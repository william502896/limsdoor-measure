import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { sendCustomerSmsStatus, sendOfficeAlimtalkStatus } from "@/app/lib/notify";
import { generateTwoPdfsAndUpload } from "@/app/lib/pdfGenerate";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["PENDING", "APPROVED", "REJECTED"]);

function cleanPhone(p?: string | null) {
    return (p ?? "").replace(/[^\d]/g, "");
}

function makeKey() {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let s = "";
    for (let i = 0; i < 7; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const id = body?.id as string;
        const admin_status = body?.admin_status as string;
        const admin_note = (body?.admin_note ?? "") as string;

        if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
        if (!ALLOWED.has(admin_status)) {
            return NextResponse.json({ error: "admin_status must be PENDING|APPROVED|REJECTED" }, { status: 400 });
        }

        const sb = supabaseAdmin();

        // ✅ 1) 기존 상태 읽기
        const prev = await sb
            .from("measurements")
            .select("id, admin_status, customer_name, customer_phone, customer_address, office_phone, width_mm, height_mm, category, detail, glass, design, open_direction, mm_per_px, source, primary_image_url")
            .eq("id", id)
            .single();

        if (prev.error) return NextResponse.json({ error: prev.error.message }, { status: 500 });

        const prevStatus = prev.data.admin_status as string;

        // ✅ 2) DB 업데이트 (우선)
        const up = await sb
            .from("measurements")
            .update({
                admin_status,
                admin_note: admin_note.trim() || null,
                updated_at: new Date().toISOString(),
            } as any)
            .eq("id", id)
            .select("id, admin_status, admin_note")
            .single();

        if (up.error) return NextResponse.json({ error: up.error.message }, { status: 500 });

        // ✅ 3) 자동화 (발송)
        const sendLogs: any[] = [];
        const transitioned = prevStatus !== admin_status && (admin_status === "APPROVED" || admin_status === "REJECTED");

        if (transitioned) {
            const sizeText = `${prev.data.width_mm}×${prev.data.height_mm}mm`;
            const optionText = `${prev.data.category}/${prev.data.detail}/${prev.data.glass}/${prev.data.design}`;

            let officePdfUrl: string | null = null;
            let customerPdfUrl: string | null = null;
            let shortUrl: string | null = null;

            // 3-1) PDF 생성 (APPROVED 인 경우)
            if (admin_status === "APPROVED") {
                const pdf = await generateTwoPdfsAndUpload({
                    ...prev.data,
                    admin_note: admin_note.trim() || null,
                    admin_status,
                });

                sendLogs.push({ step: "PDF_2", ...pdf });

                if (pdf.ok) {
                    officePdfUrl = pdf.officeUrl;
                    customerPdfUrl = pdf.customerUrl;

                    // Short URL 생성
                    if (customerPdfUrl) {
                        const shortKey = makeKey();
                        await sb.from("measurements").update({ short_key: shortKey } as any).eq("id", id);
                        shortUrl = `${process.env.NEXT_PUBLIC_APP_URL}/r/${shortKey}`;
                    }
                }
            }

            const officePhone = cleanPhone(prev.data.office_phone);
            const customerPhone = cleanPhone(prev.data.customer_phone);

            // 사무실 알림톡
            if (officePhone) {
                sendLogs.push(
                    await sendOfficeAlimtalkStatus({
                        toOfficePhone: officePhone,
                        status: admin_status as any,
                        measurementId: id,
                        customerName: prev.data.customer_name ?? "",
                        customerPhone,
                        sizeText,
                        optionText,
                        primaryImageUrl: prev.data.primary_image_url ?? null,
                        adminNote: admin_note.trim() || null,
                        pdfUrl: officePdfUrl, // 사무실용 PDF 링크
                    })
                );
            }

            // 고객 SMS
            sendLogs.push(
                await sendCustomerSmsStatus({
                    toCustomerPhone: customerPhone,
                    status: admin_status as any,
                    customerName: prev.data.customer_name ?? "",
                    sizeText,
                    optionText,
                    adminNote: admin_note.trim() || null,
                    shortUrl, // 고객용 Short URL (-> Customer PDF)
                })
            );

            // 로그 저장
            await sb
                .from("measurements")
                .update({ send_logs: sendLogs } as any)
                .eq("id", id);
        }

        return NextResponse.json({ ok: true, updated: up.data, sendLogs, transitioned });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message ?? "server error" }, { status: 500 });
    }
}
