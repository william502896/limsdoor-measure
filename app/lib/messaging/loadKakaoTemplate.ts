import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { missingKeys } from "./validateVars";
import { renderText } from "./templateRender";
import { normalizeButtons } from "./kakaoButtons";

export type LoadedKakao = {
    ok: boolean;
    reason?: string;

    pfId?: string;
    templateId?: string;
    variables?: Record<string, any>;
    disableSms?: boolean;

    // 솔라피로 넘길 버튼들
    buttons?: any[];

    // 폴백용
    fallbackText?: string;
};

export async function loadKakaoForQueue(job: any): Promise<LoadedKakao> {
    const sb = supabaseAdmin();

    const templateKey: string | null = job.kakao_template_key || null;
    const vars: Record<string, any> = job.kakao_variables || {};
    const overrideButtons = normalizeButtons(job.kakao_buttons);

    // 큐에 pf/template가 이미 박혀있으면 그 값 우선
    let pfId: string | null = job.kakao_pf_id || null;
    let templateId: string | null = job.kakao_template_id || null;
    let disableSms: boolean = !!job.disable_sms;
    let fallbackText: string | null = job.sms_fallback_text || null;
    let buttons: any[] = overrideButtons;

    if (templateKey) {
        const { data: tpl, error } = await sb
            .from("marketing_kakao_templates")
            .select(
                "pf_id, template_id, content, enable_sms_fallback, fallback_text, required_variables, strict_variables, buttons"
            )
            .eq("template_key", templateKey)
            .maybeSingle();

        if (error) return { ok: false, reason: error.message };
        if (!tpl) return { ok: false, reason: "TEMPLATE_NOT_FOUND" };

        pfId = pfId || tpl.pf_id;
        templateId = templateId || tpl.template_id;

        // 버튼: 큐 오버라이드가 있으면 우선, 없으면 템플릿 버튼 사용
        if (!buttons || buttons.length === 0) buttons = normalizeButtons(tpl.buttons);

        // 폴백 SMS: 템플릿의 fallback_text > content 순으로 렌더
        const fbBase = tpl.fallback_text || tpl.content || "";
        fallbackText = fallbackText || renderText(fbBase, vars);

        // disableSms: enable_sms_fallback=false 이면 대체문자 금지
        disableSms = tpl.enable_sms_fallback ? disableSms : true;

        // ✅ 변수 누락 검사(엄격 모드)
        const req = (tpl.required_variables || []) as string[];
        const miss = missingKeys(req, vars);

        if ((tpl.strict_variables ?? true) && miss.length > 0) {
            return {
                ok: false,
                reason: `MISSING_VARS:${miss.join(",")}`,
            };
        }
    }

    if (!pfId || !templateId) return { ok: false, reason: "KAKAO_PF_OR_TEMPLATE_MISSING" };

    return {
        ok: true,
        pfId,
        templateId,
        variables: vars,
        disableSms,
        buttons,
        fallbackText: fallbackText || undefined,
    };
}
