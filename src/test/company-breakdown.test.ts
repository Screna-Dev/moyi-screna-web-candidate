import { describe, expect, it } from 'vitest';
import { companyFaq, companyFaqJsonLd, companyIntro, type CompanyBreakdown } from '@/utils/companyBreakdown';

// The company page's opening paragraph and FAQ (scripts/routes.mjs). The
// server renderer and the page both call these, so the wording is pinned here
// rather than in either consumer.

// Amazon as measured 2026-10-04 (spec appendix B).
const AMAZON: CompanyBreakdown = {
  company: 'Amazon',
  totalPosts: 1571,
  topRoles: [
    { name: 'Software Engineer', posts: 1085 },
    { name: 'Data Scientist', posts: 181 },
    { name: 'Product Manager', posts: 164 },
  ],
  topRounds: [
    { name: 'Technical Phone Screen', posts: 617 },
    { name: 'Onsite - Behavioral / Leadership', posts: 309 },
    { name: 'Online Assessment (OA)', posts: 227 },
    { name: 'Onsite - System Design / Architecture', posts: 158 },
  ],
  roundTopics: {
    'Technical Phone Screen': [
      { name: 'Technical Trade-offs', questions: 687 },
      { name: 'Algorithms & Data Structures', questions: 633 },
      { name: 'System Design', questions: 225 },
    ],
    'Onsite - Behavioral / Leadership': [
      { name: 'Adaptability & Ambiguity', questions: 322 },
      { name: 'Stakeholder Management', questions: 214 },
      { name: 'Cross-functional Alignment', questions: 163 },
    ],
    'Online Assessment (OA)': [
      { name: 'Algorithms & Data Structures', questions: 229 },
      { name: 'Technical Trade-offs', questions: 71 },
      { name: 'API & Integrations', questions: 35 },
    ],
    'Onsite - System Design / Architecture': [
      { name: 'System Design', questions: 343 },
      { name: 'Technical Trade-offs', questions: 270 },
      { name: 'Data Modeling', questions: 88 },
    ],
  },
};

describe('companyIntro / companyFaq — Amazon', () => {
  it('matches the spec output word for word', () => {
    expect(companyIntro('Amazon', AMAZON)).toBe(
      'Most of these Amazon write-ups come from Software Engineers (1,085), then Data Scientists (181) and Product Managers (164). The most reported rounds are the technical phone screen (617), the behavioral / leadership round (309), the online assessment (227) and the system design round (158).',
    );
    expect(companyFaq('Amazon', AMAZON)).toEqual([
      {
        question: 'What rounds are in the Amazon interview?',
        answer:
          'Candidates most often report a technical phone screen (617 write-ups), a behavioral / leadership round (309), an online assessment (227) and a system design round (158).',
      },
      {
        question: 'What does the Amazon technical phone screen cover?',
        answer:
          'Across 617 technical phone screen write-ups, the most tagged question topics are Technical Trade-offs (687 questions), Algorithms & Data Structures (633) and System Design (225).',
      },
      {
        question: 'What is asked in the Amazon behavioral / leadership round?',
        answer:
          'Across 309 behavioral / leadership write-ups, the most tagged question topics are Adaptability & Ambiguity (322 questions), Stakeholder Management (214) and Cross-functional Alignment (163).',
      },
    ]);
  });

  it('emits FAQPage JSON-LD carrying the same strings', () => {
    const ld = companyFaqJsonLd('Amazon', AMAZON) as any;
    const faq = companyFaq('Amazon', AMAZON);
    expect(ld['@type']).toBe('FAQPage');
    expect(ld.mainEntity).toEqual(
      faq.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    );
  });
});

