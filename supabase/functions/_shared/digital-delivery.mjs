/**
 * Server-only preparation. No HTTP endpoint; never accept an order from a browser.
 * Caller must load the persisted order after provider verification and refund checks.
 * Disabled until the original PDF and private bucket have been verified.
 */

/** 판매 파일 전용 비공개 버킷. 공개 버킷이면 발급하지 않는다. */
export const DIGITAL_BUCKET = "shop-digital-private";

/** 기본 판매 파일 경로 (비공개 버킷 기준). */
export const DEFAULT_EBOOK_ASSET_PATH = "koi-guide/v1/book.pdf";

/** 링크 유효 시간 — success.html 도 이 값(15분)을 넘는 링크는 그리지 않는다. */
export const DOWNLOAD_TTL_MS = 900_000;

const SIGNED_URL_ORIGIN = "https://inftexpcnfinglwlrvsj.supabase.co";
const SIGNED_URL_PREFIX = "/storage/v1/object/sign/shop-digital-private/";

/** SKU → 버킷·경로 매핑. 파일을 교체하면 경로만 바꾼다. */
function ebookAssets(path) {
  return { "SGE-EBOOK-KOI-25": { bucket: DIGITAL_BUCKET, path } };
}

/**
 * Edge Function 환경변수 → 발급 설정.
 *  - NICEPAY_DIGITAL_DELIVERY_ENABLED: 기본 "false". "true"(앞뒤 공백·대소문자 무시)일 때만 연다.
 *    그 밖의 값("1", "yes", "" 등)은 모두 닫힌 상태로 본다.
 *  - NICEPAY_EBOOK_ASSET_PATH: 기본 DEFAULT_EBOOK_ASSET_PATH. 비공개 버킷 안의 PDF 경로.
 */
export function digitalDeliveryConfig(env = {}) {
  const enabled = String(env.NICEPAY_DIGITAL_DELIVERY_ENABLED ?? "false").trim().toLowerCase() === "true";
  const configured = typeof env.NICEPAY_EBOOK_ASSET_PATH === "string" ? env.NICEPAY_EBOOK_ASSET_PATH.trim() : "";
  return { enabled, assets: ebookAssets(configured || DEFAULT_EBOOK_ASSET_PATH) };
}

/**
 * 승인·원장 기록이 끝난 public.shop_orders 행 + raw_response → issueDigitalDownload 의 order.
 * 근거가 확실하지 않은 값은 발급을 막는 쪽으로 채운다.
 *  - channelType 이 정확히 "LIVE" 일 때만 실결제(test=false). 그 외 기록은 테스트로 본다.
 *  - 나이스페이 승인 응답(resultCode 0000, status paid)을 남긴 행만 providerVerified.
 *  - 원장에서 읽은 행이므로 persisted=true, 상태가 DONE 이 아니면 취소·환불로 본다.
 *  - 나이스페이 승인 경로는 KRW 만 승인하므로 통화가 비어 있으면 KRW 로 본다.
 */
export function deliveryOrderFromLedger(row, raw) {
  const record = raw && typeof raw === "object" ? raw : {};
  const currency = row && typeof row.currency === "string" && row.currency ? row.currency : "KRW";
  return {
    status: row && typeof row.status === "string" ? row.status : "",
    sku: row && typeof row.sku === "string" ? row.sku : "",
    productId: row && typeof row.product_id === "string" ? row.product_id : "",
    currency,
    amount: Number(row && row.amount),
    test: record.channelType !== "LIVE",
    refunded: !row || row.status !== "DONE",
    providerVerified:
      record.provider === "nicepay" && record.resultCode === "0000" && record.nicepayStatus === "paid",
    persisted: true,
  };
}

export async function issueDigitalDownload({ order, storage, assets = {}, enabled = false, now = Date.now() }) {
  const blocked = (reason) => ({ status: "pending", reason });
  if (!enabled) return blocked("DELIVERY_DISABLED");
  if (!order || order.status !== "DONE" || order.providerVerified !== true || order.persisted !== true)
    return blocked("UNVERIFIED_ORDER");
  if (order.test !== false || order.refunded !== false) return blocked("TEST_OR_REFUNDED");
  const catalog = { "SGE-EBOOK-KOI-25": { productId: "koi-algorithms-guide", amount: 49000 } };
  const product = catalog[order.sku];
  if (!product) return blocked("NOT_DIGITAL_PRODUCT");
  if (order.productId !== product.productId || order.currency !== "KRW" || order.amount !== product.amount)
    return blocked("ORDER_MISMATCH");
  const asset = assets[order.sku];
  if (!asset || asset.bucket !== DIGITAL_BUCKET || typeof asset.path !== "string" ||
      !asset.path.endsWith(".pdf") || asset.path.startsWith("/") || asset.path.includes("..") ||
      asset.path.includes("\\") || asset.path.includes("%"))
    return blocked("ASSET_NOT_CONFIGURED");
  try {
    const bucket = await storage.getBucket(asset.bucket);
    if (bucket.error || !bucket.data || bucket.data.public !== false) return blocked("PRIVATE_BUCKET_REQUIRED");
    const result = await storage.from(asset.bucket).createSignedUrl(asset.path, 900, { download: true });
    if (result.error || !result.data?.signedUrl) return blocked("SIGNING_FAILED");
    const url = new URL(result.data.signedUrl);
    if (url.origin !== SIGNED_URL_ORIGIN ||
        !url.pathname.startsWith(SIGNED_URL_PREFIX) ||
        !url.searchParams.get("token")) return blocked("INVALID_SIGNED_URL");
    return { status: "ready", downloadUrl: url.href, expiresAt: new Date(now + DOWNLOAD_TTL_MS).toISOString() };
  } catch {
    return blocked("STORAGE_UNAVAILABLE");
  }
}

/**
 * Edge Function 이 부르는 단일 진입점: 환경변수 → 설정 → 발급 → 성공 화면이 그릴 수 있는 형식 검증.
 * 어떤 실패도 예외로 던지지 않고 pending 사유로 돌려준다(결제 완료 화면을 깨지 않기 위해).
 * 발급 링크는 여기서 만들 뿐 저장하지 않는다. 로그·리다이렉트 주소에 URL 을 남기지 않는다.
 */
export async function resolveDigitalDelivery({ order, storage, env = {}, now = Date.now() }) {
  try {
    const config = digitalDeliveryConfig(env);
    const result = await issueDigitalDownload({ order, storage, assets: config.assets, enabled: config.enabled, now });
    if (!result || result.status !== "ready") {
      return { status: "pending", reason: typeof result?.reason === "string" ? result.reason : "DELIVERY_UNAVAILABLE" };
    }
    const downloadUrl = typeof result.downloadUrl === "string" ? result.downloadUrl : "";
    const expires = Date.parse(String(result.expiresAt));
    if (!downloadUrl.startsWith("https://") || !Number.isFinite(expires) ||
        expires <= now || expires > now + DOWNLOAD_TTL_MS)
      return { status: "pending", reason: "INVALID_SIGNED_URL" };
    return { status: "ready", downloadUrl, expiresAt: new Date(expires).toISOString() };
  } catch {
    return { status: "pending", reason: "DELIVERY_UNAVAILABLE" };
  }
}
