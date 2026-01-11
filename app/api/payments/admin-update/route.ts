import { NextResponse } from "next/server";
import { supabaseServer } from "@/app/lib/supabase/server";

export const dynamic = "force-dynamic";

type Action =
    | "MARK_PAID"
    | "CONFIRM"
    | "EXPIRE"
    | "CANCEL";

export async function POST(req: Request) {
    try {
        const { paymentId, action } = (await req.json()) as {
            paymentId: string;
            action: Action;
            adminName?: string;
        };

        if (!paymentId || !action) {
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        const sb = await supabaseServer();

        // 1) 로그인 확인 (서버 세션)
        const { data: auth, error: authErr } = await sb.auth.getUser();
        if (authErr || !auth?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 2) 내 profiles → company_id
        const { data: profile, error: pErr } = await sb
            .from("profiles")
            .select("company_id, role")
            .eq("id", auth.user.id)
            .single();

        if (pErr || !profile?.company_id) {
            return NextResponse.json(
                { error: "Company not linked. Complete onboarding first." },
                { status: 403 }
            );
        }

        // (선택) 관리자 권한 체크
        if (profile.role && profile.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // 3) 상태 전환 매핑
        let patch: Record<string, any> = {};
        switch (action) {
            case "MARK_PAID":
                patch = { status: "PAID_REPORTED" };
                break;
            case "CONFIRM":
                patch = { status: "CONFIRMED" };
                break;
            case "EXPIRE":
                patch = { status: "EXPIRED" };
                break;
            case "CANCEL":
                patch = { status: "CANCELED" };
                break;
            default:
                return NextResponse.json({ error: "Unknown action" }, { status: 400 });
        }

        // 4) 내 회사(company_id) 결제만 업데이트 (RLS + 이중검증)
        const { data, error: uErr } = await sb
            .from("payments")
            .update(patch)
            .eq("id", paymentId)
            .eq("company_id", profile.company_id)
            .select("id, status")
            .single();

        if (uErr) {
            return NextResponse.json({ error: uErr.message }, { status: 400 });
        }

        if (!data) {
            return NextResponse.json(
                { error: "Payment not found for this company" },
                { status: 404 }
            );
        }

        return NextResponse.json({ ok: true, id: data.id, status: data.status });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
