/**
 * Browser-safe payment configuration. Never add a Toss secret key or a
 * Supabase service-role key to this file.
 */
window.STARGATE_TOSS = Object.freeze({
  clientKey: "",
  confirmEndpoint: "https://inftexpcnfinglwlrvsj.supabase.co/functions/v1/toss-confirm",
  supabasePublishableKey: "sb_publishable_-D0A-aWNMTMTHXeL0oqBXg_9Tz0bdvs",
  successUrl: "https://shop.stargateedu.co.kr/success.html",
  failUrl: "https://shop.stargateedu.co.kr/cancel.html",

  // Values are the product IDs used by the deployed toss-confirm server catalog.
  // Only one-time products that do not require a shipping address are enabled.
  products: Object.freeze({
    "SGE-EBOOK-KOI-25": "koi-algorithms-guide",
    "SGE-COURSE-KOI-ADV": "koi-advanced",
    "SGE-COURSE-ALGO-BUNDLE": "algorithms-bundle",
    "SGE-COURSE-KMO-NC": "kmo-number-comb",
    "SGE-COURSE-KOI-INTRO": "koi-cpp-beginner",
    "SGE-EBOOK-ALGO-SET": "algorithms-ebook-set",
    "SGE-LIVE-VACATION-4W": "vacation-live-intensive",
    "SGE-LIVE-KOI-FINAL": "koi-final-camp",
    "SGE-CONSULT-STRATEGY-90": "strategy-consulting"
  })
});

window.STARGATE_BUSINESS = Object.freeze({
  companyName: "주식회사 별의문",
  representative: "정동수",
  businessNumber: "848-86-03835",
  mailOrderNumber: "2025-서울강남-05246호",
  address: "서울 강남구 강남대로112길 47",
  phone: "",
  email: "ceo@stargateedu.co.kr",
  privacyOfficer: "정동수 (대표)",
  hostingProvider: "GitHub Pages"
});
