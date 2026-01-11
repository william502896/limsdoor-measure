export type FitMode = "cover" | "contain";

/**
 * imgCSSObjectFit를 모르거나 불확실할 때도 자동 판정 가능하도록:
 * - imgCSSObjectFit이 'cover'/'contain'이면 그대로 사용
 * - 아니면 preview와 image 비율로 fallback 판정
 */
export function detectFitMode(
    previewW: number,
    previewH: number,
    imageW: number,
    imageH: number,
    imgCSSObjectFit?: string | null
): FitMode {
    const v = (imgCSSObjectFit || "").toLowerCase().trim();
    if (v === "cover" || v === "contain") return v;

    // fallback: 일반적으로 카메라 프리뷰는 cover로 많이 씀.
    // 다만 미리보기 영역이 이미지보다 더 "넓거나 길쭉"하게 왜곡되면 contain일 가능성도 있으니
    // 비율 차이가 크면 contain로.
    const previewAR = previewW / previewH;
    const imageAR = imageW / imageH;
    const diff = Math.abs(previewAR - imageAR);

    // diff가 작으면 cover로, 크면 contain 쪽 가정
    return diff < 0.12 ? "cover" : "contain";
}

export function getRenderedImageRect(
    previewW: number,
    previewH: number,
    imageW: number,
    imageH: number,
    fit: FitMode
) {
    // preview 안에 image가 렌더링되는 사각형(좌상단 x,y + 렌더 w,h)
    const scale =
        fit === "cover"
            ? Math.max(previewW / imageW, previewH / imageH)
            : Math.min(previewW / imageW, previewH / imageH);

    const renderW = imageW * scale;
    const renderH = imageH * scale;
    const offsetX = (previewW - renderW) / 2;
    const offsetY = (previewH - renderH) / 2;

    return { scale, renderW, renderH, offsetX, offsetY };
}
