type KakaoButton = {
    name: string;                 // 버튼명
    type: "WL" | "AL" | "DS" | "BK" | "MD"; // 흔히 쓰는 타입들(웹링크/앱링크 등)
    linkMo?: string;              // 모바일 링크
    linkPc?: string;              // PC 링크
    schemeAndroid?: string;       // 안드로이드 앱링크
    schemeIos?: string;           // iOS 앱링크
};

export function normalizeButtons(input: any): KakaoButton[] {
    if (!input) return [];
    if (Array.isArray(input)) return input as KakaoButton[];
    return [];
}
