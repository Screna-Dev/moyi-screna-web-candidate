Refine the current “Trendings” page (/mock-interview) into a premium, product-realistic **Role Leaderboard** page. The goal is to show what roles are hottest right now (ranking + trend signals) while allowing users to start practice and (if signed in) generate a personalized plan. Keep changes minimal, reuse existing components, and avoid an “AI-looking” style.

====================================================
1) Page positioning & hierarchy
====================================================
- Keep the page title: “Trendings”
- Subtitle: “See what roles are trending today — updated daily.”
- Add a small trust note under subtitle (small text):
  “Based on community activity signals. Updated daily.”
  (Do NOT mention applicant counts.)

====================================================
2) Top 3 Spotlight (keep the existing 3 cards, but improve polish)
====================================================
Keep the Top 3 role cards (#1, #2, #3) but make them feel premium and less “AI-generated”:
- Remove saturated rainbow backgrounds and heavy gradients.
- Use a calm neutral card background (white or very light neutral) with subtle border and soft shadow.
- Keep a consistent brand accent (Screna blue) for small highlights only (badges/links), NOT full card backgrounds.
- #1 can be slightly emphasized (1.05–1.1x size or a very subtle tint), #2/#3 remain neutral.

Each Top 3 card should include:
A) Header:
- Rank badge (#1/#2/#3) in a consistent style (same color family).
- Role title (e.g., Product Manager)
- “Practicing now” count (e.g., 1.2k practicing)

B) NEW: Info row (compact, under title)
- Difficulty (est.): Easy/Medium/Hard (small pill)
- Competition (est.): Low/Medium/High (small pill)
- Optional tag: “Rising fast” (only for some roles)
- Tiny 7-day sparkline (right aligned). No numeric axis, just relative trend.

C) NEW: Focus row
- Label: “Focus on:”
- 3 focus chips (e.g., Metrics, Tradeoffs, Stakeholder)

D) CTA behavior (non-intrusive)
- Keep “Start practice” but make it consistent (same button style across all cards).
- Use a secondary/outline button or a calm primary that matches existing Screna buttons.
- Avoid large colored CTA blocks.

E) Tooltips (trust & transparency)
- Add small info tooltip icons next to “Difficulty (est.)” and “Competition (est.)”
  Tooltip text:
  - Difficulty: “Estimated from practice completion and evaluation patterns.”
  - Competition: “Estimated from community demand signals (practice volume, trend growth, insights activity). Not applicant counts.”

====================================================
3) Replace “Curated Practice Sets” with a Role Leaderboard list
====================================================
Replace the entire “Curated Practice Sets” grid section with a **Role Leaderboard** list (#4–#20). This page should be role-first, not skill-set-first.

Leaderboard rows should be clean and scannable (not big cards):
Each row includes:
- Rank number (#4, #5…)
- Role title
- Practicing now count
- Tiny 7-day sparkline (same style as Top 3)
- Difficulty (est.) pill
- Competition (est.) pill
- Optional “Rising fast” tag where applicable
- A subtle “Start →” action (text link or small secondary button)

CTA should be subtle:
- Row “Start →” appears on hover (preferred) OR always visible but minimal.
- Clicking Start begins practice for that role (or opens a minimal quick-start modal with defaults). Do NOT add a complex flow here.

====================================================
4) Filters (minimal, ranking-style)
====================================================
Keep filters lightweight and ranking-appropriate:
- Add a “Job family” pill group: Engineering / Product / Data / Design (single-select)
- Add Sort dropdown: “Today” (default) + optional “This week”
- Keep “Search sets…” but rename to “Search roles…” if present
Do NOT add heavy multi-filter panels.

====================================================
5) Personalized plan CTA (login-aware, low-risk)
====================================================
For each Top 3 card (and optionally at row level), add a small CTA near the Focus row:
- Logged-in state: “Generate plan”
- Logged-out state: “Sign in to generate plan” (locked style)

Do not overpromise. This CTA should feel like a helpful next step, not a huge banner.

====================================================
6) Visual style constraints (de-AI, premium)
====================================================
- Use one brand accent (Screna blue) + neutral grayscale.
- No saturated per-card colors, no rainbow gradients, no heavy glow.
- Keep typography, spacing, border radius, and shadows consistent with existing Screna components.
- Preserve overall page structure: header → Top 3 spotlight → leaderboard list.
- Make the page feel like a real SaaS product ranking view, calm and trustworthy.

====================================================
Deliverables
====================================================
- Updated Trendings page with:
  - Premium Top 3 spotlight cards including Difficulty/Competition/sparkline/Rising fast/Focus chips
  - A full Role Leaderboard list replacing Curated Practice Sets
  - Minimal filters (job family + sort)
  - Login-aware “Generate plan” CTA
  - Tooltips for “est.” metrics and a page-level trust note