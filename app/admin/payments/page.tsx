import { supabaseServer } from "@/app/lib/supabase/server";

export const dynamic = "force-dynamic";

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
    const sb = await supabaseServer();

    // 1) 로그인 유저 확인 (서버 세션)
    const { data: auth, error: authErr } = await sb.auth.getUser();
    if (authErr || !auth?.user) {
        return (
            <div style={{ padding: 16 }}>
                <h1>결제 관리</h1>
                <pre>로그인이 필요합니다. (auth 세션 없음)</pre>
            </div>
        );
    }

    // 2) 내 profiles에서 company_id 조회 (RLS: 본인 row만 허용)
    const { data: profile, error: pErr } = await sb
        .from("profiles")
        .select("company_id, role")
        .eq("id", auth.user.id)
        .single();

    if (pErr) {
        return (
            <div style={{ padding: 16 }}>
                <h1>결제 관리</h1>
                <pre>{`profiles 조회 실패: ${pErr.message}`}</pre>
            </div>
        );
    }

    if (!profile?.company_id) {
        return (
            <div style={{ padding: 16 }}>
                <h1>결제 관리</h1>
                <pre>
                    company_id가 비어 있습니다.{"\n"}
                    → 온보딩에서 회사 생성 후 profiles.company_id 연결이 먼저 필요합니다.
                </pre>
            </div>
        );
    }

    // 3) payments를 내 회사(company_id) 기준으로 조회
    const { data: rows, error: payErr } = await sb
        .from("payments")
        .select("id, estimate_id, customer_name, customer_phone, pay_type, amount, status, payhere_link_url, expire_at, created_at")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false });

    if (payErr) {
        return (
            <div style={{ padding: 16 }}>
                <h1>결제 관리</h1>
                <pre>{`payments 조회 실패: ${payErr.message}`}</pre>
            </div>
        );
    }

    const safeRows: PaymentRow[] = (rows ?? []) as any;

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
                        {safeRows.map((r) => (
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

                        {safeRows.length === 0 && (
                            <tr>
                                <td colSpan={8} style={{ padding: 20, opacity: 0.7 }}>
                                    결제요청이 없습니다. (또는 payments에 company_id가 아직 채워지지 않았습니다)
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
