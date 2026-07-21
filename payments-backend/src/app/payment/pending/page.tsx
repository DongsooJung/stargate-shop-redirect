export default async function PendingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const orderId = typeof query.orderId === "string" ? query.orderId : "";
  return <div className="shell"><main className="panel"><div className="kicker">Payment pending</div><h1>최종 결제 결과를 확인하고 있습니다</h1><p>해외 간편결제 결과는 웹훅으로 확정됩니다. 결제 완료 전에는 콘텐츠가 제공되지 않습니다.</p>{orderId && <a className="button secondary" href={`/orders/${encodeURIComponent(orderId)}`}>Check order status</a>}</main></div>;
}
