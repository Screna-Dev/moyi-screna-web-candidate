import { useEffect, useRef } from 'react';
import { usePostHog } from 'posthog-js/react';
import { safeCapture } from '@/utils/posthog';
import { getAuthState, type AuthState } from '@/utils/authState';
import type { AnalyticsEventName } from '@/constants/analyticsEvents';

interface UseDwellTrackingOptions {
  /** 为 false 时不上报（例如数据还没加载完）。默认 true。 */
  enabled?: boolean;
}

/**
 * 复用的「进入页面 → 离开时记录 duration_seconds」埋点 hook。
 *
 * 行为：挂载时记录起始时间；在以下任一时机**只上报一次**（用 ref 去重）：
 *   - 组件卸载（SPA 内部跳转）
 *   - pagehide / visibilitychange→hidden（关闭标签页或切到后台）
 * 上报 payload = { ...getProps(), duration_seconds, entry_path, auth_state,
 * auth_state_at_end }。
 *
 * 一次访问 = 一个事件，因此事件计数 = 浏览次数，同时带上停留时长。
 *
 * 归因用的是 entry_path 和挂载时的 auth_state，不是上报那一刻的（P2）。这两者
 * 经常不同：用户在 /experience/:id 上被 API 层踢到 /auth，组件卸载时 fire() 才
 * 跑，事件身上的 $current_url 已经是登录页，时长也是 0 秒。排查里那 69 条落在
 * /auth 的 note_read 就是这么来的 —— 它们不是「在 /auth 上发生的浏览」，而是
 * 「在功能页发生、在 /auth 上结算」。auth_state_at_end 只作辅助诊断。
 *
 * @param eventName 事件名（来自 EVENTS 常量）
 * @param getProps  上报时调用，返回最新的附加属性（用函数以拿到最新 state）
 * @param options   { enabled }
 */
export function useDwellTracking(
  eventName: AnalyticsEventName,
  getProps?: () => Record<string, any>,
  options: UseDwellTrackingOptions = {}
) {
  const { enabled = true } = options;
  const posthog = usePostHog();

  // 用 ref 持有最新的依赖，避免 effect 反复重建导致计时被重置
  const getPropsRef = useRef(getProps);
  getPropsRef.current = getProps;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const startRef = useRef<number>(Date.now());
  const firedRef = useRef(false);
  const entryPathRef = useRef<string>('');
  const entryAuthStateRef = useRef<AuthState>('initializing');

  useEffect(() => {
    startRef.current = Date.now();
    firedRef.current = false;
    entryPathRef.current = window.location.pathname;
    entryAuthStateRef.current = getAuthState();

    const fire = () => {
      if (firedRef.current || !enabledRef.current) return;
      firedRef.current = true;
      const durationSeconds = Math.round((Date.now() - startRef.current) / 1000);
      const props = getPropsRef.current?.() ?? {};
      safeCapture(posthog, eventName, {
        ...props,
        duration_seconds: durationSeconds,
        entry_path: entryPathRef.current,
        // safeCapture 默认填的是「此刻」，这里要的是进入页面时的状态
        auth_state: entryAuthStateRef.current,
        auth_state_at_end: getAuthState(),
      });
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') fire();
    };

    window.addEventListener('pagehide', fire);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('pagehide', fire);
      document.removeEventListener('visibilitychange', handleVisibility);
      fire();
    };
    // 只在挂载/卸载时绑定；eventName 在调用处是常量
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventName, posthog]);
}
