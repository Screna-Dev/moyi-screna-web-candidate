Create a “Job Training Plan” page for Screna using React + shadcn/ui + Tailwind CSS semantic tokens, but strictly keep the same design system, visual language, spacing rhythm, component styling, and interaction patterns as the existing Screna platform.

This page should feel like a natural extension of the current product, not a new standalone design.
Do not invent a new UI style. Do not introduce a different visual language. Reuse existing platform patterns as much as possible.

Global design system requirements
Must visually match Screna’s existing product UI
Reuse the same:
card radius
border treatment
shadows
button styles
tab styles
input styles
dialog styles
sheet styles
spacing scale
typography hierarchy
icon usage
token-driven colors
Use Tailwind semantic tokens only such as:
bg-background
text-foreground
text-muted-foreground
border-border
bg-muted
bg-primary
text-primary
bg-secondary
text-secondary
bg-destructive
text-destructive
Reuse existing utility styles already used in the platform, including:
gradient-primary
shadow-card
shadow-glow
transition-smooth
Overall feel should be:
modern
clean
calm
premium
consistent with Screna’s current desktop SaaS experience
Avoid over-designing or introducing flashy visual patterns that do not exist elsewhere in the platform
Page purpose

This page helps users prepare for a target job through structured AI training sessions, track readiness, and review completed practice.

1. Page Header

Create a header section with responsive layout:

Left side:
Title: Job Training Plan (text-4xl font-bold)
Subtitle: supportive descriptive text in text-muted-foreground
Right side:
Button: Add Target Job
Use existing Screna primary CTA style: gradient-primary + shadow-glow
Clicking it opens a Dialog
Dialog content

Form fields:

Job Title (Input)
Company (Input, optional)
Job Description (Textarea, 4 rows)
Interview Date (date input)
Daily Prep Time (number input, step 0.5)

Footer buttons:

Cancel (outline)
Generate Plan (gradient-primary)

Layout:

Responsive flex
Stack vertically on mobile
Horizontal alignment on desktop
2. Target Jobs Navigation

Use top-level Tabs for different target jobs.

Requirements:

Each tab represents a target role, e.g.:
Senior Product Manager
Marketing Director
Each TabsTrigger includes a Target icon
TabsList:
desktop: inline-grid
mobile: grid-cols-2 full width

Must look visually consistent with existing Screna tab/navigation patterns.

3. Job Overview Card

For each selected target job, show a top summary card using:

Card
shadow-card

Layout:

grid-cols-1 md:grid-cols-3
Left column: Circular success-rate gauge
Use SVG circular progress ring
r=56, strokeWidth=8
Base ring uses muted token styling
Progress ring uses primary token styling
Compute with strokeDasharray / strokeDashoffset
Center text:
percentage value
text-3xl font-bold
Bottom label:
Overall Success Rate
Container style:
bg-gradient-to-br from-primary/10 to-secondary/10
rounded-lg
Right side (md:col-span-2): Category Breakdown
Title with BarChart3 icon in text-primary
Each category row:
left: category name (text-sm font-medium)
right: score percentage (text-sm font-semibold)
Below each row: Progress bar with h-2
Categories:
Resume & Background
Domain Knowledge
Technical Skills
Behavioral
Bottom area: Overall Preparation Progress
Label with TrendingUp icon in text-secondary
Show progress percentage
Progress bar with h-3, slightly thicker than category progress bars
4. Training Plan Sessions Card

Use:

Card
shadow-card

Header:

Title with Brain icon in text-primary
Subtitle in muted text
Category navigation

Use pill-style category tabs instead of default block tabs.

Requirements:

Use flex-wrap gap-2
Each tab should look like a pill
TabsTrigger:
rounded-full
active state: bg-primary text-primary-foreground
Categories:
Resume
Cloud
Database
System Design
Algorithms
API Design
Frontend
Backend
Behavioral
Leadership
Communication
Problem Solving

Do not make these look visually different from the rest of the platform—keep them aligned with Screna’s existing chip / tab language.

Session Cards grid
grid-cols-1 md:grid-cols-2 gap-4
Show at most 4 sessions per category
SessionCard component

Use:

Card
shadow-card
hover:shadow-glow
transition-smooth
Header
Left:
session title (text-lg)
category description (CardDescription)
Right:
if completed, green Completed badge with CheckCircle2 icon
Content
Duration row:
Clock icon + XX min
Difficulty badge:
outline variant
Completed state

Show:

Score row:
left label: Score
right: big score in text-2xl font-bold text-primary
Two side-by-side buttons:
View Report (outline, FileText icon) → opens Sheet
Retake (outline, PlayCircle icon)
Incomplete state
Full-width button:
Start Session
gradient-primary
PlayCircle icon
5. Session Report Sheet

Use a right-side Sheet with sm:max-w-2xl

Inside include two tabs:

Basic
Premium
Basic Tab

Use ScrollArea with h-[calc(100vh-200px)]

A. Summary card
bg-muted/50
rounded-lg
grid-cols-2
Show:
Overall Score (text-2xl text-primary)
Duration
B. Questions & Feedback list

Each question is a bordered rounded card:

question number + question text
score badge on the right

Below: two-column comparison (grid-cols-1 md:grid-cols-2)

Your Answer
bg-muted/30
amber dot indicator
Sample Answer
bg-primary/5 border-primary/20
primary dot indicator

Feedback block:

bg-secondary/10
rounded-lg
C. Strengths vs Areas to Improve
grid-cols-1 md:grid-cols-2
Strengths:
border-secondary/50 bg-secondary/5
heading in text-secondary
Areas to Improve:
border-destructive/50 bg-destructive/5
heading in text-destructive
Each side has 3 bullet points
D. Improvement Advice
bg-primary/5 border-primary/20
BookOpen icon
E. Action buttons
Download Report
Share
Both outline, flex-1
Premium Tab
Locked state (non-Elite)
Circular premium icon with gold gradient
Crown icon
Title: Unlock Premium Insights
Features list:
Video replay (Play icon)
Timestamped suggestions (MessageSquare)
Body language analysis (TrendingUp)
CTA:
Upgrade to Elite
gradient-primary
Crown icon
Unlocked state

Show:

Video Replay:
aspect-video bg-muted
centered Play button
Timestamped Suggestions:
time badge (mono font)
category badge
suggestion text
Advanced Analytics:
grid-cols-3
Eye Contact
Confidence
Filler Words
6. Practice History Card

Use:

Card
shadow-card

Header:

Clock icon
subtitle: Review your completed sessions...

List only completed sessions.

Each row:

responsive flex (sm:flex-row)
left:
title (font-semibold)
meta text in muted color:
category • Completed
right:
score badge (bg-primary/10)
3 ghost icon buttons:
FileText
Video
PlayCircle

Hover:

hover:bg-muted/50
transition-smooth

Each list row should use:

border
rounded-lg
Data structure

Use these interfaces:

TargetJob
id
title
company?
interviewDate
dailyPrepTime
successRate
progress
categoryScores[]
AISession
id
title
category
difficulty
duration
completed
score?
Premium logic
Use mock unlock logic by sessionId
Only "s2" is unlocked in mock data
Mock data
2 target jobs
48+ AI training sessions
12 categories
4–5 sessions per category
Important consistency rule

This page must look like it already belongs inside Screna’s current platform.

Do:
extend the current system
reuse component patterns
keep visual language unified
preserve brand consistency
Do not:
create a visually different dashboard style
introduce a new color system
use random gradients or illustrations not already in product
make this feel like a separate app