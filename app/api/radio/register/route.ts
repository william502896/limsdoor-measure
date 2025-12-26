import { NextResponse } from "next/server";
import { z } from "zod";


const schema = z.object({
    phone: z.string().min(9),
    name: z.string().min(1),
    role: z.enum(["field", "install", "customer", "admin"]).optional(),
});

import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
    }

    const { phone, name, role } = parsed.data;

    // DYNAMIC CLIENT INIT OR MOCK FALLBACK
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
    const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();

    let supabase;
    const isMockMode = !supabaseUrl || !supabaseKey || supabaseUrl.includes("your-project");

    if (isMockMode) {
        console.log("⚠️ Supabase credentials missing/invalid. Using MOCK MODE.");
        const { mockDb } = await import("@/app/lib/mock-db");

        const user = mockDb.upsert({ phone, name, role, status: "PENDING" });
        return NextResponse.json({ ok: true, user });
    }

    try {
        supabase = createClient(supabaseUrl, supabaseKey);
    } catch (e) {
        console.error("Supabase Init Error:", e);
        return NextResponse.json({ ok: false, error: "Supabase Client Init Failed" }, { status: 500 });
    }

    // PENDING으로 등록 (중복은 업데이트)
    console.log("Registering radio user (Supabase):", { phone, name, role });

    try {
        const { data, error } = await supabase
            .from("radio_users")
            .upsert(
                { phone, name, role: role ?? "field", status: "PENDING" },
                { onConflict: "phone" }
            )
            .select("id, phone, name, role, status")
            .single();

        if (error) {
            console.error("Supabase Query Error:", error);
            if (error.message.includes("fetch failed")) {
                return NextResponse.json({ ok: false, error: "Network Error: Cannot connect to Supabase. Check URL." }, { status: 500 });
            }
            return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true, user: data });

    } catch (e: any) {
        console.error("Unexpected Error:", e);
        return NextResponse.json({ ok: false, error: "Unexpected Error: " + (e.message || e) }, { status: 500 });
    }
}
