/**
 * Quick Mock one-click defaults — spec §3 level mapping (years-driven, live as of
 * 2026-08-20) and the role resolution that keeps `role` inside the question
 * bank's vocabulary.
 */
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_LEVEL,
  LEVELS,
  companySlug,
  inferLevel,
  latestExperienceTitle,
  matchRoleToOptions,
  mostCommonRole,
} from '@/utils/quickMockDefaults';

describe('inferLevel', () => {
  it('exposes the four API levels, defaulting to Intermediate', () => {
    expect(LEVELS).toEqual(['Junior', 'Intermediate', 'Senior', 'Staff']);
    expect(DEFAULT_LEVEL).toBe('Intermediate');
  });

  it('defaults to Intermediate with no resume', () => {
    const out = inferLevel(null);
    expect(out.level).toBe('Intermediate');
    expect(out.source).toBe('default');
    expect(out.reason).toBe('no_resume');
  });

  it('defaults to Intermediate when the parse produced no usable signal', () => {
    const out = inferLevel({ totalYearsExperience: 0, latestTitle: '' });
    expect(out.level).toBe('Intermediate');
    expect(out.reason).toBe('no_resume');
  });

  // Spec §3 bands, driven by the resume's parsed years.
  it('maps years onto the level bands', () => {
    expect(inferLevel({ totalYearsExperience: 1 }).level).toBe('Junior');
    expect(inferLevel({ totalYearsExperience: 3 }).level).toBe('Intermediate');
    expect(inferLevel({ totalYearsExperience: 5 }).level).toBe('Senior');
    expect(inferLevel({ totalYearsExperience: 12 }).level).toBe('Senior');
    expect(inferLevel({ totalYearsExperience: 3 }).reason).toBe('years_experience');
  });

  it('lets a staff-band title promote past the years bands', () => {
    const out = inferLevel({ totalYearsExperience: 3, latestTitle: 'Staff Engineer' });
    expect(out.level).toBe('Staff');
    expect(out.reason).toBe('title_signal');
    expect(inferLevel({ totalYearsExperience: 9, latestTitle: 'Principal PM' }).level).toBe('Staff');
  });

  // A role name is not a seniority claim — this used to promote every PM.
  it('does not treat Manager/Director titles as seniority signals', () => {
    expect(inferLevel({ totalYearsExperience: 1, latestTitle: 'Product Manager' }).level).toBe('Junior');
    expect(inferLevel({ totalYearsExperience: 3, latestTitle: 'Engineering Manager' }).level).toBe('Intermediate');
  });

  it('falls back to title signals when years are missing', () => {
    expect(inferLevel({ latestTitle: 'Senior Software Engineer' }).level).toBe('Senior');
    expect(inferLevel({ latestTitle: 'Software Engineer Intern' }).level).toBe('Junior');
    expect(inferLevel({ latestTitle: 'Engineer II' }).level).toBe('Intermediate');
    expect(inferLevel({ latestTitle: 'Software Engineer' }).reason).toBe('unparsed');
  });

  // The resume in staging that this was validated against.
  it('maps the 5-year Technical Lead resume to Senior', () => {
    const out = inferLevel({
      totalYearsExperience: 5,
      latestTitle: 'Mobile Developer / Technical Lead (Mobile)',
    });
    expect(out.level).toBe('Senior');
    expect(out.source).toBe('auto');
  });
});

describe('latestExperienceTitle', () => {
  it('prefers a current role over a more recently ended one', () => {
    expect(
      latestExperienceTitle([
        { title: 'Data Analyst', end_date: '2021' },
        { title: 'Product Manager', end_date: 'Present' },
      ])
    ).toBe('Product Manager');
  });

  it('falls back to the newest end date', () => {
    expect(
      latestExperienceTitle([
        { title: 'Intern', end_date: 'Jun 2019' },
        { title: 'Engineer II', end_date: 'Aug 2023' },
      ])
    ).toBe('Engineer II');
  });

  it('returns null for an empty history', () => {
    expect(latestExperienceTitle([])).toBeNull();
    expect(latestExperienceTitle(undefined)).toBeNull();
  });
});

describe('matchRoleToOptions', () => {
  const options = ['Software Engineer', 'Product Manager', 'Engineering Manager', 'Data Scientist'];

  it('matches exactly, ignoring case and punctuation', () => {
    expect(matchRoleToOptions('software engineer', options)).toBe('Software Engineer');
  });

  it('snaps a longer resume title onto the bank vocabulary', () => {
    expect(matchRoleToOptions('Senior Product Manager', options)).toBe('Product Manager');
  });

  it('does not let a single shared word capture a different role', () => {
    expect(matchRoleToOptions('Sales Manager', options)).toBeNull();
  });

  it('returns null for empty input or an empty vocabulary', () => {
    expect(matchRoleToOptions('', options)).toBeNull();
    expect(matchRoleToOptions('Product Manager', [])).toBeNull();
  });
});

describe('mostCommonRole', () => {
  it('picks the modal role and ignores blanks', () => {
    expect(mostCommonRole(['PM', '', 'SWE', 'PM', null, undefined])).toBe('PM');
  });

  it('returns null when nothing is usable', () => {
    expect(mostCommonRole(['', null])).toBeNull();
  });
});

describe('companySlug', () => {
  it('matches the interview-insights route slugs', () => {
    expect(companySlug('Twitter / X')).toBe('twitter-x');
    expect(companySlug('Scale.ai')).toBe('scale-ai');
  });
});
