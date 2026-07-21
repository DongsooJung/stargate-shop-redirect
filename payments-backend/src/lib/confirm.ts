import { getOrder, setOrderStatus } from "@/lib/db";
import { confirmTossPayment, internalStatus } from "@/lib/toss";

export async function confirmOrder(input: { paymentKey: string; orderId: string; amount: number }) {
  const order = await getOrder(input.orderId);
  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (order.amount !== input.amount) throw new Error("ORDER_AMOUNT_MISMATCH");
  if (order.status === "PAID") return order;
  const payment = await confirmTossPayment(input, order.confirm_idempotency_key);
  if (payment.orderId !== order.order_id || payment.totalAmount !== order.amount || payment.currency !== order.currency) throw new Error("CONFIRMED_PAYMENT_MISMATCH");
  await setOrderStatus(order.order_id, internalStatus(payment.status), payment.paymentKey);
  return { ...order, status: internalStatus(payment.status), payment_key: payment.paymentKey };
}