describe('companyIntro / companyFaq — degradation', () => {
  it('uses the short intro and no FAQ under 20 posts', () => {
    const small: CompanyBreakdown = {
      ...AMAZON,
      totalPosts: 15,
      topRounds: [{ name: 'Online Assessment (OA)', posts: 9 }],
    };
    expect(companyIntro('Acme', small)).toBe(
      'Screna has 15 Acme interview write-ups. The most reported round is the online assessment (9).',
    );
    expect(companyFaq('Acme', small)).toEqual([]);
    expect(companyFaqJsonLd('Acme', small)).toBeNull();
  });

  it('says write-up for a single post', () => {
    expect(companyIntro('Acme', { totalPosts: 1, topRounds: [] })).toBe('Screna has 1 Acme interview write-up.');
  });

  it('says nothing without a breakdown or with zero posts', () => {
    expect(companyIntro('Acme', null)).toBe('');
    expect(companyIntro('Acme', { totalPosts: 0, topRoles: [], topRounds: [], roundTopics: {} })).toBe('');
    expect(companyFaq('Acme', null)).toEqual([]);
  });

  it('skips a mixed round for questions 2 and 3', () => {
    const mixedFirst: CompanyBreakdown = {
      ...AMAZON,
      topRounds: [{ name: 'Onsite - Multi Round', posts: 700 }, ...AMAZON.topRounds!.slice(0, 3)],
      roundTopics: {
        ...AMAZON.roundTopics,
        'Onsite - Multi Round': [{ name: 'System Design', questions: 500 }],
      },
    };
    const qs = companyFaq('Amazon', mixedFirst).map((f) => f.question);
    expect(qs).toEqual([
      'What rounds are in the Amazon interview?',
      'What does the Amazon technical phone screen cover?',
      'What is asked in the Amazon behavioral / leadership round?',
    ]);
    // Still listed in question 1 — it is a real round, just not a topic answer.
    expect(companyFaq('Amazon', mixedFirst)[0].answer).toContain('a multi-round onsite (700 write-ups)');
  });

  it('gives no question to a round under 10 posts', () => {
    const thin: CompanyBreakdown = {
      ...AMAZON,
      topRounds: [
        { name: 'Technical Phone Screen', posts: 617 },
        { name: 'Onsite - Behavioral / Leadership', posts: 8 },
      ],
    };
    const qs = companyFaq('Amazon', thin).map((f) => f.question);
    expect(qs).toEqual([
      'What rounds are in the Amazon interview?',
      'What does the Amazon technical phone screen cover?',
    ]);
  });

  it('gives no question to a round whose topics are empty', () => {
    const empty: CompanyBreakdown = {
      ...AMAZON,
      roundTopics: { ...AMAZON.roundTopics, 'Technical Phone Screen': [] },
    };
    expect(companyFaq('Amazon', empty)[1].question).toBe('What does the Amazon behavioral / leadership round cover?');
  });

  it('reads cleanly with two roles and two rounds', () => {
    const two: CompanyBreakdown = {
      totalPosts: 40,
      topRoles: [
        { name: 'Software Engineer', posts: 30 },
        { name: 'Data Scientist', posts: 10 },
      ],
      topRounds: [
        { name: 'Technical Phone Screen', posts: 25 },
        { name: 'Onsite - Coding / Algorithms', posts: 15 },
      ],
      roundTopics: {
        'Technical Phone Screen': [{ name: 'System Design', questions: 12 }],
        'Onsite - Coding / Algorithms': [
          { name: 'Algorithms & Data Structures', questions: 20 },
          { name: 'Technical Trade-offs', questions: 4 },
        ],
      },
    };
    expect(companyIntro('Acme', two)).toBe(
      'Most of these Acme write-ups come from Software Engineers (30), then Data Scientists (10). The most reported rounds are the technical phone screen (25) and the onsite coding round (15).',
    );
    const faq = companyFaq('Acme', two);
    expect(faq[0].answer).toBe('Candidates most often report a technical phone screen (25 write-ups) and an onsite coding round (15).');
    expect(faq[1].answer).toBe(
      'Across 25 technical phone screen write-ups, the most tagged question topic is System Design (12 questions).',
    );
    expect(faq[2].answer).toBe(
      'Across 15 onsite coding write-ups, the most tagged question topics are Algorithms & Data Structures (20 questions) and Technical Trade-offs (4).',
    );
  });

  it('pluralises only roles that are not already plural', () => {
    const b: CompanyBreakdown = { totalPosts: 30, topRoles: [{ name: 'Sales', posts: 30 }], topRounds: [] };
    expect(companyIntro('Acme', b)).toBe('Most of these Acme write-ups come from Sales (30).');
  });

  it('lowercases a round name it does not know', () => {
    const b: CompanyBreakdown = { totalPosts: 30, topRounds: [{ name: 'Superday', posts: 30 }] };
    expect(companyIntro('Acme', b)).toBe('The most reported round is the superday (30).');
  });
});
