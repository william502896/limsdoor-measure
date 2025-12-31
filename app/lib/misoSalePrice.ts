/* =========================
   Sale Price + Discount Rules
========================= */

export type DiscountRuleType =
    | "PERCENT_OFF" // % 할인 (예: 10% 할인)
    | "AMOUNT_OFF"  // 금액 할인 (예: 30,000원 할인)
    | "SET_PRICE"   // 최종 판매가를 특정 금액으로 강제 (예: 590,000 고정)
    | "ADD_AMOUNT"  // 금액 가산 (예: +20,000)
    | "ADD_PERCENT" // % 가산 (예: +5%)
    ;

export type DiscountRuleTarget = "SALE_BASE" | "FINAL";
// SALE_BASE: 기준 판매가에만 적용 후 누적
// FINAL: (기준+가산) 최종값에 적용

export type DiscountRuleCondition = {
    // 조건을 "안 걸면" 전부 적용
    productTypes?: string[];     // ex) ["1S_MANUAL","3T_MANUAL"]
    coatings?: string[];         // ex) ["FLUORO","ANOD"]
    glassGroups?: string[];      // ex) ["CLEAR_BRONZE_AQUA","SATIN","WIRE"]

    // ✅ 요청하신 요소들
    colors?: string[];           // ex) ["WHITE","BLACK","ANOD_SILVER"]
    glassTypes?: string[];       // ex) ["CLEAR","BRONZE","SATIN","WIRE"]
    designIds?: string[];        // ex) ["D01","D02"]

    // 사이즈 범위(필요 시)
    minW?: number;
    maxW?: number;
    minH?: number;
    maxH?: number;

    // 기간 이벤트(옵션)
    dateFrom?: string;           // "2025-12-01"
    dateTo?: string;             // "2025-12-31"
};

export type DiscountRule = {
    id: string;                  // UI에서 uuid처럼
    name: string;                // 이벤트명/할인명
    enabled: boolean;

    type: DiscountRuleType;
    target?: DiscountRuleTarget; // 기본: FINAL
    value: number;               // %면 10 => 10%
    stackable?: boolean;         // false면 해당 룰 적용 후 다른 룰 적용 중단(동일 priority 내)
    priority?: number;           // 큰 값 우선
    condition?: DiscountRuleCondition;
    note?: string;
};

export type SalePriceContext = {
    productType: string;
    coating: string;
    glassGroup: string;

    width: number;
    height: number;

    // ✅ 요청하신 요소들
    color?: string;
    glass_type?: string;
    design_id?: string;

    // 이벤트 시간(옵션)
    nowISO?: string; // 지정 없으면 현재 시각 사용
};

export type SalePriceBreakdownLine = {
    ruleId: string;
    name: string;
    type: DiscountRuleType;
    target: DiscountRuleTarget;
    value: number;
    appliedDelta: number; // +면 증가, -면 감소
    before: number;
    after: number;
};

export type FinalSaleCalcResult = {
    saleBase: number;         // 기준 판매가
    saleAdd: number;          // 판매 가산(필요하면 UI에서 추가)
    salePreRule: number;      // 룰 적용 전 (saleBase + saleAdd)
    saleFinal: number;        // 룰 적용 후 최종 판매가

    breakdown: SalePriceBreakdownLine[];

    // 마진 계산(원가 연동)
    purchaseTotal?: number;
    margin?: number;
    marginRate?: number;      // %
};

function safeNum(n: any, fallback = 0) {
    const x = Number(n);
    return Number.isFinite(x) ? x : fallback;
}

function inRange(x: number, min?: number, max?: number) {
    if (typeof min === "number" && x < min) return false;
    if (typeof max === "number" && x > max) return false;
    return true;
}

function inList(value: string | undefined, list?: string[]) {
    if (!list || list.length === 0) return true;
    if (!value) return false;
    return list.includes(value);
}

function inDateRange(nowISO: string, from?: string, to?: string) {
    if (!from && !to) return true;
    const now = new Date(nowISO).getTime();
    if (from) {
        const f = new Date(from + "T00:00:00").getTime();
        if (now < f) return false;
    }
    if (to) {
        const t = new Date(to + "T23:59:59").getTime();
        if (now > t) return false;
    }
    return true;
}

