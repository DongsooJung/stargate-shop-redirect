/**
 * Server-only preparation. No HTTP endpoint; never accept an order from a browser.
 * Caller must load the persisted order after provider verification and refund checks.
 * Disabled until the original PDF and private bucket have been verified.
 */
export async function issueDigitalDownload({ order, storage, assets = {}, enabled = false, now = Date.now() }) {
  const blocked = (reason) => ({ status: "pending", reason });
  if (!enabled) return blocked("DELIVERY_DISABLED");
  if (!order || order.status !== "DONE" || order.providerVerified !== true || order.persisted !== true)
    return blocked("UNVERIFIED_ORDER");
  if (order.test !== false || order.refunded !== false) return blocked("TEST_OR_REFUNDED");
  const catalog = { "SGE-EBOOK-KOI-25": { productId: "koi-algorithms-guide", amount: 30000 } };
  const product = catalog[order.sku];
  if (!product) return blocked("NOT_DIGITAL_PRODUCT");
  if (order.productId !== product.productId || order.currency !== "KRW" || order.amount !== product.amount)
    return blocked("ORDER_MISMATCH");
  const asset = assets[order.sku];
  if (!asset || asset.bucket !== "shop-digital-private" || typeof asset.path !== "string" ||
      !asset.path.endsWith(".pdf") || asset.path.startsWith("/") || asset.path.includes("..") ||
      asset.path.includes("\\") || asset.path.includes("%"))
    return blocked("ASSET_NOT_CONFIGURED");
  try {
    const bucket = await storage.getBucket(asset.bucket);
    if (bucket.error || !bucket.data || bucket.data.public !== false) return blocked("PRIVATE_BUCKET_REQUIRED");
    const result = await storage.from(asset.bucket).createSignedUrl(asset.path, 900, { download: true });
    if (result.error || !result.data?.signedUrl) return blocked("SIGNING_FAILED");
    const url = new URL(result.data.signedUrl);
    if (url.origin !== "https://inftexpcnfinglwlrvsj.supabase.co" ||
        !url.pathname.startsWith("/storage/v1/object/sign/shop-digital-private/") ||
        !url.searchParams.get("token")) return blocked("INVALID_SIGNED_URL");
    return { status: "ready", downloadUrl: url.href, expiresAt: new Date(now + 900000).toISOString() };
  } catch {
    return blocked("STORAGE_UNAVAILABLE");
  }
}
