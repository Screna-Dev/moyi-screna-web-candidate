import type { PostHog } from 'posthog-js';

/**
 * 检查当前路径是否为 admin 页面
 */
const isAdminPage = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.location.pathname.startsWith('/admin');
};

/**
 * 安全地调用 PostHog capture，即使被广告拦截器阻止也不会抛出错误
 * 在 admin 页面自动禁用追踪
 */
export const safeCapture = (posthog: PostHog | null | undefined, eventName: string, properties?: Record<string, any>) => {
  // 在 admin 页面禁用 PostHog 追踪
  if (isAdminPage()) {
    return;
  }

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
 * 在 admin 页面自动禁用追踪
 */
export const safeIdentify = (
  posthog: PostHog | null | undefined,
  distinctId: string,
  properties?: Record<string, any>
) => {
  // 在 admin 页面禁用 PostHog 追踪
  if (isAdminPage()) {
    return;
  }

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

