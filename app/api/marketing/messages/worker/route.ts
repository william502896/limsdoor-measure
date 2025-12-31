import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { acquireLock } from "@/app/lib/workerLock";
import { sendMessage } from "@/app/lib/messaging/sendMessage";
import { renderText } from "@/app/lib/messaging/templateRender";
import { loadKakaoForQueue } from "@/app/lib/messaging/loadKakaoTemplate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key") || "";
  return key && process.env.CRON_SECRET && key === process.env.CRON_SECRET;
}

function kstNow() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60_000;
  return new Date(utc + 9 * 60 * 60_000);
}

function isQuietHoursKST() {
  const start = Number(process.env.QUIET_HOURS_START ?? 21); // 21시
  const end = Number(process.env.QUIET_HOURS_END ?? 9);     // 9시
  const h = kstNow().getHours();

  // 예: 21~9 (자정跨) 케이스
  if (start > end) return h >= start || h < end;
  // 예: 2~6 같은 케이스
  return h >= start && h < end;
}

// QUIET_HOURS_DEFER_TO="09:05" 형태
function nextKstTimeIso(hhmm = "09:05") {
  const [hh, mm] = hhmm.split(":").map((x) => Number(x));
  const d = kstNow();
  // 오늘 이미 지났으면 내일로
  const target = new Date(d);
  target.setHours(hh, mm || 0, 0, 0);
  if (target.getTime() <= d.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  // 다시 UTC ISO로 변환(서버는 UTC일 수 있으므로)
  const utcMs = target.getTime() - 9 * 60 * 60_000;
  return new Date(utcMs).toISOString();
}

function normalizePhone(p: string) {
  return (p || "").replace(/[^\d]/g, "");
}

/**
 * 백오프(재시도 대기 시간) 규칙
 * 1회 실패: 2분
 * 2회 실패: 10분
 * 3회 실패: 30분
 */
function computeBackoffMinutes(attemptsAfterFail: number) {
  if (attemptsAfterFail <= 1) return 2;
  if (attemptsAfterFail === 2) return 10;
  return 30;
}

function addMinutes(iso: string, minutes: number) {
  const t = new Date(iso).getTime() + minutes * 60 * 1000;
  return new Date(t).toISOString();
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const sb = supabaseAdmin();

  try {
    // ✅ 1) 전역 락(중복 실행 방지) - 8분 락
    const lock = await acquireLock("marketing_messages_worker", 8 * 60);
    if (!lock.ok) {
      return NextResponse.json({
        ok: true,
        worker: "messages",
        skipped: true,
        reason: lock.reason,
        tookMs: Date.now() - startedAt,
      });
    }

    const nowIso = new Date().toISOString();
    const BATCH = Number(process.env.MESSAGE_WORKER_BATCH || 30);

    // ✅ 2) “SENDING이 너무 오래된 것”을 READY로 되돌리기 (크래시/타임아웃 복구)
    const SENDING_STALE_MIN = Number(process.env.SENDING_STALE_MIN || 15);
    const staleCutoff = addMinutes(nowIso, -SENDING_STALE_MIN);

    await sb
      .from("marketing_message_queue")
      .update({
        status: "READY",
        sending_at: null,
        last_error: "Recovered from stale SENDING",
        last_error_at: nowIso,
      })
      .eq("status", "SENDING")
      .lte("sending_at", staleCutoff);

    // ✅ 3) READY 작업 가져오기(재시도 포함)
    const { data: candidates, error: selErr } = await sb
      .from("marketing_message_queue")
      .select("id, to_phone, to_name, msg_type, text, attempts, max_attempts, next_retry_at, kakao_template_key, kakao_pf_id, kakao_template_id, kakao_variables, sms_fallback_text, disable_sms")
      .eq("status", "READY")
      .lte("scheduled_at", nowIso)
      .or(`next_retry_at.is.null, next_retry_at.lte.${nowIso}`)
      .order("scheduled_at", { ascending: true })
      .limit(BATCH);

    if (selErr) throw selErr;

    if (!candidates || candidates.length === 0) {
      return NextResponse.json({
        ok: true,
        worker: "messages",
        lockedUntil: lock.lockedUntil,
        fetched: 0,
        sent: 0,
        failed: 0,
        tookMs: Date.now() - startedAt,
      });
    }

    // ✅ 폭주 방지: 1회 실행에서 최대 N건만 처리
    const HARD_CAP = Number(process.env.HARD_CAP_PER_RUN || 30);
    const limitedCandidates = (candidates || []).slice(0, HARD_CAP);

    // ✅ 4) 점유: READY → SENDING (먼저 잡아두기)
    const ids = limitedCandidates.map((c) => c.id);

    // “내가 가져온 것만” SENDING으로 변경
    const { data: claimed, error: claimErr } = await sb
      .from("marketing_message_queue")
      .update({ status: "SENDING", sending_at: nowIso })
      .in("id", ids)
      .eq("status", "READY")
      .select("id, to_phone, msg_type, text, attempts, max_attempts, kakao_template_key, kakao_pf_id, kakao_template_id, kakao_variables, sms_fallback_text, disable_sms");

    if (claimErr) throw claimErr;

    const jobs = claimed || [];

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    // ✅ 5) 실제 발송
    for (const job of jobs) {
      // ✅ 야간 발송 차단: QUIET HOURS면 다음 시간으로 이월
      if (isQuietHoursKST()) {
        const deferTo = process.env.QUIET_HOURS_DEFER_TO || "09:05";
        const nextIso = nextKstTimeIso(deferTo);

        await sb.from("marketing_message_queue").update({
          status: "READY",
          sending_at: null,
          next_retry_at: nextIso,     // 다음 발송 시각으로 이월
          last_error: `DEFERRED_QUIET_HOURS:${deferTo}`,
          last_error_at: nowIso,
        }).eq("id", job.id);

        skipped++;
        continue;
      }

      // ✅ 수신번호 정규화
      const toPhone = normalizePhone((job as any).to_phone || "");

      // ✅ 1) 수신거부(Opt-out)면 즉시 SKIPPED
      {
        const { data: opt } = await sb
          .from("marketing_optouts")
          .select("phone")
          .eq("phone", toPhone)
          .maybeSingle();

        if (opt) {
          await sb.from("marketing_message_queue").update({
            status: "SKIPPED",
            sending_at: null,
            next_retry_at: null,
            fail_reason: "OPTOUT",
            last_error: "OPTOUT_BLOCKED",
            last_error_at: nowIso,
          }).eq("id", job.id);

          skipped++;
          continue;
        }
      }

      // ✅ 2) 블랙리스트(번호/키워드) 차단
      {
        // 번호 차단
        const { data: blkPhone } = await sb
          .from("marketing_blocklist")
          .select("id")
          .eq("enabled", true)
          .eq("phone", toPhone)
          .limit(1);

        if (blkPhone && blkPhone.length > 0) {
          await sb.from("marketing_message_queue").update({
            status: "SKIPPED",
            sending_at: null,
            next_retry_at: null,
            fail_reason: "BLOCKLIST_PHONE",
            last_error: "BLOCKED_BY_BLOCKLIST_PHONE",
            last_error_at: nowIso,
          }).eq("id", job.id);

          skipped++;
          continue;
        }

        // 키워드 차단(메시지 내용 기준)
        const text = String((job as any).text || "");
        if (text) {
          const { data: blkKeywords } = await sb
            .from("marketing_blocklist")
            .select("keyword")
            .eq("enabled", true)
            .not("keyword", "is", null)
            .limit(200);

          const hit = (blkKeywords || []).find((r: any) => {
            const kw = String(r.keyword || "").trim();
            return kw && text.includes(kw);
          });

          if (hit) {
            await sb.from("marketing_message_queue").update({
              status: "SKIPPED",
              sending_at: null,
              next_retry_at: null,
              fail_reason: "BLOCKLIST_KEYWORD",
              last_error: `BLOCKED_BY_KEYWORD:${String(hit.keyword).slice(0, 50)}`,
              last_error_at: nowIso,
            }).eq("id", job.id);

            skipped++;
            continue;
          }
        }
      }

      // ✅ 3) 같은 번호 일일 발송 제한(선택, 강추)
      {
        const maxDaily = Number(process.env.MAX_DAILY_PER_PHONE || 0);
        if (maxDaily > 0) {
          // KST 오늘 00:00
          const todayStartIsoKst = (() => {
            const d = kstNow();
            d.setHours(0, 0, 0, 0);
            const utcMs = d.getTime() - 9 * 60 * 60_000;
            return new Date(utcMs).toISOString();
          })();

          const { count } = await sb
            .from("marketing_message_queue")
            .select("*", { count: "exact", head: true })
            .eq("status", "SENT")
            .eq("to_phone", toPhone)
            .gte("sent_at", todayStartIsoKst);

          if ((count || 0) >= maxDaily) {
            await sb.from("marketing_message_queue").update({
              status: "SKIPPED",
              sending_at: null,
              next_retry_at: null,
              fail_reason: "DAILY_CAP",
              last_error: `DAILY_CAP_EXCEEDED:${maxDaily}`,
              last_error_at: nowIso,
            }).eq("id", job.id);

            skipped++;
            continue;
          }
        }
      }

      // 최대 시도 초과면 FAILED로 확정
      const attempts = Number(job.attempts || 0);
      const maxAttempts = Number(job.max_attempts || 3);

      if (attempts >= maxAttempts) {
        skipped++;
        await sb
          .from("marketing_message_queue")
          .update({
            status: "FAILED",
            sending_at: null,
            last_error: "Max attempts exceeded",
            last_error_at: nowIso,
          })
          .eq("id", job.id);
        continue;
      }

      try {
        let res;

        if ((job as any).msg_type === "KAKAO") {
          const loaded = await loadKakaoForQueue(job);

          if (!loaded.ok) {
            await sb
              .from("marketing_message_queue")
              .update({
                status: "FAILED",
                sending_at: null,
                fail_reason: "KAKAO_TEMPLATE_INVALID",
                last_error: loaded.reason || "KAKAO_TEMPLATE_INVALID",
                last_error_at: nowIso,
                next_retry_at: null,
              })
              .eq("id", job.id);

            failed++;
            continue;
          }

          res = await sendMessage({
            to: (job as any).to_phone,
            text: (job as any).text || "",
            type: "KAKAO",
            kakao: {
              pfId: loaded.pfId!,
              templateId: loaded.templateId!,
              variables: loaded.variables || {},
              disableSms: !!loaded.disableSms,
              buttons: loaded.buttons || [],
            },
            fallbackText: loaded.fallbackText,
          });
        } else {
          // 기존 SMS/LMS 처리 그대로
          res = await sendMessage({
            to: job.to_phone,
            text: job.text,
            type: (job.msg_type as any) || "SMS",
            subject: "림스도어 안내",
          });
        }

        if (res.ok) {
          sent++;
          await sb
            .from("marketing_message_queue")
            .update({
              status: "SENT",
              provider: res.provider,
              provider_message_id: res.messageId || null,
              sent_at: nowIso,
              sending_at: null,
              fail_reason: null,
              last_error: null,
              last_error_at: null,
              next_retry_at: null,
            })
            .eq("id", job.id);
        } else {
          // 실패 → attempts +1, next_retry_at 설정, status READY로 복귀
          failed++;
          const nextAttempts = attempts + 1;
          const backoffMin = computeBackoffMinutes(nextAttempts);
          const retryAt = addMinutes(nowIso, backoffMin);

          await sb
            .from("marketing_message_queue")
            .update({
              status: nextAttempts >= maxAttempts ? "FAILED" : "READY",
              sending_at: null,
              attempts: nextAttempts,
              next_retry_at: nextAttempts >= maxAttempts ? null : retryAt,
              fail_reason: "PROVIDER_FAILED",
              provider: res.provider,
              last_error: res.error || "PROVIDER_FAILED",
              last_error_at: nowIso,
            })
            .eq("id", job.id);
        }
      } catch (e: any) {
        // 예외 실패도 동일하게 재시도
        failed++;
        const nextAttempts = attempts + 1;
        const backoffMin = computeBackoffMinutes(nextAttempts);
        const retryAt = addMinutes(nowIso, backoffMin);

        await sb
          .from("marketing_message_queue")
          .update({
            status: nextAttempts >= maxAttempts ? "FAILED" : "READY",
            sending_at: null,
            attempts: nextAttempts,
            next_retry_at: nextAttempts >= maxAttempts ? null : retryAt,
            fail_reason: "SEND_ERROR",
            last_error: e?.message || "SEND_ERROR",
            last_error_at: nowIso,
          })
          .eq("id", job.id);
      }
    }

    return NextResponse.json({
      ok: true,
      worker: "messages",
      lockedUntil: lock.lockedUntil,
      candidates: candidates.length,
      claimed: jobs.length,
      sent,
      failed,
      skipped,
      tookMs: Date.now() - startedAt,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, worker: "messages", error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
