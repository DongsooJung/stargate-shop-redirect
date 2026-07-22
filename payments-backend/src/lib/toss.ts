import { requiredEnv } from "@/lib/env";

const API = "https://api.tosspayments.com/v1";

function headers(idempotencyKey?: string) {
  const secret = requiredEnv("TOSS_SECRET_KEY");
  const value: Record<string, string> = {
    Authorization: `Basic ${Buffer.from(`${secret}:`).toString("base64")}`,
    "Content-Type": "application/json",
    "Accept-Language": "en-US",
  };
  if (idempotencyKey) value["Idempotency-Key"] = idempotencyKey;
  return value;
}

async function tossRequest<T>(path: string, init: RequestInit, idempotencyKey?: string) {
  const response = await fetch(`${API}${path}`, { ...init, headers: { ...headers(idempotencyKey), ...(init.headers || {}) }, cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`TOSS_${response.status}_${JSON.stringify(body)}`);
  return body as T;
}

export type TossPayment = { paymentKey: string; orderId: string; status: string; totalAmount: number; currency: string; checkout?: { url: string } };

export function createTossPayment(body: Record<string, unknown>, idempotencyKey: string) {
  return tossRequest<TossPayment>("/payments", { method: "POST", body: JSON.stringify(body) }, idempotencyKey);
}

export function confirmTossPayment(body: { paymentKey: string; orderId: string; amount: number }, idempotencyKey: string) {
  return tossRequest<TossPayment>("/payments/confirm", { method: "POST", body: JSON.stringify(body) }, idempotencyKey);
}

export function getTossPayment(paymentKey: string) {
  return tossRequest<TossPayment>(`/payments/${encodeURIComponent(paymentKey)}`, { method: "GET" });
}

export function cancelTossPayment(paymentKey: string, body: { cancelReason: string; cancelAmount?: number; currency?: string }, idempotencyKey: string) {
  return tossRequest<TossPayment>(`/payments/${encodeURIComponent(paymentKey)}/cancel`, { method: "POST", body: JSON.stringify(body) }, idempotencyKey);
}

export function internalStatus(status: string) {
  if (status === "DONE") return "PAID";
  if (status === "CANCELED") return "CANCELLED";
  if (status === "PARTIAL_CANCELED") return "PARTIALLY_CANCELLED";
  if (["ABORTED", "EXPIRED"].includes(status)) return "FAILED";
  return "PAYMENT_PENDING";
}
