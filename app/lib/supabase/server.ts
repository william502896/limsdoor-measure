import { createClient } from "@supabase/supabase-js";

export function supabaseServer() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!; // 서버에서만 사용(절대 public에 노출 X)
    return createClient(url, key, { auth: { persistSession: false } });
}
