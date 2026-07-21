export default async function FailPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  return <div className="shell"><main className="panel"><div className="kicker">Payment failed</div><h1>결제를 완료하지 못했습니다</h1><p className="error">{typeof query.message === "string" ? query.message : "Please try again or contact support."}</p><a className="button secondary" href={process.env.SHOP_ORIGIN || "https://shop.stargateedu.co.kr"}>Return to shop</a></main></div>;
}
