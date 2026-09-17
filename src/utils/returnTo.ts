/**
 * 回跳目标的产生端（F3）。
 *
 * 消费端早就齐了 —— auth.tsx 读 ?returnTo=，resolvePostAuthPath 把它带过邮箱
 * 验证、Google state 和 onboarding。缺的一直是产生端：撞墙跳转写的是
 * `state: { from }`，而 auth.tsx 不读 location.state，目标当场丢失。
 * 所有跳往登录页的地方都应该走 buildAuthPath()。
 */
const AUTH_PATHS = ['/auth', '/register'];

export interface PathParts {
  pathname: string;
  search?: string;
  hash?: string;
}

/** 站内绝对路径 + query + hash；这是 returnTo 的唯一格式。 */
export const targetFromLocation = (loc: PathParts): string =>
  `${loc.pathname}${loc.search ?? ''}${loc.hash ?? ''}`;

/**
 * 只放行站内绝对路径。`//evil.com` 在浏览器里是协议相对 URL，会跳出站外，
 * 所以单个 `/` 开头是硬条件；指回登录页的目标直接丢弃，否则登录完又回到登录页。
 */
export const sanitizeReturnTo = (raw: string | null | undefined): string => {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '';
  const path = raw.split(/[?#]/)[0];
  if (AUTH_PATHS.includes(path) || path.startsWith('/auth/')) return '';
  return raw;
};

/**
 * `/auth?returnTo=<目标>`。目标无效或缺失时退回裸 `/auth`，让
 * resolvePostAuthPath 按角色决定落点 —— 没有来源历史时不制造循环。
 */
export const buildAuthPath = (target?: string | PathParts | null): string => {
  const raw = typeof target === 'string' ? target : target ? targetFromLocation(target) : '';
  const safe = sanitizeReturnTo(raw);
  return safe ? `/auth?returnTo=${encodeURIComponent(safe)}` : '/auth';
};
