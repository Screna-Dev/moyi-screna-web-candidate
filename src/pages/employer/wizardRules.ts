import type { Job } from '@/components/admin/console/pages/employer/types';
import { numberOf } from '@/components/admin/console/pages/employer/views/wizard/logic';
import { closingRange, dateOf } from './jobMapping';

// Validation for the employer wizard's redesigned sections (wizardSections.tsx).

// What step 1 needs from the window. The closing date must be today or later,
// and 3 days to 1 month after the opening date (closingRange).
export function windowSectionErrors(job: Job, today: string, opensLocked = false): Record<string, boolean | string> {
  const opens = dateOf(job.opensAt);
  const closes = dateOf(job.closesAt);
  const range = opens ? closingRange(opens) : null;
  return {
    opensAt: !opensLocked && !opens,
    closesAt: !closes
      ? true
      : closes < today
        ? 'Must be today or later'
        : range && closes < range.min
          ? 'Must be at least 3 days after the opening date'
          : range && closes > range.max
            ? 'Must be within 1 month of the opening date'
            : false,
  };
}

// Step 3. Maximum sponsored candidates and the after-limit choice are form-only.
export function sponsorshipErrors(job: Job): Record<string, boolean | string> {
  if (job.sponsor !== 'employer') return { sponsor: !job.sponsor };
  const max = job.sponsorship.maxCandidates.trim();
  const n = numberOf(max);
  return {
    sponsor: false,
    maxCandidates: !max ? true : !/^\d[\d,]*$/.test(max) || n < 1 ? 'Enter a whole number of 1 or more' : false,
    afterLimit: !job.sponsorship.afterLimit,
  };
}
