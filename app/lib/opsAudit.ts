
import { supabaseAdmin } from "./supabaseAdmin";

type AuditParams = {
    action: string;
    target_type: string;
    target_id?: string;
    company_id?: string;
    meta?: any;
    actor_user_id?: string;
    updated_by?: string; // fallback if actor_ui missing
};

export async function logAudit(action: string, target_type: string, target_id?: string, meta: any = {}) {
    const admin = supabaseAdmin();

    // Try to infer actor from meta if passed
    const actor = meta.updated_by || meta.actor_user_id;
    const company = meta.company_id;

    const { error } = await admin.from("audit_logs").insert({
        action,
        company_id: company || null,
        actor_user_id: actor || null,
        target_type,
        target_id,
        meta
    });

    if (error) {
        console.error("Audit Log Failed:", error);
    }
}
