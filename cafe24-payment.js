/* STARGATE EDU → Cafe24 쇼핑몰 결제 이동 설정 (브라우저 공개 값만 저장) */
(function () {
  "use strict";
  const settings = {
    enabled: false,  // 카페24 PG 심사·상품 공개·최종 점검 후 true
    mallOrigin: "",  // 예: https://YOUR-MALL.cafe24.com (실제 쇼핑몰 도메인)
    productUrls: {
      "SGE-DIAG-2028-MATH": "",
      "SGE-EBOOK-KOI-25": ""
    }
  };

  function productUrl(sku) {
    if (!settings.enabled || typeof sku !== "string") return null;
    const value = settings.productUrls[sku];
    if (!value || !settings.mallOrigin) return null;
    try {
      const mall = new URL(settings.mallOrigin);
      const product = new URL(value);
      // 검증된 카페24 쇼핑몰 origin만 허용. 다른 PG·광고 URL로 이동 방지.
      if (mall.protocol !== "https:" || mall.pathname !== "/" || mall.search || mall.hash) return null;
      if (product.protocol !== "https:" || product.origin !== mall.origin) return null;
      if (!/^\/product(?:\/|$)/.test(product.pathname)) return null;
      if (product.username || product.password) return null;
      return product.href;
    } catch (_) {
      return null;
    }
  }

  window.STARGATE_CAFE24 = Object.freeze({
    enabled: settings.enabled,
    productUrl
  });
})();
