export function missingKeys(required: string[], vars: Record<string, any>) {
    const v = vars || {};
    return (required || []).filter((k) => v[k] === undefined || v[k] === null || String(v[k]).trim() === "");
}
