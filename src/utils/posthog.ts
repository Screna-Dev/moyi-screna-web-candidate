import type { PostHog } from 'posthog-js';
import { getAuthState } from '@/utils/authState';

/**
 * 安全地调用 PostHog capture，即使被广告拦截器阻止也不会抛出错误
 *
 * 每个事件都带上 auth_state（P1）。在这里统一附加，而不是在 60 多个调用点手写：
 * 漏一个就是一条无法归类的事件。调用方显式传的 auth_state 优先 —— 结算型埋点
 * （useDwellTracking）要记录的是进入页面时的状态，不是上报那一刻的。
 *
 * 没有用 PostHog 的 super properties：那是写进 localStorage 的设备级持久属性，
 * 退出时清不干净，会把上一个用户的登录态带给下一个。
 */
export const safeCapture = (posthog: PostHog | null | undefined, eventName: string, properties?: Record<string, any>) => {
  if (!posthog) {
    return;
  }

  try {
    posthog.capture(eventName, { auth_state: getAuthState(), ...properties });
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

