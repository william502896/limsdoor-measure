export async function createLead(payload: {
    funnelId: string;
    name?: string;
    phone: string;
    region?: string;
    source?: string;
    tags?: string[];
}) {
    const res = await fetch("/api/marketing/leads/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("리드 생성 실패");
    return res.json();
}
