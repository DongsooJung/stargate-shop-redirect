/**
 * Stargate Edu Shop — NICEPAY(나이스페이 포스타트) Server 승인
 *
 * 두 경로를 처리한다.
 *  1) 결제창 인증 결과  POST application/x-www-form-urlencoded  ← NICEPAY returnUrl
 *     (GitHub Pages 는 POST 를 받지 못하므로 returnUrl 이 이 함수다)
 *     서명·주문번호·금액 확인 → 승인 API 호출 → 주문 원장 기록 → success.html 로 303 이동
 *  2) 주문 상태 조회     POST application/json {orderId, productId} ← success.html
 *
 * 보안 원칙
 *  - 금액의 유일한 진실은 SERVER_CATALOG. 인증 금액이 다르면 승인 API 를 호출하지 않는다
 *    (인증만 된 거래는 청구되지 않는다).
 *  - 인증 응답 signature = hex(sha256(authToken + clientId + amount + SecretKey)) 를 검증한다.
 *  - 승인 응답 signature = hex(sha256(tid + amount + ediDate + SecretKey)) 와 금액·주문번호를
 *    다시 확인하고, 어긋나면 즉시 전액 취소한다.
 *  - 승인 호출이 네트워크 오류·타임아웃으로 불확실하면 망취소(netcancel)를 요청한다.
 *  - NICEPAY_SECRET_KEY 는 Edge Function Secret 으로만 존재한다. 저장소·브라우저 금지.
 *  - 주문 원장(public.shop_orders)은 service_role 로만 기록. 동일 orderId 는 멱등 처리.
 *
 * 필요한 Secret
 *  NICEPAY_SECRET_KEY   (필수) 나이스페이 관리자 > 개발정보 > 시크릿 키 (Basic 인증)
 *  NICEPAY_CLIENT_KEY   (선택) 기본값은 아래 DEFAULT_CLIENT_KEY. 키 재발급 시 여기만 바꾸면 된다.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/** 클라이언트 키는 브라우저에 노출되는 공개 식별자다 (payment-config.js 와 동일 값). */
const DEFAULT_CLIENT_KEY = "R2_92ee7f9929f24589b5808f7f94a393c8";

const SHOP_ORIGIN = "https://shop.stargateedu.co.kr";

/**
 * 승인 후 돌려보낼 수 있는 결제 페이지 주소. 체크아웃이 returnUrl 의 site 파라미터로
 * 자기 주소를 넘기면 이 목록에 있을 때만 그 주소로 돌려보낸다(오픈 리다이렉트 방지).
 * shop 도메인을 아임웹에 넘기고 결제 페이지를 pay 로 옮겨도 함수 수정 없이 동작한다.
 */
const RETURN_ORIGINS = new Set<string>([
  "https://shop.stargateedu.co.kr",
  "https://pay.stargateedu.co.kr",
]);

const ALLOWED_ORIGINS = new Set<string>([
  "https://shop.stargateedu.co.kr",
  "https://stargateedu.co.kr",
  "https://www.stargateedu.co.kr",
  "https://pay.stargateedu.co.kr",
  "http://localhost:8080",
  "http://127.0.0.1:5500",
]);

type CatalogEntry = { sku: string; name: string; amount: number };

/** toss-confirm · portone-verify 와 동일한 서버 카탈로그 (가격 변경 시 catalog.js 와 함께 수정) */
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

