import type { PostHog } from 'posthog-js';

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;

/**
 * 00 — Acquire: 渠道归因。
 *
 * 应用启动时读取 URL 上的 utm_* 参数与 document.referrer：
 * - posthog.register(utm_*)      → super properties，后续所有事件自动附带；
 * - last_utm_*（$set）           → last-touch 归因，每次带 UTM 访问都覆盖；
 * - initial_utm_* / initial_referrer（$set_once）→ first-touch 归因，只写一次。
 *
 * 与 src/utils/posthog.ts 一致，用 try/catch 静默兜底（广告拦截器等场景）。
 */
export const captureAttribution = (posthog: PostHog | null | undefined) => {
  if (!posthog) {
    return;
  }

  try {
    const params = new URLSearchParams(window.location.search);
    const utms: Record<string, string> = {};
    for (const key of UTM_KEYS) {
      const value = params.get(key);
      if (value) utms[key] = value;
    }

    const referrer = document.referrer || '';
    let isExternalReferrer = false;
    if (referrer) {
      try {
        isExternalReferrer = new URL(referrer).hostname !== window.location.hostname;
      } catch {
        isExternalReferrer = false;
      }
    }

    const hasUtm = Object.keys(utms).length > 0;
    if (!hasUtm && !isExternalReferrer) return;

    // Super properties：后续事件（landing_page_viewed / signup_completed …）自动继承
    if (hasUtm) {
      posthog.register(utms);
    }

    // Person properties：last-touch 覆盖写，first-touch 只写一次
    const setProps: Record<string, string> = {};
    const setOnceProps: Record<string, string> = {};
    for (const [key, value] of Object.entries(utms)) {
      setProps[`last_${key}`] = value;
      setOnceProps[`initial_${key}`] = value;
    }
    if (referrer) {
      setOnceProps.initial_referrer = referrer;
    }
    posthog.setPersonProperties(setProps, setOnceProps);
  } catch (error) {
    // 静默处理错误，避免影响用户体验
    if (import.meta.env.MODE === 'development') {
      console.warn('[PostHog] Failed to capture attribution:', error);
    }
  }
};
