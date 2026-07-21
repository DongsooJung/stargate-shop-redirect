import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { requiredEnv } from "@/lib/env";

let sqlClient: NeonQueryFunction<false, false> | null = null;

export function getDb() {
  if (!sqlClient) sqlClient = neon(requiredEnv("DATABASE_URL"));
  return sqlClient;
}

export type StoredOrder = {
  order_id: string;
  sku: string;
  method: string;
  provider: string | null;
  currency: "KRW" | "USD";
  amount: number;
  status: string;
  payment_key: string | null;
  create_idempotency_key: string;
  confirm_idempotency_key: string;
};

export async function createOrder(order: Omit<StoredOrder, "status" | "payment_key">) {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO payment_orders (order_id, sku, method, provider, currency, amount, status, create_idempotency_key, confirm_idempotency_key)
    VALUES (${order.order_id}, ${order.sku}, ${order.method}, ${order.provider}, ${order.currency}, ${order.amount}, 'CREATED', ${order.create_idempotency_key}, ${order.confirm_idempotency_key})
    RETURNING *`;
  return rows[0] as StoredOrder;
}

export async function getOrder(orderId: string) {
  const rows = await getDb()`SELECT * FROM payment_orders WHERE order_id = ${orderId} LIMIT 1`;
  return (rows[0] as StoredOrder | undefined) || null;
}

export async function setOrderStatus(orderId: string, status: string, paymentKey?: string, error?: string) {
  await getDb()`UPDATE payment_orders SET status=${status}, payment_key=COALESCE(${paymentKey || null}, payment_key), last_error=${error || null}, updated_at=NOW() WHERE order_id=${orderId}`;
}

export async function recordWebhook(transmissionId: string, eventType: string, orderId: string | null, payload: unknown) {
  const rows = await getDb()`INSERT INTO payment_webhook_events (transmission_id, event_type, order_id, payload) VALUES (${transmissionId}, ${eventType}, ${orderId}, ${JSON.stringify(payload)}::jsonb) ON CONFLICT (transmission_id) DO NOTHING RETURNING transmission_id`;
  return rows.length === 1;
}
