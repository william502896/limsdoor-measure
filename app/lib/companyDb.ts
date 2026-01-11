import { supabase, loadCompanySession } from "./companySession";

/** INSERT: company_id 자동 주입 */
export async function insertWithCompany<T extends Record<string, any>>(table: string, row: T) {
    const session = await loadCompanySession();
    const payload = { ...row, company_id: session.companyId };

    const { data, error } = await supabase.from(table).insert(payload).select().single();
    if (error) throw error;
    return data;
}

/** UPDATE: company_id 조건 자동 포함(실수 방지) */
export async function updateWithCompany<T extends Record<string, any>>(
    table: string,
    patch: Partial<T>,
    match: Record<string, any>
) {
    const session = await loadCompanySession();
    const { data, error } = await supabase
        .from(table)
        .update(patch)
        .match(match)
        .eq("company_id", session.companyId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/** SELECT: 내 회사 데이터만 */
export async function selectMyCompany<T = any>(table: string, columns = "*") {
    const session = await loadCompanySession();
    const { data, error } = await supabase
        .from(table)
        .select(columns)
        .eq("company_id", session.companyId)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data as T[];
}
