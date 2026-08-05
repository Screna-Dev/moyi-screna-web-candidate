/**
 * Single source of truth for where a user lands right after authenticating.
 *
 * A candidate who hasn't finished onboarding must go to /onboarding-resume —
 * not the dashboard. That's true for every entry point: email signup +
 * verification, plain login, and Google OAuth. Onboarding is where referral
 * source, the invite code, and the resume are collected, and the first 30
 * credits are granted; skipping it leaves the account with 0 credits and a
 * resume upload that will be rejected for insufficient balance.
 *
 * Truth comes from GET /onboarding/progress, so a user who abandons onboarding
 * halfway is sent back on their next login instead of silently escaping it.
 */
import { getOnboardingProgress } from '@/services/OnboardingServices';
import {
  hasCandidateRole,
  hasMentorRole,
  resolvePostLoginPath,
  type RoleBearer,
} from '@/components/mentor/dashboard-mode';

export const ONBOARDING_PATH = '/onboarding-resume';

/** Build /onboarding-resume with the params the page reads. */
export function onboardingPath({ returnTo, ref }: { returnTo?: string; ref?: string } = {}) {
  const params = new URLSearchParams();
  if (returnTo) params.set('returnTo', returnTo);
  if (ref?.trim()) params.set('ref', ref.trim());
  const qs = params.toString();
  return ONBOARDING_PATH + (qs ? `?${qs}` : '');
}

// Mentor-only accounts have no candidate onboarding. Dual-role accounts keep
// their existing chooser flow — /onboarding/* requires the CANDIDATE role, and
// forcing an established mentor through candidate onboarding would be wrong.
function needsCandidateOnboarding(user: RoleBearer): boolean {
  return hasCandidateRole(user) && !hasMentorRole(user);
}

/**
 * Resolve the post-authentication landing path.
 *
 * @param user - the authenticated user (role/roles)
 * @param opts.returnTo - deep link the user was bounced from, if any
 * @param opts.ref - referral code carried in from a referral link
 * @param opts.forceOnboarding - true for a known-new account (just verified
 *   their email, or Google's isFirstLogin). Skips the progress lookup and goes
 *   straight to onboarding, so a progress endpoint that's down can't drop a
 *   brand-new user onto the dashboard with 0 credits.
 */
export async function resolvePostAuthPath(
  user: RoleBearer,
  opts: { returnTo?: string; ref?: string; forceOnboarding?: boolean } = {},
): Promise<string> {
  const { returnTo, ref, forceOnboarding } = opts;
  const fallback = returnTo || resolvePostLoginPath(user);

  if (!needsCandidateOnboarding(user)) return fallback;
  if (forceOnboarding) return onboardingPath({ returnTo, ref });

  try {
    const res = await getOnboardingProgress();
    const data = res?.data as { data?: { completed?: boolean } } | undefined;
    const progress = (data?.data ?? data) as { completed?: boolean } | undefined;
    if (progress?.completed) return fallback;
    return onboardingPath({ returnTo, ref });
  } catch (err) {
    // Progress lookup failed (endpoint down, migration not run). Don't trap a
    // returning user in onboarding over an infrastructure error — let them in.
    console.error('[auth] onboarding progress lookup failed', err);
    return fallback;
  }
}
