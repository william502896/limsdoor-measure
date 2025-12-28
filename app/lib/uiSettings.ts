import { createSupabaseBrowser } from "./supabaseClient";

export const UI_SETTINGS_KEY = "app_ui_custom_settings_v1";

export type ThemePreset = "LIGHT" | "DARK" | "PRO" | "PREMIUM" | "CUSTOM";
export type IconSet = "OUTLINE" | "FILLED" | "MINIMAL";
export type ButtonRadius = "SHARP" | "ROUNDED" | "PILL";
export type ShadowMode = "ON" | "OFF";

export type UiSettings = {
    brandName: string;
    headerTitle: string;

    logoUrl: string;
    faviconUrl: string;

    preset: ThemePreset;

    colors: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        text: string;
    };

    background: {
        appBgImageUrl: string;
        pageBgImageUrl: string; // 선택
        fixed: boolean;
        repeat: "no-repeat" | "repeat" | "repeat-x" | "repeat-y";
        blurPx: number; // 0~20
        dimOpacity: number; // 0~0.8
    };

    icons: {
        set: IconSet;
        colorMode: "AUTO" | "MANUAL";
        manualColor: string;
    };

    fonts: {
        heading: "Pretendard" | "NotoSansKR" | "System";
        body: "Pretendard" | "NotoSansKR" | "System";
        headingWeight: 400 | 500 | 600 | 700;
        bodyWeight: 300 | 400 | 500 | 600;
    };

    buttons: {
        radius: ButtonRadius;
        heightPx: number; // 36~56
        paddingX: number; // 12~24
        shadow: ShadowMode;
        tapAnim: boolean;
    };
};

export type AppScope = "GLOBAL" | "FIELD" | "SHOP";

export type MultiAppUiConfig = {
    global: UiSettings;
    field?: UiSettings;
    shop?: UiSettings;
};

export const PRESETS: Record<Exclude<ThemePreset, "CUSTOM">, Partial<UiSettings>> = {
    LIGHT: {
        preset: "LIGHT",
        colors: {
            primary: "#2563EB",
            secondary: "#64748B",
            accent: "#F97316",
            background: "#FFFFFF",
            text: "#0F172A",
        },
        background: { fixed: false, repeat: "no-repeat", blurPx: 0, dimOpacity: 0.0 } as any,
        icons: { set: "OUTLINE", colorMode: "AUTO", manualColor: "#0F172A" } as any,
        fonts: { heading: "Pretendard", body: "Pretendard", headingWeight: 700, bodyWeight: 400 } as any,
        buttons: { radius: "ROUNDED", heightPx: 44, paddingX: 16, shadow: "ON", tapAnim: true } as any,
    },
    DARK: {
        preset: "DARK",
        colors: {
            primary: "#60A5FA",
            secondary: "#94A3B8",
            accent: "#FBBF24",
            background: "#0B1220",
            text: "#E2E8F0",
        },
        background: { fixed: true, repeat: "no-repeat", blurPx: 0, dimOpacity: 0.25 } as any,
        icons: { set: "OUTLINE", colorMode: "AUTO", manualColor: "#E2E8F0" } as any,
        fonts: { heading: "Pretendard", body: "Pretendard", headingWeight: 700, bodyWeight: 400 } as any,
        buttons: { radius: "ROUNDED", heightPx: 44, paddingX: 16, shadow: "OFF", tapAnim: true } as any,
    },
    PRO: {
        preset: "PRO",
        colors: {
            primary: "#111827",
            secondary: "#6B7280",
            accent: "#10B981",
            background: "#F8FAFC",
            text: "#111827",
        },
        background: { fixed: false, repeat: "no-repeat", blurPx: 0, dimOpacity: 0.0 } as any,
        icons: { set: "MINIMAL", colorMode: "AUTO", manualColor: "#111827" } as any,
        fonts: { heading: "NotoSansKR", body: "Pretendard", headingWeight: 700, bodyWeight: 400 } as any,
        buttons: { radius: "SHARP", heightPx: 42, paddingX: 16, shadow: "OFF", tapAnim: false } as any,
    },
    PREMIUM: {
        preset: "PREMIUM",
        colors: {
            primary: "#7C3AED",
            secondary: "#64748B",
            accent: "#EC4899",
            background: "#0B0B10",
            text: "#F8FAFC",
        },
        background: { fixed: true, repeat: "no-repeat", blurPx: 4, dimOpacity: 0.35 } as any,
        icons: { set: "FILLED", colorMode: "MANUAL", manualColor: "#F8FAFC" } as any,
        fonts: { heading: "Pretendard", body: "Pretendard", headingWeight: 700, bodyWeight: 400 } as any,
        buttons: { radius: "PILL", heightPx: 46, paddingX: 18, shadow: "ON", tapAnim: true } as any,
    },
};

