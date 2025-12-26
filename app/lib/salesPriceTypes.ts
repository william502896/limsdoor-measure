export type SaleColor = "WHITE" | "BLACK" | "OTHER";
export type SaleDiscountType = "AMOUNT" | "PERCENT" | "COUPON_CODE";
export type SaleDiscountTarget = "BASE_ONLY" | "BASE_PLUS_OPTIONS" | "FINAL_TOTAL";

export type SaleDiscountRule = {
    name: string;                 // 예: "연말 이벤트", "재구매 할인"
    type: SaleDiscountType;       // AMOUNT(정액), PERCENT(정률), COUPON_CODE(코드)
    value: number;                // AMOUNT: 원, PERCENT: 0~100, COUPON_CODE: 0(별도처리)
    target: SaleDiscountTarget;   // 어디에 적용?
    stackable: boolean;           // 중복 가능?
    note?: string;

    // 조건부(선택)
    minSalePrice?: number;        // 판매가 최소 조건
    minQuantity?: number;         // 예: 2조 이상
    channels?: ("DANGGEUN" | "WEB" | "OFFLINE")[]; // 유입 채널
    couponCode?: string;          // COUPON_CODE일 때
};

export type SalePriceDraft = {
    product_type: string;         // "1S_MANUAL" 등
    coating: "FLUORO" | "ANOD";
    color?: SaleColor;

    glass_group: "CLEAR_BRONZE_AQUA" | "SATIN" | "WIRE";
    glass_type?: string;          // 더 디테일한 유리명(선택)
    design_id?: string;

    is_knockdown: boolean;

    // 사이즈: (권장) width_key 기반 + 실제 입력 width_mm/height_mm 기록
    width_key: number;            // 1100,1300...
    width_mm?: number;
    height_mm?: number;

    sale_base: number;            // 기준 판매가(내가 확정)
    sale_option_policy?: any;     // 옵션/자재를 판매가에 어떻게 반영할지 (예: 원가대로, 고정가산 등)

    discount_rules: SaleDiscountRule[]; // 이벤트/할인 정책

    starts_at?: string;           // ISO
    ends_at?: string;             // ISO
    priority?: number;            // 낮을수록 우선

    memo?: string;

    // publish
    is_published?: boolean;
};
