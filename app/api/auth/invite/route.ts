import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export async function POST(req: Request) {
    try {
        const { code } = await req.json();
        if (!code || typeof code !== "string") {
            return NextResponse.json({ ok: false, error: "초대코드를 입력해주세요." }, { status: 400 });
        }

        const sb = supabaseAdmin();

        // 1) 유효 코드 조회
        const { data, error } = await sb
            .from("invite_codes")
            .select("*")
            .eq("code", code.trim())
            .maybeSingle();

        if (error || !data) {
            return NextResponse.json({ ok: false, error: "초대코드가 올바르지 않습니다." }, { status: 400 });
        }
        if (!data.is_active) {
            return NextResponse.json({ ok: false, error: "비활성화된 초대코드입니다." }, { status: 400 });
        }
        if (data.used_count >= data.max_uses) {
            return NextResponse.json({ ok: false, error: "초대코드 사용 횟수를 초과했습니다." }, { status: 400 });
        }

        // 2) 사용 카운트 증가 (race 대비: rpc로 하는게 최선이지만 MVP는 update로 충분)
        const { error: upErr } = await sb
            .from("invite_codes")
            .update({ used_count: data.used_count + 1 })
            .eq("id", data.id);

        if (upErr) {
            return NextResponse.json({ ok: false, error: "초대코드 처리 실패. 다시 시도해주세요." }, { status: 500 });
        }

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: false, error: "서버 오류" }, { status: 500 });
    }
}
