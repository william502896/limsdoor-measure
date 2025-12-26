import { useEffect, useState } from "react";

export type SalePriceRow = {
    id: string;

    product_type: string;
    coating: string;
    glass_group: string;
    width_key: number;     // -1 포함
    variant: string;       // "" 포함

    color: string;
    glass_type: string;
    design_id: string;

    sale_base: number;
    sale_add: number;
    priority: number;
    is_published: boolean;
    memo: string;

    discount_rules: any[];
    stats: any;

    created_at: string;
    updated_at: string;
};

export async function fetchSalePrice(params: {
    product_type: string;
    coating: string;
    glass_group: string;
    width_key?: number;     // 없으면 자동 -1
    variant?: string;       // 없으면 자동 ""
    color: string;
    glass_type: string;
    design_id: string;
}): Promise<SalePriceRow | null> {
    const sp = new URLSearchParams({
        product_type: params.product_type,
        coating: params.coating,
        glass_group: params.glass_group,
        width_key: String(params.width_key ?? -1),
        variant: String(params.variant ?? ""),
        color: params.color,
        glass_type: params.glass_type,
        design_id: params.design_id,
    });

    const res = await fetch(`/api/miso-sale-price?${sp.toString()}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok || !json?.ok) return null;
    return json.data ?? null;
}

type CalcInputs = {
    product_type: string;
    coating: string;
    glass_group: string;
    width_key?: number;     // 없으면 -1로 처리됨
    variant?: string;       // 없으면 ""로 처리됨
    color: string;
    glass_type: string;
    design_id: string;
};

export function useAutoSalePrice(inputs: CalcInputs) {
    const [salePrice, setSalePrice] = useState<SalePriceRow | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const ready =
            inputs.product_type &&
            inputs.coating &&
            inputs.glass_group &&
            inputs.color &&
            inputs.glass_type &&
            inputs.design_id;

        if (!ready) {
            setSalePrice(null);
            return;
        }

        let alive = true;
        setLoading(true);

        (async () => {
            const row = await fetchSalePrice(inputs);
            if (!alive) return;
            setSalePrice(row);
            setLoading(false);
        })();

        return () => {
            alive = false;
        };
    }, [
        inputs.product_type,
        inputs.coating,
        inputs.glass_group,
        inputs.width_key,
        inputs.variant,
        inputs.color,
        inputs.glass_type,
        inputs.design_id,
    ]);

    return { salePrice, loading };
}
