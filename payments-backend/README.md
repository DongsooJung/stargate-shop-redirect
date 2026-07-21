# Stargate Payments Backend

Server-side Toss Payments gateway for `shop.stargateedu.co.kr`, intended for deployment at `pay.stargateedu.co.kr`.

## Safety model

- The browser submits only an allow-listed SKU and payment method.
- The server reloads the price from `src/lib/catalog.ts`.
- Toss secret keys are read only from server environment variables.
- Payment approval compares the stored order ID, amount, and currency.
- Webhook payloads are verified by fetching the payment from Toss before the database is updated.
- Non-PayPal foreign-wallet webhooks complete the required server-side payment confirmation.
- Duplicate webhook transmissions and payment mutations are idempotent.

## Setup

1. Provision a pooled Postgres-compatible database and run `db/migrations/001_orders.sql`.
2. Create a Vercel project with this directory as its Root Directory.
3. Add every variable in `.env.example` to Development, Preview, and Production as appropriate.
4. Keep production Toss keys limited to the Production environment.
5. Deploy and test with Toss test keys.
6. Set the static shop's `STARGATE_PAYMENTS.toss.apiBase` only after the backend passes test payments and cancellation.

Global-wallet checkout is intentionally blocked because all `amountUSD` values are `null`. Approve and enter explicit USD prices in `src/lib/catalog.ts` before activation.

Subscription SKUs are blocked until Toss billing-key issuance and recurring charge jobs are implemented. Physical-book SKUs are blocked until shipping-address collection, consent, retention, and fulfillment are implemented.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
