export async function logApi(input: {
    request_id: string;
    endpoint: string;
    role?: string | null;
    ok: boolean;
    latency_ms: number;
    meta?: any;
}) {
    // 👉 여기서 Supabase / DB / 로그툴로 저장
    // For now, consistent console logging
    const statusStr = input.ok ? "OK" : "ERROR";
    console.log(`[API LOG] [${input.endpoint}] [${statusStr}] ID:${input.request_id} Role:${input.role} (${input.latency_ms}ms)`);
    if (input.meta) {
        // console.log("Meta:", JSON.stringify(input.meta));
    }
}
