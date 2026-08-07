/**
 * resumeFileName tests
 * Covers: pre-signed S3 URLs (the real shape of `resume_path`), plain stored
 *         paths, percent-encoded names, and the empty cases.
 */
import { describe, it, expect } from 'vitest';
import { resumeFileName } from '@/utils/resumeFile';

const SIGNED =
  'https://moyi-screna-staging-us-east-1-data.s3.amazonaws.com/candidate-resumes/8I32RMGqFzRKub.pdf' +
  '?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20260807T102057Z&X-Amz-Expires=3600' +
  '&X-Amz-Signature=aabfc210f76352a31e9da5092dd829fb02de6c687b0fa2697f7a7e9a45ec52c7';

describe('resumeFileName', () => {
  it('drops the pre-signed query so the signature never reaches the UI', () => {
    expect(resumeFileName(SIGNED)).toBe('8I32RMGqFzRKub.pdf');
  });

  it('handles a plain stored path', () => {
    expect(resumeFileName('/uploads/candidate-resumes/alex-chen-resume.pdf'))
      .toBe('alex-chen-resume.pdf');
  });

  it('decodes percent-encoded names', () => {
    expect(resumeFileName('/uploads/Alex%20Chen%20Resume.pdf')).toBe('Alex Chen Resume.pdf');
  });

  it('leaves a malformed escape sequence alone rather than throwing', () => {
    expect(resumeFileName('/uploads/100%-complete.pdf')).toBe('100%-complete.pdf');
  });

  it('strips a fragment too', () => {
    expect(resumeFileName('/uploads/resume.pdf#page=2')).toBe('resume.pdf');
  });

  it('returns undefined for empty input', () => {
    expect(resumeFileName(undefined)).toBeUndefined();
    expect(resumeFileName(null)).toBeUndefined();
    expect(resumeFileName('')).toBeUndefined();
    expect(resumeFileName('https://example.com/?x=1')).toBeUndefined();
  });
});
