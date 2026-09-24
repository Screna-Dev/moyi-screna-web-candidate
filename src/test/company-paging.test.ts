import { describe, expect, it } from 'vitest';
// Plain .mjs manifest, shared with scripts/, api/ and src/.
import {
  COMPANY_PAGE_SIZE,
  MIN_POST_QUESTIONS,
  companyPageCount,
  companyPageWindow,
  isIndexablePost,
  noteSeoTitle,
} from '../../scripts/routes.mjs';

// The arithmetic and copy rules behind the crawlable surface. Three consumers
// apply each of them — the request-time renderers under api/_render, the
// company/note pages when the bundle boots, and scripts/sitemap.mjs — so a
// change here is a change to what is published, in three places at once.

describe('companyPageWindow', () => {
  const SIZE = COMPANY_PAGE_SIZE;

  // Page 1 is the OLDEST notes, not the newest. That is the whole design: the
  // API only sorts newest-first, so the pages are cut from the far end of the
  // sequence and read backwards.
  it('starts at the oldest notes and ends at the newest', () => {
    const total = 25;
    expect(companyPageWindow(total, 1)).toEqual({ from: 15, take: 10 });
    expect(companyPageWindow(total, 2)).toEqual({ from: 5, take: 10 });
    expect(companyPageWindow(total, 3)).toEqual({ from: 0, take: 5 });
  });

  it('covers every note exactly once across the series', () => {
    for (const total of [1, 9, 10, 11, 25, 100, 2377]) {
      const seen = new Set<number>();
      for (let n = 1; n <= companyPageCount(total); n += 1) {
        const { from, take } = companyPageWindow(total, n);
        for (let i = from; i < from + take; i += 1) {
          expect(seen.has(i), `index ${i} appears on two pages (total ${total})`).toBe(false);
          seen.add(i);
        }
      }
      expect(seen.size, `series does not cover all ${total} notes`).toBe(total);
    }
  });

  // The property the oldest-first ordering exists to buy, and the one the spec
  // verifies against the live site: publishing a note must not change what any
  // page except the last one contains.
  //
  // Under newest-first, index i is the (i+1)-th newest note, so a new note
  // pushes every existing note one index later — and `total - size*n` moves
  // with it, naming the same notes. Newest-first pagination has no such
  // property: every page's contents shift by one on every publish, and a URL
  // whose content never settles does not get indexed.
  it('keeps every page but the last pinned as notes are published', () => {
    const before = 25;
    for (const after of [26, 30, 31, 40]) {
      const pagesBefore = companyPageCount(before);
      for (let n = 1; n < pagesBefore; n += 1) {
        const old = companyPageWindow(before, n);
        const now = companyPageWindow(after, n);
        // The window shifts by exactly the number of new notes, which is what
        // keeps it over the same notes.
        expect(now.from - old.from, `page ${n} drifted (total ${before} -> ${after})`).toBe(
          after - before,
        );
        expect(now.take).toBe(old.take);
      }
    }
  });

  it('spans at most two API pages, so one render is at most two extra reads', () => {
    for (const total of [1, 10, 11, 37, 2377]) {
      for (let n = 1; n <= companyPageCount(total); n += 1) {
        const { from, take } = companyPageWindow(total, n);
        if (take <= 0) continue;
        const first = Math.floor(from / SIZE);
        const last = Math.floor((from + take - 1) / SIZE);
        expect(last - first).toBeLessThanOrEqual(1);
      }
    }
  });

  it('reports an empty window past the end rather than a negative one', () => {
    expect(companyPageWindow(25, 4).take).toBeLessThanOrEqual(0);
    expect(companyPageWindow(0, 1).take).toBeLessThanOrEqual(0);
  });

  it('always reports at least one page, so an empty company still has a URL shape', () => {
    expect(companyPageCount(0)).toBe(1);
    expect(companyPageCount(null)).toBe(1);
    expect(companyPageCount(10)).toBe(1);
    expect(companyPageCount(11)).toBe(2);
    expect(companyPageCount(2377)).toBe(238);
  });
});

describe('noteSeoTitle', () => {
  // The bug this replaced: the brand was appended and the whole string sliced
  // to 60, so the cut landed inside " | Screna AI" and all 40 prerendered
  // titles ended on a dangling separator with the brand gone.
  it('keeps the brand whatever the length of the rest', () => {
    const long = noteSeoTitle({
      company: 'Amazon',
      role: 'Senior Software Development Engineer',
      round: 'Onsite - Multi Round System Design',
    });
    expect(long.endsWith(' | Screna AI')).toBe(true);
  });

  it('never ends on a dangling separator', () => {
    const cases = [
      { company: 'Amazon', role: 'Software Engineer', round: 'Onsite - Multi Round' },
      { company: 'Axon', role: 'Software Engineer', round: 'Onsite - System Design / Coding' },
      { company: 'Google', role: 'Senior Staff Software Engineer, Infrastructure', round: 'Phone Screen' },
      { company: 'Meta', role: 'Product Manager — Growth', round: 'Behavioral' },
    ];
    for (const post of cases) {
      const core = noteSeoTitle(post).replace(/ \| Screna AI$/, '');
      expect(core, `"${core}" ends on punctuation`).not.toMatch(/[\s—\-/·|,;:]$/);
    }
  });

  it('cuts on a word boundary rather than mid-word', () => {
    const core = noteSeoTitle({
      company: 'Amazon',
      role: 'Software Engineer',
      round: 'Onsite - Multi Round',
    }).replace(/ \| Screna AI$/, '');
    expect(core).toBe('Amazon Software Engineer Interview — Onsite');
  });

  it('leaves a short title untouched', () => {
    expect(noteSeoTitle({ company: 'Meta', role: 'PM' })).toBe('Meta PM Interview | Screna AI');
  });
});

describe('isIndexablePost', () => {
  // The gate counts summary + question titles + notes and stops there — it does
  // not see the AI hints, which are ~294 words per question and the bulk of the
  // rendered page. Requiring two questions and 120 of those words marked 66% of
  // the library noindex on a measurement of the wrong thing.
  it('indexes a single-question note', () => {
    expect(isIndexablePost({ questions: [{ title: 'Design a rate limiter', notes: 'Went well.' }] })).toBe(
      true,
    );
  });

  it('withholds a note with no questions', () => {
    expect(isIndexablePost({ questions: [], summary: 'A long summary. '.repeat(40) })).toBe(false);
    expect(isIndexablePost({ summary: 'No questions key at all' })).toBe(false);
  });

  it('survives junk rather than throwing', () => {
    expect(isIndexablePost(null)).toBe(false);
    expect(isIndexablePost({ questions: 'nope' })).toBe(false);
  });

  it('is driven by the named threshold, so narrowing it is one edit', () => {
    const oneQuestion = { questions: [{ title: 'Q', notes: 'A' }] };
    expect(isIndexablePost(oneQuestion)).toBe(MIN_POST_QUESTIONS <= 1);
  });
});
