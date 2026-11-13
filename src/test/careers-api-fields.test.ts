import { describe, it, expect } from 'vitest';
import type { CareerApplication, CareerJob } from '@/services/careersApi';
import { applicationStateMessage, leftToStartLabel, levelLabel, standingTile, toMyJob, toOpportunityJob, yearsLabel } from '@/components/newDesign/opportunities/careersDesignData';

// Fields the backend added after the 2026-11-05 frontend list: list skills /
// years / interviewFunding / myBestScore; application location / bestScore /
// retake window.

function job(over: Partial<CareerJob> = {}): CareerJob {
  return {
    jobId: 'job-1',
    title: 'Backend Engineer',
    companyName: 'Lumen Metrics',
    companyLogoUrl: null,
    location: 'Austin, TX',
    workplaceType: 'HYBRID',
    employmentType: 'FULL_TIME',
    seniority: 'SENIOR',
    role: null,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    salaryPeriod: null,
    summary: null,
    closesAt: null,
    timezone: null,
    publishedAt: null,
    interviewDurationMinutes: 20,
    interviewPayer: 'EMPLOYER',
    applied: false,
    ...over,
  };
}

function app(over: Partial<CareerApplication> = {}): CareerApplication {
  return {
    applicationId: 'app-1',
    jobId: 'job-1',
    jobTitle: 'Backend Engineer',
    companyName: 'Lumen Metrics',
    companyLogoUrl: null,
    jobStatus: 'OPEN',
    closesAt: null,
    timezone: null,
    appliedAt: '2026-10-28T00:00:00Z',
    interviewStatus: 'COMPLETED',
    interviewCompletedAt: '2026-11-10T00:00:00Z',
    interviewDurationMinutes: 20,
    interviewLanguage: 'en',
    questionCount: 3,
    interviewPayer: 'EMPLOYER',
    canStartInterview: false,
    ...over,
  };
}

describe('labels', () => {
  it('formats experience years and the level', () => {
    expect(yearsLabel(5, null)).toBe('5+ years');
    expect(yearsLabel(3, 5)).toBe('3–5 years');
    expect(yearsLabel(null, 2)).toBe('Up to 2 years');
    expect(yearsLabel(null, null)).toBe('');
    expect(levelLabel('SENIOR', 5, null)).toBe('Senior (5+ years)');
    expect(levelLabel(null, 5, null)).toBe('5+ years');
  });

  it('counts down to the retake deadline', () => {
    const now = Date.parse('2026-11-10T00:00:00Z');
    expect(leftToStartLabel('2026-11-10T04:32:30Z', now)).toBe('4h 32m left to start');
    expect(leftToStartLabel('2026-11-12T03:00:00Z', now)).toBe('2d 3h left to start');
    expect(leftToStartLabel('2026-11-09T00:00:00Z', now)).toBe('');
    expect(leftToStartLabel(null, now)).toBe('');
  });
});

describe('Opportunities card', () => {
  it('uses skills, years and who pays now', () => {
    const card = toOpportunityJob(job({ skills: ['Go', 'Kafka'], yearsExperienceMin: 5, interviewFunding: 'CANDIDATE' }));
    expect(card.tags).toEqual(['Go', 'Kafka']);
    expect(card.level).toBe('Senior (5+ years)');
    // Sponsorship ran out: no longer "Sponsored".
    expect(card.interviewCostLabel).toMatch(/^1 interview/);
    expect(card.sponsorInfo).toBe('Self-funded interview');
  });

  it('shows my best score and offers a retake', () => {
    const card = toOpportunityJob(job({ applied: true, myBestScore: 84 }));
    expect(card.scoreValue).toBe('84/100');
    expect(card.primaryAction).toBe('Retake interview');
    // The next interview is a retake: candidate-paid even on a sponsored job.
    expect(card.interviewCostLabel).toMatch(/^1 interview/);
    expect(toOpportunityJob(job()).scoreValue).toBeUndefined();
  });
});