export function matchesRule(ctx: SalePriceContext, rule: DiscountRule): boolean {
    if (!rule.enabled) return false;
    const c = rule.condition;
    if (!c) return true;

    // 제품/도장/유리그룹
    if (!inList(ctx.productType, c.productTypes)) return false;
    if (!inList(ctx.coating, c.coatings)) return false;
    if (!inList(ctx.glassGroup, c.glassGroups)) return false;

    // ✅ 색상/유리종류/디자인
    if (!inList(ctx.color, c.colors)) return false;
    if (!inList(ctx.glass_type, c.glassTypes)) return false;
    if (!inList(ctx.design_id, c.designIds)) return false;

    // 사이즈
    if (!inRange(ctx.width, c.minW, c.maxW)) return false;
    if (!inRange(ctx.height, c.minH, c.maxH)) return false;

    // 기간
    const nowISO = ctx.nowISO ?? new Date().toISOString();
    if (!inDateRange(nowISO, c.dateFrom, c.dateTo)) return false;

    return true;
}

/**
 * ✅ 최종 판매가 계산(할인규칙 적용 + 원가 연동 마진 계산)
 * - saleBase: 기준 판매가(관리자가 입력/확정)
 * - saleAdd: 색상/유리/디자인 가산분(원하면 UI에서 따로 운영)
 * - rules: 할인/이벤트 규칙 배열
 * - ctx: 제품 조건(색상/유리/디자인 포함)
 */
export function calculateFinalSalePrice(params: {
    saleBase: number;
    saleAdd?: number;
    rules?: DiscountRule[];
    ctx: SalePriceContext;
    purchaseTotal?: number; // calculateMisoCost(spec).totalCost
}): FinalSaleCalcResult {
    const saleBase = Math.max(0, safeNum(params.saleBase));
    const saleAdd = safeNum(params.saleAdd ?? 0);
    const purchaseTotal = typeof params.purchaseTotal === "number" ? params.purchaseTotal : undefined;

    const rules = (params.rules ?? [])
        .filter((r) => r && r.enabled)
        .slice()
        .sort((a, b) => (safeNum(b.priority, 0) - safeNum(a.priority, 0)));

    const breakdown: SalePriceBreakdownLine[] = [];

    const pre = Math.max(0, saleBase + saleAdd);
    let cur = pre;

    for (const rule of rules) {
        if (!matchesRule(params.ctx, rule)) continue;

        const target: DiscountRuleTarget = rule.target ?? "FINAL";
        const before = cur;

        // target이 SALE_BASE이면, "saleBase영역"에만 적용한 느낌을 주기 위해
        // cur를 기준으로 적용하되, 실제로는 '누적'이므로 동일하게 cur를 갱신합니다.
        // (원하시면 SALE_BASE를 별도 레이어로 분리도 가능합니다)
        let delta = 0;
        const v = safeNum(rule.value);

        switch (rule.type) {
            case "PERCENT_OFF": {
                delta = -Math.round((cur * v) / 100);
                cur = Math.max(0, cur + delta);
                break;
            }
            case "AMOUNT_OFF": {
                delta = -Math.round(v);
                cur = Math.max(0, cur + delta);
                break;
            }
            case "SET_PRICE": {
                const next = Math.max(0, Math.round(v));
                delta = next - cur;
                cur = next;
                break;
            }
            case "ADD_AMOUNT": {
                delta = Math.round(v);
                cur = Math.max(0, cur + delta);
                break;
            }
            case "ADD_PERCENT": {
                delta = Math.round((cur * v) / 100);
                cur = Math.max(0, cur + delta);
                break;
            }
            default: {
                // unknown -> ignore
                continue;
            }
        }

        breakdown.push({
            ruleId: rule.id,
            name: rule.name,
            type: rule.type,
            target,
            value: v,
            appliedDelta: delta,
            before,
            after: cur,
        });

        // stackable=false면, 동일 priority 이후 룰을 막는 방식도 가능하지만
        // 여기서는 "적용 후 전체 중단"으로 구현 (원하시면 priority 단위로 바꿔드릴게요)
        if (rule.stackable === false) break;
    }

    const saleFinal = cur;

    let margin: number | undefined;
    let marginRate: number | undefined;
    if (typeof purchaseTotal === "number") {
        margin = saleFinal - purchaseTotal;
        marginRate = saleFinal > 0 ? (margin / saleFinal) * 100 : 0;
    }

    return {
        saleBase,
        saleAdd,
        salePreRule: pre,
        saleFinal,
        breakdown,
        purchaseTotal,
        margin,
        marginRate,
    };
}
