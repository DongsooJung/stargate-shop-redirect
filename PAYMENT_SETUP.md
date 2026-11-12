# 결제 연동 운영 문서

## 대표 결제 번호

- 대표 전화: 070-8027-8225
- 결제 전화: 010-5246-8224
- 표기 위치: `payment-config.js`의 `STARGATE_BUSINESS.phone`, `mobile`. 푸터와 체크아웃이 이 값을 읽는다.

## 결제 경로

- 스토어의 기존 `?sku=` 링크, PayPal Payment Link, 실물 교재 마켓플레이스 링크는 유지한다.
- 실제 PayPal URL이 등록된 SKU는 PayPal Payment Link를 우선한다.
- 결제 목록 1번 `SGE-EBOOK-KOI-25`, 3번 `SGE-COURSE-ALGO-BUNDLE`은 토스페이먼츠 경유 PayPal(`FOREIGN_EASY_PAY`, USD) 버튼을 연다.
- PayPal은 별도 USD MID다. `paypalClientKey`와 `paypalUsd`의 양수 금액이 없으면 버튼은 결제창을 열지 않고 대표 번호만 안내한다. 임의 환율로 청구하지 않는다.
- PayPal URL이 없고 `products`에 등록된 다른 단건 상품은 TossPayments 카드(KRW) 결제창을 사용한다.
- 실물 상품은 배송주소 수집 구현 전, 구독 상품은 빌링키 구현 전까지 이메일 주문을 사용한다. 해외카드·PayPal은 정기결제를 지원하지 않는다.
- Toss 클라이언트 키가 비어 있거나 SDK가 준비되지 않으면 이메일 주문으로 닫힌다. 이메일 신청만으로 청구되지 않는다.

## Toss 승인 구조

`checkout.html` → TossPayments V2 → `success.html` → Supabase Edge Function `toss-confirm`

- 승인 엔드포인트: `https://inftexpcnfinglwlrvsj.supabase.co/functions/v1/toss-confirm`
- 카드는 `KRW`, PayPal은 `USD`다. 승인 함수가 `currency: "USD"`와 `paypalUsd` 금액을 검증하기 전에는 PayPal 승인이 거절된다. 승인 전 결제창만 열린 금액은 확정 청구가 아니다.
- 브라우저는 구매자 이름·이메일·휴대폰 번호와 필수 동의를 확인한다. 국제번호는 `+`로 시작한다.
- Edge Function은 서버 카탈로그 금액 검증, 주문 원장 기록, 주문번호 멈등 처리와 Toss 최종 승인을 담당한다.
- 카드번호 등 인증정보는 결제사 화면에서만 처리한다.

## 상품 ID 매핑

운영몰은 SKU를 URL과 화면의 기준으로 사용하고, 승인 API에는 배포된 서버 카탈로그의 `productId`를 보낸다. 매핑은 `payment-config.js`에만 둔다. 이름과 금액이 모두 대응되는 배송주소 불필요 단건 상품 9종만 등록되어 있다.

가격을 변경할 때는 다음 세 곳을 함께 확인한다.

1. `catalog.js`의 운영 SKU와 금액
2. `payment-config.js`의 SKU → 서버 `productId` 매핑, PayPal SKU의 `paypalUsd`
3. Supabase `toss-confirm`의 서버 카탈로그와 금액

## 라이브 전환 차단 항목

1. Supabase Edge Function Secret `TOSS_SECRET_KEY`에 클라이언트 키와 같은 모드의 `test_sk_*` 또는 `live_sk_*`를 등록한다. PayPal USD MID 시크릿은 카드 시크릿과 섞지 않는다.
2. `payment-config.js`의 빈 `clientKey`에 대응하는 `test_ck_*` 또는 `live_ck_*`를 등록한다.
3. `paypalClientKey`에 PayPal USD MID 클라이언트 키를 넣고, `paypalUsd`의 1·3번 상품에 확정 USD 금액을 넣는다.
4. 대표 전화번호 `070-8027-8225`, 결제 전화 `010-5246-8224`는 기재됐다.
5. 테스트 키로 승인, 새로고침 멈등성, 실패 화면, 매출전표 링크와 Supabase 주문 원장을 확인한다.
6. 라이브 키 전환 후 소액 결제 1건을 승인하고 토스 관리자에서 취소한다.

## 후속 보안 강화

