// app/lib/message.shared.ts
import { QuoteBreakdown, Options, Measurement, computeWidthHeightMm } from "./pricing.shared";

export function buildCustomerMessage(params: {
    customerName: string;
    customerPhone: string;
    options: Options;
    measurement: Measurement;
    quote: QuoteBreakdown;
}) {
    const { customerName, customerPhone, options, measurement, quote } = params;
    const { wMin, hMin } = computeWidthHeightMm(measurement);

    const bankLine = `케이뱅크 700100061232 주식회사 림스로 입금 부탁드립니다.`;
    const guideLine = `※ 시공비는 기본 포함이지만, 고객 안내는 시공비 15만원을 뺀 금액을 "자재비"로 확정하여 표시합니다.`;
    const ruleLine = `※ 자재비 입금이 되어야 제품 제작이 진행됩니다. 시공비는 시공 후 정산됩니다.`;

    const doorLabelMap: Record<string, string> = {
        THREE_PANEL: "3연동",
        ONE_SLIDING: "원슬라이딩",
        SWING: "스윙",
        HOPE: "여닫이(호패)",
    };

    const doorLabel = doorLabelMap[options.doorType] ?? options.doorType;

    const lines = [
        `[림스도어 실측/견적 안내]`,
        `고객: ${customerName} (${customerPhone})`,
        `제품: ${doorLabel}`,
        `실측(최소기준): ${wMin} x ${hMin} (mm)`,
        ``,
        `자재비(확정): ${quote.material.toLocaleString()}원`,
        `시공비(별도): ${quote.installFee.toLocaleString()}원`,
        `총액: ${quote.total.toLocaleString()}원`,
        ``,
        bankLine,
        guideLine,
        ruleLine,
    ];

    return lines.join("\n");
}
