import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
    id: string;
    role: string | null;
    company_id: string | null;
    name: string | null;
    phone: string | null;
};

export type CompanySession = {
    userId: string;
    profile: Profile;
    companyId: string;
};

export async function loadCompanySession() {
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) throw authErr;
    if (!authData.user) throw new Error("로그인이 필요합니다.");

    const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("id, role, company_id, name, phone")
        .eq("id", authData.user.id)
        .single();

    if (pErr) throw pErr;
    if (!profile) throw new Error("profiles row가 없습니다. (trigger 확인 필요)");
    if (!profile.company_id) throw new Error("company_id가 비어 있습니다. 온보딩에서 회사 연결이 필요합니다.");

    return {
        userId: authData.user.id,
        profile,
        companyId: profile.company_id,
    } as CompanySession;
}
