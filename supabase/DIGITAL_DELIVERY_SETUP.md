# 전자책 자동 전달 준비 · 2026-10-26

## 현재 상태
- 토스 clientKey / paypalClientKey 비어 있음.
- 포트원 storeId 비어 있음, mode=test.
- 운영 프로젝트 inftexpcnfinglwlrvsj: 연결 계정의 관리 조회 권한 거절.
- 판매할 원본 PDF는 Library 검색에서 미확인. 미존재로 단정하지 않음.
- 실제 결제, 파일 등록, 자동 이메일 발송, 운영 백엔드 배포는 완료되지 않음.

## 준비한 코드
- functions/_shared/digital-delivery.mjs: 서버 전용 다운로드 발급 모듈.
- 비활성화 기본값. 서버에서 검증·저장한 실결제 주문만 처리.
- 30,000 KRW / SGE-EBOOK-KOI-25 / 환불 없음 검증.
- 원본 PDF의 명시적 SKU 매핑 및 private 버킷 여부 확인 후 15분 signed URL 발급.
- 테스트 결제에는 판매용 파일을 발급하지 않음.
- 메일 발송 기능은 포함하지 않음. 성공 화면은 실제 emailStatus=sent 응답이 있을 때만 발송 완료 안내.

## 활성화 전 필요한 작업
1. 계정 소유자가 운영 Supabase 프로젝트 관리 권한을 연결 계정에 복구.
2. 토스 또는 포트원 중 사용할 결제사 선택 후 해당 공개값·서버 시크릿 설정. 시크릿은 저장소/채팅에 붙여넣지 않음.
3. ISBN 979-11-993413-0-2 판매용 최종 PDF 확인, shop-digital-private 비공개 버킷에 업로드.
4. _shared 모듈을 기존 결제 검증 함수에서 import. 웹 요청의 값을 그대로 order로 넘기면 안 됨.
5. provider API로 재검증하고 DB 저장 성공·통화·금액·SKU·환불 상태 확인 후에만 providerVerified/persisted/test/refunded를 설정.
6. 검증한 bucket/path를 assets에 매핑하고 enabled=true로 활성화. 반환값을 승인 응답의 delivery에 포함.
7. 주문 재조회 시 구매자 인증과 소유권 검증이 필요함. 주문번호만으로 파일 발급하지 않음.
8. 메일은 검증된 주문 연락처, 발송 동의/거래 알림 범위, 발신 도메인 및 멱등 outbox를 갖춘 뒤 별도 연결. 현재 자동 발송 없음.
9. 시험 파일로 실패/중복/취소/환불/만료 검증, 이후 승인된 테스트 결제 흐름 검증. 실결제 전환은 PG 승인과 운영 설정 확인 후 수행.

## 검증
node --test tests/digital-delivery.test.mjs
모의 저장소를 사용한 단위 검증이며 운영 DB·스토리지·PG 통합 검증이 아님.
공식 API: https://supabase.com/docs/reference/javascript/storage-from-createsignedurl
