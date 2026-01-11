export type PhotoQualityReport = {
    ok: boolean;
    score: number; // 0~100
    warnings: string[];
    metrics: {
        brightness: number; // 0~255
        contrast: number;   // 대략 값
        sharpness: number;  // 대략 값
    };
};

export async function analyzePhotoQuality(file: File): Promise<PhotoQualityReport> {
    const img = await fileToImage(file);
    const { canvas, ctx } = imageToCanvas(img, 640); // 리사이즈 분석
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // 1) 밝기(평균)
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        sum += (r + g + b) / 3;
    }
    const brightness = sum / (data.length / 4);

    // 2) 대비(표준편차 근사)
    let varSum = 0;
    const n = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
        const v = (data[i] + data[i + 1] + data[i + 2]) / 3;
        varSum += (v - brightness) * (v - brightness);
    }
    const contrast = Math.sqrt(varSum / n);

    // 3) 선명도(라플라시안 근사) - 아주 가벼운 샘플링
    const sharpness = laplacianSharpness(data, width, height);

    const warnings: string[] = [];
    let score = 100;

    // 밝기 기준
    if (brightness < 60) { warnings.push("사진이 너무 어둡습니다(조명 켜고 다시 촬영 권장)."); score -= 25; }
    if (brightness > 210) { warnings.push("사진이 너무 밝습니다(빛 반사/역광 가능)."); score -= 15; }

    // 대비 기준
    if (contrast < 25) { warnings.push("대비가 낮아 윤곽 인식이 어렵습니다(각도/거리 조정)."); score -= 15; }

    // 선명도 기준
    if (sharpness < 12) { warnings.push("사진이 흐립니다(손떨림/초점 문제)."); score -= 30; }

    // 최소 점수 보정
    score = Math.max(0, Math.min(100, score));

    // ok 기준: 70점 이상 & 치명 경고 없음
    const ok = score >= 70 && !warnings.some(w => w.includes("흐립니다"));

    return { ok, score, warnings, metrics: { brightness, contrast, sharpness } };
}

function fileToImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = reject;
        img.src = url;
    });
}

function imageToCanvas(img: HTMLImageElement, targetW: number) {
    const ratio = img.height / img.width;
    const w = targetW;
    const h = Math.round(targetW * ratio);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, w, h);
    return { canvas, ctx };
}

function laplacianSharpness(data: Uint8ClampedArray, width: number, height: number) {
    // 그레이 변환 후 중앙 일부만 샘플링(속도)
    const toGray = (idx: number) => (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

    let sum = 0;
    let count = 0;

    // 중앙 60% 영역만
    const x0 = Math.floor(width * 0.2), x1 = Math.floor(width * 0.8);
    const y0 = Math.floor(height * 0.2), y1 = Math.floor(height * 0.8);

    for (let y = y0 + 1; y < y1 - 1; y += 2) {
        for (let x = x0 + 1; x < x1 - 1; x += 2) {
            const i = (y * width + x) * 4;
            const c = toGray(i);
            const up = toGray(((y - 1) * width + x) * 4);
            const dn = toGray(((y + 1) * width + x) * 4);
            const lf = toGray((y * width + (x - 1)) * 4);
            const rt = toGray((y * width + (x + 1)) * 4);

            // 라플라시안(근사)
            const lap = Math.abs((up + dn + lf + rt) - 4 * c);
            sum += lap;
            count++;
        }
    }
    return count ? sum / count : 0;
}
