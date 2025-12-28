import { createClient } from "@supabase/supabase-js";

export function createSupabaseBrowser() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
        console.error('Supabase environment variables missing:', { url: !!url, anonKey: !!anonKey });
        throw new Error('Supabase configuration is missing. Please check your environment variables.');
    }

    return createClient(url, anonKey);
}

export function createSupabaseAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!, // 서버에서만 사용!
        { auth: { persistSession: false } }
    );
}
