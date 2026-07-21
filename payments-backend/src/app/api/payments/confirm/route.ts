import { z } from "zod";
import { confirmOrder } from "@/lib/confirm";
import { assertSameOrigin, publicError } from "@/lib/security";

export const runtime = "nodejs";
const schema = z.object({ paymentKey:z.string().min(10).max(200), orderId:z.string().min(6).max(64), amount:z.number().int().positive() });

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = schema.parse(await request.json());
    const order = await confirmOrder(input);
    return Response.json({ orderId:order.order_id, status:order.status });
  } catch (error) {
    return Response.json({ error:publicError(error, "CONFIRM_FAILED") }, { status:400 });
  }
}
