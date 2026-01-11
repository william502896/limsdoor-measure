// app/components/GlassDesignOptions.tsx
"use client";

import React from "react";
import type { GlassDesign } from "@/app/lib/pricing";

type Props = {
    value: GlassDesign;
    onChange: (next: GlassDesign) => void;
    isSliding?: boolean; // 원슬라이딩이면 큰아치 옵션 노출
};

function clamp(n: any) {
    const x = Number(n);
    if (!Number.isFinite(x)) return 0;
    return Math.max(0, Math.floor(x));
}

export default function GlassDesignOptions({ value, onChange, isSliding }: Props) {
    const v = value;

    const set = (patch: Partial<GlassDesign>) => onChange({ ...v, ...patch });

    return (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 space-y-4">
            <div className="text-sm font-semibold text-zinc-200">유리 디자인</div>

            {/* 간살 */}
            <div className="rounded-xl bg-zinc-900/40 p-3 space-y-3">
                <div className="text-sm font-semibold text-zinc-200">간살</div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-black/30 p-3">
                        <div>
                            <div className="text-sm text-zinc-200">간살 기본형 (2줄 세트)</div>
                            <div className="text-xs text-zinc-500">세트당 30,000원</div>
                        </div>
                        <input
                            className="w-24 rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-zinc-100"
                            type="number"
                            min={0}
                            value={v.muntinSet2LinesCount}
                            onChange={(e) => set({ muntinSet2LinesCount: clamp(e.target.value) })}
                        />
                    </label>

                    <label className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-black/30 p-3">
                        <div>
                            <div className="text-sm text-zinc-200">간살 추가 (1줄 단품)</div>
                            <div className="text-xs text-zinc-500">1줄당 20,000원</div>
                        </div>
                        <input
                            className="w-24 rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-zinc-100"
                            type="number"
                            min={0}
                            value={v.muntinExtraBarCount}
                            onChange={(e) => set({ muntinExtraBarCount: clamp(e.target.value) })}
                        />
                    </label>
                </div>
            </div>

            {/* 디자인 옵션 */}
            <div className="rounded-xl bg-zinc-900/40 p-3 space-y-3">
                <div className="text-sm font-semibold text-zinc-200">디자인 옵션</div>

                <label className="flex items-center gap-2 text-sm text-zinc-200">
                    <input
                        type="checkbox"
                        checked={v.archBasic}
                        onChange={(e) => set({ archBasic: e.target.checked })}
                    />
                    아치형 디자인 (도어 종류/짝수에 따라 22~24만)
                </label>

                <label className="flex items-center gap-2 text-sm text-zinc-200">
                    <input
                        type="checkbox"
                        checked={v.bottomPanel}
                        onChange={(e) => set({ bottomPanel: e.target.checked })}
                    />
                    하부고시 (+280,000원)
                </label>

                <label className="flex items-center gap-2 text-sm text-zinc-200">
                    <input
                        type="checkbox"
                        checked={v.archCorner}
                        onChange={(e) => set({ archCorner: e.target.checked })}
                    />
                    모서리 아치 (+90,000원)
                </label>

                {isSliding ? (
                    <label className="flex items-center gap-2 text-sm text-zinc-200">
                        <input
                            type="checkbox"
                            checked={v.bigArchVertical}
                            onChange={(e) => set({ bigArchVertical: e.target.checked })}
                        />
                        원슬라이딩 세로 큰아치(1200×2400) (+400,000원)
                    </label>
                ) : null}
            </div>
        </div>
    );
}
