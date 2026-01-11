import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/database.types'; // Ensure this exists or use any

export async function createClient() {
    const cookieStore = await cookies();
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
            },
        }
    );
}

export async function getUserContext() {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) return null;

    const user = session.user;

    // 1. Get Profile (Superadmin?)
    const { data: profile } = await supabase
        .from('profiles')
        .select('is_superadmin, name')
        .eq('user_id', user.id)
        .single();

    const isSuperAdmin = profile?.is_superadmin ?? false;

    // 2. Get Company Membership
    // Prioritize "approved" membership
    const { data: member } = await supabase
        .from('company_members')
        .select('company_id, role, approved, companies(status, name)')
        .eq('user_id', user.id)
        .eq('approved', true) // Only approved
        .single(); // Assuming single company for MVP

    return {
        user,
        profile,
        isSuperAdmin,
        companyId: member?.company_id,
        companyName: member?.companies?.name,
        companyStatus: member?.companies?.status, // ACTIVE / SUSPENDED
        role: member?.role, // admin, measurer, ...
    };
}

export async function requireSuperAdmin() {
    const ctx = await getUserContext();
    if (!ctx?.isSuperAdmin) {
        throw new Error('Unauthorized: Superadmin only');
    }
    return ctx;
}
