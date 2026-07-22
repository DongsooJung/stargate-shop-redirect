import { randomUUID } from "node:crypto";
import { createOrder, setOrderStatus } from "@/lib/db";
import { origins } from "@/lib/env";
import { checkoutBlock, type PaymentMethod, priceFor, products } from "@/lib/catalog";
import { createTossPayment } from "@/lib/toss";

const providers = ["PAYPAL", "ALIPAY", "ALIPAYHK", "GCASH", "TOUCHNGO", "TRUEMONEY"] as const;

export async function beginCheckout(input: { sku: string; method: PaymentMethod; lang: "ko" | "en"; provider?: string }) {
  const item = products[input.sku];
  if (!item) throw new Error("UNKNOWN_SKU");
  const blocked = checkoutBlock(item);
  if (blocked) throw new Error(blocked);
  const price = priceFor(item, input.method);
  const orderId = `SG_${randomUUID()}`;
  const createKey = randomUUID();
  const confirmKey = randomUUID();
  const provider = input.method === "globalWallet" && providers.includes(input.provider as typeof providers[number]) ? input.provider! : null;
  if (input.method === "globalWallet" && !provider) throw new Error("INVALID_GLOBAL_PROVIDER");
  const stored = await createOrder({ order_id: orderId, sku: item.sku, method: input.method, provider, currency: price.currency, amount: price.amount, create_idempotency_key: createKey, confirm_idempotency_key: confirmKey });
  const { pay } = origins();
  const payload: Record<string, unknown> = {
    method: input.method === "globalWallet" ? "FOREIGN_EASY_PAY" : "CARD",
    amount: stored.amount,
    currency: stored.currency,
    orderId: stored.order_id,
    orderName: input.lang === "en" ? item.nameEn : item.nameKo,
    successUrl: `${pay}/payment/success`,
    failUrl: `${pay}/payment/fail`,
    flowMode: "DEFAULT",
  };
  if (input.method === "internationalCard") payload.card = { useInternationalCardOnly: true };
  if (input.method === "globalWallet") {
    payload.provider = provider;
    payload.pendingUrl = `${pay}/payment/pending?orderId=${encodeURIComponent(orderId)}`;
  }
  try {
    const payment = await createTossPayment(payload, createKey);
    if (!payment.checkout?.url) throw new Error("TOSS_CHECKOUT_URL_MISSING");
    await setOrderStatus(orderId, "PAYMENT_PENDING", payment.paymentKey);
    return payment.checkout.url;
  } catch (error) {
    await setOrderStatus(orderId, "FAILED", undefined, error instanceof Error ? error.message.slice(0, 1000) : "UNKNOWN_ERROR");
    throw error;
  }
}
