import { NextResponse } from "next/server";

export async function POST() {
    const res = NextResponse.json({ ok: true });

    // Clear Secure Token
    // Clear Secure Token
    res.cookies.set("tier1_admin", "", { path: "/", maxAge: 0 });

    // Clear UI Flag
    res.cookies.set("tier1_ui", "", { path: "/", maxAge: 0 });

    return res;
}
