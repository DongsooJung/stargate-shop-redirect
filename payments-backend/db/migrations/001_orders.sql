CREATE TABLE IF NOT EXISTS payment_orders (
  order_id TEXT PRIMARY KEY,
  sku TEXT NOT NULL,
  method TEXT NOT NULL,
  provider TEXT,
  currency TEXT NOT NULL CHECK (currency IN ('KRW','USD')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL,
  payment_key TEXT UNIQUE,
  create_idempotency_key UUID NOT NULL UNIQUE,
  confirm_idempotency_key UUID NOT NULL UNIQUE,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payment_orders_status_idx ON payment_orders(status);

CREATE TABLE IF NOT EXISTS payment_webhook_events (
  transmission_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  order_id TEXT REFERENCES payment_orders(order_id),
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
