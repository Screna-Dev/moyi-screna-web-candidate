import { describe, it, expect, vi, beforeEach } from 'vitest';

// Requests several components make at the same moment share one call while
// it's in flight; a later call (after it settled) goes out again.

const http = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/services/api', () => ({ default: http }));

beforeEach(() => http.get.mockReset());

describe('getPersonalInfo', () => {
  it('shares one in-flight request, then fetches fresh', async () => {
    const { getPersonalInfo } = await import('@/services/ProfileServices');
    let resolve!: (v: unknown) => void;
    http.get.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    const a = getPersonalInfo();
    const b = getPersonalInfo();
    expect(http.get).toHaveBeenCalledTimes(1);
    resolve({ data: { data: { name: 'Lu' } } });
    expect(await a).toBe(await b);
    http.get.mockResolvedValueOnce({ data: { data: { name: 'Lu 2' } } });
    await getPersonalInfo();
    expect(http.get).toHaveBeenCalledTimes(2);
  });
});

describe('getCareerJob', () => {
  it('the layout title and the job page share one request per job', async () => {
    const { getCareerJob } = await import('@/services/careersApi');
    let resolve!: (v: unknown) => void;
    http.get.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    const a = getCareerJob('job-1');
    const b = getCareerJob('job-1');
    http.get.mockResolvedValueOnce({ data: { data: { posting: { title: 'Other' } } } });
    const other = getCareerJob('job-2');
    expect(http.get).toHaveBeenCalledTimes(2);
    resolve({ data: { data: { posting: { title: 'Backend Engineer' } } } });
    expect((await a).posting.title).toBe('Backend Engineer');
    expect(await b).toBe(await a);
    expect((await other).posting.title).toBe('Other');
  });
});
