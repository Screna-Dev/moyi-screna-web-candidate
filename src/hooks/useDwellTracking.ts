import { useEffect, useRef } from 'react';
import { usePostHog } from 'posthog-js/react';
import { safeCapture } from '@/utils/posthog';
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
 * 上报 payload = { ...getProps(), duration_seconds }。
 *
 * 一次访问 = 一个事件，因此事件计数 = 浏览次数，同时带上停留时长。
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

  useEffect(() => {
    startRef.current = Date.now();
    firedRef.current = false;

    const fire = () => {
      if (firedRef.current || !enabledRef.current) return;
      firedRef.current = true;
      const durationSeconds = Math.round((Date.now() - startRef.current) / 1000);
      const props = getPropsRef.current?.() ?? {};
      safeCapture(posthog, eventName, { ...props, duration_seconds: durationSeconds });
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
