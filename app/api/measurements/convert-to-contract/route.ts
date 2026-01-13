import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { id, deposit_amount, contract_date } = body;

        if (!id) {
            return NextResponse.json({ error: "Measurement ID is required" }, { status: 400 });
        }

        const sb = supabaseAdmin();

        // Get current measurement to calculate payment status
        const { data: measurement, error: fetchError } = await sb
            .from("measurements")
            .select("total_price, material_price")
            .eq("id", id)
            .single();

        if (fetchError || !measurement) {
            return NextResponse.json({ error: "Measurement not found" }, { status: 404 });
        }

        const totalPrice = measurement.total_price || measurement.material_price || 0;
        const depositAmt = Number(deposit_amount) || 0;
        const balanceAmt = Math.max(0, totalPrice - depositAmt);

        // Determine payment status
        let paymentStatus = "UNPAID";
        if (depositAmt > 0 && depositAmt >= totalPrice) {
            paymentStatus = "FULLY_PAID";
        } else if (depositAmt > 0) {
            paymentStatus = "DEPOSIT_PAID";
        }

        // Determine contract status
        let contractStatus = "QUOTE";
        if (depositAmt > 0) {
            contractStatus = paymentStatus === "FULLY_PAID" ? "PRODUCING" : "CONTRACT_CONFIRMED";
        }

        // Update measurement with contract data
        const { error: updateError } = await sb
            .from("measurements")
            .update({
                contract_status: contractStatus,
                deposit_amount: depositAmt > 0 ? depositAmt : null,
                deposit_paid_date: depositAmt > 0 ? new Date().toISOString() : null,
                balance_amount: balanceAmt,
                payment_status: paymentStatus,
                contract_date: contract_date || new Date().toISOString().split('T')[0],
                status: depositAmt > 0 ? "CONTRACTED" : "QUOTE",
            })
            .eq("id", id);

        if (updateError) {
            return NextResponse.json({ error: `Update failed: ${updateError.message}` }, { status: 500 });
        }

        return NextResponse.json({
            ok: true,
            contract_status: contractStatus,
            payment_status: paymentStatus
        });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message ?? "unknown error" }, { status: 500 });
    }
}
