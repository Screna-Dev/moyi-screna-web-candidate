// The interview authorization shown before every career interview (QA D4,
// ADR-022 E-24, backend #304). Agreeing sends consentAccepted: true plus
// CONSENT_VERSION with every start call, rejoins included; the backend records
// who agreed to which version, and when, for each new interview.
//
// PLACEHOLDER: the PM supplies the final text and its version name. Replace
// CONSENT_SECTIONS, the checkbox label in careersShared's InterviewConsent and
// CONSENT_VERSION together, so the recorded version always matches the text
// shown. Also pending: whether "report to the employer" and "video recording"
// become two separate checkboxes (that would change the request).

// ≤ 64 characters (else 400 VALIDATION_ERROR). Recorded verbatim.
export const CONSENT_VERSION = "placeholder-2026-11";

export const CONSENT_SECTIONS = (companyName: string) => [
  {
    title: "Recording",
    body: "Your interview is recorded on video, including your voice and camera. A transcript is created from the recording.",
  },
  {
    title: "AI assessment",
    body: "Screna uses AI to assess your answers against the criteria set for this role. The assessment supports the recruiter's decision; it does not make it.",
  },
  {
    title: "Sharing with the employer",
    body: `${companyName} receives your assessment, transcript, recording and the resume on your profile for this application.`,
  },
  {
    title: "Your choice",
    body: "You can close this window now and nothing will be recorded or charged.",
  },
];

