import type { PostHog } from 'posthog-js';
import { safeCapture } from '@/utils/posthog';
import { EVENTS } from '@/constants/analyticsEvents';

/**
 * Retention 相关工具 —— Day 0 = onboarding_completed 完成日。
 * 用于计算 app_opened 事件里的 days_since_onboarding。
 */
const ONBOARDING_COMPLETED_AT_KEY = 'screna_onboarding_completed_at';

/**
 * 触发 onboarding_completed 并记录 Day 0。
 * 三个 onboarding 流程都通过此函数上报，传入不同的 flow_type 以区分。
 */
export const markOnboardingComplete = (
  posthog: PostHog | null | undefined,
  flowType: string,
  properties?: Record<string, any>
) => {
  const completedAt = new Date().toISOString();
  try {
    // 仅在首次完成时写入 Day 0（避免重复 onboarding 覆盖留存基准日）
    if (!localStorage.getItem(ONBOARDING_COMPLETED_AT_KEY)) {
      localStorage.setItem(ONBOARDING_COMPLETED_AT_KEY, completedAt);
    }
  } catch {
    // localStorage 不可用时静默忽略
  }

  safeCapture(posthog, EVENTS.ONBOARDING_COMPLETED, {
    flow_type: flowType,
    // 同步落 person property：days_since_onboarding 口径不再依赖单设备 localStorage，
    // 存量 null 的回填也以此属性为准（$set_once 保证 Day 0 不被重复 onboarding 覆盖）。
    $set_once: { onboarding_completed_at: completedAt },
    ...properties,
  });
};

/**
 * 距离 Day 0 的整天数；没有记录时返回 null（PostHog 无法出留存曲线时即为 null）。
 */
export const getDaysSinceOnboarding = (): number | null => {
  try {
    const raw = localStorage.getItem(ONBOARDING_COMPLETED_AT_KEY);
    if (!raw) return null;
    const start = new Date(raw).getTime();
    if (Number.isNaN(start)) return null;
    const diffMs = Date.now() - start;
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  } catch {
    return null;
  }
};
