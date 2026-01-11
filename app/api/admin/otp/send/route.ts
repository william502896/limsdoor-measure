import { NextResponse } from "next/server";
import { logSecurityEvent } from "@/app/lib/securityLog";

function gen6() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST() {
    const mode = (process.env.OTP_MODE || "mock").toLowerCase();
    const ttl = Number(process.env.OTP_TTL_SECONDS || 300);

    const code = gen6();

    // ✅ 실제 운영은 여기서 SMS/Email 발송으로 교체
    // 지금은 mock: 응답에 코드 포함(테스트용)
    await logSecurityEvent({
        action: "OTP_SENT",
        success: true,
        path: "/admin/secure-auth",
        meta: { mode },
    });

    const res = NextResponse.json(
        mode === "mock" ? { ok: true, mock_code: code, ttl } : { ok: true, ttl }
    );

    // ✅ 서버 쿠키에 OTP 저장(해시로 저장하는게 더 좋지만, MVP는 쿠키로 단순화)
    res.cookies.set("super_admin_otp_code", code, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: ttl,
        path: "/",
    });

    return res;
}
