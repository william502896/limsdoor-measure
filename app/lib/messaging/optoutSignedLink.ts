import crypto from "crypto";

export function normalizePhone(p: string) {
    return (p || "").replace(/[^\d]/g, "");
}

// ts는 초 단위
export function signOptout(phone: string, ts: number) {
    const secret = process.env.OPTOUT_SIGNING_SECRET || "";
    if (!secret) throw new Error("OPTOUT_SIGNING_SECRET missing");

    const msg = `${phone}.${ts}`;
    return crypto.createHmac("sha256", secret).update(msg).digest("hex");
}

export function buildOptoutUrl(phoneRaw: string) {
    const base = (process.env.APP_BASE_URL || "").replace(/\/$/, "");
    if (!base) throw new Error("APP_BASE_URL missing");

    const phone = normalizePhone(phoneRaw);
    const ts = Math.floor(Date.now() / 1000);
    const sig = signOptout(phone, ts);

    const url = new URL(base + "/optout");
    url.searchParams.set("p", phone);
    url.searchParams.set("ts", String(ts));
    url.searchParams.set("sig", sig);

    return url.toString();
}

export function verifyOptoutSig(phoneRaw: string, tsRaw: string, sigRaw: string) {
    const phone = normalizePhone(phoneRaw);
    const ts = Number(tsRaw || 0);
    const sig = (sigRaw || "").trim();

    if (!phone || !ts || !sig) return { ok: false as const, reason: "MISSING_PARAMS" };

    const ttl = Number(process.env.OPTOUT_TTL_SECONDS || 2592000); // 기본 30일
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - ts) > ttl) return { ok: false as const, reason: "EXPIRED" };

    const expected = signOptout(phone, ts);

    // Create buffers for timingSafeEqual
    const sigBuffer = Buffer.from(sig);
    const expectedBuffer = Buffer.from(expected);

    if (sigBuffer.length !== expectedBuffer.length) {
        return { ok: false as const, reason: "BAD_SIG" };
    }

    const same = crypto.timingSafeEqual(expectedBuffer, sigBuffer);
    if (!same) return { ok: false as const, reason: "BAD_SIG" };

    return { ok: true as const, phone };
}
