# Stargate Edu Shop

정보·수학 올림피아드(KOI·KMO) 전문 온라인 스쿨 랜딩페이지.

- 배포: GitHub Pages
- 커스텀 도메인: **shop.stargateedu.co.kr**
- 브랜드 컬러: 딥네이비 `#0B2A4A` / 골드 `#C9A227`

## 구조
- `index.html` — 메인 랜딩(히어로·베스트셀러·구독·교재·라이브·컨설팅)
- `catalog.js` — 상품 SKU·가격·포함 콘텐츠·강의↔교재 관계
- `payment-links.js` — 기존 PayPal 상품별 결제 링크 중앙 설정
- `payment-config.js` — Toss 공개 설정과 운영 SKU→서버 상품 ID 매핑
- `store.js` — 상품 상세·연계 콘텐츠·결제 이동 UI
- `checkout.html` — PayPal 우선·Toss V2·이메일 폴백 결제 라우팅
- `success.html` / `cancel.html` — Toss 최종 승인 및 실패 안내
- `PAYMENT_SETUP.md` — 결제 연결·출시 전 체크리스트
- `CNAME` — 커스텀 도메인 설정
- `404.html` — 오류 페이지
