export type PlanTier = "STARTER" | "PRO" | "ENTERPRISE";

export interface PlanFeature {
    label: string;
    included: boolean;
    limit?: string | number;
}

export interface SaaSPlan {
    id: PlanTier;
    name: string;
    price: string;
    description: string;
    features: PlanFeature[];
}

export const SAAS_PLANS: SaaSPlan[] = [
    {
        id: "STARTER",
        name: "STARTER",
        price: "₩39,000/월",
        description: "1인 사업자 및 소형 시공팀을 위한 필수 자동화",
        features: [
            { label: "랜딩페이지 제작", included: true, limit: "1개" },
            { label: "PDF 자료 호스팅", included: true, limit: "3개" },
            { label: "문자/카톡/당근 발송", included: true },
            { label: "기본 자동 시나리오", included: true, limit: "1종 (PDF후속)" },
            { label: "월간 성과 리포트", included: true },
            { label: "AI 인사이트", included: false },
            { label: "CRM 연동", included: false },
        ]
    },
    {
        id: "PRO",
        name: "PRO",
        price: "₩99,000/월",
        description: "지역 기반 전문 시공업체를 위한 완전 자동화",
        features: [
            { label: "랜딩페이지 제작", included: true, limit: "무제한" },
            { label: "PDF/콘텐츠 자산 관리", included: true, limit: "무제한" },
            { label: "리드 점수화 (Lead Scoring)", included: true },
            { label: "자동 시나리오 트리", included: true, limit: "무제한" },
            { label: "상담/실측/결제 연동", included: true },
            { label: "주간 AI 인사이트", included: true },
            { label: "CRM 연동", included: true },
        ]
    },
    {
        id: "ENTERPRISE",
        name: "ENTERPRISE",
        price: "문의",
        description: "프랜차이즈 및 다지점 운영을 위한 맞춤형 시스템",
        features: [
            { label: "전담 매니저 배정", included: true },
            { label: "지점별 계정 분리", included: true },
            { label: "커스텀 시나리오 설계", included: true },
            { label: "API/ERP 연동 지원", included: true },
            { label: "구축형(On-Premise) 옵션", included: true },
        ]
    }
];
