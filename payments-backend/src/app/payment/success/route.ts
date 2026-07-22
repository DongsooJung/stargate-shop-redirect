import { NextResponse } from "next/server";
import { confirmOrder } from "@/lib/confirm";
import { origins } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const paymentKey = url.searchParams.get("paymentKey") || "";
  const orderId = url.searchParams.get("orderId") || "";
  const amount = Number(url.searchParams.get("amount"));
  try {
    if (!paymentKey || !orderId || !Number.isSafeInteger(amount) || amount <= 0) throw new Error("INVALID_SUCCESS_PARAMETERS");
    await confirmOrder({ paymentKey, orderId, amount });
    return NextResponse.redirect(`${origins().pay}/orders/${encodeURIComponent(orderId)}`);
  } catch (error) {
    const failed = new URL(`${origins().pay}/payment/fail`);
    failed.searchParams.set("code", "CONFIRM_FAILED");
    failed.searchParams.set("message", error instanceof Error ? error.message : "UNKNOWN_ERROR");
    return NextResponse.redirect(failed);
  }
}