- 공개 브라우저 키와 CORS는 비브라우저 호출을 인증하지 않는다. 승인 함수에 IP·주문 단위 rate limit을 적용한다.
- 결제창을 열기 전에 서버가 금액과 SKU를 확인한 짧은 만료시간의 주문 nonce 또는 서명을 발급하고, 승인 함수가 이를 검증하도록 확장한다.

비밀 키와 Supabase service-role 키는 저장소나 브라우저 코드에 넣지 않는다.

## 8. PortOne(포트원) V2 — 테스트 연동 (2026-10-26)

```
checkout.html ── PortOne.requestPayment (storeId + channelKey, 테스트 채널)
      ▼
success.html?provider=portone&paymentId=…
      │  POST {paymentId, productId, customer}
      ▼
Supabase Edge Function  portone-verify
      │  ① GET https://api.portone.io/payments/{paymentId}  (PortOne V2 API Secret)
      │  ② status=PAID · currency=KRW · amount.total=SERVER_CATALOG 확인
      │  ③ 불일치·실결제(LIVE) 채널이면 즉시 자동 취소 → FAILED/CANCELED 기록
      ▼
public.shop_orders  (raw_response.provider = "portone", channelType = TEST/LIVE)

PortOne 웹훅 → 같은 함수(webhook-id 헤더) → Standard Webhooks 서명 검증 → 같은 검증 로직
```

| 값 | 위치 | 공개 여부 |
|---|---|---|
| storeId (`store-…`) | `payment-config.js` `STARGATE_PORTONE.storeId` | 공개 가능 |
| channelKey (`channel-key-…`) | `payment-config.js` | 공개 가능 |
| V2 API Secret | Edge Function Secret `PORTONE_API_SECRET` | **저장소·브라우저 금지** |
| 웹훅 시크릿 (`whsec_…`) | Edge Function Secret `PORTONE_WEBHOOK_SECRET` | **저장소·브라우저 금지** |
| 상점 ID 서버 확인용 | Edge Function Secret `PORTONE_STORE_ID` | 비밀 아님(권장) |
| 실결제 허용 스위치 | Edge Function Secret `PORTONE_ALLOW_LIVE=true` | 실결제 전환 때만 |

### 활성화 순서
1. `payment-config.js` 의 `STARGATE_PORTONE.storeId` 에 콘솔의 상점 ID 입력 → 커밋. 비어 있으면 PortOne 버튼은 열리지 않고 기존 이메일 안내가 유지된다.
2. Edge Function `portone-verify` 배포 (`supabase/functions/portone-verify/index.ts`, verify_jwt=false — 함수 내부에서 출처·서명·금액을 검증).
3. Supabase Secrets: `PORTONE_API_SECRET`, `PORTONE_STORE_ID`.
4. (권장) PortOne 콘솔 웹훅 URL: `https://inftexpcnfinglwlrvsj.supabase.co/functions/v1/portone-verify`, 버전 V2 → 발급된 시크릿을 `PORTONE_WEBHOOK_SECRET` 에 저장.
5. 테스트 카드로 결제 → `success.html` 에 "(테스트)" 표시 확인 → `shop_orders` 에서 DONE 확인.

```sql
select order_id, amount, status, method, raw_response->>'channelType' as channel, approved_at
from public.shop_orders where raw_response->>'provider' = 'portone'
order by created_at desc limit 10;
```

### 실결제 전환
- PG 심사 승인 후 실연동 채널키로 `channelKey` 교체, `mode: "live"` 로 변경.
- Secret `PORTONE_ALLOW_LIVE=true` 추가. 이 값이 없으면 서버가 LIVE 결제를 자동 취소한다.
- 가격 변경 시 `catalog.js`, `toss-confirm`, `portone-verify` 의 `SERVER_CATALOG` 를 함께 수정.

## 9. NICEPAY(나이스페이 포스타트) Server 승인 — 실결제 연동 (2026-11-12)

