import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function won(n?: number) {
    const v = Number(n ?? 0);
    return v.toLocaleString() + "원";
}

export default async function MeasurementDetailPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const sb = supabaseAdmin();

    const { data: m, error } = await sb
        .from("measurements")
        .select("*")
        .eq("id", params.id)
        .single();

    if (error || !m) {
        return <div className="p-6 text-red-500">불러오기 실패: {error?.message}</div>;
    }

    const o = m.options_json ?? {};
    const p = m.pricing_json ?? {};
    const x = m.extras_json ?? {};

    // ✅ 표기용(없으면 JSON에서 꺼냄)
    const customerName = m.customer_name ?? o?.customer?.name ?? "";
    const customerPhone = m.customer_phone ?? o?.customer?.phone ?? "";
    const customerAddress = m.customer_address ?? o?.customer?.address ?? "";
    // ✅ 한글 변환 맵
    const MAP: Record<string, string> = {
        "3T MANUAL": "3연동",
        "ONE_SLIDE_MANUAL": "원슬라이딩",
        "SWING": "스윙도어",
        "LEFT_TO_RIGHT": "좌 → 우",
        "RIGHT_TO_LEFT": "우 → 좌",
        "FLUORO": "불소도장",
        "ANODIZING": "아노다이징",
        "WHITE": "화이트",
        "BLACK": "블랙",
        "CHAMPAGNE_GOLD": "샴페인골드",
        "CLEAR": "투명",
        "MIST": "미스트",
        "AQUA": "아쿠아",
        "BRONZE": "브론즈",
    };
    const t = (v: string) => MAP[v] ?? v;

    const safeStr = (v: any) => (typeof v === "object" && v !== null ? JSON.stringify(v) : (v ?? ""));

    // ✅ Glass Design JSON → 한국어 변환
    function parseGlassDesign(gd: any): string {
        if (!gd || typeof gd !== "object") return "-";
        const parts: string[] = [];
        if (gd.archBasic) parts.push("아치형");
        if (gd.archCorner) parts.push("모서리 아치");
        if (gd.bottomPanel) parts.push("하부고시");
        if (gd.bigArchVertical) parts.push("세로 큰아치");
        if (gd.muntinSet2LinesCount > 0) parts.push(`간살 2줄세트 ${gd.muntinSet2LinesCount}개`);
        if (gd.muntinExtraBarCount > 0) parts.push(`추가 간살 ${gd.muntinExtraBarCount}줄`);
        return parts.length > 0 ? parts.join(", ") : "기본(옵션 없음)";
    }

    // 문종 / 상세 (JSON 파싱 시도)
    const doorTypeRaw = safeStr(m.door_type ?? o?.doorType);
    let doorDetailRaw = m.door_detail ?? o?.doorDetail;
    let doorDetailTxt = "";

    // doorDetail이 객체면 .detail이나 .type을 한글로 보여주기 시도
    if (typeof doorDetailRaw === "object" && doorDetailRaw !== null) {
        if (doorDetailRaw.detail) doorDetailTxt = doorDetailRaw.detail;
        else if (doorDetailRaw.type) doorDetailTxt = t(doorDetailRaw.type);
        else doorDetailTxt = JSON.stringify(doorDetailRaw);
    } else {
        // 문자열이지만 JSON일 수도 있음
        try {
            if (typeof doorDetailRaw === 'string' && doorDetailRaw.startsWith('{')) {
                const parsed = JSON.parse(doorDetailRaw);
                doorDetailTxt = parsed.detail || t(parsed.type) || doorDetailRaw;
            } else {
                doorDetailTxt = t(doorDetailRaw ?? "");
            }
        } catch {
            doorDetailTxt = t(doorDetailRaw ?? "");
        }
    }

    const doorType = t(doorTypeRaw);
    const design = safeStr(o?.design ?? o?.doorDesign);
    const openDirection = t(safeStr(o?.openDirection));
    const width = m.width_mm ?? o?.widthMm ?? 0;
    const height = m.height_mm ?? o?.heightMm ?? 0;

    const finish = t(safeStr(o?.frameFinish));   // 불소도장/아노다이징
    const color = t(safeStr(o?.frameColor));     // 화이트/블랙/샴페인골드 등

    const glassType = t(safeStr(o?.glassType));
    const glassDesign = safeStr(o?.glassDesign);
    const muntinQty = Number(o?.muntinQty ?? 0); // ✅ 간살 수량(요구하신 것)

    const measureDate = m.created_at ? new Date(m.created_at).toLocaleString("ko-KR") : "-";
    // ✅ DB install_date/install_time 우선, 없으면 options에서
    const installDate = m.install_date ?? o?.installDate ?? o?.requestDate ?? "-";
    const installTime = m.install_time ?? o?.installTime ?? o?.requestTime ?? "-";

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">사무실 확인용 상세 (실측)</h1>
                    <div className="text-sm text-slate-500">ID: {m.id}</div>
                </div>

                <div className="flex gap-2">
                    <a
                        className="rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 text-sm font-bold flex items-center gap-1"
                        href={`/field/new?from=admin&edit=${m.id}`}
                    >
                        <span>✏️ 수정 (현장화면)</span>
                    </a>
                    <a
                        className="rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 px-3 py-2 text-sm"
                        href="/admin/measurements"
                    >
                        목록으로
                    </a>
                </div>
            </div>

            {/* 고객 */}
            <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 space-y-2 text-zinc-300">
                <div className="font-semibold text-white">고객 정보</div>
                <div className="text-sm">이름: {customerName}</div>
                <div className="text-sm">전화: {customerPhone}</div>
                <div className="text-sm">주소: {customerAddress || "-"}</div>
            </section>

            {/* 일정 */}
            <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 space-y-2 text-zinc-300">
                <div className="font-semibold text-white">일정</div>
                <div className="text-sm">실측일: {measureDate}</div>
                <div className="text-sm">시공요청: {installDate} {installTime}</div>
            </section>

            {/* 제품/옵션 */}
            <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 space-y-2 text-zinc-300">
                <div className="font-semibold text-white">제품/옵션</div>
                <div className="text-sm">문종: {doorType} {doorDetailTxt ? ` / ${doorDetailTxt}` : ""}</div>
                <div className="text-sm">디자인: {design || "-"}</div>
                <div className="text-sm">문열림 방향: {openDirection || "-"}</div>
                <div className="text-sm">사이즈(mm): {width} × {height}</div>
                <div className="text-sm">프레임: {finish} / {color}</div>
                <div className="text-sm">유리 종류: {glassType || "-"}</div>
                <div className="text-sm">유리 디자인: {parseGlassDesign(o?.glassDesign)}</div>
                <div className="text-sm">간살 수량: {muntinQty} (개)</div>
            </section>

            {/* 추가작업 */}
            <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 space-y-2 text-zinc-300">
                <div className="font-semibold text-white">추가 작업</div>
                <div className="text-sm">철거: {x?.demolitionOldDoor ? "예 (150,000원)" : "아니오"}</div>
                <div className="text-sm">목공: {x?.carpentryWork ? "예 (시공비 +50,000원 / 자재비 별도)" : "아니오"}</div>
                <div className="text-sm">짐이전: {x?.movingNoElevator ? `예 (층수 ${x?.movingFloor ?? "-"} / 층당 10,000원)` : "아니오"}</div>
            </section>

            {/* 금액 */}
            <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 space-y-2 text-zinc-300">
                <div className="font-semibold text-white">금액</div>
                <div className="text-sm">자재비(확정): {won(p?.materialWon ?? p?.material)}</div>
                <div className="text-sm">시공비(별도): {won(p?.installWon ?? p?.install)}</div>
                <div className="text-sm font-bold">총액: {won(p?.totalWon ?? p?.total)}</div>
            </section>

            {/* 메모 */}
            <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 space-y-2 text-zinc-300">
                <div className="font-semibold text-white">메모</div>
                <pre className="whitespace-pre-wrap text-sm text-neutral-200">{m.memo ?? "-"}</pre>
            </section>

            {/* 원본 JSON(사무실은 이게 진짜 중요) */}
            <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 space-y-2 text-zinc-400">
                <div className="font-semibold text-white">원본 데이터(JSON)</div>
                <details>
                    <summary className="cursor-pointer text-sm text-neutral-300">options_json 보기</summary>
                    <pre className="mt-2 text-xs overflow-auto">{JSON.stringify(o, null, 2)}</pre>
                </details>
                <details>
                    <summary className="cursor-pointer text-sm text-neutral-300">pricing_json 보기</summary>
                    <pre className="mt-2 text-xs overflow-auto">{JSON.stringify(p, null, 2)}</pre>
                </details>
                <details>
                    <summary className="cursor-pointer text-sm text-neutral-300">extras_json 보기</summary>
                    <pre className="mt-2 text-xs overflow-auto">{JSON.stringify(x, null, 2)}</pre>
                </details>
            </section>
        </div>
    );
}
