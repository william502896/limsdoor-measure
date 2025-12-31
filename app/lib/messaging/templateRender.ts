export function renderText(template: string, vars: Record<string, any>) {
    // 지원: #{name}, {{name}}
    return (template || "").replace(/(#\{([^}]+)\})|(\{\{([^}]+)\}\})/g, (m, _a, k1, _b, k2) => {
        const key = (k1 || k2 || "").trim();
        const v = vars?.[key];
        return v === undefined || v === null ? "" : String(v);
    });
}
