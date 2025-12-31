# LimsDoor SaaS Architecture: Multi-tenancy & Isolation

## 1. Overview
LimsDoor는 **"Single Codebase, Multi-Tenant"** 전략을 채택합니다.
하나의 애플리케이션 인스턴스가 여러 회사의 데이터를 처리하되, **논리적 격리(Logical Isolation)**를 통해 보안을 유지합니다.

## 2. Data Model
### Tenant (Organization)
- `saas_tenants` 테이블이 최상위 엔티티입니다.
- 모든 비즈니스 데이터(랜딩, 리드, 주문 등)는 `tenant_id` Foreign Key를 가집니다.
- **Internal Tenant**: `is_internal = true` 플래그를 가진 테넌트(LimsDoor 본사)는 모든 기능에 접근하며, 시스템 전역 모니터링 권한을 가질 수 있습니다.

### User
- `saas_users` 테이블은 사용자가 어떤 테넌트에 속해 있는지 정의합니다.
- 향후 Supabase Auth의 `app_metadata`에 `tenant_id`를 동기화하여 RLS(Row Level Security)를 적용합니다.

## 3. Feature Flags & Billing
기능 접근 제어는 **Plan-based Feature Flags**로 관리합니다.

| Feature | STARTER | PRO | ENTERPRISE | INTERNAL |
| :--- | :---: | :---: | :---: | :---: |
| Landing Builder | ✅ (1ea) | ✅ (Unlim) | ✅ | ✅ |
| PDF Assets | ✅ (3ea) | ✅ | ✅ | ✅ |
| Auto Scenarios | ❌ | ✅ | ✅ | ✅ |
| AI Insights | ❌ | ✅ | ✅ | ✅ |
| Internal Dashboard | ❌ | ❌ | ❌ | ✅ |

## 4. UI/UX Separation Strategy
### Dashboard
- **Internal**: 모든 베타 기능과 관리자 전용 메뉴(Global Stats) 노출.
- **External**: 현재 구독 중인 플랜에 해당하는 메뉴만 활성화. 상위 플랜 기능 접근 시 "Upgrade" 모달 팝업.

### Onboarding
- **Self-Serve**: 웹사이트에서 바로 가입 -> Stripe 결제 -> Tenant 생성 -> STARTER/PRO 플랜 자동 적용.
- **Sales-Led**: 영업팀이 ENTERPRISE 테넌트 수동 생성 및 커스텀 설정.

## 5. Security & Isolation
- **API Level**: 모든 API 요청은 `req` 컨텍스트에서 `tenant_id`를 식별하고, DB 쿼리에 반드시 `WHERE tenant_id = ?` 조건을 강제합니다.
- **Database Level**: Supabase RLS 정책을 통해, DB단에서 다른 테넌트의 데이터 접근을 원천 차단합니다.

## 6. Migration Plan
1. `saas_tenants` 테이블 생성 (완료)
2. 기존 데이터(Null tenant_id)를 'LimsDoor HQ' 테넌트로 마이그레이션.
3. API 미들웨어에 Tenant ID 주입 로직 추가.
4. RLS 활성화.
