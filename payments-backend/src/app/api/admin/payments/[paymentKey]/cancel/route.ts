import { randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { requiredEnv } from "@/lib/env";
import { cancelTossPayment } from "@/lib/toss";
import { publicError } from "@/lib/security";

export const runtime = "nodejs";
const schema = z.object({ cancelReason:z.string().min(2).max(200), cancelAmount:z.number().int().positive().optional(), currency:z.enum(["KRW","USD"]).optional() });
const same = (a:string,b:string) => { const x=Buffer.from(a), y=Buffer.from(b); return x.length === y.length && timingSafeEqual(x,y); };

export async function POST(request: Request, { params }: { params:Promise<{ paymentKey:string }> }) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
    if (!same(token, requiredEnv("ADMIN_API_KEY"))) return Response.json({ error:"UNAUTHORIZED" }, { status:401 });
    const { paymentKey } = await params;
    const input = schema.parse(await request.json());
    const idempotencyKey = request.headers.get("idempotency-key") || randomUUID();
    const payment = await cancelTossPayment(paymentKey, input, idempotencyKey);
    return Response.json({ orderId:payment.orderId, status:payment.status });
  } catch (error) {
    return Response.json({ error:publicError(error, "CANCEL_FAILED") }, { status:400 });
  }
}
