# Stargate Edu Shop

정보·수학 올림피아드(KOI·KMO) 전문 온라인 스쿨 랜딩페이지.

- 배포: GitHub Pages
- 커스텀 도메인: **shop.stargateedu.co.kr**
- 브랜드 컬러: 딥네이비 `#0B2A4A` / 골드 `#C9A227`

## 구조
- `index.html` — 메인 랜딩(히어로·베스트셀러·구독·교재·라이브·컨설팅)
- `catalog.js` — 상품 SKU·가격·포함 콘텐츠·강의↔교재 관계
- `payment-links.js` — PayPal 상품별 결제 링크 중앙 설정
- `store.js` — 상품 상세·연계 콘텐츠·결제 이동 UI
- `checkout.html` — 상품 검증 및 글로벌 결제 연결 페이지
- `PAYMENT_SETUP.md` — 결제 연결·출시 전 체크리스트
- `paypal-products.csv` — 16개 PayPal 상품 등록·URL 관리 원본
- `PayPal_Product_Registry.xlsx` — 운영자가 바로 입력할 수 있는 등록 순서표
- `PAYPAL_PRODUCT_REGISTRY.md` — 일회성 결제·구독 플랜 등록 절차
- `scripts/validate-paypal-registry.mjs` — 카탈로그·가격·링크 정합성 검사
- `CNAME` — 커스텀 도메인 설정
- `404.html` — 오류 페이지

## PayPal 등록표 검증

```bash
node scripts/validate-paypal-registry.mjs
```
