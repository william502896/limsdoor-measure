import { createClient } from '@/app/lib/auth';

// Simple In-Memory Cache for Flags (Server-side scope per request or pod)
// Note: In Serverless Next.js, this might not persist long but helps within a request.
// For true caching, use Redis or similar. For now, DB check is fine.

export async function getFlag(key: string, companyId?: string): Promise<boolean> {
    const supabase = await createClient();

    // 1. Check GLOBAL scope first
    const { data: globalFlag } = await supabase
        .from('feature_flags')
        .select('enabled')
        .eq('scope', 'GLOBAL')
        .eq('key', key)
        .single();

    if (globalFlag?.enabled) return true; // Blocked globally

    // 2. Check COMPANY scope if companyId provided
    if (companyId) {
        const { data: companyFlag } = await supabase
            .from('feature_flags')
            .select('enabled')
            .eq('scope', 'COMPANY')
            .eq('key', key)
            .eq('company_id', companyId)
            .single();

        if (companyFlag?.enabled) return true;
    }

    return false; // Not blocked
}

// Check fundamental kill switches
export async function checkSystemStatus(companyId?: string) {
    const isGlobalStopped = await getFlag('APP_GLOBAL_STOP');
    if (isGlobalStopped) return { blocked: true, reason: 'System Maintenance' };

    if (companyId) {
        // Check if Company logic is specifically stopped
        const isCompanyStopped = await getFlag('APP_GLOBAL_STOP', companyId);
        if (isCompanyStopped) return { blocked: true, reason: 'Company Suspended' };
    }

    return { blocked: false };
}
