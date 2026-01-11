import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

type RiskSummary = {
    widthMm: number;
    heightMm: number;
    gapMm: number;
    angleDeg: number;
    riskLevel: "OK" | "WARNING" | "DANGER";
    photoRequired: boolean;
    extraMaterialRecommended: boolean;
    doorType?: string; // 선택: 3연동/원슬라이딩/파티션 등
};

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as { risk: RiskSummary; basePrice?: number };

        const risk = body.risk;
        const basePrice = Number(body.basePrice || 0);

        const sb = supabaseAdmin();

        const { data: rules, error } = await sb
            .from("pricing_rules")
            .select("rule_key,title,amount,enabled,meta")
            .eq("enabled", true);

        // If table doesn't exist or error, just proceed with caution or return error
        // For now we assume if error it might be just empty or connection issue, 
        // but code provided handles it by 500.
        if (error) {
            // Only return 500 if it's a real error, if table missing maybe we gracefully fallback?
            // The user prompt code returns 500. I'll stick to prompt.
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const getAmount = (key: string) => rules?.find(r => r.rule_key === key)?.amount ?? 0;

        // 기본 추가금 로직
        let extra = 0;
        const breakdown: Array<{ key: string; title: string; amount: number }> = [];

        if (risk.extraMaterialRecommended) {
            const amt = getAmount("EXTRA_MATERIAL_BASE");
            if (amt > 0) {
                extra += amt;
                breakdown.push({ key: "EXTRA_MATERIAL_BASE", title: "추가자재 권장", amount: amt });
            }
        }

        if (risk.photoRequired || risk.riskLevel === "DANGER") {
            const amt = getAmount("RE_MEASURE_FEE");
            if (amt > 0) {
                extra += amt;
                breakdown.push({ key: "RE_MEASURE_FEE", title: "정밀확인/재실측(옵션)", amount: amt });
            }
        }

        // 도어타입별 추가 룰(원하시면 여기 확장)
        // 예: 3연동/원슬라이딩이면 +50,000 추가
        if (risk.doorType && (risk.doorType.includes("3") || risk.doorType.includes("원슬라이딩"))) {
            // meta 룰로도 가능하지만 우선 하드코딩 예시
            const amt = 50000;
            extra += amt;
            breakdown.push({ key: "DOORTYPE_ADDON", title: "도어타입 추가자재", amount: amt });
        }

        const total = basePrice + extra;

        return NextResponse.json({
            basePrice,
            extra,
            total,
            breakdown,
        });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || "calc error" }, { status: 500 });
    }
}
