# 결제 연동 운영 문서

## 대표 결제 번호

- 대표 전화: 070-8027-8225
- 결제 전화: 010-9587-8225
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
4. 대표 전화번호 `070-8027-8225`, 결제 전화 `010-9587-8225`는 기재됐다.
5. 테스트 키로 승인, 새로고침 멈등성, 실패 화면, 매출전표 링크와 Supabase 주문 원장을 확인한다.
6. 라이브 키 전환 후 소액 결제 1건을 승인하고 토스 관리자에서 취소한다.

## 후속 보안 강화

- 공개 브라우저 키와 CORS는 비브라우저 호출을 인증하지 않는다. 승인 함수에 IP·주문 단위 rate limit을 적용한다.
- 결제창을 열기 전에 서버가 금액과 SKU를 확인한 짧은 만료시간의 주문 nonce 또는 서명을 발급하고, 승인 함수가 이를 검증하도록 확장한다.

비밀 키와 Supabase service-role 키는 저장소나 브라우저 코드에 넣지 않는다.
