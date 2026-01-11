import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { logSecurityEvent } from "@/app/lib/securityLog";

const HASH = process.env.SUPER_ADMIN_PIN_HASH || "$2b$10$U0vSJPSXniJdZ2T2thuhvOS8O9E555KtBujPaRImFVTU..aJJqahS";
const TTL = Number(process.env.DANGER_REAUTH_TTL_SECONDS || 300);

export async function POST(req: Request) {
    const { pin } = await req.json().catch(() => ({ pin: "" }));
    const ok = await bcrypt.compare(String(pin ?? ""), HASH);

    await logSecurityEvent({
        action: ok ? "DANGER_REAUTH_OK" : "DANGER_REAUTH_FAIL",
        success: ok,
        path: "danger-action",
        meta: {},
    });

    if (!ok) return NextResponse.json({ ok: false }, { status: 401 });

    const res = NextResponse.json({ ok: true });
    res.cookies.set("danger_reauth_ok", "true", {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: TTL,
        path: "/",
    });
    return res;
}
