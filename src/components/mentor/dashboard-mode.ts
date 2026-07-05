/**
 * Dashboard-mode helpers for accounts that carry both the CANDIDATE and MENTOR
 * roles. These users choose which experience to enter via the chooser screen
 * (`/select-dashboard`) and can flip between the two from a sidebar control.
 *
 * The chosen mode is persisted so a returning dual-role user lands back where
 * they left off instead of seeing the chooser every time. Single-role users
 * never see the chooser and ignore the persisted value.
 */

export type DashboardMode = 'candidate' | 'mentor';

// Persisted preferred dashboard for dual-role users.
const DASHBOARD_MODE_KEY = 'screna_dashboard_mode';

// Routes each mode points at.
export const MENTOR_DASHBOARD_PATH = '/mentor-dashboard';
export const CANDIDATE_DASHBOARD_PATH = '/dashboard';
export const SELECT_DASHBOARD_PATH = '/select-dashboard';

type RoleBearer = { role?: string; roles?: string[] } | null | undefined;

// All roles for an account, upper-cased, de-duplicated. Falls back to the
// single `role` field for tokens decoded before `roles[]` was available.
function normalizedRoles(user: RoleBearer): string[] {
  if (!user) return [];
  const list = (user.roles && user.roles.length ? user.roles : [user.role])
    .filter((r): r is string => typeof r === 'string' && r.length > 0)
    .map((r) => r.toUpperCase());
  return Array.from(new Set(list));
}

export function hasMentorRole(user: RoleBearer): boolean {
  return normalizedRoles(user).includes('MENTOR');
}

export function hasCandidateRole(user: RoleBearer): boolean {
  return normalizedRoles(user).includes('CANDIDATE');
}

// A user who can switch between both dashboards.
export function isDualRole(user: RoleBearer): boolean {
  return hasMentorRole(user) && hasCandidateRole(user);
}

export function getStoredDashboardMode(): DashboardMode | null {
  const v = localStorage.getItem(DASHBOARD_MODE_KEY);
  return v === 'candidate' || v === 'mentor' ? v : null;
}

export function setStoredDashboardMode(mode: DashboardMode): void {
  localStorage.setItem(DASHBOARD_MODE_KEY, mode);
}

export function clearStoredDashboardMode(): void {
  localStorage.removeItem(DASHBOARD_MODE_KEY);
}

// Where to send a user right after authentication.
//  - dual-role  → remembered choice, else the chooser screen
//  - mentor only → mentor dashboard
//  - everyone else (candidate / admin handled separately) → candidate dashboard
export function resolvePostLoginPath(user: RoleBearer): string {
  if (isDualRole(user)) {
    const stored = getStoredDashboardMode();
    if (stored === 'mentor') return MENTOR_DASHBOARD_PATH;
    if (stored === 'candidate') return CANDIDATE_DASHBOARD_PATH;
    return SELECT_DASHBOARD_PATH;
  }
  if (hasMentorRole(user)) return MENTOR_DASHBOARD_PATH;
  return CANDIDATE_DASHBOARD_PATH;
}
