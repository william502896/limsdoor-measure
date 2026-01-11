import { BusinessModule, RiskAnalysisResult } from "../types";

// 창호 전용 입력 데이터 타입
export type WindowData = {
    widthMm: number;
    heightMm: number;
    wallFlatnessMm: number;   // 벽면 평탄도
    sillLevelMm: number;      // 하부 수평 오차
    glassType: "복층" | "삼중" | "로이";
    frameType: "PVC" | "알루미늄";
    openingType: "미서기" | "여닫이" | "프로젝트창";
    isLarge?: boolean; // Optional derived
};

export const WindowModule: BusinessModule = {
    id: "WINDOW",
    label: "창호/샷시 (Window)",

    evaluateRisk: (input: WindowData): RiskAnalysisResult => {
        const warnings: string[] = [];
        const surcharges: { label: string; amount: number }[] = [];

        let riskLevel: "OK" | "WARNING" | "DANGER" = "OK";

        // 1. 벽면 평탄도 (7mm 기준)
        if (input.wallFlatnessMm >= 7) {
            riskLevel = "WARNING";
            surcharges.push({ label: "벽면 보강 작업 (폼 과다)", amount: 50000 });
            warnings.push("벽면 평탄도 오차(7mm+) -> 보강 프레임 필요");
        }

        // 2. 하부 수평 (5mm 기준)
        if (input.sillLevelMm >= 5) {
            riskLevel = "DANGER"; // 더 위험함
            surcharges.push({ label: "하부 수평 미장/고임", amount: 70000 });
            warnings.push("하부 수평 불량(5mm+) -> 단열 성능 저하 위험");
        }

        // 3. 대형 삼중유리
        if (input.glassType === "삼중" && input.widthMm > 1800) {
            surcharges.push({ label: "대형 삼중유리 특수시공", amount: 80000 });
            warnings.push("대형 삼중유리 -> 설치 난이도 증가");
        }

        return {
            riskLevel,
            warnings,
            surcharges,
            totalSurcharge: surcharges.reduce((acc, curr) => acc + curr.amount, 0),
        };
    },

    buildMarketingContext: (input: WindowData, risk: RiskAnalysisResult) => {
        return `
[창호(샷시) 진단 결과]
- 규격: ${input.widthMm} x ${input.heightMm} mm
- 옵션: ${input.glassType} / ${input.frameType}
- 상태: ${risk.riskLevel}
- 주요이슈: ${risk.warnings.join(", ")}
- 추가공정: ${risk.surcharges.map(s => s.label).join(", ")} (+${risk.totalSurcharge.toLocaleString()}원)

[고객 안내 멘트]
현재 창호 개구부는 가로 ${input.widthMm}mm × 세로 ${input.heightMm}mm 기준이며,
${input.wallFlatnessMm >= 7 ? "벽면 오차" : ""} ${input.sillLevelMm >= 5 ? "및 하부 수평 오차" : ""}로 인해 ${risk.riskLevel} 구간으로 판단됩니다.
단열 성능 확보를 위해 보강 시공이 필요하며, 추가 비용 ${risk.totalSurcharge.toLocaleString()}원이 예상됩니다.
        `.trim();
    }
};
