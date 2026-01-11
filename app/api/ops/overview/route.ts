
import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/app/lib/authServer";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export async function GET(req: Request) {
    try {
        const { authorized, response } = await requireSuperAdmin();
        if (!authorized) return response;

        const admin = supabaseAdmin();

        // 1. Counts
        const { count: totalCompanies, error: c1 } = await admin.from('companies').select('*', { count: 'exact', head: true });
        if (c1) throw new Error(`Companies Count Error: ${c1.message}`);

        const { count: activeCompanies } = await admin.from('companies').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE');
        const { count: suspendedCompanies } = await admin.from('companies').select('*', { count: 'exact', head: true }).eq('status', 'SUSPENDED');

        // 2. Global Flag
        const { data: flag } = await admin.from('feature_flags').select('enabled').eq('key', 'APP_GLOBAL_STOP').single();

        // 3. Recent Logs
        const { data: logs, error: l1 } = await admin.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(20);
        if (l1) {
            console.error("Audit Logs Error:", l1);
        }

        return NextResponse.json({
            kpi: {
                totalCompanies: totalCompanies || 0,
                activeCompanies: activeCompanies || 0,
                suspendedCompanies: suspendedCompanies || 0,
                globalStop: flag?.enabled || false
            },
            logs: logs || []
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
    }
}
