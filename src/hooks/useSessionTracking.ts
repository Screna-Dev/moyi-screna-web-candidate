import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { usePostHog } from 'posthog-js/react';
import { safeCapture } from '@/utils/posthog';
import { useAuth } from '@/contexts/AuthContext';
import { EVENTS } from '@/constants/analyticsEvents';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 分钟无操作视为 session 结束
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

/**
 * Retention 基础设施 —— 上报 session_end。
 *
 * 记录 session_start，路由变化时累加 pages_visited，监听用户操作重置 30 分钟空闲计时器。
 * 在「空闲超时」和「pagehide（关闭/切后台）」时上报 session_end：
 *   { duration_seconds, pages_visited }
 *
 * 仅在已登录时生效。空闲触发后会自动开启新的 session 计时。
 */
export function useSessionTracking() {
  const posthog = usePostHog();
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  const startRef = useRef<number>(Date.now());
  const pagesVisitedRef = useRef<number>(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const authedRef = useRef(isAuthenticated);
  authedRef.current = isAuthenticated;

  // 路由变化 → 累加 pages_visited
  useEffect(() => {
    pagesVisitedRef.current += 1;
  }, [location.pathname]);

  const fireSessionEnd = useRef(() => {});
  fireSessionEnd.current = () => {
    if (!authedRef.current) return;
    const durationSeconds = Math.round((Date.now() - startRef.current) / 1000);
    // 过滤掉没有任何停留的噪声
    if (durationSeconds <= 0 && pagesVisitedRef.current <= 1) return;
    safeCapture(posthog, EVENTS.SESSION_END, {
      duration_seconds: durationSeconds,
      pages_visited: pagesVisitedRef.current,
    });
  };

  useEffect(() => {
    // 登出后重置计时基准，避免跨用户混入
    startRef.current = Date.now();
    pagesVisitedRef.current = 1;

    const resetSession = () => {
      startRef.current = Date.now();
      pagesVisitedRef.current = 1;
    };

    const armIdleTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        fireSessionEnd.current();
        resetSession(); // 空闲后开启新 session
      }, IDLE_TIMEOUT_MS);
    };

    const handleActivity = () => armIdleTimer();
    const handlePageHide = () => fireSessionEnd.current();
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') fireSessionEnd.current();
    };

    if (isAuthenticated) {
      armIdleTimer();
      ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }));
      window.addEventListener('pagehide', handlePageHide);
      document.addEventListener('visibilitychange', handleVisibility);
    }

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, handleActivity));
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isAuthenticated]);
}
