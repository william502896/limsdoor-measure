import { createClient } from "@supabase/supabase-js";

export function supabaseAdmin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is required");
    if (!service) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");

    return createClient(url, service, {
        auth: { persistSession: false },
    });
}
