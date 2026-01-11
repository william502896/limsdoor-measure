
export type RiskSummary = {
    widthMm: number;
    heightMm: number;
    gapMm: number;
    angleDeg: number;
    riskLevel: "OK" | "WARNING" | "DANGER";
    photoRequired: boolean;
    extraMaterialRecommended: boolean;
};

export const buildCustomerMessage = (r: RiskSummary) => {
    const size = `가로 ${r.widthMm}mm × 세로 ${r.heightMm}mm 기준으로 확인되었습니다.`;
    const risk =
        r.riskLevel === "DANGER"
            ? "현장 오차가 커서 시공 전 추가 확인이 필요합니다."
            : r.riskLevel === "WARNING"
                ? "일부 오차가 있어 보완 시공을 권장드립니다."
                : "현재 상태는 안정적으로 확인되었습니다.";

    const action =
        r.photoRequired
            ? "문틀 상단과 바닥을 정면으로 한 장씩 촬영해 주시면 정확한 안내가 가능합니다."
            : r.extraMaterialRecommended
                ? "마감 완성도를 위해 보강 자재를 함께 적용하는 것이 좋습니다."
                : "이 상태로 바로 진행이 가능합니다.";

    return `${size} ${risk} ${action}`;
};

export const buildOfficeMessage = (r: RiskSummary) => {
    return [
        `사이즈: ${r.widthMm} × ${r.heightMm} mm`,
        `단차: ${r.gapMm.toFixed(1)}mm / 수직오차: ${r.angleDeg.toFixed(1)}°`,
        `리스크: ${r.riskLevel}`,
        r.photoRequired ? "📸 사진 필수" : "",
        r.extraMaterialRecommended ? "➕ 추가자재 권장" : "",
    ].filter(Boolean).join("\n");
};

export const buildSendMessage = (r: RiskSummary) => {
    if (r.photoRequired) {
        return `실측 결과 오차가 확인되어 사진 확인이 필요합니다.\n문틀 상단/바닥을 정면으로 촬영해 주세요.`;
    }
    if (r.extraMaterialRecommended) {
        return `실측 결과 일부 오차가 있어 보강 자재 적용을 권장드립니다.\n자세한 내용은 상담 시 안내드립니다.`;
    }
    return `실측 결과 기준으로 바로 진행 가능합니다.\n견적 안내 도와드리겠습니다.`;
};
