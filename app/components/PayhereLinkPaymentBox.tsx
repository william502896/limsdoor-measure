
"use client";

import { useMemo, useState, useEffect } from "react";

type PayType = "DEPOSIT" | "BALANCE" | "FULL" | "MATERIAL" | "INSTALLATION";
type PayMethod = "CARD" | "CASH";

type Props = {
    estimateId: string;
    customerName?: string;
    customerPhone?: string;
    initialAmount?: number;
    installFee?: number; // NEW
    materialCost?: number; // NEW
};

export default function PayhereLinkPaymentBox({ estimateId, customerName, customerPhone, initialAmount, installFee, materialCost }: Props) {
    const [payType, setPayType] = useState<PayType>("DEPOSIT");
    const [payMethod, setPayMethod] = useState<PayMethod>("CARD");
    const [amount, setAmount] = useState<number>(0);
    const [memo, setMemo] = useState("");
    const [created, setCreated] = useState<any>(null);
    const [linkUrl, setLinkUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<string>("");

    // Sync initialAmount logic
    useEffect(() => {
        // If user explicitly selects MATERIAL or INSTALLATION, update amount based on props
        if (payType === "INSTALLATION" && installFee !== undefined) {
            setAmount(installFee);
        } else if (payType === "MATERIAL" && materialCost !== undefined) {
            setAmount(materialCost);
        } else if (payType === "FULL" && initialAmount) {
            setAmount(initialAmount);
        } else if (initialAmount && amount === 0 && payType === "DEPOSIT") {
            // Allow initial sync only effectively if "0"
            setAmount(initialAmount);
        }
    }, [payType, installFee, materialCost, initialAmount]);

    const isValidAmount = useMemo(() => Number.isFinite(amount) && amount > 0, [amount]);

    async function createPayment() {
        setLoading(true);
        setMsg("");
        try {
            const res = await fetch("/api/payments/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    estimateId,
                    customerName,
                    customerPhone,
                    payType,
                    amount,
                    memo: memo || (payType === "MATERIAL" ? "자재비(제품값)" : payType === "INSTALLATION" ? "시공비" : ""),
                    method: payMethod === "CARD" ? "PAYHERE_LINK" : "CASH",
                }),
            });
            const json = await res.json();
            if (!json.ok) throw new Error(json.error || "create failed");
            setCreated(json.payment);

            if (payMethod === "CASH") {
                setMsg("✅ 현금 기록이 생성되었습니다. (관리자 확인 가능)");
            } else {
                setMsg("✅ 결제요청이 생성되었습니다. 페이히어 앱에서 링크 발송 후 URL을 입력하세요.");
            }
        } catch (e: any) {
            setMsg(`❌ ${e?.message ?? "오류"} `);
        } finally {
            setLoading(false);
        }
    }

    async function setPaymentLink() {
        if (!created?.id) return;
        if (!/^https?:\/\//.test(linkUrl)) {
            setMsg("❌ 링크 URL이 올바르지 않습니다. https:// 로 시작해야 합니다.");
            return;
        }
        setLoading(true);
        setMsg("");
        try {
            const res = await fetch("/api/payments/set-link", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ paymentId: created.id, linkUrl }),
            });
            const json = await res.json();
            if (!json.ok) throw new Error(json.error || "set-link failed");
            setCreated(json.payment);
            setMsg("✅ 링크가 저장되었습니다.");
        } catch (e: any) {
            setMsg(`❌ ${e?.message ?? "오류"} `);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12, marginTop: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>결제 요청 (페이히어/현금)</div>

            <div style={{ display: "grid", gap: 10 }}>

                {/* Method & Type Row */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <label>
                        <span style={{ fontSize: 12, opacity: 0.7, display: 'block' }}>방식</span>
                        <select value={payMethod} onChange={(e) => setPayMethod(e.target.value as PayMethod)} style={{ fontWeight: 700, padding: 4 }}>
                            <option value="CARD">💳 카드(링크)</option>
                            <option value="CASH">💵 현금</option>
                        </select>
                    </label>

                    <label>
                        <span style={{ fontSize: 12, opacity: 0.7, display: 'block' }}>구분</span>
                        <select value={payType} onChange={(e) => setPayType(e.target.value as PayType)} style={{ padding: 4 }}>
                            <option value="DEPOSIT">예약금</option>
                            <option value="BALANCE">잔금</option>
                            <option value="FULL">전액</option>
                            <option value="MATERIAL">🏗️ 자재비 (제품)</option>
                            <option value="INSTALLATION">🔧 시공비</option>
                        </select>
                    </label>
                </div>

                {/* Amount Row */}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <label>
                        <span style={{ fontSize: 12, opacity: 0.7, display: 'block' }}>금액(원)</span>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            placeholder="0"
                            style={{ width: 140, fontWeight: 700, padding: 6, border: '1px solid #ccc', borderRadius: 4 }}
                        />
                    </label>
                    {/* Helper Text for Auto-calc */}
                    {(payType === "MATERIAL" || payType === "INSTALLATION") && amount > 0 && (
                        <span style={{ fontSize: 12, color: "blue" }}>
                            {payType === "MATERIAL" ? "* 시공비 차감됨" : "* 표준 시공비"}
                        </span>
                    )}
                </div>

                <label>
                    메모
                    <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder={payType === "MATERIAL" ? "자재비" : "직접 입력"} style={{ width: "100%", padding: 6, border: '1px solid #ccc', borderRadius: 4, marginTop: 4 }} />
                </label>

                {!created ? (
                    <button disabled={loading || !estimateId || !isValidAmount} onClick={createPayment}
                        style={{ padding: "10px 0", cursor: "pointer", backgroundColor: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 6, fontWeight: 700, marginTop: 4 }}
                    >
                        {loading ? "생성 중..." : payMethod === "CARD" ? "결제요청 생성 (링크)" : "현금 기록 생성"}
                    </button>
                ) : (
                    <div style={{ border: "1px dashed #bbb", borderRadius: 10, padding: 10, backgroundColor: "#fafafa" }}>
                        <div style={{ fontWeight: 700, color: "green" }}>{payMethod === "CARD" ? "요청 생성됨" : "기록 생성됨"}</div>
                        <div style={{ opacity: 0.75, fontSize: 13, marginBottom: 8 }}>
                            ID: {created.id.slice(0, 8)}... / <b>{created.status}</b>
                        </div>

                        {/* Link Input Section: Only for CARD */}
                        {payMethod === "CARD" && (
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <input
                                    value={linkUrl}
                                    onChange={(e) => setLinkUrl(e.target.value)}
                                    placeholder="페이히어 링크(URL) 붙여넣기"
                                    style={{ flex: 1, minWidth: 200, padding: 6, border: '1px solid #ccc', borderRadius: 4 }}
                                />
                                <button disabled={loading} onClick={setPaymentLink} style={{ padding: "6px 12px", border: "1px solid #ccc", borderRadius: 4, background: "white", fontWeight: "bold" }}>
                                    {loading ? "..." : "저장"}
                                </button>
                            </div>
                        )}

                        {created.payhere_link_url ? (
                            <div style={{ marginTop: 8 }}>
                                <a href={created.payhere_link_url} target="_blank" rel="noreferrer" style={{ textDecoration: "underline", color: "blue", fontWeight: "bold" }}>
                                    🔗 저장된 링크 열기
                                </a>
                            </div>
                        ) : null}
                    </div>
                )}

                {msg ? <div style={{ marginTop: 6, fontSize: 13, fontWeight: "bold", color: msg.startsWith("✅") ? "green" : "red" }}>{msg}</div> : null}
            </div>
        </div>
    );
}

