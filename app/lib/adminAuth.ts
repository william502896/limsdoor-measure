import { verifyTier1Token } from "@/app/lib/adminTier1";

export async function isAdminRequest(req: Request) {
    const key = req.headers.get("x-admin-key");
    if (key && process.env.ADMIN_MASTER_KEY && key === process.env.ADMIN_MASTER_KEY) {
        return true;
    }

    // Check Cookie
    const cookieHeader = req.headers.get("cookie") || "";
    const match = cookieHeader.match(/tier1_admin=([^;]+)/);
    const token = match ? match[1] : null;

    if (token) {
        const secret = process.env.ADMIN_TIER1_COOKIE_SECRET || "";
        if (!secret) return false;
        const result = await verifyTier1Token(secret, token);
        return result.ok;
    }

    return false;
}
