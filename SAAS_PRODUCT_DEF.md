# LimsDoor SaaS Product Definition

## 1. Product Identity
**Name**: LimsDoor Marketing OS (가칭)
**Concept**: 현장 영업 자동화 플랫폼
**Slogan**: "사람이 아니라 시스템이 영업합니다"

## 2. Target Audience
- 중문 시공업체
- 인테리어 디자인 스튜디오
- 홈케어/설비 업체
- 프랜차이즈 시공 본사

## 3. Plan Structure
### STARTER (₩39,000/mo)
- **Target**: 1인 시공팀
- **Core Value**: 놓치는 고객 방지
- **Features**:
  - 랜딩페이지 1개
  - PDF 자료 3개
  - 기본 문자 발송
  - 기본 시나리오 (PDF 후속)

### PRO (₩99,000/mo) ⭐ MAIN
- **Target**: 전문 시공업체 (직원 2~5인)
- **Core Value**: 매출 증대 & 완전 자동화
- **Features**:
  - 무제한 랜딩/PDF
  - 리드 점수화 (Lead Scoring)
  - 고급 자동 시나리오 (Scenarios)
  - 상담/실측/결제 모든 단계 연동
  - AI 인사이트 리포트

### ENTERPRISE (Custom)
- **Target**: 프랜차이즈 / 대리점 운영
- **Core Value**: 통합 관리 & ERP 연동
- **Features**:
  - 지점 관리
  - 전담 매니저
  - API 연동

## 4. Onboarding Automation
1. **Industry Select**: 업종 선택 시 해당 업종의 기본 템플릿(랜딩, PDF, 문자) 로드.
2. **Auto Provisioning**: 
   - DB에 `marketing_landing_pages` 기본 레코드 생성.
   - `marketing_scenarios` 기본 활성화.
3. **Activation**: 즉시 사용 가능한 URL 발급.

## 5. Next Steps for Commercialization
- [ ] 결제 모듈 연동 (PortOne / Toss Payments)
- [ ] 사용자 계정/구독 관리 (Supabase Auth + Stripe/Billing)
- [ ] 도메인 커스텀 기능 (CName)
