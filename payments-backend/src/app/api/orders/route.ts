import { NextResponse } from "next/server";
import { z } from "zod";
import { beginCheckout } from "@/lib/checkout";
import { assertSameOrigin, publicError } from "@/lib/security";

export const runtime = "nodejs";

const inputSchema = z.object({ sku:z.string().min(3).max(80), method:z.enum(["domestic","internationalCard","globalWallet"]), lang:z.enum(["ko","en"]).default("ko"), provider:z.string().max(30).optional() });

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const form = await request.formData();
    const input = inputSchema.parse(Object.fromEntries(form));
    const url = await beginCheckout(input);
    return NextResponse.redirect(url, 303);
  } catch (error) {
    const message = publicError(error, "CHECKOUT_FAILED");
    return NextResponse.json({ error:message }, { status: message === "PAYMENT_SERVICE_NOT_CONFIGURED" ? 503 : 400 });
  }
}
