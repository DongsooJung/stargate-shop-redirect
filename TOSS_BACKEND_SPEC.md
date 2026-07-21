# Toss Payments backend contract

`shop.stargateedu.co.kr` is a static GitHub Pages site. All secret-key operations must run on a separate HTTPS backend, recommended at `https://pay.stargateedu.co.kr`.

## Public routes

- `GET /checkout?sku={sku}&method={domestic|internationalCard|globalWallet}&lang={ko|en}`
- `GET /payment/success`
- `GET /payment/fail`
- `GET /payment/pending`
- `GET /orders/{orderId}`

## Server routes

- `POST /api/orders` creates a server-priced order from an allow-listed SKU.
- `POST /api/payments/confirm` validates `paymentKey`, `orderId`, and `amount`, then calls Toss `POST /v1/payments/confirm`.
- `POST /api/webhooks/toss` handles payment, cancellation, deposit, and asynchronous foreign-wallet status changes.
- `POST /api/admin/payments/{paymentKey}/cancel` performs an authenticated full or partial cancellation.

## Method mapping

| UI method | Toss method | Currency | Required option |
|---|---|---|---|
| `domestic` | `CARD` or selected Korean method | `KRW` | Standard hosted checkout |
| `internationalCard` | `CARD` | `KRW` | `useInternationalCardOnly: true` |
| `globalWallet` | `FOREIGN_EASY_PAY` | `USD` | Provider plus `pendingUrl`; contract dependent |

## Environment variables

```text
TOSS_CLIENT_KEY=
TOSS_SECRET_KEY=
TOSS_MID=
SHOP_ORIGIN=https://shop.stargateedu.co.kr
PAY_ORIGIN=https://pay.stargateedu.co.kr
DATABASE_URL=
ADMIN_API_KEY=
```

Never prefix the Toss secret key with `NEXT_PUBLIC_`, expose it in HTML, commit it to GitHub, or return it from an API response.

## Required order checks

1. Accept only a known SKU; ignore any client-supplied price or product name.
2. Load KRW or explicitly configured USD pricing on the server.
3. Generate a random 6–64 character `orderId`.
4. Persist the order before opening the Toss checkout.
5. On success redirect, compare stored and returned `orderId` and `amount` before approval.
6. Use an idempotency key for all mutation requests and make webhook processing idempotent.
7. Deliver courses or eBooks only after the stored payment status is final `DONE`/`PAID`.

## Webhook behavior

- Subscribe to `PAYMENT_STATUS_CHANGED`, `CANCEL_STATUS_CHANGED`, and `DEPOSIT_CALLBACK` when virtual accounts are enabled.
- Return HTTP 200 quickly, then process slower work asynchronously.
- Treat duplicate events as normal and update an order only through valid state transitions.
- For non-PayPal foreign wallets, use the webhook result rather than the browser redirect as the final payment result.

## Deployment gate

The static checkout remains disabled while `STARGATE_PAYMENTS.toss.apiBase` is empty. After the backend is deployed and tested, set it to `https://pay.stargateedu.co.kr/` and publish the shop. Production activation also requires the applicable Toss merchant contracts for international cards and foreign wallets.
