export type BBox = { x: number; y: number; w: number; h: number };

export type FitMode = "contain" | "cover";

/**
 * ✅ 프리뷰가 contain인지 cover인지 "자동 판별"
 *
 * 우선순위:
 * 1) imgCSSObjectFit이 'contain'/'cover'로 명시돼 있으면 그 값을 그대로 사용
 * 2) 아니면, 프리뷰 컨테이너 비율 vs 이미지 비율로 판별:
 *    - 일반적인 UI에서 "크롭 없이 전체를 보여주려면(contain)"는 짧은 쪽에 맞춰 축소 (min)
 *    - "꽉 채우려면(cover)"는 긴 쪽에 맞춰 확대 (max)
 *
 * 기본값은 안전하게 'contain'
 */
export function detectFitMode(
    previewW: number,
    previewH: number,
    imageW: number,
    imageH: number,
    imgCSSObjectFit?: string | null
): FitMode {
    // 1) CSS object-fit 명시가 있으면 우선
    const of = (imgCSSObjectFit ?? "").toLowerCase().trim();
    if (of === "contain") return "contain";
    if (of === "cover") return "cover";

    // 2) 숫자 안전장치
    if (previewW <= 0 || previewH <= 0 || imageW <= 0 || imageH <= 0) return "contain";

    // 3) 비율 기반 판별
    // preview 비율이 image 비율보다 "가로로 넓으면" → contain이면 상하 여백, cover면 좌우 크롭이 흔함
    // preview 비율이 image 비율보다 "세로로 길면" → contain이면 좌우 여백, cover면 상하 크롭이 흔함
    const rPreview = previewW / previewH;
    const rImage = imageW / imageH;

    // 대부분의 현장 프리뷰는 "잘리지 않는" UX가 기본이라 안전하게 contain을 기본으로,
    // preview가 확실히 "화면 꽉채움(크롭)" 형태일 때만 cover로 추정합니다.
    //
    // 휴리스틱: preview와 image 비율 차이가 큰데,
    // 프리뷰가 일반적으로 "전체 화면형"이고(높이 고정 + 100%)일수록 cover가 많습니다.
    // 여기서는 보수적으로, 비율 차이가 꽤 큰 경우에만 cover 후보로 판단.
    const ratioDiff = Math.abs(Math.log(rPreview / rImage)); // 0이면 동일비율, 클수록 차이 큼

    // threshold는 경험값: 0.18~0.25 정도면 체감될 정도의 비율 차이
    const TH = 0.22;

    // 비율 차이가 크면, cover로 세팅해 꽉 채우는 UI일 가능성이 증가
    // 하지만 "무조건 cover"는 위험하므로, 기본은 contain 유지
    if (ratioDiff >= TH) {
        // 이 상황에서 cover를 선택하면 크롭이 발생하지만,
        // UI가 꽉 차게 보이는 케이스일 확률이 상대적으로 큼
        return "cover";
    }

    return "contain";
}

/**
 * 화면(프리뷰) bbox → 원본 이미지 픽셀 bbox 변환
 * (contain/cover 모두 지원)
 */
export function mapBBoxScreenToImage(
    boxScreen: BBox,
    previewW: number,
    previewH: number,
    imageW: number,
    imageH: number,
    fit: FitMode
): BBox {
    if (
        previewW <= 0 ||
        previewH <= 0 ||
        imageW <= 0 ||
        imageH <= 0 ||
        boxScreen.w <= 0 ||
        boxScreen.h <= 0
    ) {
        return { x: 0, y: 0, w: 0, h: 0 };
    }

    const scaleX = previewW / imageW;
    const scaleY = previewH / imageH;
    const scale = fit === "contain" ? Math.min(scaleX, scaleY) : Math.max(scaleX, scaleY);

    const displayedW = imageW * scale;
    const displayedH = imageH * scale;

    const offsetX = (previewW - displayedW) / 2;
    const offsetY = (previewH - displayedH) / 2;

    const xOnDisplayed = boxScreen.x - offsetX;
    const yOnDisplayed = boxScreen.y - offsetY;

    let xImg = xOnDisplayed / scale;
    let yImg = yOnDisplayed / scale;
    let wImg = boxScreen.w / scale;
    let hImg = boxScreen.h / scale;

    xImg = clamp(xImg, 0, imageW);
    yImg = clamp(yImg, 0, imageH);
    wImg = clamp(wImg, 0, imageW - xImg);
    hImg = clamp(hImg, 0, imageH - yImg);

    return {
        x: Math.round(xImg),
        y: Math.round(yImg),
        w: Math.round(wImg),
        h: Math.round(hImg),
    };
}

function clamp(v: number, min: number, max: number) {
    return Math.max(min, Math.min(max, v));
}
