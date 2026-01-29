import type { PostHog } from 'posthog-js';

/**
 * 安全地调用 PostHog capture，即使被广告拦截器阻止也不会抛出错误
 */
export const safeCapture = (posthog: PostHog | null | undefined, eventName: string, properties?: Record<string, any>) => {
  if (!posthog) {
    return;
  }

  try {
    posthog.capture(eventName, properties);
  } catch (error) {
    // 静默处理错误，避免影响用户体验
    // 通常是由于广告拦截器阻止了 PostHog 请求
    if (import.meta.env.MODE === 'development') {
      console.warn('[PostHog] Failed to capture event:', eventName, error);
    }
  }
};

/**
 * 安全地调用 PostHog identify，即使被广告拦截器阻止也不会抛出错误
 */
export const safeIdentify = (
  posthog: PostHog | null | undefined,
  distinctId: string,
  properties?: Record<string, any>
) => {
  if (!posthog) {
    return;
  }

  try {
    posthog.identify(distinctId, properties);
  } catch (error) {
    // 静默处理错误，避免影响用户体验
    if (import.meta.env.MODE === 'development') {
      console.warn('[PostHog] Failed to identify user:', error);
    }
  }
};

