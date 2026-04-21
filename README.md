# stargate-shop-redirect

`shop.stargateedu.co.kr` → `https://www.stargateedu.co.kr/` 정적 리다이렉트 GitHub Pages 리포.

## 구성
- `CNAME` — shop.stargateedu.co.kr
- `index.html` — meta refresh + JS `location.replace` + canonical 태그로 SEO 안전한 리다이렉트

## 배포 방법
1. GitHub 에 신규 public 리포 `DongsooJung/stargate-shop-redirect` 생성
2. 본 폴더 3개 파일 push
3. Settings → Pages → Branch: `main` / `/` 선택 → Save
4. Custom domain 에 `shop.stargateedu.co.kr` 입력 (Enforce HTTPS 체크)
5. Cafe24 DNS 관리 콘솔에서 CNAME 추가:
   - 호스트: `shop`
   - 값: `dongsoojung.github.io`
   - TTL: 600

## 검증
```bash
dig shop.stargateedu.co.kr
curl -I https://shop.stargateedu.co.kr/
# 기대: 200 OK + 즉시 location.replace 로 stargateedu.co.kr 이동
```

## 주의
- CAFE24 쇼핑몰 자체에 `shop.stargateedu.co.kr` 을 직접 연결하려면 CAFE24 다중 도메인 옵션이 필요(추가 비용). 본 리포는 무료 우회 솔루션.
- 추후 Cloudflare Workers 로 이관 시 `301 Moved Permanently` 헤더로 변경 가능 (SEO 측면 더 우수).
