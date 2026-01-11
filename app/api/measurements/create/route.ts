import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type IncomingPayload = {
    customer: { name: string; phone: string; address?: string };
    measurer?: { name?: string; phone?: string };
    office?: { phone?: string; email?: string };

    options: {
        category: string;
        detail: string;
        glass: string;
        design: string;
        openDirection: string;
        oneSlidingType?: "오픈형" | "벽부형";
    };

    measurement: {
        widthMm: number;
        heightMm: number;
        mmPerPx: number;
        corners?: any;
        source: "camera" | "photo" | "manual";
        imageDataUrl?: string | null;
    };

    memo?: string;
    sendTarget: "office" | "customer" | "both";
};

function cleanPhone(p?: string) {
    return (p ?? "").replace(/[^\d]/g, "");
}

function safeInt(n: any, fallback = 0) {
    const x = Number(n);
    if (!Number.isFinite(x)) return fallback;
    return Math.round(x);
}

function safeFloat(n: any, fallback = 1) {
    const x = Number(n);
    if (!Number.isFinite(x)) return fallback;
    return x;
}

function buildStoragePath(measurementId: string, fileName: string) {
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const base = fileName.replace(/[^\w.\-]/g, "_");
    return `${measurementId}/${ts}_${base}`;
}

/** ✅ 발송은 지금은 "자리"만: 실제 연동(솔라피/알리고/알림톡/카카오) 붙이면 됩니다 */
async function sendOfficeKakaoMock(_payload: any) {
    return { ok: true, provider: "KAKAO_MOCK" };
}
async function sendCustomerSmsMock(_payload: any) {
    return { ok: true, provider: "SMS_MOCK" };
}

