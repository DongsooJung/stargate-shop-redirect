// Public checkout routing only. Never put Toss secret keys in this file.
// Keep apiBase empty in GitHub. The isolated eBook test deployment injects its preview backend at deploy time.
window.STARGATE_PAYMENTS = {
  mode: "setup",
  supportEmail: "ceo@stargateedu.co.kr",
  toss: {
    provider: "Toss Payments",
    apiBase: "",
    testSkus: ["SGE-EBOOK-ALGO-SET"],
    methods: {
      domestic: {
        enabled: true,
        currency: "KRW",
        ko: "국내 결제",
        en: "Korean payment",
        descriptionKo: "한국 발급 카드, 계좌이체, 국내 간편결제",
        descriptionEn: "Korean-issued cards, bank transfer and local wallets"
      },
      internationalCard: {
        enabled: true,
        currency: "KRW",
        ko: "해외카드 결제",
        en: "International card",
        descriptionKo: "Visa, Mastercard, JCB, UnionPay, AMEX",
        descriptionEn: "Visa, Mastercard, JCB, UnionPay and AMEX"
      },
      globalWallet: {
        enabled: true,
        currency: "USD",
        ko: "글로벌 간편결제",
        en: "Global wallet",
        descriptionKo: "PayPal, Alipay, GCash 등 (계약 활성화 후)",
        descriptionEn: "PayPal, Alipay, GCash and more (after activation)"
      }
    }
  },
  // Optional fallback links. These remain disabled until a valid HTTPS URL is entered.
  paypal: {
    provider: "PayPal",
    links: {
      "SGE-COURSE-KOI-ADV": "",
      "SGE-COURSE-ALGO-BUNDLE": "",
      "SGE-COURSE-KMO-NC": "",
      "SGE-COURSE-KOI-INTRO": "",
      "SGE-SUB-BANK-M": "",
      "SGE-SUB-BANK-Y": "",
      "SGE-SUB-MOCK-M": "",
      "SGE-BOOK-KOI-INTRO": "",
      "SGE-BOOK-ALGO-V1": "",
      "SGE-BOOK-KOI-PAST-2015-2025": "",
      "SGE-EBOOK-ALGO-SET": "",
      "SGE-BOOK-KMO-NC": "",
      "SGE-LIVE-VACATION-4W": "",
      "SGE-LIVE-KOI-FINAL": "",
      "SGE-CONSULT-STRATEGY-90": "",
      "SGE-MENTOR-M4": ""
    }
  },
  // Set explicit USD prices after the global-wallet contract is approved.
  // The server remains the source of truth and must validate every price.
  usdPrices: {}
};
