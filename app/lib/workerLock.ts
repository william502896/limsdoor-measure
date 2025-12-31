import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

/**
 * lock_key로 단일 실행 보장
 * ttlSeconds 동안 락 유지
 */
export async function acquireLock(lockKey: string, ttlSeconds: number) {
    const sb = supabaseAdmin();
    const now = new Date();
    const lockedUntil = new Date(now.getTime() + ttlSeconds * 1000).toISOString();

    // 1) 현재 row 조회
    const { data: existing, error: selErr } = await sb
        .from("worker_locks")
        .select("lock_key, locked_until")
        .eq("lock_key", lockKey)
        .maybeSingle();

    if (selErr) throw selErr;

    // 2) 없으면 생성
    if (!existing) {
        const { error: insErr } = await sb.from("worker_locks").insert({
            lock_key: lockKey,
            locked_until: lockedUntil,
        });
        if (!insErr) return { ok: true, lockedUntil };
        // race 가능 → 아래 갱신 로직으로 진행
    }

    // 3) expired면 갱신(조건부 업데이트)
    const isExpired = existing && new Date(existing.locked_until).getTime() <= now.getTime();
    if (!isExpired) return { ok: false, reason: "LOCKED" as const };

    const { data: upd, error: updErr } = await sb
        .from("worker_locks")
        .update({ locked_until: lockedUntil })
        .eq("lock_key", lockKey)
        .lte("locked_until", now.toISOString()) // 만료된 경우만 갱신
        .select()
        .maybeSingle();

    if (updErr) throw updErr;
    if (!upd) return { ok: false, reason: "RACE_LOST" as const };
    return { ok: true, lockedUntil };
}
