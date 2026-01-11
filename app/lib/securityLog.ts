import { headers } from "next/headers";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export async function logSecurityEvent(params: {
    actor_user_id?: string | null;
    actor_email?: string | null;
    action: string;
    success: boolean;
    path?: string | null;
    meta?: any;
}) {
    try {
        const h = await headers();
        const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
        const ua = h.get("user-agent") ?? null;

        const sb = supabaseAdmin();
        await sb.from("admin_security_events").insert({
            actor_user_id: params.actor_user_id ?? null,
            actor_email: params.actor_email ?? null,
            action: params.action,
            success: params.success,
            ip,
            user_agent: ua,
            path: params.path ?? null,
            meta: params.meta ?? {},
        });
    } catch {
        // 로그 실패는 기능 자체를 막지 않음
    }
}
