import { supabaseServer } from "@/app/lib/supabase/server";
import MarketingClientViewer from "./client-view";

export const dynamic = "force-dynamic";

export default async function MarketingResultsPage() {
    const sb = await supabaseServer();
    const { data: auth } = await sb.auth.getUser();

    if (!auth?.user) {
        return <div style={{ padding: 20 }}>로그인이 필요합니다.</div>;
    }

    // RLS applied automatically
    const { data: rows, error } = await sb
        .from("marketing_runs")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        return (
            <div style={{ padding: 20 }}>
                <h3>Error Loading Results</h3>
                <pre>{error.message}</pre>
                <p>혹시 supabase_marketing_migration.sql을 실행하셨나요?</p>
            </div>
        );
    }

    return (
        <div style={{ padding: 20, maxWidth: 1400, margin: "0 auto", fontFamily: "sans-serif" }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20 }}>📊 마케팅 전략 리포트</h1>
            <MarketingClientViewer runs={rows || []} />
        </div>
    );
}
