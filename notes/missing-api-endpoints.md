# Missing API Endpoints — AI Mock Interview (New Design)

> **Context**: The new `AIMockPage` (`/ai-mock`, `/ai-mockwhite`) uses the new visual design
> (setup → warmup → opening → live → cooldown stages) and needs to connect to the real backend.
> This document tracks what's missing or needs to change in the API for full integration.

---

## 1. Quick-Start Interview Endpoint ⚠️ **Missing**

**Problem**: The current API requires an `interviewId` that comes from an existing **training plan module**.
There is no way to start a one-off / quick mock interview without first creating a training plan.

**Needed endpoint**:
```
POST /training-plans/interviews/quick-start
Body: {
  type: "behavioral" | "product" | "system-design" | "resume",
  difficulty: "junior" | "intermediate" | "senior" | "staff",
  duration: number,          // minutes
  mode: "voice" | "video",
  company?: string           // optional company context
}
Response: {
  session_id: string,
  url: string,               // LiveKit server URL
  token: string,             // LiveKit access token
  room_name: string,
  max_interview_duration: number
}
```

**Current workaround**: The `AIMockPage` reads an `interviewId` URL search param
(`/ai-mock?interviewId=<id>`). This works when navigating from **InterviewPrep** which has a
real training plan session ID. Without this param, the page runs in **demo mode** (scripted
simulation, no real AI connection).

**How to trigger live mode today**:
In `InterviewPrep.tsx`, change the navigation target from:
```ts
navigate(`/interview/${selectedSessionPreview.id}`);
```
to:
```ts
navigate(`/ai-mock?interviewId=${selectedSessionPreview.id}`);
```
*(or pass `&mode=video` for video mode)*

---

## 2. Dashboard Mock Interview Sessions — No Real IDs ⚠️ **Missing**

**Problem**: `DashboardMockInterviewPage` (`/dashboard/mock-interview`) renders static hardcoded
session cards (IDs 1–8) that are not backed by real training plan module IDs.

**Needed**:
- An API endpoint to return **personalised session recommendations** based on the user's
  training plans, or
- The quick-start endpoint above so that clicking "Start Session" creates a session on-the-fly.

---

## 3. LiveKit Transcript / State Protocol ⚠️ Needs Clarification

**Problem**: `LiveInterview` and `VideoInterview` now listen to LiveKit
`onActiveSpeakersChanged` for bot/user speaking state and `onDataReceived` for transcript data.
The exact data message format the backend sends is not yet confirmed.

**Assumed format** (via `onDataReceived`):
```json
{
  "type": "transcript",
  "role": "bot" | "user",
  "text": "…"
}
```

Please confirm this with the backend team, or provide the actual format so the frontend can
parse transcripts correctly.

---

## 4. Session End / Evaluation Navigation ⚠️ Needs Review

After the live stage ends, `AIMockPage` navigates to `/evaluation`. The evaluation page
currently shows a static mock report. It needs to be connected to:
```
GET /training-plans/interviews/{interviewId}/report
```
(already exists in `IntervewSesstionServices.getInterviewSession(interviewId)`)

The `interviewId` (or `sessionId`) should be passed to the evaluation page so it can load the
correct report.

---

## 5. Settings → Account: Change Email & Delete Account ❌ No Backend Endpoint

**Context**: `settings-design.tsx` (`ProfileTab`) had these two actions stubbed
out with fake UI (email change → fake "verification sent"; delete → `TODO`).
The published API surface exposes **no** endpoint for either:

- **Change email**: no `/profile/change-email` (and no auth-side equivalent).
  The email field is now **read-only** with a "contact support" note. The
  `POST /profile/personal-info` endpoint only accepts name/country/timezone.
- **Delete account**: no delete endpoint anywhere. The UI now shows the row as
  **"Coming soon"** (disabled button + contact-support note) instead of a fake
  confirm flow.

**Needed to enable these** (paths would follow the `/profile/*` convention, e.g.
`/profile/change-password`):
```
POST   /api/v1/profile/change-email   Body: { newEmail, password }  → email a verification link
DELETE /api/v1/profile                → permanently delete account + data
```
When the backend adds these, re-wire via new `ProfileServices` functions and
restore the interactive UI (git history has the wired version).

## Summary Table

| # | Description | Status | Priority |
|---|-------------|--------|----------|
| 1 | Quick-start interview endpoint (no training plan required) | ❌ Missing | High |
| 2 | Dashboard session cards backed by real API data | ❌ Missing | Medium |
| 3 | LiveKit transcript data message format confirmation | ⚠️ Unconfirmed | High |
| 4 | Evaluation page connected to session report API | ⚠️ Partial | Medium |
| 5 | Change-email + delete-account endpoints | ❌ Missing | Medium |
