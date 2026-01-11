export type DoorStructure =
    | "원슬라이딩"
    | "2슬라이딩"
    | "3슬라이딩"
    | "4슬라이딩"
    | "3연동"
    | "스윙도어"
    | "호패도어"
    // Legacy/Extra mappings if needed, but we aim for distinct set
    | "파티션";

export const DOOR_STRUCTURES: DoorStructure[] = [
    "원슬라이딩",
    "2슬라이딩",
    "3슬라이딩",
    "4슬라이딩",
    "3연동",
    "스윙도어",
    "호패도어",
    "파티션"
];

export type FrameColor = "화이트" | "블랙" | "그레이" | "골드";
export const FRAME_COLORS: FrameColor[] = ["화이트", "블랙", "그레이", "골드"];

export type GlassType =
    | "투명"
    | "샤틴"
    | "브론즈"
    | "다크그레이"
    | "브론즈샤틴"
    | "다크샤틴"
    | "투명샤틴"
    | "아쿠아"
    | "미스트"
    | "플루트"
    | "머루"
    | "망입유리"
    | "필름유리";

export const GLASS_TYPES: GlassType[] = [
    "투명",
    "샤틴",
    "브론즈",
    "다크그레이",
    "브론즈샤틴",
    "다크샤틴",
    "투명샤틴",
    "아쿠아",
    "미스트",
    "플루트",
    "머루",
    "망입유리",
    "필름유리"
];

export type DesignType = "유럽형 통유리" | "격자디자인" | "아치" | "간살" | "분할";
export const DOOR_DESIGNS: DesignType[] = [
    "유럽형 통유리",
    "격자디자인",
    "아치",
    "간살",
    "분할"
];

// Helper to categorize structures if needed for UI grouping
export const DOOR_CATEGORY_MAP: Record<string, DoorStructure[]> = {
    "자동문": ["3연동", "원슬라이딩"],
    "수동문": ["3연동", "원슬라이딩", "2슬라이딩", "3슬라이딩", "4슬라이딩", "호패도어", "스윙도어"],
    "파티션": ["파티션"]
};
