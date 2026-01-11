import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logSecurityEvent } from "@/app/lib/securityLog";

export async function POST(req: Request) {
    const { otp } = await req.json().catch(() => ({ otp: "" }));
    const c = await cookies();

    const saved = c.get("super_admin_otp_code")?.value;
    const ok = saved && String(otp ?? "") === saved;

    await logSecurityEvent({
        action: ok ? "OTP_OK" : "OTP_FAIL",
        success: !!ok,
        path: "/admin/secure-auth",
        meta: {},
    });

    if (!ok) return NextResponse.json({ ok: false }, { status: 401 });

    const res = NextResponse.json({ ok: true });
    res.cookies.set("super_admin_otp_verified", "true", {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 60 * 30,
        path: "/",
    });

    return res;
}
