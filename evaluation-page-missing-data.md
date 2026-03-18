# Evaluation Page — UI vs API Data Gap Analysis

**Date:** 2026-03-05
**Page:** `/evaluation` → `src/pages/newDesign/evaluation-page.tsx`
**API endpoint:** `GET /api/v1/training-plans/interviews/{interviewId}/report`
**API service:** `src/services/IntervewSesstionServices.jsx → getInterviewSession()`

---

## ✅ Sections connected to real API data

| UI Section | API field | Notes |
|---|---|---|
| Overall score badge | `overall_score` (0–100) | Direct |
| Summary text | `summary` | Replaces hardcoded paragraph |
| Score Overview — 4 categories | `scores.behavioral`, `scores.technical_skills`, `scores.domain_knowledge`, `scores.resume_background` | Scores are 0–10, normalized ×10 for display |
| Question breakdown — question text | `questions[].question_text` | |
| Question breakdown — answer | `questions[].answer_text` | Shown as evidence quote |
| Question breakdown — feedback | `questions[].feedback` | Shown as improvement note |
| Question breakdown — score | `questions[].score` (0–10, ×10) | |
| Session duration | Summed from `questions[].duration_sec` | |
| Completed at | `generated_at` | ISO date, formatted |
| Session type chip | URL param `?type=` | Passed from ai-mock |
| Coaching Plan — focus area text | `improvement_advice` (first 120 chars) | |
| Session Recording — video | `video_url` | Only shown when present |

---

## ❌ UI sections with NO corresponding API data

### 1. Dimension reasoning & evidence (per-dimension accordion)
- **UI:** Each of the 7 mock dimensions has a `reasoning` paragraph, `evidence[]` (quotes + timestamps + why-it-matters), and `nextSteps[]`
- **API:** Returns only 4 numeric category scores — no reasoning text, no quote evidence, no next steps per dimension
- **Impact:** When API data is loaded, the accordion panels open to empty content
- **Suggested fix:** Backend should return per-category `reasoning`, `evidence` quotes, and `nextSteps` in the report response

---

### 2. Per-dimension scores per question (`dimScores`)
- **UI:** Each question shows a mini breakdown of which dimensions were scored (e.g., "Problem Solving: 78, Communication: 75")
- **API:** `questions[]` only returns one `score` per question (overall) and a single `feedback` string
- **Impact:** "Dimension Performance" sub-section inside question rows is empty when API data is loaded
- **Suggested fix:** API should return `dimension_scores: [{ name, score }]` per question

---

### 3. Progress Over Time chart
- **UI:** `TREND_DATA` — line chart showing improvement across 4 past sessions
- **API:** The report endpoint returns data for a **single session only**; no historical session scores are available
- **Impact:** Chart always shows mock data (Jan 28 → Feb 23) regardless of real session
- **Suggested fix:** New endpoint needed, e.g. `GET /training-plans/sessions/history?limit=10` returning past session scores per dimension

---

### 4. Coaching Plan cards — specific drill content
- **UI:** 3 cards: "10-min Targeted Drill", "Focus: {weakestDim}", "Curated Question Set"
- **API:** `improvement_advice` (a string) is used for the middle card. The other two cards ("Targeted Drill" and "Curated Question Set") are generic static UI with no API backing
- **Impact:** Call-to-action buttons ("Start Targeted Retry", "Open Practice Sets", "View Questions") have no target content
- **Suggested fix:** Backend should return `next_actions: [{ type, title, description, link }]` in the report

---

### 5. Session meta — role / job title
- **UI:** Displays `SESSION_META.role` ("Software Engineer")
- **API:** Report does not return the target role. `job_id` is returned but the job title is not
- **Impact:** Role chip always shows fallback "Software Engineer"
- **Suggested fix:** Include `job_title` (or `target_role`) in the report response, or add it to the URL params when navigating to `/evaluation`

---

### 6. Session meta — questions count
- **UI:** Shows "X questions covered"
- **API:** Can be derived from `questions[].length` when present, but `questions` is a **Premium-only field**
- **Impact:** Free-tier users will always see the fallback mock count (3)
- **Suggested fix:** Add `questions_count` as a non-premium field in the base report response

---

### 7. Strengths list (`strengths[]`) — not surfaced in evaluation-page UI
- **API returns:** `strengths[]` (Premium), `areas_for_improvement[]` (Premium)
- **UI:** The evaluation-page has no "What Went Well" / "Areas to Strengthen" section (those exist in `evaluation-report.tsx` which is a separate component)
- **Impact:** Premium strengths/areas data goes unused in this page
- **Suggested fix:** Add a "Highlights" section to evaluation-page using `strengths` and `areas_for_improvement` when available (see `evaluation-report.tsx` as reference)

---

### 8. Video timeline markers
- **UI:** `VIDEO_MARKERS` — annotated timeline with per-question segments (Q1 starts at 45s, Q2 at 510s, etc.)
- **API:** No structured timeline data is returned. `video_url` is a raw video URL with no chapter markers
- **Impact:** Video timeline always shows mock segment positions
- **Suggested fix:** Backend should return `video_chapters: [{ label, start_sec, end_sec, question_text }]` alongside `video_url`

---

## Summary table

| UI Feature | Has API data | Notes |
|---|---|---|
| Overall score | ✅ | |
| Summary text | ✅ | |
| 4 category scores | ✅ | |
| Video URL | ✅ (Premium) | |
| Session duration | ✅ (derived) | |
| Completed at | ✅ | |
| Question text + feedback | ✅ | |
| Improvement advice | ✅ (Premium) | |
| Dimension reasoning / evidence / next steps | ❌ | Backend gap |
| Per-question dimension scores | ❌ | Backend gap |
| Progress over time chart | ❌ | No history endpoint |
| Coaching plan drill / question set links | ❌ | No content API |
| Target role / job title | ❌ | Missing from report |
| Questions count (free tier) | ❌ | Premium field only |
| Strengths section in this page | ❌ | Exists in other component, unused here |
| Video chapter markers | ❌ | Backend gap |
