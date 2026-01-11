import { BusinessModule, RiskAnalysisResult } from "../types";

export type InteriorData = {
    areaM2: number;
    ceilingHeightMm: number;
    floorSlopeMm: number;
    moistureRisk: boolean;
    workType: "도배" | "바닥" | "부분철거" | "올리모델링";
};

export const InteriorModule: BusinessModule = {
    id: "INTERIOR",
    label: "부분 인테리어 (Interior)",

    evaluateRisk: (input: InteriorData): RiskAnalysisResult => {
        const warnings: string[] = [];
        const surcharges: { label: string; amount: number }[] = [];

        let riskLevel: "OK" | "WARNING" | "DANGER" = "OK";

        // 1. 바닥 경사 (6mm 기준)
        if (input.floorSlopeMm >= 6) {
            riskLevel = "WARNING";
            surcharges.push({ label: "바닥 수평 몰탈/샌딩", amount: 100000 });
            warnings.push("바닥 경사(6mm+) -> 레벨링 필수");
        }

        // 2. 습기 위험
        if (input.moistureRisk) {
            riskLevel = "DANGER";
            surcharges.push({ label: "특수 방수 처리", amount: 150000 });
            warnings.push("습기 감지 -> 곰팡이/박리 위험 높음");
        }

        // 3. 천장고 (비용보다는 주의사항)
        if (input.ceilingHeightMm < 2300) {
            warnings.push("천장고 낮음(2.3m 미만) -> 매입등/몰딩 간섭 주의");
        }

        return {
            riskLevel,
            warnings,
            surcharges,
            totalSurcharge: surcharges.reduce((acc, curr) => acc + curr.amount, 0),
        };
    },

    buildMarketingContext: (input: InteriorData, risk: RiskAnalysisResult) => {
        return `
[인테리어 진단 결과]
- 공정: ${input.workType} (면적: ${input.areaM2}m²)
- 천장고: ${input.ceilingHeightMm}mm
- 상태: ${risk.riskLevel}
- 주요이슈: ${risk.warnings.join(", ")}
- 추가공정: ${risk.surcharges.map(s => s.label).join(", ")} (+${risk.totalSurcharge.toLocaleString()}원)

[고객 안내 멘트]
현장 확인 결과 ${input.floorSlopeMm >= 6 ? "바닥 수평" : ""} ${input.moistureRisk ? "및 습기 상태" : ""}로 인해 
${risk.riskLevel} 등급 리스크가 존재합니다.
마감 완성도를 위해 ${risk.totalSurcharge.toLocaleString()}원의 보강 공정이 필요하며, 이는 하자를 예방하기 위한 필수 조치입니다.
        `.trim();
    }
};
