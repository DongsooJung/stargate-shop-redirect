# PayPal 상품 등록표 운영 가이드

`paypal-products.csv`와 `PayPal_Product_Registry.xlsx`는 `catalog.js`에 등록된 16개 SKU를 PayPal Business에 입력하기 위한 운영 원본이다.

## 등록 순서

1. Excel의 `PayPal 등록표` 시트에서 `등록 순서` 1번부터 차례대로 작업한다.
2. `PayPal 등록 유형`이 `일회성 결제 링크`인 12개는 Payment Links and Buttons에서 생성한다.
3. `구독 플랜`인 4개는 PayPal Subscriptions에서 상품과 고정 요금제를 생성한다.
4. 상품명, SKU, KRW 가격, 청구 주기, 배송지 수집 여부를 등록표와 동일하게 입력한다.
5. 발급된 HTTPS URL을 CSV의 `paypal_url`과 `payment-links.js`의 같은 SKU에 입력한다.
6. `node scripts/validate-paypal-registry.mjs`가 통과한 뒤 샌드박스 또는 소액 실결제로 완료·취소·환불 흐름을 확인한다.

## PayPal 입력 규칙

- 통화: 전 상품 `KRW`
- 수량: 강의·디지털 콘텐츠·서비스는 1개 고정
- 배송지: `shipping_required=yes`인 실물 교재 3개만 수집
- 구독: 무료 체험 없이 등록표의 월·연 주기로 자동 갱신
- 판매 예정: `SGE-BOOK-KMO-NC`는 제작 완료 전 URL을 비워 둔다.
- 상품 설명: `제공 방식`, `연결 콘텐츠`, `운영 메모`를 합쳐 구매자가 지급 방식과 취소 조건을 알 수 있게 작성한다.

## 링크 반영 예시

```js
"SGE-COURSE-KOI-ADV": "https://www.paypal.com/ncp/payment/발급코드"
```

URL이 비어 있거나 HTTPS가 아니면 검증이 실패하거나 상점 결제가 계속 차단된다. 결제 성공 화면만으로 LMS·eBook을 자동 지급하지 말고, PayPal 거래 조회 또는 webhook 확인 후 지급한다.

## 공개 전 확인

- PayPal Business 본인·법인 확인 및 정산 계좌 연결
- 실물 교재 배송 가능 국가, 배송비, 관부가세 부담 주체 확정
- 환불·구독 해지·노쇼·일정 변경 기준 반영
- 이용약관과 개인정보처리방침의 PayPal 처리 및 국외 이전 문구 반영
- 사업자등록번호와 통신판매업 신고번호의 실제 값 반영
