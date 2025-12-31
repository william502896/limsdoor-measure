# LimsDoor SaaS: System Requirement Specification (SRS)

## 1. 시스템 개요 (System Overview)
*   **시스템명**: LimsDoor – 현장 영업 자동화 SaaS
*   **목적**: 방문/시공 업종의 영업 프로세스(랜딩 → 마케팅 → 상담 → 실측 → 결제)를 End-to-End로 자동화하여 인력 의존도를 낮추고 매출 전환율을 극대화함.
*   **대상 사용자**:
    *   **SUPER ADMIN**: 플랫폼 전체 운영, 요금제 관리, 테넌트 관리.
    *   **INTERNAL ADMIN**: 림스도어 본사 관리자 (전 기능 무제한 접근).
    *   **EXTERNAL ADMIN**: SaaS 구독 외부 고객사 (요금제별 기능 제한).
    *   **STAFF**: 고객사 소속 현장/상담 직원 (할당된 권한만 수행).

## 2. 핵심 모듈 정의 (Core Modules)

### [1] 랜딩페이지 제작 모듈
*   **기능**:
    *   템플릿 기반 랜딩페이지 CRUD (생성/수정/삭제).
    *   헤더, 본문, 이미지, CTA 버튼 커스터마이징.
    *   마케팅 PDF 자산 연결 기능.
    *   고유 접속 URL 자동 생성 및 QR 코드 제공.
    *   페이지별 방문 및 전환(Click/Submit) 로그 수집.

### [2] 콘텐츠 & PDF 자산 관리
*   **기능**:
    *   마케팅용 PDF 파일 업로드 및 클라우드 스토리지(Bucket) 관리.
    *   자료 유형(카탈로그, 가격표, 시공사례 등) 분류.
    *   다운로드 횟수 추적 및 연결된 랜딩페이지 현황 표시.

### [3] 메시지 발송 모듈
*   **기능**:
    *   SMS(LMS), 카카오 알림톡, 당근마켓 연동 발송.
    *   상황별(PDF발송, 상담안내, 실측확정) 템플릿 관리.
    *   랜딩페이지 단축 URL 자동 삽입.
    *   발송 결과(성공/실패) 및 도달률 로그 저장.
    *   일일 발송량 제한 및 수신거부(Opt-out) 관리.

### [4] 리드 관리 & 점수화 (Lead Scoring)
*   **기능**:
    *   고객 행동(방문, 다운로드, 클릭, 신청) 추적 및 로깅.
    *   사전 정의된 규칙에 따른 리드 점수 자동 계산.
    *   [HOT / WARM / COLD] 등급 자동 분류.
    *   관리자 대시보드에 긴급 대응 필요 리드 최상단 노출.

### [5] 자동 시나리오 엔진 (Automation Engine)
*   **기능**:
    *   IF(조건) / THEN(실행) / WAIT(대기) 구조의 시나리오 빌더.
    *   트리거: PDF 다운로드 시, 상담 완료 시, 실측 완료 시 등.
    *   액션: 메시지 발송, 내부 알림, 상태 변경.
    *   시나리오별 ON/OFF 및 성과(실행 횟수) 모니터링.

### [6] 상담 / 실측 / 결제 연동
*   **기능**:
    *   리드 상태(접수→상담→실측→계약) 파이프라인 관리.
    *   실측 일정 캘린더 연동 및 담당자 배정.
    *   모바일 견적서 생성 및 결제 링크 발송.
    *   단계별 전환율 데이터 집계.

### [7] AI 분석 & 리포트
*   **기능**:
    *   전체 퍼널(Funnel) 데이터 분석.
    *   성과 좋은 랜딩/메시지 자동 식별 및 추천.
    *   이탈률 높은 구간 경고 알림.
    *   주간/월간 운영 성과 요약 리포트 자동 생성.

## 3. 권한 및 테넌트 구조 (Architecture)
*   **Multi-Tenancy**: `tenant_id`를 통해 논리적으로 데이터가 완벽히 격리된 구조.
*   **Feature Flags**: 요금제(Starter/Pro/Enterprise)에 따라 모듈 접근 권한 동적 제어.
*   **Data Isolation**: 모든 API 및 쿼리 레벨에서 소속 테넌트 데이터만 접근 허용 (RLS 적용).

## 4. 비기능 요구사항 (NFR)
*   **Usability**: 현장 작업자가 장갑을 끼고도 조작 가능한 직관적인 모바일 UI/UX.
*   **Performance**: 페이지 로딩 및 API 응답 2초 이내 (Edge Function 활용 권장).
*   **Reliability**: 메시지 발송 실패 시 자동 재시도(Retry) 및 대체 경로(Fallback) 지원.
*   **Scalability**: SaaS 고객 증가에 유연하게 대응 가능한 서버리스/Cloud Native 구조.

## 5. 기술 스택 가이드 (Recommendation)
*   **Frontend**: Next.js 14+ (App Router), Tailwind CSS, Lucide Icons.
*   **Backend**: Next.js API Routes (Serverless Functions).
*   **Database**: PostgreSQL (Supabase) + Supabase Auth / Storage.
*   **Infrastructure**: Vercel (Hosting, Edge Network, Cron).
*   **Automation**: Redis(Upstash) or DB-backed Queue for Async Jobs.

## 6. MVP → 확장 로드맵
*   **Phase 1 (MVP)**: 랜딩 제작 + 리드 수집 + 기본 문자 발송 (완료).
*   **Phase 2 (Automation)**: 자동 시나리오 엔진 + 리드 스코어링 + AI 리포트 (완료).
*   **Phase 3 (SaaS Expansion)**: 멀티테넌트 구조 + 결제 연동 + 외부 API 개방 (진행 중).
*   **Phase 4 (Platform)**: 업종별 특화 템플릿 마켓플레이스 + 데이터 사업화.

## 7. 성공 기준 (Success Metrics)
*   **Business**: 고객사(시공업체)의 실측 전환율 30% 이상 증가.
*   **Operational**: 단순 반복 문의 응대 시간 50% 절감.
*   **Technical**: 시스템 가동률(SLA) 99.9% 유지.
