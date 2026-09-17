import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { hasStoredSession } from '@/services/api';
import { getAuthState, setAuthState, type AuthState } from '@/utils/authState';

/**
 * 「此刻能不能放行」的共享判定（F2）。
 *
 * 不能直接用 `isAuthenticated`：AuthContext 要解 token、拉 personal info，首帧
 * 对已登录用户也返回 false，拿它当守卫会把老用户踢到登录页。所以先同步读存储
 * —— 有 token 就是 initializing（等着，别动），没有才是确定的 anonymous。
 *
 * 顺带把结果推给模块级状态，让 React 树外的 safeCapture 读到同一个值（P1）。
 */
export function useAuthGate(): AuthState {
  const { isAuthenticated, isLoading } = useAuth();

  let state: AuthState;
  if (isAuthenticated) state = 'authenticated';
  else if (!hasStoredSession()) state = 'anonymous';
  else state = isLoading ? 'initializing' : 'anonymous';

  useEffect(() => {
    if (getAuthState() !== state) setAuthState(state);
  }, [state]);

  return state;
}
