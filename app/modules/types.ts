
export type BusinessModuleType = "DOOR" | "WINDOW" | "INTERIOR" | "FURNITURE" | "SIGNAGE";

export interface RiskAnalysisResult {
    riskLevel: "OK" | "WARNING" | "DANGER";
    warnings: string[];
    surcharges: { label: string; amount: number }[];
    totalSurcharge: number;
}

export interface MarketingTemplateVars {
    [key: string]: string | number;
}

export interface BusinessModule {
    id: BusinessModuleType;
    label: string;

    // 리스크 판단 로직
    evaluateRisk: (data: any) => RiskAnalysisResult;

    // 마케팅 메시지 빌더
    buildMarketingContext: (data: any, risk: RiskAnalysisResult) => string;
}
