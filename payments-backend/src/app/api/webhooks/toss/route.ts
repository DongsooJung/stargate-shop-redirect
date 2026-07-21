import { z } from "zod";
import { getOrder, recordWebhook, setOrderStatus } from "@/lib/db";
import { getTossPayment, internalStatus } from "@/lib/toss";
import { publicError } from "@/lib/security";

export const runtime = "nodejs";
const eventSchema = z.object({ eventType:z.string(), createdAt:z.string().optional(), data:z.record(z.string(), z.unknown()) });

export async function POST(request: Request) {
  try {
    const transmissionId = request.headers.get("tosspayments-webhook-transmission-id");
    if (!transmissionId) return Response.json({ error:"MISSING_TRANSMISSION_ID" }, { status:400 });
    const event = eventSchema.parse(await request.json());
    const paymentKey = typeof event.data.paymentKey === "string" ? event.data.paymentKey : null;
    if (!paymentKey) return Response.json({ received:true, ignored:true });
    const payment = await getTossPayment(paymentKey);
    const order = await getOrder(payment.orderId);
    if (!order || order.amount !== payment.totalAmount || order.currency !== payment.currency) return Response.json({ error:"PAYMENT_MISMATCH" }, { status:409 });
    const isNew = await recordWebhook(transmissionId, event.eventType, order.order_id, event);
    if (!isNew) return Response.json({ received:true, duplicate:true });
    await setOrderStatus(order.order_id, internalStatus(payment.status), payment.paymentKey);
    return Response.json({ received:true });
  } catch (error) {
    return Response.json({ error:publicError(error, "WEBHOOK_FAILED") }, { status:500 });
  }
}
