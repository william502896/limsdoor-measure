import { SAAS_PLANS, PlanTier } from "./plans";

export type FeatureKey =
    | "LANDING_BUILDER"
    | "PDF_ASSETS"
    | "AUTOMATION_SCENARIO"
    | "AI_INSIGHTS"
    | "CRM_INTEGRATION"
    | "PAYMENT_LINK"
    | "INTERNAL_DASHBOARD"; // Internal Only

export const FEATURE_FLAGS: Record<PlanTier, FeatureKey[]> = {
    STARTER: ["LANDING_BUILDER", "PDF_ASSETS"],
    PRO: ["LANDING_BUILDER", "PDF_ASSETS", "AUTOMATION_SCENARIO", "AI_INSIGHTS", "CRM_INTEGRATION", "PAYMENT_LINK"],
    ENTERPRISE: ["LANDING_BUILDER", "PDF_ASSETS", "AUTOMATION_SCENARIO", "AI_INSIGHTS", "CRM_INTEGRATION", "PAYMENT_LINK"]
};

export function getTenantFeatures(plan: PlanTier, isInternal: boolean): FeatureKey[] {
    // 1. Base features from Plan
    let features = [...(FEATURE_FLAGS[plan] || [])];

    // 2. Internal overrides (Super Admin)
    if (isInternal) {
        features.push("INTERNAL_DASHBOARD");
        // Internal gets everything essentially
        features = [
            "LANDING_BUILDER",
            "PDF_ASSETS",
            "AUTOMATION_SCENARIO",
            "AI_INSIGHTS",
            "CRM_INTEGRATION",
            "PAYMENT_LINK",
            "INTERNAL_DASHBOARD"
        ];
    }

    return Array.from(new Set(features)); // Dedupe
}

export function hasFeature(userFeatures: FeatureKey[], required: FeatureKey): boolean {
    return userFeatures.includes(required);
}
