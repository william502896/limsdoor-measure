import { NextResponse } from "next/server";
import { supabaseServer } from "@/app/lib/supabase/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function joinClovaText(clova: any) {
    // CLOVA OCR 응답 구조에서 텍스트만 최대한 안전하게 뽑기
    // (도메인/버전에 따라 조금 다를 수 있어 방어적으로 처리)
    const images = clova?.images;
    if (!Array.isArray(images) || images.length === 0) return "";

    const fields = images[0]?.fields;
    if (Array.isArray(fields)) {
        return fields
            .map((f: any) => f?.inferText)
            .filter(Boolean)
            .join(" ");
    }

    // 혹시 문서형 응답이 다른 형태면 문자열화라도 남김
    return "";
}

async function callClovaOcrBase64(args: {
    invokeUrl: string;
    secret: string;
    base64: string;
    format: string; // jpg|png|pdf|tiff...
    name: string;
}) {
    const { invokeUrl, secret, base64, format, name } = args;

    const body = {
        version: "V2",
        requestId: crypto.randomUUID(),
        timestamp: Date.now(),
        images: [
            {
                format,
                name,
                data: base64,
            },
        ],
    };

    const res = await fetch(invokeUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-OCR-SECRET": secret,
        },
        body: JSON.stringify(body),
        cache: "no-store",
    });

    const text = await res.text();
    if (!res.ok) {
        throw new Error(`CLOVA OCR 실패: ${res.status} ${text}`);
    }
    return JSON.parse(text);
}

export async function POST(req: Request) {
    try {
        const sb = await supabaseServer();
        const { data: auth } = await sb.auth.getUser();
        if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { table, id } = await req.json().catch(() => ({}));
        if (!id || !table) return NextResponse.json({ error: "table,id required" }, { status: 400 });
        if (table !== "documents" && table !== "secret_documents") {
            return NextResponse.json({ error: "invalid table" }, { status: 400 });
        }

        // 내 회사 확인
        const { data: profile, error: pErr } = await sb
            .from("profiles")
            .select("company_id, role")
            .eq("id", auth.user.id)
            .single();

        if (pErr || !profile?.company_id) return NextResponse.json({ error: "company_id missing" }, { status: 403 });

        // 시크릿은 ADMIN만
        if (table === "secret_documents" && profile.role !== "ADMIN") {
            return NextResponse.json({ error: "Admin only" }, { status: 403 });
        }

        // 문서 row 읽기
        const { data: row, error: rErr } = await sb
            .from(table)
            .select("id, company_id, file_url, file_type, ocr_status")
            .eq("id", id)
            .single();

        if (rErr || !row) return NextResponse.json({ error: "row not found" }, { status: 404 });
        if (row.company_id !== profile.company_id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

        // 상태 변경
        await sb.from(table).update({ ocr_status: "PROCESSING" }).eq("id", id);

        const invokeUrl = process.env.CLOVA_OCR_INVOKE_URL!;
        const secret = process.env.CLOVA_OCR_SECRET!;
        if (!invokeUrl || !secret) return NextResponse.json({ error: "OCR env missing" }, { status: 500 });

        // 버킷 선택
        const bucket = table === "secret_documents" ? "company-secret" : "company-docs";

        // 스토리지 파일 다운로드 (service_role)
        const admin = supabaseAdmin();
        const { data: fileBlob, error: dErr } = await admin.storage.from(bucket).download(row.file_url);
        if (dErr || !fileBlob) throw new Error(dErr?.message || "storage download failed");

        const ab = await fileBlob.arrayBuffer();
        const buf = Buffer.from(ab);

        // 파일 타입 추정
        const ext = (row.file_type || "").toLowerCase();
        const format = ext === "jpg" || ext === "jpeg" ? "jpg" : ext === "png" ? "png" : ext === "pdf" ? "pdf" : ext === "tiff" ? "tiff" : ext;

        // base64
        const base64 = buf.toString("base64");

        // CLOVA OCR 호출
        const clova = await callClovaOcrBase64({
            invokeUrl,
            secret,
            base64,
            format: format || "jpg",
            name: row.file_url.split("/").pop() || "upload",
        });

        const extracted = joinClovaText(clova);

        // DB 저장
        const { error: uErr } = await sb
            .from(table)
            .update({
                ocr_status: "DONE",
                extracted_text: extracted,
                ocr_json: clova,
            })
            .eq("id", id);

        if (uErr) throw new Error(uErr.message);

        return NextResponse.json({ ok: true, extractedLength: extracted.length });
    } catch (e: any) {
        // 실패 시 상태 업데이트
        try {
            const body = await req.clone().json().catch(() => ({}));
            if (body?.table && body?.id) {
                const sb = await supabaseServer();
                await sb.from(body.table).update({ ocr_status: "FAILED" }).eq("id", body.id);
            }
        } catch { }
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
