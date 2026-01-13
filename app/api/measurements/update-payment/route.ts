import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { id, deposit_amount, balance_amount, payment_type } = body;

        if (!id) {
            return NextResponse.json({ error: "Measurement ID is required" }, { status: 400 });
        }

        const sb = supabaseAdmin();

        // Get current measurement
        const { data: measurement, error: fetchError } = await sb
            .from("measurements")
            .select("total_price, material_price, deposit_amount, balance_amount")
            .eq("id", id)
            .single();

        if (fetchError || !measurement) {
            return NextResponse.json({ error: "Measurement not found" }, { status: 404 });
        }

        const totalPrice = measurement.total_price || measurement.material_price || 0;
        let currentDeposit = measurement.deposit_amount || 0;
        let currentBalance = measurement.balance_amount || 0;

        const updates: any = {};

        // Update based on payment type
        if (payment_type === "deposit") {
            currentDeposit = Number(deposit_amount) || 0;
            currentBalance = Math.max(0, totalPrice - currentDeposit);
            updates.deposit_amount = currentDeposit;
            updates.deposit_paid_date = new Date().toISOString();
            updates.balance_amount = currentBalance;
        } else if (payment_type === "balance") {
            currentBalance = Number(balance_amount) || 0;
            updates.balance_amount = 0; // Paid
            updates.balance_paid_date = new Date().toISOString();
        }

        // Determine payment status
        const totalPaid = currentDeposit + (payment_type === "balance" ? currentBalance : 0);
        let paymentStatus = "UNPAID";
        let contractStatus = measurement.contract_status || "QUOTE";

        if (totalPaid >= totalPrice && totalPaid > 0) {
            paymentStatus = "FULLY_PAID";
            contractStatus = "PRODUCING"; // Move to production when fully paid
        } else if (currentDeposit > 0) {
            paymentStatus = "DEPOSIT_PAID";
            contractStatus = "CONTRACT_CONFIRMED";
        }

        updates.payment_status = paymentStatus;
        updates.contract_status = contractStatus;
        if (paymentStatus !== "UNPAID") {
            updates.status = "CONTRACTED";
        }

        // Update measurement
        const { error: updateError } = await sb
            .from("measurements")
            .update(updates)
            .eq("id", id);

        if (updateError) {
            return NextResponse.json({ error: `Update failed: ${updateError.message}` }, { status: 500 });
        }

        return NextResponse.json({
            ok: true,
            payment_status: paymentStatus,
            contract_status: contractStatus
        });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message ?? "unknown error" }, { status: 500 });
    }
}
