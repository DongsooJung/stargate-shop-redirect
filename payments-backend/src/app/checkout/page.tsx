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
  return <div className="shell"><div className="brand">STARGATE<b>PAY</b></div><main className="panel"><div className="kicker">Final order check</div><h1>{name}</h1>{price ? <div className="price">{new Intl.NumberFormat(lang === "en" ? "en-US" : "ko-KR", { style:"currency", currency:price.currency, maximumFractionDigits:0 }).format(price.amount)}</div> : <div className="notice">USD price has not been approved for this product. Global wallet checkout remains disabled.</div>}<h2>Payment method</h2><span className="status">{method}</span>{blocked && <div className="notice">{blocked === "SHIPPING_DETAILS_REQUIRED" ? "Shipping details must be added before physical-product checkout can be activated." : "Recurring billing must be implemented before this subscription can be activated."}</div>}{price && !blocked && <form action="/api/orders" method="post"><input type="hidden" name="sku" value={sku}/><input type="hidden" name="method" value={method}/><input type="hidden" name="lang" value={lang}/>{method === "globalWallet" && <div className="method"><label>Wallet provider<select name="provider" required defaultValue="PAYPAL"><option value="PAYPAL">PayPal</option><option value="ALIPAY">Alipay</option><option value="GCASH">GCash</option><option value="TOUCHNGO">Touch &apos;n Go</option><option value="TRUEMONEY">TrueMoney</option></select></label></div>}<button className="button" type="submit">{lang === "en" ? "Open secure payment" : "안전한 결제창 열기"}</button></form>}<p className="meta">The server reloads the SKU price and creates a new order. Browser-supplied prices are ignored.</p></main></div>;
}
