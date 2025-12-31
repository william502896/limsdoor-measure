import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

type SendInput = {
    to: string;
    subject: string;
    text: string;
    payload: any;
    reportDate: string; // YYYY-MM-DD
};

async function sendReportEmailMock(to: string, subject: string, text: string) {
    // ✅ 실제 발송 붙일 때 여기만 교체하세요 (Resend/SendGrid/Nodemailer 등)
    // 지금은 "성공했다고 치고" 로그만 남깁니다.
    return { ok: true as const, providerId: "MOCK" };
}

export async function sendDailyReportEmail(input: SendInput) {
    const sb = supabaseAdmin();

    try {
        const res = await sendReportEmailMock(input.to, input.subject, input.text);

        await sb.from("marketing_report_logs").insert({
            report_date: input.reportDate,
            channel: "EMAIL",
            to_target: input.to,
            subject: input.subject,
            payload: input.payload,
            status: res.ok ? "SENT" : "FAILED",
            error: res.ok ? null : "PROVIDER_FAILED",
        });

        return { ok: true };
    } catch (e: any) {
        await sb.from("marketing_report_logs").insert({
            report_date: input.reportDate,
            channel: "EMAIL",
            to_target: input.to,
            subject: input.subject,
            payload: input.payload,
            status: "FAILED",
            error: e?.message || "UNKNOWN",
        });

        return { ok: false, error: e?.message || "UNKNOWN" };
    }
}
