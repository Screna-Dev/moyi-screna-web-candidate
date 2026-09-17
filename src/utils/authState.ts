import { hasStoredSession } from '@/services/api';

/**
 * 全站共享的登录态（P1 / F2）。
 *
 * 三个值的含义是「此刻能不能放行」，不是「用户是谁」：
 *   initializing  —— 存储里有 token，但 AuthContext 还没解完，谁也不该被踢
 *   authenticated —— 已放行
 *   anonymous     —— 确定没有会话（公开页上的正常状态，不是污染）
 *
 * 放在模块级而不是 context 里，是因为 safeCapture 是普通函数，在 React 树外
 * 也会被调用；context 只能在组件里读。AuthProvider 负责把状态推进来。
 */
export type AuthState = 'initializing' | 'authenticated' | 'anonymous';

let current: AuthState | null = null;

export const setAuthState = (state: AuthState) => {
  current = state;
};

/**
 * 当前登录态。AuthProvider 推值之前（首帧、以及 React 树外的早期上报）回退到
 * 存储：没有 token 就是确定的 anonymous，有 token 则还在 initializing。
 */
export const getAuthState = (): AuthState => {
  if (current) return current;
  return hasStoredSession() ? 'initializing' : 'anonymous';
};
