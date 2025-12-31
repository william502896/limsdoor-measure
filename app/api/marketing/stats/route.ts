import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = supabaseAdmin();

        // 1. New Leads Today (created_at >= today start)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { count: newLeadsCount, error: newLeadsError } = await supabase
            .from('measurements')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', today.toISOString());

        // 2. Unanswered Leads (Status = SUBMITTED or DRAFT, maybe older than 1 hour?)
        // For simplicity, let's say all SUBMITTED (requested by consumer) are unanswered leads to act on.
        const { count: unansweredCount, error: unansweredError } = await supabase
            .from('measurements')
            .select('*', { count: 'exact', head: true })
            .in('status', ['SUBMITTED']);

        // 3. Pending Decision (Status = DONE - measured but deal not closed?)
        // Since we don't have a separate 'Contract' table linked yet, we assume 'DONE' means measurement done.
        // We might want to track if they have proceeded. For now, just count 'DONE'.
        const { count: pendingCount, error: pendingError } = await supabase
            .from('measurements')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'DONE');

        // 4. Overall Funnel Stats
        // Inflow (Total created this month?), Consulting (ASSIGNED?), Measured (DONE?), Closing (??)
        // Let's get counts for each status
        const { data: statusCounts, error: statusError } = await supabase
            .from('measurements')
            .select('status');

        if (newLeadsError || unansweredError || pendingError || statusError) {
            throw new Error("Failed to fetch stats");
        }

        // Calculate funnel numbers from statusCounts
        const funnel = {
            inflow: statusCounts?.length || 0, // Total
            consulting: statusCounts?.filter(r => r.status === 'ASSIGNED' || r.status === 'IN_PROGRESS').length || 0,
            measured: statusCounts?.filter(r => r.status === 'DONE').length || 0,
            closing: 0 // Placeholder as we don't have contract status in measurements status enum
        };

        return NextResponse.json({
            actions: {
                newLeads: newLeadsCount || 0,
                unanswered: unansweredCount || 0,
                pending: pendingCount || 0
            },
            funnel
        });

    } catch (error) {
        console.error("Marketing Stats Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