export async function POST(req: Request) {
    try {
        const sb = supabaseAdmin();

        // 1) FormData 받기 (json + photos[])
        const form = await req.formData();
        const jsonRaw = form.get("json");
        if (!jsonRaw || typeof jsonRaw !== "string") {
            return NextResponse.json({ error: "FormData에 json 필드가 필요합니다." }, { status: 400 });
        }

        let payload: IncomingPayload;
        try {
            payload = JSON.parse(jsonRaw);
        } catch {
            return NextResponse.json({ error: "json 파싱 실패" }, { status: 400 });
        }

        // 2) 최소 검증
        const customerName = (payload.customer?.name ?? "").trim();
        const customerPhone = cleanPhone(payload.customer?.phone);

        if (!customerName) {
            return NextResponse.json({ error: "고객명은 필수입니다." }, { status: 400 });
        }
        if (customerPhone.length < 9) {
            return NextResponse.json({ error: "고객 전화번호가 올바르지 않습니다." }, { status: 400 });
        }

        const widthMm = safeInt(payload.measurement?.widthMm, 0);
        const heightMm = safeInt(payload.measurement?.heightMm, 0);
        if (widthMm <= 0 || heightMm <= 0) {
            return NextResponse.json({ error: "가로/세로(mm)가 0보다 커야 합니다." }, { status: 400 });
        }

        // 3) measurements row insert
        const detail = payload.options?.detail ?? "미지정";
        const oneSlidingType = payload.options?.oneSlidingType;
        const fullDetail = oneSlidingType ? `${detail}(${oneSlidingType})` : detail;

        const row = {
            customer_name: customerName,
            customer_phone: customerPhone,
            customer_address: (payload.customer?.address ?? "").trim() || null,

            measurer_name: (payload.measurer?.name ?? "").trim() || null,
            measurer_phone: cleanPhone(payload.measurer?.phone) || null,

            office_phone: cleanPhone(payload.office?.phone) || null,
            office_email: (payload.office?.email ?? "").trim() || null,

            category: payload.options?.category ?? "미지정",
            detail: fullDetail,
            glass: payload.options?.glass ?? "미지정",
            design: payload.options?.design ?? "미지정",
            open_direction: payload.options?.openDirection ?? "미지정",

            width_mm: widthMm,
            height_mm: heightMm,
            mm_per_px: safeFloat(payload.measurement?.mmPerPx, 1),
            corners: payload.measurement?.corners ?? null,
            source: payload.measurement?.source ?? "photo",

            image_data_url: payload.measurement?.imageDataUrl ?? null,

            memo: (payload.memo ?? "").trim() || null,
            send_target: payload.sendTarget ?? "both",
        };

        const ins = await sb.from("measurements").insert(row).select("id").single();
        if (ins.error) {
            return NextResponse.json({ error: `DB 저장 실패: ${ins.error.message}` }, { status: 500 });
        }
        const measurementId = ins.data.id as string;

        // 4) 사진 업로드 (0~N)
        // ✅ 0) 대표 캡처(primaryCapture) 처리
        const primaryCapture = form.get("primaryCapture");
        const primaryFile = primaryCapture instanceof File ? primaryCapture : null;
        let primaryImageUrl: string | null = null;

        if (primaryFile) {
            const path = buildStoragePath(measurementId, primaryFile.name || "primary_capture.jpg");
            const up = await sb.storage.from("measurements").upload(path, primaryFile, {
                contentType: primaryFile.type || "image/jpeg",
                upsert: true,
            });

            if (!up.error) {
                const { data: pub } = sb.storage.from("measurements").getPublicUrl(path);
                primaryImageUrl = pub.publicUrl;

                await sb.from("measurements").update({ primary_image_url: primaryImageUrl }).eq("id", measurementId);

                // 대표도 photos 테이블에 기록
                await sb.from("measurement_photos").insert({
                    measurement_id: measurementId,
                    file_name: primaryFile.name,
                    mime_type: primaryFile.type,
                    size_bytes: primaryFile.size,
                    storage_path: path,
                    public_url: primaryImageUrl,
                });
            }
        }

        const files = form.getAll("photos").filter((x) => x instanceof File) as File[];

        const photoResults: Array<{ publicUrl: string; path: string; name: string }> = [];

        for (const file of files) {
            // 파일 크기 제한(필요시 조정)
            if (file.size > 15 * 1024 * 1024) continue;

            const path = buildStoragePath(measurementId, file.name);

            const up = await sb.storage.from("measurements").upload(path, file, {
                contentType: file.type || "application/octet-stream",
                upsert: false,
            });

            if (up.error) {
                // 업로드 일부 실패해도 전체를 죽이지 않음(현장 막힘 방지)
                continue;
            }

            const { data: pub } = sb.storage.from("measurements").getPublicUrl(path);
            const publicUrl = pub.publicUrl;

            photoResults.push({ publicUrl, path, name: file.name });

            // measurement_photos 기록
            await sb.from("measurement_photos").insert({
                measurement_id: measurementId,
                file_name: file.name,
                mime_type: file.type || null,
                size_bytes: file.size,
                storage_path: path,
                public_url: publicUrl,
            });
        }

        // 대표 이미지(primary_image_url) 업데이트(첫 장을 대표로) - 대표캡처가 없을 때만
        if (!primaryImageUrl && photoResults.length > 0) {
            await sb
                .from("measurements")
                .update({ primary_image_url: photoResults[0].publicUrl })
                .eq("id", measurementId);
            primaryImageUrl = photoResults[0].publicUrl;
        }

        // 5) 발송(현재는 MOCK)
        const sendTarget = payload.sendTarget ?? "both";
        const sendLogs: any[] = [];

        const sendPayload = {
            measurementId,
            customer: { ...payload.customer, phone: customerPhone },
            options: payload.options,
            measurement: { widthMm, heightMm, mmPerPx: row.mm_per_px },
            office: payload.office,
            measurer: payload.measurer,
            primaryImageUrl: primaryImageUrl ?? photoResults[0]?.publicUrl ?? null,
            memo: payload.memo ?? "",
        };

        // SOLAPI 등 연동 시 버튼 추가:
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
        const adminLink = appUrl ? `${appUrl}/admin/measurements/${measurementId}` : "";
        /*
        kakaoOptions: {
            buttons: adminLink ? [{ buttonType: "WL", buttonName: "관리자에서 열기", linkMo: adminLink, linkPc: adminLink }] : undefined
        }
        */

        if (sendTarget === "office" || sendTarget === "both") {
            sendLogs.push(await sendOfficeKakaoMock(sendPayload)); // TODO: Pass adminLink if mock supports it
        }
        if (sendTarget === "customer" || sendTarget === "both") {
            sendLogs.push(await sendCustomerSmsMock(sendPayload));
        }

        return NextResponse.json({
            ok: true,
            measurementId,
            uploadedPhotos: photoResults,
            sendLogs,
        });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message ?? "서버 오류" }, { status: 500 });
    }
}
