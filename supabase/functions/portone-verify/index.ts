/**
 * Stargate Edu Shop — PortOne V2 결제 검증 (server-side verify)
 *
 * 두 경로를 처리한다.
 *  1) 브라우저 검증  POST {paymentId, productId, customer}   ← success.html
 *  2) PortOne 웹훅   POST (webhook-id / webhook-signature 헤더) ← PortOne 콘솔 웹훅
 *
 * 어느 경로든 결제 상태는 브라우저 값이 아니라 PortOne API(GET /payments/{id})
 * 조회 결과로만 확정한다.
 *
 * 보안 원칙
 *  - 금액의 유일한 진실은 SERVER_CATALOG. 결제 금액·통화가 다르면 PortOne 에
 *    즉시 취소를 요청하고 FAILED(AMOUNT_MISMATCH) 로 기록한다.
 *  - PORTONE_API_SECRET / PORTONE_WEBHOOK_SECRET 은 Edge Function Secret 으로만 존재한다.
 *  - PORTONE_STORE_ID 가 설정돼 있으면 다른 상점의 결제는 거절한다.
 *  - PORTONE_ALLOW_LIVE 가 "true" 가 아니면 실결제(LIVE 채널) 결제는 거절·취소한다.
 *    (테스트 단계 보호장치 — 실결제 전환 시 "true" 로 바꾼다)
 *  - 주문 원장(public.shop_orders)은 service_role 로만 기록. 동일 paymentId 는 멱등 처리.
 *
 * 필요한 Secret
 *  PORTONE_API_SECRET      (필수) 콘솔 > 결제 연동 > 연동 정보 > V2 API Secret
 *  PORTONE_STORE_ID        (권장) store-xxxxxxxx-...
 *  PORTONE_WEBHOOK_SECRET  (웹훅 사용 시) whsec_...
 *  PORTONE_ALLOW_LIVE      (실결제 전환 시에만) "true"
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const PORTONE_API = "https://api.portone.io";

const ALLOWED_ORIGINS = new Set<string>([
  "https://shop.stargateedu.co.kr",
  "https://stargateedu.co.kr",
  "https://www.stargateedu.co.kr",
  "http://localhost:8080",
  "http://127.0.0.1:5500",
]);

type CatalogEntry = { sku: string; name: string; amount: number };

/** toss-confirm 과 동일한 서버 카탈로그 (가격 변경 시 두 함수와 catalog.js 를 함께 수정) */
const SERVER_CATALOG: Record<string, CatalogEntry> = {
  "koi-algorithms-guide": { sku: "SGE-EBOOK-KOI-25", name: "KOI 수상자의 25개 핵심 알고리즘 가이드", amount: 30000 },
  "koi-advanced": { sku: "SGE-COURSE-KOI-ADV", name: "정보올림피아드 심화 (자료구조·알고리즘)", amount: 429000 },
  "algorithms-bundle": { sku: "SGE-COURSE-ALGO-BUNDLE", name: "알고리즘 종합 패키지 (입문+심화)", amount: 690600 },
  "kmo-number-comb": { sku: "SGE-COURSE-KMO-NC", name: "KMO 대비 정수론·조합", amount: 384000 },
  "koi-cpp-beginner": { sku: "SGE-COURSE-KOI-INTRO", name: "정보올림피아드 입문 (C++ 기초)", amount: 297000 },
  "algorithms-ebook-set": { sku: "SGE-EBOOK-ALGO-SET", name: "알고리즘 문제집 eBook 세트", amount: 47600 },
  "vacation-live-intensive": { sku: "SGE-LIVE-VACATION-4W", name: "방학 집중 라이브특강 (4주)", amount: 281600 },
  "koi-final-camp": { sku: "SGE-LIVE-KOI-FINAL", name: "KOI 직전 파이널 캠프", amount: 405000 },
  "strategy-consulting": { sku: "SGE-CONSULT-STRATEGY-90", name: "입시·대회 전략 컨설팅", amount: 250000 },
};

const PAYMENT_ID_RE = /^SGE-[A-Z0-9-]{6,58}$/;

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://shop.stargateedu.co.kr";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json; charset=utf-8" },
  });
}

function trim(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v ? v.slice(0, max) : null;
}

/* ---------- Standard Webhooks 서명 검증 (PortOne V2 웹훅 규격) ---------- */

