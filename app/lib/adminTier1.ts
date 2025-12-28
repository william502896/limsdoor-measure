export type Tier1TokenPayload = {
    v: 1;
    exp: number; // unix ms
};

function base64UrlEncode(bytes: Uint8Array) {
    const b64 = Buffer.from(bytes).toString("base64");
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function base64UrlDecodeToBytes(s: string) {
    const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
    return new Uint8Array(Buffer.from(b64, "base64"));
}

async function hmacSha256(secret: string, data: Uint8Array) {
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret) as BufferSource,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, data as BufferSource);
    return new Uint8Array(sig);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array) {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
}

export async function signTier1Token(secret: string, ttlMs: number) {
    const payload: Tier1TokenPayload = { v: 1, exp: Date.now() + ttlMs };
    const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
    const payloadB64 = base64UrlEncode(payloadBytes);

    const sigBytes = await hmacSha256(secret, new TextEncoder().encode(payloadB64));
    const sigB64 = base64UrlEncode(sigBytes);

    return `${payloadB64}.${sigB64}`;
}

export async function verifyTier1Token(secret: string, token: string) {
    try {
        const [payloadB64, sigB64] = token.split(".");
        if (!payloadB64 || !sigB64) return { ok: false as const };

        const expectedSig = await hmacSha256(secret, new TextEncoder().encode(payloadB64));
        const gotSig = base64UrlDecodeToBytes(sigB64);
        if (!timingSafeEqual(expectedSig, gotSig)) return { ok: false as const };

        const payloadBytes = base64UrlDecodeToBytes(payloadB64);
        const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as Tier1TokenPayload;
        if (payload.v !== 1) return { ok: false as const };
        if (Date.now() > payload.exp) return { ok: false as const };

        return { ok: true as const, payload };
    } catch {
        return { ok: false as const };
    }
}
