import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function won(n?: number) {
    const v = Number(n ?? 0);
    return v.toLocaleString() + "원";
}

export default async function MeasurementDetailPage({ params }: { params: { id: string } }) {
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

    const doorType = m.door_type ?? o?.doorType ?? "";
    const doorDetail = m.door_detail ?? o?.doorDetail ?? "";
    const design = o?.design ?? o?.doorDesign ?? "";
    const openDirection = o?.openDirection ?? "";
    const width = m.width_mm ?? o?.widthMm ?? 0;
    const height = m.height_mm ?? o?.heightMm ?? 0;

    const finish = o?.frameFinish ?? "";   // 불소도장/아노다이징
    const color = o?.frameColor ?? "";     // 화이트/블랙/샴페인골드 등

    const glassType = o?.glassType ?? "";
    const glassDesign = o?.glassDesign ?? "";
    const muntinQty = Number(o?.muntinQty ?? 0); // ✅ 간살 수량(요구하신 것)

    const measureDate = m.created_at ? new Date(m.created_at).toLocaleString("ko-KR") : "-";
    const installDate = o?.installDate ?? o?.requestDate ?? "-";
    const installTime = o?.installTime ?? o?.requestTime ?? "-";

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold">사무실 확인용 상세 (실측)</h1>
                    <div className="text-sm text-neutral-400">ID: {m.id}</div>
                </div>

                <a
                    className="rounded-lg border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-900"
                    href="/admin/measurements"
                >
                    목록으로
                </a>
            </div>

            {/* 고객 */}
            <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 space-y-2">
                <div className="font-semibold">고객 정보</div>
                <div className="text-sm">이름: {customerName}</div>
                <div className="text-sm">전화: {customerPhone}</div>
                <div className="text-sm">주소: {customerAddress || "-"}</div>
            </section>

            {/* 일정 */}
            <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 space-y-2">
                <div className="font-semibold">일정</div>
                <div className="text-sm">실측일: {measureDate}</div>
                <div className="text-sm">시공요청: {installDate} {installTime}</div>
            </section>

            {/* 제품/옵션 */}
            <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 space-y-2">
                <div className="font-semibold">제품/옵션</div>
                <div className="text-sm">문종: {doorType} {doorDetail ? ` / ${doorDetail}` : ""}</div>
                <div className="text-sm">디자인: {design || "-"}</div>
                <div className="text-sm">문열림 방향: {openDirection || "-"}</div>
                <div className="text-sm">사이즈(mm): {width} × {height}</div>
                <div className="text-sm">프레임: {finish} / {color}</div>
                <div className="text-sm">유리 종류: {glassType || "-"}</div>
                <div className="text-sm">유리 디자인: {glassDesign || "-"}</div>
                <div className="text-sm">간살 수량: {muntinQty} (개)</div>
            </section>

            {/* 추가작업 */}
            <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 space-y-2">
                <div className="font-semibold">추가 작업</div>
                <div className="text-sm">철거: {x?.demolitionOldDoor ? "예 (150,000원)" : "아니오"}</div>
                <div className="text-sm">목공: {x?.carpentryWork ? "예 (시공비 +50,000원 / 자재비 별도)" : "아니오"}</div>
                <div className="text-sm">짐이전: {x?.movingNoElevator ? `예 (층수 ${x?.movingFloor ?? "-"} / 층당 10,000원)` : "아니오"}</div>
            </section>

            {/* 금액 */}
            <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 space-y-2">
                <div className="font-semibold">금액</div>
                <div className="text-sm">자재비(확정): {won(p?.materialWon ?? p?.material)}</div>
                <div className="text-sm">시공비(별도): {won(p?.installWon ?? p?.install)}</div>
                <div className="text-sm font-bold">총액: {won(p?.totalWon ?? p?.total)}</div>
            </section>

            {/* 메모 */}
            <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 space-y-2">
                <div className="font-semibold">메모</div>
                <pre className="whitespace-pre-wrap text-sm text-neutral-200">{m.memo ?? "-"}</pre>
            </section>

            {/* 원본 JSON(사무실은 이게 진짜 중요) */}
            <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 space-y-2">
                <div className="font-semibold">원본 데이터(JSON)</div>
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