function b64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifyWebhook(secret: string, headers: Headers, body: string): Promise<boolean> {
  const id = headers.get("webhook-id");
  const ts = headers.get("webhook-timestamp");
  const sigHeader = headers.get("webhook-signature");
  if (!id || !ts || !sigHeader) return false;

  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum) || Math.abs(Date.now() / 1000 - tsNum) > 300) return false;

  const keyBytes = b64ToBytes(secret.startsWith("whsec_") ? secret.slice(6) : secret);
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${ts}.${body}`)),
  );
  const expected = bytesToB64(mac);

  return sigHeader.split(" ").some((part) => {
    const [version, sig] = part.split(",", 2);
    return version === "v1" && typeof sig === "string" && safeEqual(sig, expected);
  });
}

/* ---------- PortOne API ---------- */

type PortOnePayment = Record<string, unknown> & {
  id?: string;
  status?: string;
  storeId?: string;
  transactionId?: string;
  orderName?: string;
  currency?: string;
  paidAt?: string;
  requestedAt?: string;
  receiptUrl?: string;
  customData?: string;
  amount?: { total?: number };
  channel?: { type?: string; pgProvider?: string };
  method?: { type?: string; provider?: string };
  failure?: { reason?: string; pgCode?: string; pgMessage?: string };
};

async function fetchPayment(paymentId: string, apiSecret: string, storeId: string | null) {
  const url = new URL(`${PORTONE_API}/payments/${encodeURIComponent(paymentId)}`);
  if (storeId) url.searchParams.set("storeId", storeId);
  const res = await fetch(url, { headers: { Authorization: `PortOne ${apiSecret}` } });
  const body = (await res.json().catch(() => ({}))) as PortOnePayment;
  return { status: res.status, body };
}

async function cancelPayment(paymentId: string, apiSecret: string, storeId: string | null, reason: string) {
  try {
    const res = await fetch(`${PORTONE_API}/payments/${encodeURIComponent(paymentId)}/cancel`, {
      method: "POST",
      headers: { Authorization: `PortOne ${apiSecret}`, "Content-Type": "application/json" },
      body: JSON.stringify(storeId ? { storeId, reason } : { reason }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function productFromCustomData(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed?.productId === "string" ? parsed.productId : null;
  } catch {
    return null;
  }
}

function methodLabel(p: PortOnePayment): string | null {
  const t = p.method?.type;
  if (!t) return null;
  if (t === "PaymentMethodCard") return "CARD";
  if (t === "PaymentMethodEasyPay") return `EASY_PAY${p.method?.provider ? `:${p.method.provider}` : ""}`;
  if (t === "PaymentMethodTransfer") return "TRANSFER";
  if (t === "PaymentMethodVirtualAccount") return "VIRTUAL_ACCOUNT";
  if (t === "PaymentMethodMobile") return "MOBILE";
  return t.replace(/^PaymentMethod/, "").toUpperCase();
}

/* ---------- 핵심: PortOne 조회 결과로 주문 확정 ---------- */

type SyncResult =
  | { ok: true; idempotent?: boolean; test: boolean; payment: Record<string, unknown>; product: CatalogEntry }
  | { ok: false; status: number; code: string; message: string };

async function syncPayment(
  paymentId: string,
  hintProductId: string | null,
  customer: { name: string | null; email: string | null; phone: string | null },
  origin: string | null,
): Promise<SyncResult> {
  const apiSecret = Deno.env.get("PORTONE_API_SECRET");
  if (!apiSecret) {
    return { ok: false, status: 500, code: "PORTONE_SECRET_NOT_CONFIGURED", message: "결제 검증 키가 서버에 설정되지 않았습니다." };
  }
  const storeId = Deno.env.get("PORTONE_STORE_ID") || null;
  const allowLive = Deno.env.get("PORTONE_ALLOW_LIVE") === "true";

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const { data: existing } = await db
    .from("shop_orders")
    .select("order_id, product_id, status, method, approved_at, receipt_url, amount, sku, product_name, raw_response")
    .eq("order_id", paymentId)
    .maybeSingle();

  if (existing?.status === "DONE") {
    const raw = (existing.raw_response ?? {}) as Record<string, unknown>;
    return {
      ok: true,
      idempotent: true,
      test: raw.channelType === "TEST",
      payment: {
        status: "PAID",
        method: existing.method,
        approvedAt: existing.approved_at,
        receiptUrl: existing.receipt_url,
      },
      product: { sku: existing.sku ?? "", name: existing.product_name ?? "", amount: existing.amount },
    };
  }
  if (existing && existing.raw_response && (existing.raw_response as Record<string, unknown>).provider !== "portone") {
    return { ok: false, status: 409, code: "ORDER_ID_CONFLICT", message: "다른 결제수단에서 사용된 주문번호입니다." };
  }

  let fetched: { status: number; body: PortOnePayment };
  try {
    fetched = await fetchPayment(paymentId, apiSecret, storeId);
  } catch (error) {
    console.error("PortOne fetch failed", error);
    return { ok: false, status: 502, code: "PORTONE_NETWORK_ERROR", message: "PortOne 통신에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  }
  if (fetched.status === 404) {
    return { ok: false, status: 404, code: "PAYMENT_NOT_FOUND", message: "결제 내역을 찾을 수 없습니다." };
  }
  if (fetched.status < 200 || fetched.status >= 300) {
    console.error("PortOne fetch error", fetched.status, fetched.body?.type ?? "");
    return { ok: false, status: 502, code: `PORTONE_HTTP_${fetched.status}`, message: "결제 조회에 실패했습니다." };
  }

  const pay = fetched.body;
  const productId = productFromCustomData(pay.customData) ?? hintProductId;
  const product = productId ? SERVER_CATALOG[productId] : undefined;
  const channelType = pay.channel?.type ?? "UNKNOWN";
  const record = {
    provider: "portone",
    channelType,
    pgProvider: pay.channel?.pgProvider ?? null,
    portoneStatus: pay.status ?? null,
    transactionId: pay.transactionId ?? null,
    amountTotal: pay.amount?.total ?? null,
    currency: pay.currency ?? null,
    paidAt: pay.paidAt ?? null,
    failure: pay.failure ?? null,
  };

  const writeOrder = async (fields: Record<string, unknown>) => {
    const base = {
      order_id: paymentId,
      product_id: productId ?? "unknown",
      sku: product?.sku ?? null,
      product_name: product?.name ?? (typeof pay.orderName === "string" ? pay.orderName.slice(0, 200) : null),
      amount: product?.amount ?? (Number.isInteger(pay.amount?.total) && (pay.amount?.total ?? 0) > 0 ? pay.amount!.total : 1),
      currency: "KRW",
      payment_key: pay.transactionId ?? null,
      client_origin: origin,
      raw_response: record,
      ...fields,
    };
    const contact: Record<string, string> = {};
    if (customer.name) contact.customer_name = customer.name;
    if (customer.email) contact.customer_email = customer.email;
    if (customer.phone) contact.customer_phone = customer.phone;
    const { error } = existing
      ? await db.from("shop_orders").update({ ...base, ...contact }).eq("order_id", paymentId)
      : await db.from("shop_orders").insert({ ...base, ...contact });
    if (error) console.error("shop_orders write failed", error.message);
  };

  if (storeId && pay.storeId && pay.storeId !== storeId) {
    return { ok: false, status: 400, code: "STORE_MISMATCH", message: "다른 상점의 결제입니다." };
  }

  if (pay.status !== "PAID") {
    if (pay.status === "FAILED" || pay.status === "CANCELLED") {
      await writeOrder({
        status: pay.status === "CANCELLED" ? "CANCELED" : "FAILED",
        fail_code: pay.failure?.pgCode ?? pay.status,
        fail_message: (pay.failure?.reason ?? pay.failure?.pgMessage ?? "결제가 완료되지 않았습니다.").slice(0, 500),
      });
    }
    return {
      ok: false,
      status: 402,
      code: `PAYMENT_${pay.status ?? "UNKNOWN"}`,
      message: pay.failure?.reason ?? "결제가 완료되지 않았습니다.",
    };
  }

  // PAID 이후 검증 — 하나라도 어긋나면 즉시 취소
  let rejectCode: string | null = null;
  let rejectMessage = "";
  if (!product) {
    rejectCode = "UNKNOWN_PRODUCT";
    rejectMessage = "결제 가능한 상품이 아닙니다.";
  } else if (pay.currency !== "KRW" || pay.amount?.total !== product.amount) {
    rejectCode = "AMOUNT_MISMATCH";
    rejectMessage = `결제 금액이 상품 가격과 일치하지 않습니다. 기대 금액 ${product.amount}원`;
  } else if (channelType !== "TEST" && !allowLive) {
    rejectCode = "LIVE_NOT_ALLOWED";
    rejectMessage = "현재 테스트 결제만 허용됩니다.";
  }

  if (rejectCode) {
    const canceled = await cancelPayment(paymentId, apiSecret, storeId, `자동 취소: ${rejectCode}`);
    await writeOrder({
      status: canceled ? "CANCELED" : "FAILED",
      fail_code: rejectCode,
      fail_message: `${rejectMessage}${canceled ? " (자동 취소됨)" : " (자동 취소 실패 — 관리자 확인 필요)"}`.slice(0, 500),
    });
    return { ok: false, status: 400, code: rejectCode, message: rejectMessage };
  }

  await writeOrder({
    status: "DONE",
    method: methodLabel(pay),
    receipt_url: typeof pay.receiptUrl === "string" && pay.receiptUrl.startsWith("https://") ? pay.receiptUrl : null,
    requested_at: pay.requestedAt ?? null,
    approved_at: pay.paidAt ?? null,
    fail_code: null,
    fail_message: null,
  });

  return {
    ok: true,
    test: channelType === "TEST",
    payment: {
      status: "PAID",
      method: methodLabel(pay),
      approvedAt: pay.paidAt ?? null,
      receiptUrl: typeof pay.receiptUrl === "string" && pay.receiptUrl.startsWith("https://") ? pay.receiptUrl : null,
    },
    product: product!,
  };
}

/* ---------- HTTP ---------- */

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (req.method !== "POST") {
    return json({ ok: false, code: "METHOD_NOT_ALLOWED", message: "POST 만 허용됩니다." }, 405, origin);
  }

  const raw = await req.text();
  if (raw.length > 20_000) return json({ ok: false, code: "PAYLOAD_TOO_LARGE" }, 413, origin);

  // 1) PortOne 웹훅
  if (req.headers.has("webhook-id")) {
    const secret = Deno.env.get("PORTONE_WEBHOOK_SECRET");
    if (!secret) return json({ ok: false, code: "WEBHOOK_SECRET_NOT_CONFIGURED" }, 500, null);
    if (!(await verifyWebhook(secret, req.headers, raw))) {
      return json({ ok: false, code: "INVALID_SIGNATURE" }, 401, null);
    }
    let event: { type?: string; data?: { paymentId?: string } } = {};
    try {
      event = JSON.parse(raw);
    } catch {
      return json({ ok: false, code: "INVALID_JSON" }, 400, null);
    }
    const paymentId = trim(event.data?.paymentId, 64);
    if (!paymentId || !PAYMENT_ID_RE.test(paymentId) || !String(event.type ?? "").startsWith("Transaction.")) {
      return json({ ok: true, ignored: true }, 200, null); // 처리 대상 아님 → 재시도 방지
    }
    const result = await syncPayment(paymentId, null, { name: null, email: null, phone: null }, "portone-webhook");
    // 네트워크·설정 오류만 5xx 로 돌려 PortOne 재시도를 유도
    const retry = !result.ok && (result.status >= 500);
    return json({ ok: result.ok, code: result.ok ? undefined : result.code }, retry ? 500 : 200, null);
  }

  // 2) 브라우저 검증
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return json({ ok: false, code: "ORIGIN_NOT_ALLOWED", message: "허용되지 않은 출처입니다." }, 403, origin);
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw);
  } catch {
    return json({ ok: false, code: "INVALID_JSON", message: "요청 형식이 올바르지 않습니다." }, 400, origin);
  }

  const paymentId = trim(payload.paymentId, 64);
  const productId = trim(payload.productId, 64);
  if (!paymentId || !PAYMENT_ID_RE.test(paymentId) || !productId || !SERVER_CATALOG[productId]) {
    return json({ ok: false, code: "MISSING_PARAMETERS", message: "paymentId 와 productId 가 올바르지 않습니다." }, 400, origin);
  }

  const c = (payload.customer ?? {}) as Record<string, unknown>;
  const result = await syncPayment(
    paymentId,
    productId,
    { name: trim(c.name, 60), email: trim(c.email, 120), phone: trim(c.phone, 30) },
    origin,
  );

  if (!result.ok) return json({ ok: false, code: result.code, message: result.message }, result.status, origin);
  return json(
    { ok: true, idempotent: result.idempotent ?? false, test: result.test, payment: result.payment, product: result.product },
    200,
    origin,
  );
});
