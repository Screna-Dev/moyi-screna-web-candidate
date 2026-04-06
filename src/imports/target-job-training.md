Update the existing Dashboard → Mock Interview Sessions page (P2) to add a new feature: Target Job / JD-based training. Keep the current layout, grid, cards, filters, and overall styling consistent. Do not redesign the whole page. Only add this feature and the required modal(s)/drawer(s).

Goal

Users can:

set a Target Job using a detailed Job Description (JD) to generate more targeted training sessions, OR

clear the target JD and fall back to profile-based personalized recommendations.

1) Add a “Target Job” module near the top (above filters, below the existing personalization banner)

Insert a compact card/row called Target Job with two states:

State A — No target job set (default)

Title: “Target job”

Helper text: “Add a job description to tailor sessions, or keep using recommendations based on your profile.”

Primary button: Add target job

Secondary text link: Choose from suggested roles (opens modal)

State B — Target job set

Show a compact summary pill row:

“Target: [Job title]” + optional “Company: [Company]”

Small status badge: “JD-based”

Actions on the right:

Edit (opens modal)

Clear JD (reverts to profile-based personalization)

Small helper line: “Sessions are now tailored to this job description.”

2) Modal: “Add New Target Job” (include P1 content + fast setup)

When user clicks Add/Edit, open a centered modal matching the P1 UI style:

Modal header

Title: “Add New Target Job”

Subtitle: “Enter details for your target job position”

Close icon top-right

Modal content (two tabs)

Create two tabs at the top of the modal:

Quick setup (default)

Paste JD

Tab 1: Quick setup (system suggested roles/JDs)

Subtitle: “Suggested based on your profile”

A searchable list of suggested target roles (radio select), each row shows:

Job title (e.g., “Software Engineer, Backend”)

Company type tag (Startup / Mid-size / Big Tech) OR optional company name

Short snippet of focus keywords (e.g., “API design, scalability, ownership”)

A “Use this” action

Optional: include 1–2 “Suggested job descriptions” templates users can select (preview via expand)

Primary CTA at bottom: Use selected role

Tab 2: Paste JD (manual detailed JD)

Use the P1 form fields:

Job Title (required) placeholder “e.g., Senior Product Manager”

Company (optional) placeholder “e.g., Google”

Job Description (textarea) placeholder “Paste the job description here…”

Interview Date (date picker) placeholder “mm/dd/yyyy”

Daily Prep Time (hrs) numeric input default “2”
Buttons:

Secondary: Cancel

Primary: Generate Plan (same as P1)

3) Behavior after saving a Target Job

After user clicks “Use selected role” or “Generate Plan”:

Close modal

Update the top banner on P2 to reflect JD-based tailoring:

Replace/augment existing banner text with:
“Recommendations tailored to your target job description and profile.”

Update session cards subtly:

Add a small tag “Tailored to JD” on recommended cards (low emphasis)

Optionally add a small “Matched skills” tooltip on some cards (e.g., “Mapped to: stakeholder, metrics, system design”)

4) Clear JD behavior (revert to profile personalization)

When user clicks “Clear JD”:

Show a confirmation dialog:

Title: “Clear target job description?”

Body: “You’ll return to recommendations based on your profile.”

Buttons: Cancel / Clear

After clearing:

Target Job module returns to State A

Banner reverts to original profile-based text:
“Personalized recommendations based on your resume, profile, and target role.”

5) Constraints (important)

Do not change existing filters (“All Domains”, “Focus Area”, “More filters”, “Recommended”) except to keep them compatible.

Keep the page clean and avoid adding heavy new sections.

Only add the Target Job module + modal(s) + confirmation dialog.

Maintain clear visual hierarchy and consistent spacing.