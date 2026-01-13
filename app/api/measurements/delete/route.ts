import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
        return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    const ids = id.split(",").map((s) => s.trim()).filter(Boolean);
    const sb = supabaseAdmin();

    // 1. Get related schedule IDs FIRST
    const { data: schedules } = await sb
        .from("sc_schedules")
        .select("id")
        .in("measurement_id", ids);

    const scheduleIds = schedules?.map(s => s.id) || [];

    // 2. Delete related purchase_orders (if any schedules exist)
    if (scheduleIds.length > 0) {
        const { error: poError } = await sb
            .from("sc_purchase_orders")
            .delete()
            .in("schedule_id", scheduleIds);

        if (poError) {
            console.error("Failed to delete related purchase orders:", poError);
            return NextResponse.json({ error: "Failed to delete related purchase orders: " + poError.message }, { status: 500 });
        }
    }

    // 3. Delete related schedules
    const { error: scheduleError } = await sb
        .from("sc_schedules")
        .delete()
        .in("measurement_id", ids);

    if (scheduleError) {
        console.error("Failed to delete related schedules:", scheduleError);
        return NextResponse.json({ error: "Failed to delete related schedules: " + scheduleError.message }, { status: 500 });
    }

    // 4. Finally delete the measurements
    const { error } = await sb.from("measurements").delete().in("id", ids);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
