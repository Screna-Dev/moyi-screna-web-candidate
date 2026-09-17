import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthGate } from '@/hooks/useAuthGate';
import { buildAuthPath } from '@/utils/returnTo';

/**
 * 路由级登录守卫（F2）。
 *
 * 关键在于它比页面早一步：以前的拦截全部写在页面自己的 useEffect 或
 * DashboardLayout 里，都在挂载之后才跳转，而 `*_viewed` 埋点就挂在同一批
 * useEffect 上 —— 未登录访客被踢走之前，浏览事件已经发出去了。排查里
 * coaching_viewed / interview_notes_browsed / note_read 虚高 50%–139% 就是这么
 * 来的。这里 anonymous 直接返回 Navigate，子节点根本不进渲染。
 *
 * initializing（存储里有 token，AuthContext 还在解）照常渲染，不挡加载态：
 * 这种访客本来就是登录用户，挡住只会给每个受保护页面加一次白屏，而污染来自
 * 压根没有 token 的访客，已经被上面那条拦掉了。真的失效时仍由 API 层踢出去，
 * 和改动前一样；区别是这期间的事件带 auth_state='initializing'，看板可以把
 * 这段单独排掉，而不会和干净的匿名浏览混在一起。
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const gate = useAuthGate();
  const location = useLocation();

  // replace: 登录页不进历史栈，登录完回到目标后按返回不会弹回登录页。
  if (gate === 'anonymous') {
    return <Navigate to={buildAuthPath(location)} replace />;
  }

  return <>{children}</>;
}

export default RequireAuth;
