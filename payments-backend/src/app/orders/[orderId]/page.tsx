import { getOrder } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: Promise<{ orderId:string }> }) {
  const { orderId } = await params;
  let order = null;
  try { order = await getOrder(orderId); } catch { /* deployment is not configured yet */ }
  return <div className="shell"><main className="panel"><div className="kicker">Order status</div><h1>{order ? order.status : "Order unavailable"}</h1>{order ? <><p><code>{order.order_id}</code></p><p>SKU: {order.sku}</p><p>Amount: {order.currency} {order.amount.toLocaleString()}</p></> : <div className="notice">The order was not found or the payment database is not configured.</div>}</main></div>;
}