```
checkout.html ── AUTHNICE.requestPay (clientId, method=card, returnUrl=Edge Function)
      ▼  카드사 인증
NICEPAY 결제창 ── POST(form) ──▶ Supabase Edge Function  nicepay-approve
      │  ① signature = sha256(authToken + clientId + amount + SecretKey) 검증
      │  ② amount = SERVER_CATALOG 확인 (다르면 승인 API 미호출 → 청구 없음)
      │  ③ POST https://api.nicepay.co.kr/v1/payments/{tid}  (Basic clientKey:secretKey)
      │  ④ 승인 응답 서명·금액·주문번호 재검증, 불일치 시 즉시 전액 취소 / 응답 미수신 시 망취소
      ▼  303
success.html?provider=nicepay&orderId=…  ── POST {orderId, productId} ──▶ nicepay-approve (원장 조회)
      ▼
public.shop_orders  (raw_response.provider = "nicepay", channelType = LIVE/TEST)
```

GitHub Pages 는 POST 를 받지 못하므로 `returnUrl` 은 정적 페이지가 아니라 Edge Function 이다.

### 아임웹 연동 방식 (2026-11-12 결정)
쇼핑몰 화면은 아임웹으로 옮기고, 결제는 이 저장소의 결제 페이지에서 받는다. 아임웹에서 산 나이스페이 키는 아임웹 결제 설정에 넣을 수 없으므로(아임웹은 자체 신청만 받음) 아임웹 상품의 구매 버튼을 `checkout.html?sku=…` 로 연결한다.
- 체크아웃은 `returnUrl` 에 `site=<자기 주소>` 를 붙이고, 함수는 `RETURN_ORIGINS`(shop, pay)에 있을 때만 그 주소의 `success.html` 로 돌려보낸다.
- `shop.stargateedu.co.kr` 을 아임웹에 연결할 때는 이 저장소의 `CNAME` 을 `pay.stargateedu.co.kr` 로 바꾸고, 도메인 DNS 에 `pay` CNAME → `dongsoojung.github.io` 를 추가한다. 함수는 수정하지 않아도 된다.
- 아임웹 버튼 링크도 그때 `pay.` 주소로 바꾼다.

| 값 | 위치 | 공개 여부 |
|---|---|---|
| 클라이언트 키 (`R2_…`) | `payment-config.js` `STARGATE_NICEPAY.clientId`, 함수의 `DEFAULT_CLIENT_KEY` | 공개 가능 |
| 시크릿 키 | Edge Function Secret `NICEPAY_SECRET_KEY` | **저장소·브라우저 금지** |
| 클라이언트 키 서버 재정의 | Edge Function Secret `NICEPAY_CLIENT_KEY` (선택) | 비밀 아님 |

### 결제 경로 우선순위
PayPal Payment Link → **NICEPAY** → PortOne(테스트) → TossPayments → 이메일 주문.
`STARGATE_NICEPAY.clientId` 를 빈 문자열로 바꾸면 즉시 이전 경로로 되돌아간다(롤백).

### 활성화 순서
1. Supabase > Edge Functions > Secrets 에 `NICEPAY_SECRET_KEY` 등록. 없으면 함수는 승인 API 를 호출하지 않고 `NICEPAY_SECRET_NOT_CONFIGURED` 로 닫힌다.
2. Edge Function `nicepay-approve` 배포 (verify_jwt=false — 함수 내부에서 서명·금액을 검증).
3. 이 브랜치를 `main` 에 병합 → GitHub Pages 반영.
4. 가장 싼 상품으로 실결제 1건 → `success.html` 확인 → `shop_orders` DONE 확인 → 나이스페이 관리자에서 취소.

```sql
select order_id, amount, status, method, raw_response->>'channelType' as channel, approved_at, fail_code
from public.shop_orders where raw_response->>'provider' = 'nicepay'
order by created_at desc limit 10;
```

### 주의
- 나이스페이 관리자의 **IP보안(REST API 접근제한)** 에 IP 를 등록하지 않는다. Supabase Edge Function 은 고정 송신 IP 가 없어 등록하는 순간 승인 API 가 차단된다.
- 샌드박스 키(`S2_…`)로 시험할 때는 `checkout.html` 의 SDK 주소를 `https://sandbox-pay.nicepay.co.kr/v1/js/` 로 바꾼다. 서버는 키 접두어로 샌드박스 API 를 자동 선택한다.
- 가격 변경 시 `catalog.js`, `toss-confirm`, `portone-verify`, `nicepay-approve` 의 `SERVER_CATALOG` 를 함께 수정한다.
- 현재 결제수단은 카드(`method: "card"`)만 연다. 간편결제·계좌이체는 나이스페이 계약에 해당 수단이 열린 뒤 추가한다.
