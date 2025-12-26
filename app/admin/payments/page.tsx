import { supabaseServer } from "@/app/lib/supabase/server";

type PaymentRow = {
    id: string;
    estimate_id: string;
    customer_name: string | null;
    customer_phone: string | null;
    pay_type: string;
    amount: number;
    status: string;
    payhere_link_url: string | null;
    expire_at: string | null;
    created_at: string;
};

function formatKST(iso?: string | null) {
    if (!iso) return "-";
    const d = new Date(iso);
    // KST 표시
    return new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(d);
}

async function adminAction(paymentId: string, action: string) {
    "use server";
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/payments/admin-update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, action, adminName: "admin" }),
        cache: "no-store",
    });
}

export default async function AdminPaymentsPage() {
    const supabase = supabaseServer();
    const { data, error } = await supabase
        .from("payments")
        .select("id, estimate_id, customer_name, customer_phone, pay_type, amount, status, payhere_link_url, expire_at, created_at")
        .order("created_at", { ascending: false })
        .limit(200);

    if (error) {
        return (
            <div style={{ padding: 16 }}>
                <h1>결제 관리</h1>
                <pre>{error.message}</pre>
            </div>
        );
    }

    const rows = (data ?? []) as PaymentRow[];

    return (
        <div style={{ padding: 16 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>결제 관리(페이히어 링크결제)</h1>
            <p style={{ opacity: 0.7, marginTop: 8 }}>
                CREATED(요청생성) → LINK_SENT(링크발송) → PAID_REPORTED(결제완료 신고) → CONFIRMED(관리자확정)
            </p>

            <div style={{ marginTop: 16, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                    <thead>
                        <tr>
                            {["상태", "견적ID", "고객", "금액", "만료", "링크", "생성일", "액션"].map((h) => (
                                <th key={h} style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "10px 8px" }}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr key={r.id}>
                                <td style={{ borderBottom: "1px solid #eee", padding: "10px 8px", fontWeight: 600 }}>{r.status}</td>
                                <td style={{ borderBottom: "1px solid #eee", padding: "10px 8px" }}>{r.estimate_id}</td>
                                <td style={{ borderBottom: "1px solid #eee", padding: "10px 8px" }}>
                                    <div>{r.customer_name ?? "-"}</div>
                                    <div style={{ opacity: 0.7 }}>{r.customer_phone ?? "-"}</div>
                                </td>
                                <td style={{ borderBottom: "1px solid #eee", padding: "10px 8px" }}>
                                    <div style={{ fontWeight: 700 }}>{r.amount.toLocaleString()}원</div>
                                    <div style={{ opacity: 0.7 }}>{r.pay_type}</div>
                                </td>
                                <td style={{ borderBottom: "1px solid #eee", padding: "10px 8px" }}>{formatKST(r.expire_at)}</td>
                                <td style={{ borderBottom: "1px solid #eee", padding: "10px 8px" }}>
                                    {r.payhere_link_url ? (
                                        <a href={r.payhere_link_url} target="_blank" rel="noreferrer">
                                            링크열기
                                        </a>
                                    ) : (
                                        "-"
                                    )}
                                </td>
                                <td style={{ borderBottom: "1px solid #eee", padding: "10px 8px" }}>{formatKST(r.created_at)}</td>
                                <td style={{ borderBottom: "1px solid #eee", padding: "10px 8px", whiteSpace: "nowrap" }}>
                                    <form action={adminAction.bind(null, r.id, "MARK_PAID")} style={{ display: "inline-block", marginRight: 6 }}>
                                        <button type="submit">결제완료표시</button>
                                    </form>
                                    <form action={adminAction.bind(null, r.id, "CONFIRM")} style={{ display: "inline-block", marginRight: 6 }}>
                                        <button type="submit">관리자확정</button>
                                    </form>
                                    <form action={adminAction.bind(null, r.id, "EXPIRE")} style={{ display: "inline-block", marginRight: 6 }}>
                                        <button type="submit">만료</button>
                                    </form>
                                    <form action={adminAction.bind(null, r.id, "CANCEL")} style={{ display: "inline-block" }}>
                                        <button type="submit">취소</button>
                                    </form>
                                </td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={8} style={{ padding: 20, opacity: 0.7 }}>
                                    결제요청이 없습니다.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
