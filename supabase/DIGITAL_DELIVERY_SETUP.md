# 전자책 자동 전달 준비 · 2026-11-19 (연결 코드 PR)

## 현재 상태
- `nicepay-approve` 가 실결제 승인·원장 기록 후 전자책 15분 서명 링크를 발급하도록 **연결됨** (`feat/ebook-digital-delivery`).
- 다만 **기본값은 꺼짐**이다. `NICEPAY_DIGITAL_DELIVERY_ENABLED` 가 정확히 `"true"` 일 때만 `delivery.status === "ready"` 가 되고,
  그 전까지는 `{status:"pending", reason:"DELIVERY_DISABLED"}` 이라 `success.html` 은 기존 "주문번호와 함께 문의" 안내를 그대로 유지한다.
- 따라서 이 코드를 배포해도 지금의 나이스페이 실결제·PG 심사 흐름은 바뀌지 않는다.
- `shop-digital-private` 버킷과 판매용 PDF 업로드는 아직 **없다**. 버킷·파일 없이 `"true"` 로 켜면 발급은 `PRIVATE_BUCKET_REQUIRED`/`SIGNING_FAILED` 로 막히고 화면은 기존 안내로 남는다(결제 자체는 정상).
- 실제 결제, 파일 등록, 자동 이메일 발송, 운영 백엔드 배포는 아직 완료되지 않았다.

## 동작 계약
| 상황 | delivery | success.html |
|---|---|---|
| 발급 꺼짐 (기본) | `{status:"pending", reason:"DELIVERY_DISABLED"}` | 기존 문의 안내 |
| 테스트 결제 / 취소·환불 | `{status:"pending", reason:"TEST_OR_REFUNDED"}` | 테스트 결제 안내 |
| 전자책이 아닌 상품 | `{status:"pending", reason:"NOT_DIGITAL_PRODUCT"}` | 상품 유형별 기존 안내(코스·컨설팅 등) |
| 금액·통화·SKU 불일치 | `{status:"pending", reason:"ORDER_MISMATCH"}` | 기존 문의 안내 |
| 비공개 버킷 아님 / 파일 없음 / 서명 실패 | `{status:"pending", reason:"PRIVATE_BUCKET_REQUIRED" \| "SIGNING_FAILED" \| ...}` | 기존 문의 안내 |
| 실결제 · 조건 충족 | `{status:"ready", downloadUrl, expiresAt}` | "전자책 다운로드" 버튼 (15분) |

- 발급은 승인 응답을 검증하고 `public.shop_orders` 기록까지 성공한 주문에서만 호출한다. 요청 본문의 값으로 주문을 만들지 않는다.
- `status`·`lookup` 조회 응답과 리다이렉트 직후 발급은 같은 함수 `resolveDigitalDelivery` 를 쓴다. 리다이렉트 주소·로그에는 서명 URL 을 넣지 않는다(브라우저 기록·리퍼러 노출 방지). 로그에는 `digital delivery pending <orderId> <reason>` 만 남는다.
- `success.html` 은 `delivery.status==="ready"` 이고 URL 이 `https://inftexpcnfinglwlrvsj.supabase.co/storage/v1/object/sign/shop-digital-private/…&token=…` 이며 만료가 15분 이내일 때만 버튼을 그린다(기존 코드 그대로).

## 환경변수 (Edge Function Secret)
| 이름 | 기본값 | 의미 |
|---|---|---|
| `NICEPAY_DIGITAL_DELIVERY_ENABLED` | `"false"` | `"true"`(앞뒤 공백·대소문자 무시)일 때만 발급. `"1"`, `"yes"` 등은 꺼짐 |
| `NICEPAY_EBOOK_ASSET_PATH` | `"koi-guide/v1/book.pdf"` | `shop-digital-private` 버킷 안의 판매 PDF 경로 |

## 준비한 코드
- `functions/_shared/digital-delivery.mjs`
  - `digitalDeliveryConfig(env)` — 환경변수 → `{enabled, assets}` (기본 경로·꺼짐 규칙의 유일한 정의)
  - `deliveryOrderFromLedger(row, raw)` — 원장 행 + `raw_response` → 발급 주문. 근거가 약한 값은 발급을 막는 쪽으로 채운다
  - `issueDigitalDownload(...)` — 검증 후 15분 signed URL 발급 (기존)
  - `resolveDigitalDelivery(...)` — 위 셋을 묶은 Edge Function 진입점. 어떤 실패도 예외 대신 `pending` 사유로 돌려준다
- `functions/nicepay-approve/index.ts` — 승인 완료 직후 1회(로그용) + 조회 응답의 `delivery`
- `tests/digital-delivery.test.mjs` — 모의 저장소 단위 검증 18건
- 49,000 KRW / `SGE-EBOOK-KOI-25` / 환불 없음 / 테스트 결제 제외 / 비공개 버킷만 / 15분 만료

## 활성화 전 필요한 작업 (대표님/계정 소유자)
1. ~~`nicepay-approve` 에 발급 모듈 연결~~ — 이 PR
2. **`shop-digital-private` 비공개 버킷 생성 + `koi-guide/v1/book.pdf` 업로드** (ISBN 979-11-994914-3-4 판매용 최종 PDF — 『KOI 100개 핵심 알고리즘 가이드』 208쪽, 2026-11-21 교체). 새 파일을 v2 경로에 올릴 경우 `NICEPAY_EBOOK_ASSET_PATH=koi-guide/v2/book.pdf` 를 함께 등록한다. 공개 버킷이면 발급이 거부된다.
3. **`NICEPAY_DIGITAL_DELIVERY_ENABLED=true` 시크릿 등록** (`NICEPAY_EBOOK_ASSET_PATH` 는 기본값을 쓰면 생략 가능)
4. **`nicepay-approve` Edge Function 배포** (`verify_jwt=false`)
5. 가장 싼 상품 실결제 1건 → `success.html` 다운로드 버튼 확인 → 링크로 PDF 열림 확인 → 나이스페이 관리자에서 취소
6. **구매자 확인(소유권) 보완** — 지금 조회는 `orderId + productId` 만으로 응답한다. 주문번호를 아는 사람은 링크를 다시 받을 수 있다(기존 결제내역 노출과 같은 범위지만, 이제는 파일까지 나간다). 활성화 전에 체크아웃 세션 토큰 또는 구매자 이메일·휴대폰 확인을 붙이는 것을 권한다.
7. 메일 자동 발송은 여전히 없다. `delivery.emailStatus==="sent"` 를 실제로 보내는 발송기가 생길 때만 채운다.
8. 시험 파일로 실패/중복/취소/환불/만료 검증 후 실결제 전환.

## 검증
```
node --test tests/digital-delivery.test.mjs     # 18/18 통과
deno check supabase/functions/nicepay-approve/index.ts
```
모의 저장소 단위 검증이며 운영 DB·스토리지·PG 통합 검증이 아니다.
공식 API: https://supabase.com/docs/reference/javascript/storage-from-createsignedurl
