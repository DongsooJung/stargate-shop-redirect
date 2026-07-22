import { checkoutBlock, type PaymentMethod, products, priceFor } from "@/lib/catalog";

const methods: PaymentMethod[] = ["domestic", "internationalCard", "globalWallet"];

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const sku = typeof query.sku === "string" ? query.sku : "";
  const method = typeof query.method === "string" && methods.includes(query.method as PaymentMethod) ? query.method as PaymentMethod : null;
  const lang = query.lang === "en" ? "en" : "ko";
  const item = products[sku];
  if (!item || !method) return <div className="shell"><main className="panel"><h1>Invalid checkout request</h1><p>Return to the shop and select the product again.</p></main></div>;
  let price: ReturnType<typeof priceFor> | null = null;
  try { price = priceFor(item, method); } catch { price = null; }
  const name = lang === "en" ? item.nameEn : item.nameKo;
  const blocked = checkoutBlock(item);
  const eBookPilot = sku === "SGE-EBOOK-ALGO-SET";
  const testConfigured = Boolean(process.env.TOSS_SECRET_KEY?.startsWith("test_sk_") && process.env.DATABASE_URL);
  const canCheckout = Boolean(price && !blocked && eBookPilot && testConfigured);
  return <div className="shell"><div className="brand">STARGATE<b>PAY</b></div><main className="panel"><div className="kicker">Final order check</div><h1>{name}</h1>{price ? <div className="price">{new Intl.NumberFormat(lang === "en" ? "en-US" : "ko-KR", { style:"currency", currency:price.currency, maximumFractionDigits:0 }).format(price.amount)}</div> : <div className="notice">USD price has not been approved for this product. Global wallet checkout remains disabled.</div>}<h2>Payment method</h2><span className="status">{method}</span>{blocked && <div className="notice">{blocked === "SHIPPING_DETAILS_REQUIRED" ? "Shipping details must be added before physical-product checkout can be activated." : "Recurring billing must be implemented before this subscription can be activated."}</div>}{price && !blocked && !eBookPilot && <div className="notice">This test deployment accepts only the Algorithms Workbook eBook Set.</div>}{price && !blocked && eBookPilot && !testConfigured && <div className="notice">{lang === "en" ? "The eBook route is connected. Add a Toss test secret key and database to enable a sandbox payment." : "이북 테스트 경로가 연결되었습니다. 토스 테스트 시크릿 키와 데이터베이스를 설정하면 샌드박스 결제가 활성화됩니다."}</div>}{canCheckout && <form action="/api/orders" method="post"><input type="hidden" name="sku" value={sku}/><input type="hidden" name="method" value={method}/><input type="hidden" name="lang" value={lang}/>{method === "globalWallet" && <div className="method"><label>Wallet provider<select name="provider" required defaultValue="PAYPAL"><option value="PAYPAL">PayPal</option><option value="ALIPAY">Alipay</option><option value="GCASH">GCash</option><option value="TOUCHNGO">Touch &apos;n Go</option><option value="TRUEMONEY">TrueMoney</option></select></label></div>}<button className="button" type="submit">{lang === "en" ? "Open secure payment" : "안전한 결제창 열기"}</button></form>}<p className="meta">The server reloads the SKU price and creates a new order. Browser-supplied prices are ignored.</p></main></div>;
}