export function getDefaultSettings(): UiSettings {
    return {
        brandName: "LimsDoor",
        headerTitle: "실측 입력",
        logoUrl: "/assets/brand/logo.png",
        faviconUrl: "/favicon.ico",
        preset: "LIGHT",
        colors: {
            primary: "#2563EB",
            secondary: "#64748B",
            accent: "#F97316",
            background: "#FFFFFF",
            text: "#0F172A",
        },
        background: {
            appBgImageUrl: "",
            pageBgImageUrl: "",
            fixed: false,
            repeat: "no-repeat",
            blurPx: 0,
            dimOpacity: 0,
        },
        icons: { set: "OUTLINE", colorMode: "AUTO", manualColor: "#0F172A" },
        fonts: {
            heading: "Pretendard",
            body: "Pretendard",
            headingWeight: 700,
            bodyWeight: 400,
        },
        buttons: {
            radius: "ROUNDED",
            heightPx: 44,
            paddingX: 16,
            shadow: "ON",
            tapAnim: true,
        },
    };
}

export function getInitialMultiAppConfig(): MultiAppUiConfig {
    return {
        global: getDefaultSettings(),
    };
}

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

export function readUiSettings(): MultiAppUiConfig | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(UI_SETTINGS_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);

        // Migration check: if old format (has 'colors'), wrap in global
        if (parsed.colors && !parsed.global) {
            return {
                global: parsed,
                field: undefined, // Explicitly undefined means fall back to global
                shop: undefined
            };
        }
        return parsed as MultiAppUiConfig;
    } catch {
        return null;
    }
}

export function writeUiSettings(s: MultiAppUiConfig) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(UI_SETTINGS_KEY, JSON.stringify(s));
}

// Logic: Scope > Global > Default
export function resolveUiSettings(config: MultiAppUiConfig, scope: AppScope): UiSettings {
    if (scope === "GLOBAL") return config.global;

    // Check if specific scope exists
    const derived = scope === "FIELD" ? config.field : config.shop;
    if (derived) return derived;

    // Fallback to Global
    return config.global;
}

export function applyCssVarsFromSettings(s: UiSettings) {
    if (typeof document === 'undefined') return;
    const r = document.documentElement;

    // colors
    r.style.setProperty("--ui-primary", s.colors.primary);
    r.style.setProperty("--ui-secondary", s.colors.secondary);
    r.style.setProperty("--ui-accent", s.colors.accent);
    r.style.setProperty("--ui-bg", s.colors.background);
    r.style.setProperty("--ui-text", s.colors.text);

    // fonts
    const fontMap: Record<UiSettings["fonts"]["heading"], string> = {
        Pretendard: `"Pretendard", system-ui, -apple-system, "Segoe UI", Arial`,
        NotoSansKR: `"Noto Sans KR", system-ui, -apple-system, "Segoe UI", Arial`,
        System: `system-ui, -apple-system, "Segoe UI", Arial`,
    };
    r.style.setProperty("--ui-font-heading", fontMap[s.fonts.heading] || fontMap.Pretendard);
    r.style.setProperty("--ui-font-body", fontMap[s.fonts.body] || fontMap.Pretendard);
    r.style.setProperty("--ui-font-heading-weight", String(s.fonts.headingWeight));
    r.style.setProperty("--ui-font-body-weight", String(s.fonts.bodyWeight));

    // button styles
    const radiusMap: Record<ButtonRadius, string> = {
        SHARP: "8px",
        ROUNDED: "14px",
        PILL: "999px",
    };
    r.style.setProperty("--ui-btn-radius", radiusMap[s.buttons.radius]);
    r.style.setProperty("--ui-btn-height", `${clamp(s.buttons.heightPx, 36, 56)}px`);
    r.style.setProperty("--ui-btn-pad-x", `${clamp(s.buttons.paddingX, 12, 24)}px`);
    r.style.setProperty("--ui-btn-shadow", s.buttons.shadow === "ON" ? "0 10px 20px rgba(0,0,0,0.18)" : "none");
    r.style.setProperty("--ui-tap-anim", s.buttons.tapAnim ? "1" : "0");

    // backgrounds
    r.style.setProperty("--ui-app-bg-image", s.background.appBgImageUrl ? `url("${s.background.appBgImageUrl}")` : "none");
    r.style.setProperty("--ui-page-bg-image", s.background.pageBgImageUrl ? `url("${s.background.pageBgImageUrl}")` : "none");
    r.style.setProperty("--ui-bg-fixed", s.background.fixed ? "fixed" : "scroll");
    r.style.setProperty("--ui-bg-repeat", s.background.repeat);
    r.style.setProperty("--ui-bg-blur", `${clamp(s.background.blurPx, 0, 20)}px`);
    r.style.setProperty("--ui-bg-dim", String(clamp(s.background.dimOpacity, 0, 0.8)));

    // icons
    r.style.setProperty("--ui-icon-set", s.icons.set);
    const iconColor = s.icons.colorMode === "AUTO" ? s.colors.text : s.icons.manualColor;
    r.style.setProperty("--ui-icon-color", iconColor);
}

// Ensure type validity when merging
export function mergePreset(base: UiSettings, preset: Exclude<ThemePreset, "CUSTOM">): UiSettings {
    const p = PRESETS[preset];
    if (!p) return base;

    const merged: UiSettings = {
        ...base,
        ...p,
        colors: { ...base.colors, ...(p.colors as any) },
        background: { ...base.background, ...(p.background as any) },
        icons: { ...base.icons, ...(p.icons as any) },
        fonts: { ...base.fonts, ...(p.fonts as any) },
        buttons: { ...base.buttons, ...(p.buttons as any) },
    };
    merged.preset = preset;
    return merged;
}
