import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/app/lib/supabaseClient";

export const runtime = "nodejs";

type OnboardingBody = {
    owner_user_id: string;

    business_number: string;
    company_name: string;
    address?: string;
    email?: string;
    fax?: string;
    kakao?: string;
    logo_url?: string;
    homepage_urls?: string[];
    shopping_mall_urls?: string[];
    youtube?: string; // New
    tiktok?: string; // New
    instagram?: string; // New
    facebook?: string; // New

    owner_name: string;
    owner_job_title?: string;
    owner_phone?: string;

    measurers?: Array<{ name: string; phone?: string; note?: string }>;
    installers?: Array<{ name: string; phone?: string; note?: string }>;
};

export async function POST(req: Request) {
    const supabase = createSupabaseAdmin();

    const body = (await req.json().catch(() => null)) as OnboardingBody | null;
    if (!body) return NextResponse.json({ ok: false, error: "BAD_JSON" }, { status: 400 });

    const {
        owner_user_id,
        business_number,
        company_name,
        address,
        email,
        fax,
        kakao,
        logo_url,
        homepage_urls,
        shopping_mall_urls,
        youtube, // New
        tiktok, // New
        instagram, // New
        facebook, // New
        owner_name,
        owner_job_title,
        owner_phone,
        measurers = [],
        installers = [],
    } = body;

    if (!owner_user_id || !business_number || !company_name || !owner_name) {
        return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });
    }

    // 1) 회사 생성 (한글 컬럼명 주의: 큰따옴표)
    const { data: company, error: cErr } = await supabase
        .from('회사들')
        .insert({
            "비즈니스 번호": business_number,
            "회사명": company_name,
            "주소": address ?? null,
            "이메일": email ?? null,
            "팩스": fax ?? null,
            "카톡": kakao ?? null,
            "로고_url": logo_url ?? null,
            "홈페이지": homepage_urls ?? null,
            "쇼핑몰": shopping_mall_urls ?? null,
            "유튜브": youtube ?? null, // New
            "틱톡": tiktok ?? null, // New
            "인스타그램": instagram ?? null, // New
            "페이스북": facebook ?? null, // New
            "마스터_비밀번호": (body as any).master_password ?? "0000" // New: Default 0000 if missing
        })
        .select("id")
        .single();

    if (cErr) return NextResponse.json({ ok: false, error: cErr.message }, { status: 500 });

    // 2) OWNER 프로필 upsert
    const { error: pErr } = await supabase
        .from("프로필")
        .upsert({
            id: owner_user_id,
            company_id: company.id,
            user_name: owner_name,
            role: "OWNER",
            job_title: owner_job_title ?? null,
            phone: owner_phone ?? null,
        });

    if (pErr) return NextResponse.json({ ok: false, error: pErr.message }, { status: 500 });

    // 3) 측정자/설치기사 생성 (company_id 포함)
    if (measurers.length) {
        const rows = measurers
            .filter((m) => (m.name || "").trim().length > 0)
            .map((m) => ({
                company_id: company.id,
                name: m.name.trim(),
                phone: m.phone ?? null,
                note: m.note ?? null,
            }));
        if (rows.length) {
            const { error } = await supabase.from("측정자").insert(rows);
            if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        }
    }

    if (installers.length) {
        const rows = installers
            .filter((i) => (i.name || "").trim().length > 0)
            .map((i) => ({
                company_id: company.id,
                name: i.name.trim(),
                phone: i.phone ?? null,
                note: i.note ?? null,
            }));
        if (rows.length) {
            const { error } = await supabase.from("설치 기사").insert(rows);
            if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        }
    }

    // 4) 온보딩 완료 쿠키 세팅 (미들웨어 가드용)
    const res = NextResponse.json({ ok: true, company_id: company.id });
    res.cookies.set("onboarded", "1", { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
    res.cookies.set("company_id", company.id, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });

    // Explicitly clear 'demo' if it behaves as a separate cookie due to domain/path quirks (Safety)
    // (Note: Overwriting usually works, but this is harmless)


    return res;
}
