import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// #322 (card 740): the backend charges every mock interview at the voice
// rate, so the frontend must never open one with video. Ships with the
// backend in the same prod release.

const aiMock = readFileSync('src/pages/newDesign/ai-mock.tsx', 'utf8');
const evaluation = readFileSync('src/pages/newDesign/evaluation-page.tsx', 'utf8');

describe('mock interviews are voice only', () => {
  it('ignores ?mode= and never defaults to video', () => {
    // ?mode= only decides whether to skip the mode screen, never the mode.
    expect(aiMock).not.toMatch(/(\?\?|\|\|) 'video'/);
    expect(aiMock).toMatch(/const audioOnly = true;/);
    expect(aiMock).toMatch(/mode: 'voice' as Mode/);
  });

  it('offers no Video option', () => {
    expect(aiMock).not.toMatch(/onSelect\('video'\)/);
    expect(aiMock).not.toMatch(/value: 'video'/);
  });

  it('the evaluation retake opens a voice interview', () => {
    expect(evaluation).toMatch(/\/ai-mock\?interviewId=\$\{newModuleId\}&mode=voice/);
  });
});
