export default function Home() {
  const configured = Boolean(process.env.TOSS_SECRET_KEY && process.env.DATABASE_URL);
  return (
    <div className="shell">
      <div className="brand">STARGATE<b>PAY</b></div>
      <main className="panel">
        <div className="kicker">Payment gateway</div>
        <h1>Stargate secure payment service</h1>
        <p>This host creates server-priced orders, approves Toss Payments transactions, and receives payment webhooks.</p>
        <h2>Deployment status</h2>
        <span className={`status ${configured ? "ok" : ""}`}>{configured ? "Configured" : "Setup required"}</span>
        {!configured && <div className="notice">Add the required Vercel environment variables and run the database migration before enabling checkout on the shop.</div>}
        <p className="meta">No secret keys or payment credentials are exposed by this page.</p>
      </main>
    </div>
  );
}