describe('Opportunities card with myApplication (#320)', () => {
  it('missing or null myApplication keeps the pre-#320 behaviour', () => {
    const card = toOpportunityJob(job({ applied: true, myBestScore: 84 }));
    expect(card.reportAvailable).toBeUndefined();
    expect(toOpportunityJob(job({ myApplication: null })).primaryAction).toBe('Quick interview');
  });

  it('completed with a retake open: report, retake, candidate-paid, time left', () => {
    const deadline = new Date(Date.now() + (4 * 60 + 32) * 60_000 + 30_000).toISOString();
    const card = toOpportunityJob(
      job({ applied: true, myBestScore: 84, myApplication: app({ bestScore: 84, canStartInterview: true, retakeAvailability: 'AVAILABLE', retakeDeadline: deadline, interviewFunding: 'CANDIDATE' }) }),
    );
    expect(card.reportAvailable).toBe(true);
    expect(card.primaryAction).toBe('Retake interview');
    expect(card.interviewCostLabel).toBe('1 interview · ~20 minutes\n4h 32m left to start');
  });

  it('retake in progress: no report (result 409s), continue, no countdown', () => {
    const card = toOpportunityJob(
      job({ applied: true, myBestScore: 84, myApplication: app({ interviewStatus: 'IN_PROGRESS', bestScore: 84, canStartInterview: true, retakeAvailability: 'AVAILABLE', retakeDeadline: new Date(Date.now() + 3_600_000).toISOString(), interviewFunding: 'CANDIDATE' }) }),
    );
    expect(card.reportAvailable).toBe(false);
    expect(card.scoreValue).toBe('84/100');
    expect(card.primaryAction).toBe('Continue interview');
    expect(card.interviewCostLabel).not.toMatch(/left to start/);
  });

  it("applied, not started, sponsored: the application's funding", () => {
    const card = toOpportunityJob(
      job({ applied: true, interviewFunding: 'CANDIDATE', myApplication: app({ interviewStatus: 'NOT_STARTED', canStartInterview: true, interviewFunding: 'EMPLOYER' }) }),
    );
    expect(card.interviewCostLabel).toMatch(/^Sponsored/);
    expect(card.reportAvailable).toBe(false);
  });

  it('who pays is hidden when no interview can start', () => {
    const card = toOpportunityJob(job({ applied: true, myBestScore: 60, myApplication: app({ bestScore: 60, canStartInterview: false, retakeAvailability: 'LIMIT_REACHED' }) }));
    expect(card.interviewCostLabel).toBe('');
  });
});

describe('My Jobs card', () => {
  it('uses the application location, workplace and best score', () => {
    const row = toMyJob(app({ location: 'Austin, TX', workplaceType: 'REMOTE', bestScore: 72 }));
    expect(row.location).toBe('Austin, TX · Remote');
    expect(row.bestScore).toBe(72);
  });

  it('offers Retake only while one can start, with the time left', () => {
    const deadline = new Date(Date.now() + (2 * 60 + 5) * 60_000 + 30_000).toISOString();
    const open = toMyJob(app({ canStartInterview: true, retakeAvailability: 'AVAILABLE', retakeDeadline: deadline }));
    expect(open.actions.map((a) => a.label)).toEqual(['View report', 'Retake interview']);
    expect(open.creditInfo).toBe('1 interview · 2h 5m left to start');

    const closed = toMyJob(app({ canStartInterview: false, retakeAvailability: 'WINDOW_CLOSED' }));
    expect(closed.actions.map((a) => a.label)).toEqual(['View report']);
    expect(closed.creditInfo).toBeUndefined();
  });
});

describe('result standing (rules from 11-09)', () => {
  const st = (o: Partial<{ rank: number; rankedCandidates: number; topPercent: number; pointsBehindTop5: number }>) => ({
    rank: null, rankedCandidates: null, topPercent: null, pointsBehindTop5: null, ...o,
  });

  it('Pro: rank of ranked candidates', () => {
    expect(standingTile(st({ rank: 2, rankedCandidates: 31 })).value).toBe('#2 of 31');
  });

  it('Free: top band and gap to the top 5', () => {
    const t = standingTile(st({ topPercent: 25, pointsBehindTop5: 6 }));
    expect([t.value, t.sub]).toEqual(['Top 25%', '6 pts behind the top 5']);
  });

  it('Free: all four null means in the top 5', () => {
    expect(standingTile(st({})).sub).toBe("You're in the top 5");
  });

  it('Free: 0 pts behind is a tie with #5, never "0 pts behind"', () => {
    const t = standingTile(st({ topPercent: 10, pointsBehindTop5: 0 }));
    expect(t.sub).toBe('Tied with #5 — they completed their first interview earlier');
    expect(JSON.stringify(standingTile(st({ pointsBehindTop5: 0 })))).not.toMatch(/0 pts behind/);
  });

  it('null standing does not claim too few candidates', () => {
    expect(standingTile(null).sub).not.toMatch(/candidates finish|too few/i);
  });
});

describe('retake gate and 409 reload message', () => {
  it('no Retake or countdown unless retakeAvailability is AVAILABLE', () => {
    const deadline = new Date(Date.now() + 3600_000).toISOString();
    const row = toMyJob(app({ canStartInterview: true, retakeAvailability: 'WINDOW_CLOSED', retakeDeadline: deadline }));
    expect(row.actions.map((a) => a.label)).toEqual(['View report']);
    expect(row.creditInfo).toBeUndefined();
  });

  it('explains the reloaded application', () => {
    expect(applicationStateMessage(app({ retakeAvailability: 'WINDOW_CLOSED' }))).toMatch(/time to retake/);
    expect(applicationStateMessage(app({ retakeAvailability: 'LIMIT_REACHED' }))).toMatch(/all retakes/);
    expect(applicationStateMessage(app({ interviewStatus: 'NOT_STARTED', jobStatus: 'CLOSED' }))).toMatch(/no longer accepting/);
  });
});
