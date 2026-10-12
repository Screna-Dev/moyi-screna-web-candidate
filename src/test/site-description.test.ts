import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { SEO_COPY } from '@/constants/seo';
import { ORGANIZATION_JSON_LD } from '@/constants/organization';

// One definition of the company, everywhere it is stated. public/llms.txt is
// the reference (it is not edited here); the head of index.html, the home
// page's useSeo copy and the Organization JSON-LD must all say the same thing,
// or AI search reads several definitions and quotes none of them.

const LLMS = readFileSync('public/llms.txt', 'utf8');
const INDEX = readFileSync('index.html', 'utf8');

/** The positioning sentence: llms.txt's opening blockquote, unwrapped. */
const LONG = LLMS.split('\n')
  .filter((l) => l.startsWith('> '))
  .map((l) => l.slice(2).trim())
  .join(' ');

const SHORT =
  'Screna AI is an interview preparation platform for tech job seekers: AI mock interviews, personalized training plans, real interview experiences, and 1:1 mentors.';

const OLD = ['Ace your next interview', 'AI-driven interview preparation', 'AI-powered interview preparation and mock interview platform'];

const attr = (selector: RegExp) => INDEX.match(selector)?.[1];

describe('site description', () => {
  it('reads the long sentence from llms.txt', () => {
    expect(LONG).toBe(
      'Screna AI is an interview preparation platform for tech job seekers. It runs AI mock interviews (technical, behavioral, and system design), builds a personalized training plan from your resume and target role, hosts a community library of real interview experiences, and connects candidates with human mentors for 1:1 coaching.',
    );
  });

  it('uses the short sentence for every description meta in index.html', () => {
    expect(attr(/<meta name="description" content="([^"]*)"/)).toBe(SHORT);
    expect(attr(/<meta property="og:description" content="([^"]*)"/)).toBe(SHORT);
    expect(attr(/<meta name="twitter:description" content="([^"]*)"/)).toBe(SHORT);
  });

  it('uses the long sentence for the WebApplication JSON-LD', () => {
    const ld = JSON.parse(INDEX.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]);
    expect(ld['@type']).toBe('WebApplication');
    expect(ld.description).toBe(LONG);
  });

  it('uses the long sentence for the Organization JSON-LD', () => {
    expect(ORGANIZATION_JSON_LD.description).toBe(LONG);
  });

  it("matches index.html in the home page's useSeo copy, which rewrites the meta on boot", () => {
    expect(SEO_COPY.home.description).toBe(SHORT);
  });

  it('has no trace of the old wording in shipped files', () => {
    const shipped = [
      INDEX,
      readFileSync('src/constants/seo.ts', 'utf8'),
      readFileSync('src/constants/organization.ts', 'utf8'),
      readFileSync('src/pages/newDesign/home/home.tsx', 'utf8'),
    ].join('\n');
    for (const phrase of OLD) expect(shipped).not.toContain(phrase);
  });
});
