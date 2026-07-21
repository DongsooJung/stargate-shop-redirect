import { origins } from "@/lib/env";

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== origins().pay) throw new Error("INVALID_REQUEST_ORIGIN");
}

export function publicError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  if (process.env.NODE_ENV === "development") return message;
  if (message.startsWith("MISSING_ENV_")) return "PAYMENT_SERVICE_NOT_CONFIGURED";
  if (["UNKNOWN_SKU","GLOBAL_PRICE_NOT_CONFIGURED","INVALID_GLOBAL_PROVIDER","RECURRING_BILLING_NOT_IMPLEMENTED","SHIPPING_DETAILS_REQUIRED","INVALID_REQUEST_ORIGIN","ORDER_NOT_FOUND","ORDER_AMOUNT_MISMATCH"].includes(message)) return message;
  return fallback;
}
