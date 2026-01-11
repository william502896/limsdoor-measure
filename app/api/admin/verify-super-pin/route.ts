import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { logSecurityEvent } from "@/app/lib/securityLog";

// Default to 0000 hash if env not set
const HASH = process.env.SUPER_ADMIN_PIN_HASH || "$2b$10$U0vSJPSXniJdZ2T2thuhvOS8O9E555KtBujPaRImFVTU..aJJqahS";

export async function POST(req: Request) {
    const { pin } = await req.json().catch(() => ({ pin: "" }));
    const ok = await bcrypt.compare(String(pin ?? ""), HASH);

    await logSecurityEvent({
        action: ok ? "PIN_OK" : "PIN_FAIL",
        success: ok,
        path: "/admin/secure-auth",
        meta: {},
    });

    if (!ok) return NextResponse.json({ ok: false }, { status: 401 });

    const res = NextResponse.json({ ok: true });

    // ✅ PIN 통과 쿠키(30분)
    res.cookies.set("super_admin_verified", "true", {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 60 * 30,
        path: "/",
    });

    // OTP는 별도 쿠키에서
    res.cookies.set("super_admin_otp_verified", "false", {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 60 * 30,
        path: "/",
    });

    // Update Layout UI cookie as well
    res.cookies.set("tier1_ui", "1", {
        path: "/",
        maxAge: 60 * 30,
    });

    return res;
}