const ORDER_ID_RE = /^SGE-[A-Z0-9-]{6,58}$/;
const TID_RE = /^[A-Za-z0-9]{10,40}$/;

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : SHOP_ORIGIN;
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

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function sha256Hex(text: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
  return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** S1_/S2_ = 샌드박스(실제 승인 없음), R1_/R2_ = 운영 */
function isSandbox(clientKey: string): boolean {
  return clientKey.startsWith("S");
}

function apiHost(clientKey: string): string {
  return isSandbox(clientKey) ? "https://sandbox-api.nicepay.co.kr" : "https://api.nicepay.co.kr";
}

function basicAuth(clientKey: string, secretKey: string): string {
  return `Basic ${btoa(`${clientKey}:${secretKey}`)}`;
}

/* ---------- NICEPAY API ---------- */

type NicePayment = Record<string, unknown> & {
  resultCode?: string;
  resultMsg?: string;
  tid?: string;
  orderId?: string;
  ediDate?: string;
  signature?: string;
  status?: string;
  paidAt?: string;
  payMethod?: string;
  amount?: number;
  currency?: string;
  approveNo?: string;
  receiptUrl?: string;
  buyerName?: string;
  buyerTel?: string;
  buyerEmail?: string;
  card?: { cardName?: string; cardQuota?: string | number; cardType?: string };
};

async function approve(tid: string, amount: number, clientKey: string, secretKey: string) {
  const res = await fetch(`${apiHost(clientKey)}/v1/payments/${encodeURIComponent(tid)}`, {
    method: "POST",
    headers: { Authorization: basicAuth(clientKey, secretKey), "Content-Type": "application/json;charset=utf-8" },
    body: JSON.stringify({ amount }),
    signal: AbortSignal.timeout(30_000),
  });
  const body = (await res.json().catch(() => null)) as NicePayment | null;
  // 5xx·본문 파싱 실패·resultCode 없음 = 승인 여부를 알 수 없는 응답. 호출부에서 망취소로 처리한다.
  if (res.status >= 500 || !body || typeof body.resultCode !== "string" || !body.resultCode) {
    throw new Error(`NICEPAY approve indeterminate response (HTTP ${res.status})`);
  }
  return { status: res.status, body };
}

async function cancel(tid: string, orderId: string, reason: string, clientKey: string, secretKey: string) {
  try {
    const res = await fetch(`${apiHost(clientKey)}/v1/payments/${encodeURIComponent(tid)}/cancel`, {
      method: "POST",
      headers: { Authorization: basicAuth(clientKey, secretKey), "Content-Type": "application/json;charset=utf-8" },
      body: JSON.stringify({ reason: reason.slice(0, 100), orderId }),
      signal: AbortSignal.timeout(30_000),
    });
    const body = (await res.json().catch(() => ({}))) as NicePayment;
    return body.resultCode === "0000";
  } catch {
    return false;
  }
}

/** 승인 결과가 불확실할 때(네트워크 순단·타임아웃) 호출. 유효기간 1시간. */
async function netCancel(orderId: string, clientKey: string, secretKey: string) {
  try {
    const res = await fetch(`${apiHost(clientKey)}/v1/payments/netcancel`, {
      method: "POST",
      headers: { Authorization: basicAuth(clientKey, secretKey), "Content-Type": "application/json;charset=utf-8" },
      body: JSON.stringify({ orderId }),
      signal: AbortSignal.timeout(30_000),
    });
    const body = (await res.json().catch(() => ({}))) as NicePayment;
    return body.resultCode === "0000";
  } catch {
    return false;
  }
}

function methodLabel(p: NicePayment): string | null {
  const m = typeof p.payMethod === "string" ? p.payMethod : "";
  if (!m) return null;
  if (m === "card") return "CARD";
  if (m === "bank") return "TRANSFER";
  if (m === "vbank") return "VIRTUAL_ACCOUNT";
  if (m === "cellphone") return "MOBILE";
  return `EASY_PAY:${m.toUpperCase()}`.slice(0, 40);
}

function isoOrNull(value: unknown): string | null {
  if (typeof value !== "string" || value === "0") return null;
  const t = Date.parse(value);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

function httpsOrNull(value: unknown): string | null {
  return typeof value === "string" && value.startsWith("https://") ? value.slice(0, 500) : null;
}

/* ---------- 결과 화면으로 이동 ---------- */

function back(site: string, params: Record<string, string>): Response {
  const url = new URL(`${RETURN_ORIGINS.has(site) ? site : SHOP_ORIGIN}/success.html`);
  url.searchParams.set("provider", "nicepay");
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
  return new Response(null, { status: 303, headers: { Location: url.toString(), "Cache-Control": "no-store" } });
}

function db() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
}

/* ---------- 1) returnUrl: 인증 결과 → 승인 ---------- */

async function handleReturn(req: Request, raw: string): Promise<Response> {
  const q = new URL(req.url).searchParams;
  const form = new URLSearchParams(raw);
  const lang = q.get("lang") === "en" ? "en" : "ko";
  const productId = trim(q.get("product"), 64) ?? "";
  const product = SERVER_CATALOG[productId];
  const orderId = trim(form.get("orderId"), 64) ?? "";
  const site = q.get("site") ?? "";
  const ctx = { product: productId, sku: product?.sku ?? "", lang, orderId: ORDER_ID_RE.test(orderId) ? orderId : "" };
  const done = () => back(site, ctx);
  const failTo = (code: string, message = "") => back(site, { ...ctx, code, message: message.slice(0, 200) });

  const secretKey = Deno.env.get("NICEPAY_SECRET_KEY");
  const clientKey = Deno.env.get("NICEPAY_CLIENT_KEY") || DEFAULT_CLIENT_KEY;
  if (!secretKey) return failTo("NICEPAY_SECRET_NOT_CONFIGURED", "결제 승인 키가 서버에 설정되지 않았습니다.");

  const authResultCode = form.get("authResultCode") ?? "";
  if (authResultCode !== "0000") {
    // 인증 실패·사용자 취소 — 승인 전이므로 청구 없음
    return failTo(`AUTH_${authResultCode || "UNKNOWN"}`.slice(0, 40), form.get("authResultMsg") ?? "결제가 완료되지 않았습니다.");
  }

  const tid = trim(form.get("tid"), 40) ?? "";
  const authToken = form.get("authToken") ?? "";
  const signature = (form.get("signature") ?? "").toLowerCase();
  const amountRaw = form.get("amount") ?? "";
  const amount = Number(amountRaw);

  if (!product) return failTo("UNKNOWN_PRODUCT", "결제 가능한 상품이 아닙니다.");
  if (!ORDER_ID_RE.test(orderId) || !TID_RE.test(tid) || !/^\d{1,12}$/.test(amountRaw)) {
    return failTo("MISSING_PAYMENT_RESULT", "결제 결과에 필요한 값이 누락되었습니다.");
  }
  if (form.get("clientId") !== clientKey) return failTo("STORE_MISMATCH", "다른 상점의 결제입니다.");

  const expected = await sha256Hex(`${authToken}${clientKey}${amountRaw}${secretKey}`);
  if (!authToken || !safeEqual(signature, expected)) return failTo("INVALID_SIGNATURE", "결제 인증 정보가 올바르지 않습니다.");

  const client = db();
  const { data: existing } = await client
    .from("shop_orders")
    .select("order_id, status, raw_response")
    .eq("order_id", orderId)
    .maybeSingle();
  if (existing?.status === "DONE") return done();
  if (existing && (existing.raw_response as Record<string, unknown> | null)?.provider !== "nicepay") {
    return failTo("ORDER_ID_CONFLICT", "다른 결제수단에서 사용된 주문번호입니다.");
  }

  const sandbox = isSandbox(clientKey);
  const write = async (fields: Record<string, unknown>, record: Record<string, unknown>) => {
    const row = {
      order_id: orderId,
      product_id: productId,
      sku: product.sku,
      product_name: product.name,
      amount: product.amount,
      currency: "KRW",
      payment_key: tid,
      client_origin: RETURN_ORIGINS.has(site) ? site : SHOP_ORIGIN,
      raw_response: { provider: "nicepay", channelType: sandbox ? "TEST" : "LIVE", tid, ...record },
      ...fields,
    };
    const { error } = existing
      ? await client.from("shop_orders").update(row).eq("order_id", orderId)
      : await client.from("shop_orders").insert(row);
    if (error) console.error("shop_orders write failed", error.message);
    return !error;
  };

  if (amount !== product.amount) {
    // 승인 API 를 호출하지 않으므로 청구되지 않는다.
    await write(
      { status: "FAILED", fail_code: "AMOUNT_MISMATCH", fail_message: `인증 금액 ${amount}원 ≠ 상품 가격 ${product.amount}원 (미승인)` },
      { authAmount: amount },
    );
    return failTo("AMOUNT_MISMATCH", "결제 금액이 상품 가격과 일치하지 않습니다.");
  }

  let res: { status: number; body: NicePayment };
  try {
    res = await approve(tid, product.amount, clientKey, secretKey);
  } catch (error) {
    console.error("NICEPAY approve failed", error);
    const cancelled = await netCancel(orderId, clientKey, secretKey);
    await write(
      {
        status: cancelled ? "CANCELED" : "FAILED",
        fail_code: "NICEPAY_NETWORK_ERROR",
        fail_message: cancelled ? "승인 응답 미수신 — 망취소 완료" : "승인 응답 미수신 — 망취소 실패, 관리자 확인 필요",
      },
      { netCancel: cancelled },
    );
    return failTo("NICEPAY_NETWORK_ERROR", "결제 승인 통신에 실패했습니다. 청구 여부는 고객센터에서 확인해 드립니다.");
  }

  const pay = res.body;
  const record = {
    resultCode: pay.resultCode ?? null,
    nicepayStatus: pay.status ?? null,
    payMethod: pay.payMethod ?? null,
    approveNo: pay.approveNo ?? null,
    amountTotal: pay.amount ?? null,
    currency: pay.currency ?? null,
    paidAt: pay.paidAt ?? null,
    cardName: pay.card?.cardName ?? null,
    cardQuota: pay.card?.cardQuota ?? null,
  };

  if (pay.resultCode !== "0000" || pay.status !== "paid") {
    await write(
      {
        status: "FAILED",
        fail_code: String(pay.resultCode ?? `HTTP_${res.status}`).slice(0, 40),
        fail_message: String(pay.resultMsg ?? "결제가 승인되지 않았습니다.").slice(0, 500),
      },
      record,
    );
    return failTo(`NICEPAY_${pay.resultCode ?? res.status}`.slice(0, 40), String(pay.resultMsg ?? "결제가 승인되지 않았습니다."));
  }

  // 승인 이후 검증 — 하나라도 어긋나면 즉시 전액 취소
  let rejectCode: string | null = null;
  const paidTid = typeof pay.tid === "string" && TID_RE.test(pay.tid) ? pay.tid : tid;
  if (pay.orderId !== orderId) rejectCode = "ORDER_MISMATCH";
  else if (pay.amount !== product.amount || (pay.currency && pay.currency !== "KRW")) rejectCode = "AMOUNT_MISMATCH";
  else if (!sandbox) {
    // 샌드박스 응답은 임의 값이라 서명 검증 대상이 아니다.
    const sig = typeof pay.signature === "string" ? pay.signature.toLowerCase() : "";
    const want = await sha256Hex(`${paidTid}${pay.amount}${pay.ediDate ?? ""}${secretKey}`);
    if (!sig || !safeEqual(sig, want)) rejectCode = "INVALID_APPROVE_SIGNATURE";
  }

  if (rejectCode) {
    const cancelled = await cancel(paidTid, orderId, `자동 취소: ${rejectCode}`, clientKey, secretKey);
    await write(
      {
        status: cancelled ? "CANCELED" : "FAILED",
        fail_code: rejectCode,
        fail_message: cancelled ? "승인 후 검증 실패 — 자동 취소됨" : "승인 후 검증 실패 — 자동 취소 실패, 관리자 확인 필요",
      },
      record,
    );
    return failTo(rejectCode, "결제 검증에 실패해 결제를 취소했습니다.");
  }

  const saved = await write(
    {
      status: "DONE",
      payment_key: paidTid,
      method: methodLabel(pay),
      receipt_url: httpsOrNull(pay.receiptUrl),
      approved_at: isoOrNull(pay.paidAt) ?? new Date().toISOString(),
      customer_name: trim(pay.buyerName, 60),
      customer_email: trim(pay.buyerEmail, 120),
      customer_phone: trim(pay.buyerTel, 30),
      fail_code: null,
      fail_message: null,
    },
    record,
  );
  if (!saved) {
    // 결제는 승인됐지만 원장 기록 실패 — 취소하지 않고 주문번호로 수동 확인한다.
    console.error("ORDER_WRITE_FAILED after approval", orderId, paidTid);
    return failTo("ORDER_WRITE_FAILED", "결제는 승인됐지만 주문 기록에 실패했습니다. 주문번호와 함께 문의해 주세요.");
  }
  return done();
}

/* ---------- 2) success.html: 주문 상태 조회 ---------- */

async function handleLookup(raw: string, origin: string | null): Promise<Response> {
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw);
  } catch {
    return json({ ok: false, code: "INVALID_JSON", message: "요청 형식이 올바르지 않습니다." }, 400, origin);
  }
  const orderId = trim(payload.orderId, 64);
  const productId = trim(payload.productId, 64);
  if (!orderId || !ORDER_ID_RE.test(orderId) || !productId || !SERVER_CATALOG[productId]) {
    return json({ ok: false, code: "MISSING_PARAMETERS", message: "orderId 와 productId 가 올바르지 않습니다." }, 400, origin);
  }

  const { data: row, error } = await db()
    .from("shop_orders")
    .select("order_id, product_id, status, method, approved_at, receipt_url, amount, sku, product_name, fail_code, fail_message, raw_response")
    .eq("order_id", orderId)
    .maybeSingle();
  if (error) return json({ ok: false, code: "ORDER_READ_FAILED", message: "주문 조회에 실패했습니다." }, 500, origin);

  const raw_ = (row?.raw_response ?? {}) as Record<string, unknown>;
  if (!row || raw_.provider !== "nicepay" || row.product_id !== productId) {
    return json({ ok: false, code: "PAYMENT_NOT_FOUND", message: "결제 내역을 찾을 수 없습니다." }, 404, origin);
  }
  if (row.status !== "DONE") {
    return json(
      { ok: false, code: row.fail_code ?? `PAYMENT_${row.status}`, message: row.fail_message ?? "결제가 완료되지 않았습니다." },
      402,
      origin,
    );
  }
  return json(
    {
      ok: true,
      idempotent: true,
      test: raw_.channelType === "TEST",
      payment: { status: "PAID", method: row.method, approvedAt: row.approved_at, receiptUrl: row.receipt_url },
      product: { sku: row.sku ?? "", name: row.product_name ?? "", amount: row.amount },
    },
    200,
    origin,
  );
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

  const type = (req.headers.get("Content-Type") ?? "").toLowerCase();
  if (type.includes("application/x-www-form-urlencoded")) {
    // 결제창(pay.nicepay.co.kr)에서 브라우저가 직접 POST — 출처 대신 서명으로 검증한다.
    return handleReturn(req, raw);
  }

  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return json({ ok: false, code: "ORIGIN_NOT_ALLOWED", message: "허용되지 않은 출처입니다." }, 403, origin);
  }
  return handleLookup(raw, origin);
});
