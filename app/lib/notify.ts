import { solapiMessageService } from "@/app/lib/solapiClient";

function cleanPhone(p?: string | null) {
    return (p ?? "").replace(/[^\d]/g, "");
}

function appUrl() {
    return process.env.NEXT_PUBLIC_APP_URL || "";
}

export async function sendOfficeAlimtalkStatus(opts: {
    toOfficePhone: string;
    status: "APPROVED" | "REJECTED";
    measurementId: string;
    customerName: string;
    customerPhone: string;
    sizeText: string; // "900×2100mm"
    optionText: string; // "수동문/3연동/브론즈샤틴/디자인A"
    primaryImageUrl?: string | null;
    adminNote?: string | null;
    pdfUrl?: string | null;
}) {
    const to = cleanPhone(opts.toOfficePhone);
    const from = cleanPhone(process.env.SOLAPI_FROM);
    const pfId = process.env.SOLAPI_KAKAO_PFID;

    const templateId =
        opts.status === "APPROVED"
            ? process.env.SOLAPI_KAKAO_TEMPLATE_APPROVED
            : process.env.SOLAPI_KAKAO_TEMPLATE_REJECTED;

    if (!to) return { ok: false, provider: "SOLAPI_ALIMTALK", error: "office phone missing" };
    if (!from) return { ok: false, provider: "SOLAPI_ALIMTALK", error: "SOLAPI_FROM missing" };
    if (!pfId) return { ok: false, provider: "SOLAPI_ALIMTALK", error: "SOLAPI_KAKAO_PFID missing" };
    if (!templateId) return { ok: false, provider: "SOLAPI_ALIMTALK", error: "templateId missing" };

    const ms = solapiMessageService();

    const adminLink = appUrl() ? `${appUrl()}/admin/measurements/${opts.measurementId}` : "";

    const variables: Record<string, string> = {
        "#{MEASUREMENT_ID}": opts.measurementId,
        "#{CUSTOMER_NAME}": opts.customerName,
        "#{CUSTOMER_PHONE}": opts.customerPhone,
        "#{SIZE_MM}": opts.sizeText,
        "#{OPTIONS}": opts.optionText,
        "#{LINK}": opts.primaryImageUrl ?? "",
        "#{ADMIN_NOTE}": opts.adminNote ?? "",
        "#{PDF_URL}": opts.pdfUrl ?? "",
    };

    try {
        const result = await ms.send({
            to,
            from,
            kakaoOptions: {
                pfId,
                templateId,
                variables,
                buttons: adminLink
                    ? [
                        {
                            buttonType: "WL",
                            buttonName: "관리자에서 열기",
                            linkMo: adminLink,
                            linkPc: adminLink,
                        },
                    ]
                    : undefined,
            },
        });

        return { ok: true, provider: "SOLAPI_ALIMTALK", result };
    } catch (e: any) {
        return { ok: false, provider: "SOLAPI_ALIMTALK", error: e?.message ?? "send failed" };
    }
}

export async function sendCustomerSmsStatus(opts: {
    toCustomerPhone: string;
    status: "APPROVED" | "REJECTED";
    customerName: string;
    sizeText: string;
    optionText: string;
    adminNote?: string | null;
    shortUrl?: string | null;
}) {
    const enabled = process.env.SOLAPI_CUSTOMER_SMS === "true";
    if (!enabled) return { ok: false, provider: "SOLAPI_SMS", error: "SOLAPI_CUSTOMER_SMS disabled" };

    const to = cleanPhone(opts.toCustomerPhone);
    const from = cleanPhone(process.env.SOLAPI_FROM);
    if (!to) return { ok: false, provider: "SOLAPI_SMS", error: "customer phone missing" };
    if (!from) return { ok: false, provider: "SOLAPI_SMS", error: "SOLAPI_FROM missing" };

    const link = opts.shortUrl ? `\nPDF: ${opts.shortUrl}` : "";

    const text =
        opts.status === "APPROVED"
            ? `[림스도어] ${opts.customerName} 고객님, 실측이 확정되었습니다.\n사이즈: ${opts.sizeText}\n옵션: ${opts.optionText}${link}\n${opts.adminNote ? `메모: ${opts.adminNote}` : ""}`.trim()
            : `[림스도어] ${opts.customerName} 고객님, 실측 확인 결과 재확인이 필요합니다.\n사이즈: ${opts.sizeText}\n옵션: ${opts.optionText}\n${opts.adminNote ? `사유: ${opts.adminNote}` : "담당자가 연락드리겠습니다."}`.trim();

    try {
        const ms = solapiMessageService();
        const result = await ms.send({ to, from, text });
        return { ok: true, provider: "SOLAPI_SMS", result };
    } catch (e: any) {
        return { ok: false, provider: "SOLAPI_SMS", error: e?.message ?? "send failed" };
    }
}
