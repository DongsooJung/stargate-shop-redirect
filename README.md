# Stargate Edu Shop

정보·수학 올림피아드(KOI·KMO) 전문 온라인 스쿨 랜딩페이지.

- 배포: GitHub Pages
- 커스텀 도메인: **shop.stargateedu.co.kr**
- 브랜드 컬러: 딥네이비 `#0B2A4A` / 골드 `#C9A227`

## 구조
- `index.html` — 메인 랜딩(히어로·베스트셀러·구독·교재·라이브·컨설팅)
- `catalog.js` — 상품 SKU·가격·포함 콘텐츠·강의↔교재 관계
- `payment-links.js` — Toss 국내·해외 결제 API 및 PayPal 대체 링크 공개 라우팅 설정
- `store.js` — 상품 상세·연계 콘텐츠·결제 이동 UI
- `checkout.html` — 상품 검증, 약관 동의, 국내·해외 결제수단 선택 페이지
- `PAYMENT_SETUP.md` — 결제 연결·출시 전 체크리스트\n- `TOSS_BACKEND_SPEC.md` — 서버 승인·웹훅·환불 보안 계약
- `CNAME` — 커스텀 도메인 설정
- `404.html` — 오류 페이지
