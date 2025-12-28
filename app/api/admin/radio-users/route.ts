import { NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/app/lib/supabase";
import { isAdminRequest } from "@/app/lib/adminAuth";

export async function GET(req: Request) {
    // 1. Check Mock Mode FIRST (Bypass Auth if Supabase is missing)
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
    const isMockMode = !supabaseUrl || supabaseUrl.includes("your-project");

    if (isMockMode) {
        const { mockDb } = await import("@/app/lib/mock-db");
        return NextResponse.json({ ok: true, users: mockDb.users });
    }

    // 2. Auth Check (Only for real DB)
    if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

    const { data, error } = await supabase
        .from("radio_users")
        .select("id, phone, name, role, status, created_at, updated_at")
        .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, users: data });
}

const patchSchema = z.object({
    id: z.string().uuid(),
    status: z.enum(["APPROVED", "REJECTED", "BLOCKED", "PENDING"]),
    role: z.enum(["admin", "field", "install", "customer"]).optional(),
});

export async function PATCH(req: Request) {
    // 1. Check Mock Mode FIRST
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
    const isMockMode = !supabaseUrl || supabaseUrl.includes("your-project");

    if (isMockMode) {
        // Need to parse body manually for mock
        const body = await req.json().catch(() => ({}));
        // We can skip full schema validation for mock or do partial
        const { id, status, role } = body;

        const { mockDb } = await import("@/app/lib/mock-db");
        const updated = mockDb.update(id, { status, role });
        return NextResponse.json({ ok: true, user: updated });
    }

    // 2. Auth Check (only for real DB)
    if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });

    const { id, status, role } = parsed.data;

    const update: any = { status };
    if (role) update.role = role;

    const { data, error } = await supabase
        .from("radio_users")
        .update(update)
        .eq("id", id)
        .select("id, phone, name, role, status")
        .single();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, user: data });
}
