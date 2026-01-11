import { BusinessModule, BusinessModuleType } from "./types";
import { WindowModule } from "./window";
import { InteriorModule } from "./interior";

// Door Module Mock (기존 로직이 분산되어 있어 여기서는 껍데기만 예시로 둠 or 가져옴)
const DoorModule: BusinessModule = {
    id: "DOOR",
    label: "현관중문 (Door)",
    evaluateRisk: (data: any) => {
        // 기존 AR 페이지 로직을 옮겨올 수 있음
        // 지금은 Placeholder
        return {
            riskLevel: "OK",
            warnings: [],
            surcharges: [],
            totalSurcharge: 0
        };
    },
    buildMarketingContext: (data: any, risk: any) => "중문 기본 템플릿"
};

const FurnitureModule: BusinessModule = {
    id: "FURNITURE",
    label: "맞춤 가구 (Furniture)",
    evaluateRisk: () => ({ riskLevel: "OK", warnings: ["준비중"], surcharges: [], totalSurcharge: 0 }),
    buildMarketingContext: () => "가구 템플릿 (준비중)"
};

const SignageModule: BusinessModule = {
    id: "SIGNAGE",
    label: "간판/사인 (Signage)",
    evaluateRisk: () => ({ riskLevel: "OK", warnings: ["준비중"], surcharges: [], totalSurcharge: 0 }),
    buildMarketingContext: () => "간판 템플릿 (준비중)"
};

export const MODULE_REGISTRY: Record<BusinessModuleType, BusinessModule> = {
    "DOOR": DoorModule,
    "WINDOW": WindowModule,
    "INTERIOR": InteriorModule,
    "FURNITURE": FurnitureModule,
    "SIGNAGE": SignageModule
};

export function getModule(type: BusinessModuleType) {
    return MODULE_REGISTRY[type] || DoorModule;
}
