On the existing AI Mock Interview (public) page, minimally integrate the logged-in Personalized Mock experience from the dashboard page. Reuse the current practice set cards and keep the overall layout unchanged as much as possible.

Goal

Use one page with two states:

Public “Explore” (browse sets)

Logged-in “Personalized” enhancements (target job + for-you ranking + recent sessions)

Constraints (very important)

Make the smallest UI changes possible.

Reuse the existing practice set cards (same layout, chips, credits, duration, practiced count).

Do NOT redesign the overall page layout or card style.

Do NOT add a new sidebar; keep the current page structure.

1) Add a lightweight personalization bar (top, minimal)

Directly under the “AI Mock Interview” title area (above Quick Start), add a small inline bar:

Label: “Personalization”

State A (not signed in): show a lock icon + text “Sign in to personalize with your target role & save progress” + a small “Sign in” link/button.

State B (signed in): show “Target role: [role] · [level]” + “Add target job” button (reuse existing “Add target job” behavior) + small “Clear” link to revert to profile-based recommendations.

This bar should be compact and not change the page width.

2) Reuse existing Quick Start block (minimal changes)

Keep the current “Custom Session” (Quick Start) block.

Add one small optional field/row inside Quick Start:

“Use target job” selector (disabled when not signed in; clicking prompts sign in)

If signed in, allow choosing from:

“From my profile”

“From target job (JD)” (selected if user added one)

Do not change the existing Voice/Video mode buttons or Start Session CTA.

3) Insert “Trending Today” row using existing card style

Below Quick Start, add a “Trending Today” horizontal row similar to the dashboard:

Show 3 compact items (role cards) with “Start” buttons.

Keep styling consistent and minimal.

If user clicks “Start” while not signed in: show a soft-gate modal (sign in required).

If signed in: start a session using that trending set.

4) Curated Practice Sets: add a “For you” tab without changing cards

Keep the existing “Curated Practice Sets” section and filters.
Add tabs above the grid (very subtle):

Popular (default)

Trending

For you (locked when not signed in)

Behavior:

Not signed in: “For you” shows a lock icon; clicking opens sign-in modal.

Signed in: “For you” uses the same existing practice set cards but ranked based on:

target job if present, otherwise profile.

The grid cards themselves must remain unchanged (reuse exactly the current card components).

5) Add “Recent Sessions” only for signed-in users (minimal)

Below the practice set grid, add a “Recent Sessions” section:

If not signed in: show a compact placeholder card “Sign in to view your recent sessions”

If signed in: show recent sessions list (reuse existing dashboard session list style if available)

6) Soft-gate modal (minimal)

Create a small modal used whenever a signed-in-required action happens:

Triggered by: Start session, For you tab, Use target job, Save, Recent sessions

Copy: “Sign in to personalize your mock, save progress, and get coach feedback.”

Buttons: “Sign in” (primary) and “Continue browsing” (secondary)

Keep it calm and not aggressive.

Deliverables

Update the AI Mock Interview page with the above minimal additions and states. Keep it visually consistent, clean, and use existing Screna components and practice set cards.