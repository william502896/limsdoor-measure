import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MeasurementListPage() {
    const sb = supabaseAdmin();

    // 최신순 50개만 조회
    const { data: list, error } = await sb
        .from("measurements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

    if (error) {
        return <div className="p-6 text-red-500">불러오기 실패: {error.message}</div>;
    }

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold">실측 목록</h1>
                <div className="text-sm text-neutral-400">최근 50건</div>
            </div>

            <div className="grid grid-cols-1 gap-2">
                {list?.map((m) => {
                    const o = m.options_json ?? {};
                    const p = m.pricing_json ?? {};
                    const created = m.created_at ? new Date(m.created_at).toLocaleString("ko-KR") : "-";

                    return (
                        <Link
                            key={m.id}
                            href={`/admin/measurements/${m.id}`}
                            className="block rounded-xl border border-neutral-800 bg-neutral-900 p-4 hover:border-neutral-600 transition"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-semibold text-lg">{m.customer_name || "(이름 없음)"}</div>
                                    <div className="text-sm text-neutral-400">{m.customer_phone || "-"}</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-emerald-400">
                                        {p.totalWon ? p.totalWon.toLocaleString() + "원" : "-"}
                                    </div>
                                    <div className="text-xs text-neutral-500">{created}</div>
                                </div>
                            </div>
                            <div className="mt-2 text-sm text-neutral-300">
                                {m.door_type} / {m.width_mm}x{m.height_mm}
                            </div>
                            <div className="mt-1 text-xs text-neutral-500 truncate">
                                {m.customer_address || "주소 없음"}
                            </div>
                        </Link>
                    );
                })}

                {list?.length === 0 && (
                    <div className="p-8 text-center text-neutral-500 border border-dashed border-neutral-800 rounded-xl">
                        데이터가 없습니다.
                    </div>
                )}
            </div>
        </div>
    );
}
