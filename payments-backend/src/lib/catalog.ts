export type PaymentMethod = "domestic" | "internationalCard" | "globalWallet";

export type Product = {
  sku: string;
  nameKo: string;
  nameEn: string;
  amountKRW: number;
  amountUSD: number | null;
  billing: "one_time" | "subscription";
  fulfillment: "digital" | "service" | "physical";
};

const product = (sku: string, nameKo: string, nameEn: string, amountKRW: number, options: Partial<Pick<Product,"billing"|"fulfillment">> = {}): Product => ({ sku, nameKo, nameEn, amountKRW, amountUSD: null, billing:options.billing || "one_time", fulfillment:options.fulfillment || "digital" });

export const products: Record<string, Product> = Object.fromEntries([
  product("SGE-COURSE-KOI-ADV", "정보올림피아드 심화 (자료구조·알고리즘)", "Advanced Computing Olympiad", 429000),
  product("SGE-COURSE-ALGO-BUNDLE", "알고리즘 종합 패키지 (입문+심화)", "Complete Algorithms Package", 690600),
  product("SGE-COURSE-KMO-NC", "KMO 대비 정수론·조합", "KMO Number Theory & Combinatorics", 384000),
  product("SGE-COURSE-KOI-INTRO", "정보올림피아드 입문 (C++ 기초)", "Computing Olympiad Fundamentals", 297000),
  product("SGE-SUB-BANK-M", "문제은행 월 구독", "Monthly Problem Bank", 39000, { billing:"subscription" }),
  product("SGE-SUB-BANK-Y", "문제은행 연 구독", "Annual Problem Bank", 390000, { billing:"subscription" }),
  product("SGE-SUB-MOCK-M", "월간 모의고사", "Monthly Mock Exams", 49000, { billing:"subscription" }),
  product("SGE-BOOK-KOI-INTRO", "정보올림피아드 입문 교재", "Computing Olympiad Fundamentals Textbook", 28800, { fulfillment:"physical" }),
  product("SGE-BOOK-ALGO-V1", "알고리즘 문제집 상권", "Algorithms Workbook, Volume 1", 31500, { fulfillment:"physical" }),
  product("SGE-BOOK-KOI-PAST-2015-2025", "KOI 기출·해설집 (2015-2025)", "KOI Past Papers & Solutions", 37800, { fulfillment:"physical" }),
  product("SGE-EBOOK-ALGO-SET", "알고리즘 문제집 eBook 세트", "Algorithms Workbook eBook Set", 47600),
  product("SGE-BOOK-KMO-NC", "KMO 정수론·조합 워크북", "KMO Number Theory & Combinatorics Workbook", 42000),
  product("SGE-LIVE-VACATION-4W", "방학 집중 라이브특강 (4주)", "Vacation Live Intensive", 281600, { fulfillment:"service" }),
  product("SGE-LIVE-KOI-FINAL", "KOI 직전 파이널 캠프", "KOI Final Camp", 405000, { fulfillment:"service" }),
  product("SGE-CONSULT-STRATEGY-90", "입시·대회 전략 컨설팅", "Admissions & Competition Strategy Consulting", 250000, { fulfillment:"service" }),
  product("SGE-MENTOR-M4", "1:1 정기 멘토링", "Ongoing 1:1 Mentoring", 752000, { fulfillment:"service" }),
].map((item) => [item.sku, item]));

export function priceFor(product: Product, method: PaymentMethod) {
  if (method === "globalWallet") {
    if (product.amountUSD === null) throw new Error("GLOBAL_PRICE_NOT_CONFIGURED");
    return { amount: product.amountUSD, currency: "USD" as const };
  }
  return { amount: product.amountKRW, currency: "KRW" as const };
}

export function checkoutBlock(product: Product) {
  if (product.billing === "subscription") return "RECURRING_BILLING_NOT_IMPLEMENTED";
  if (product.fulfillment === "physical") return "SHIPPING_DETAILS_REQUIRED";
  return null;
}
