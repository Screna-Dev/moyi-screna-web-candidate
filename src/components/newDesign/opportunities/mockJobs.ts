export type JobType = "Partner Job" | "Screna Sponsored";

export type OpportunityJob = {
  id: string;
  initials: string;
  company: string;
  title: string;
  jobType: JobType;
  location: string;
  workType: string;
  level: string;
  salaryMin: number;
  salaryMax: number;
  description: string;
  tags: string[];
  applicationCount: number;
  applicationMax: number;
  sponsorInfo: string;
  spotsUsed?: number;
  spotsTotal?: number;
  spotsRemaining?: number;
  closingDate: string;        // ISO date string
  closingDateLabel: string;   // display string
  postedDate: string;         // ISO date string
  interviewCost: number;      // credits, 0 = free
  interviewCostLabel: string;
  primaryAction: string;
  primaryBtnShadow?: string;
  scoreValue?: string;
  scoreStatus?: string;
};

export const opportunityJobs: OpportunityJob[] = [
  {
    id: "1",
    initials: "TC",
    company: "TechCorp",
    title: "Backend Engineer",
    jobType: "Partner Job",
    location: "San Francisco, CA",
    workType: "Remote",
    level: "Senior (5+ years)",
    salaryMin: 150000,
    salaryMax: 200000,
    description: "Build and maintain scalable backend services powering our core platform infrastructure.",
    tags: ["Python", "Distributed Systems", "AWS"],
    applicationCount: 31,
    applicationMax: 50,
    sponsorInfo: "First interview sponsored by recruiter",
    closingDate: "2026-10-15",
    closingDateLabel: "Closes Oct 15, 2026",
    postedDate: "2026-09-20",
    interviewCost: 0,
    interviewCostLabel: "1 credit/min · Up to 30 minutes",
    primaryAction: "Quick interview",
    primaryBtnShadow: "0px 4px 3px rgba(60,119,246,0.2)",
  },
  {
    id: "2",
    initials: "IL",
    company: "Innovate Labs",
    title: "Full-stack Engineer",
    jobType: "Screna Sponsored",
    location: "New York, NY",
    workType: "Hybrid",
    level: "Mid-level (3–5 years)",
    salaryMin: 120000,
    salaryMax: 160000,
    description: "Design and develop end-to-end features across our web application stack.",
    tags: ["React", "Node.js", "TypeScript"],
    applicationCount: 12,
    applicationMax: 40,
    sponsorInfo: "First 10 interviews free",
    spotsUsed: 7,
    spotsTotal: 10,
    spotsRemaining: 3,
    closingDate: "2026-11-01",
    closingDateLabel: "Closes Nov 1, 2026",
    postedDate: "2026-09-22",
    interviewCost: 0,
    interviewCostLabel: "Free first assessment available",
    primaryAction: "Quick interview",
    primaryBtnShadow: "0px 4px 3px rgba(60,119,246,0.2)",
  },
  {
    id: "3",
    initials: "MA",
    company: "Meridian Analytics",
    title: "Data Engineer",
    jobType: "Partner Job",
    location: "Austin, TX",
    workType: "On-site",
    level: "Mid-level (3–5 years)",
    salaryMin: 110000,
    salaryMax: 140000,
    description: "Design and build data pipelines to support analytics and machine learning workflows.",
    tags: ["Spark", "dbt", "Snowflake", "SQL"],
    applicationCount: 18,
    applicationMax: 35,
    sponsorInfo: "First interview sponsored by recruiter",
    closingDate: "2026-10-22",
    closingDateLabel: "Closes Oct 22, 2026",
    postedDate: "2026-09-18",
    interviewCost: 30,
    interviewCostLabel: "30 credits · ~45 minutes",
    primaryAction: "Quick interview",
    primaryBtnShadow: "0px 4px 3px rgba(60,119,246,0.2)",
  },
  {
    id: "4",
    initials: "CH",
    company: "Canopy Health",
    title: "Product Manager, Growth",
    jobType: "Partner Job",
    location: "Boston, MA",
    workType: "Hybrid",
    level: "Senior (5+ years)",
    salaryMin: 130000,
    salaryMax: 170000,
    description: "Lead growth initiatives and partner cross-functionally to drive user acquisition and retention.",
    tags: ["Product Strategy", "A/B Testing", "Analytics"],
    applicationCount: 8,
    applicationMax: 20,
    sponsorInfo: "First interview sponsored by recruiter",
    closingDate: "2026-10-08",
    closingDateLabel: "Closes Oct 8, 2026",
    postedDate: "2026-09-10",
    interviewCost: 0,
    interviewCostLabel: "1 credit/min · Up to 30 minutes",
    primaryAction: "Quick interview",
    primaryBtnShadow: "none",
  },
  {
    id: "5",
    initials: "DF",
    company: "DataFlow",
    title: "Software Engineer",
    jobType: "Screna Sponsored",
    location: "Seattle, WA",
    workType: "Remote",
    level: "Entry-level (0–2 years)",
    salaryMin: 85000,
    salaryMax: 110000,
    description: "Build and iterate on core product features in a fast-moving engineering team.",
    tags: ["Go", "Kubernetes", "PostgreSQL"],
    applicationCount: 44,
    applicationMax: 60,
    sponsorInfo: "First 5 interviews free",
    spotsUsed: 3,
    spotsTotal: 5,
    spotsRemaining: 2,
    closingDate: "2026-11-15",
    closingDateLabel: "Closes Nov 15, 2026",
    postedDate: "2026-09-24",
    interviewCost: 0,
    interviewCostLabel: "Free first assessment available",
    primaryAction: "Quick interview",
    primaryBtnShadow: "none",
  },
  {
    id: "6",
    initials: "AG",
    company: "Atlas Grid",
    title: "Platform Engineer",
    jobType: "Partner Job",
    location: "Chicago, IL",
    workType: "Hybrid",
    level: "Senior (5+ years)",
    salaryMin: 155000,
    salaryMax: 195000,
    description: "Own infrastructure reliability and developer experience for a large-scale distributed platform.",
    tags: ["Terraform", "AWS", "Linux", "CI/CD"],
    applicationCount: 22,
    applicationMax: 30,
    sponsorInfo: "First interview sponsored by recruiter",
    closingDate: "2026-10-01",
    closingDateLabel: "Closes Oct 1, 2026",
    postedDate: "2026-09-08",
    interviewCost: 20,
    interviewCostLabel: "20 credits · ~30 minutes",
    primaryAction: "Quick interview",
    primaryBtnShadow: "0px 4px 3px rgba(60,119,246,0.2)",
  },
  {
    id: "7",
    initials: "WC",
    company: "Wexler Cloud",
    title: "Backend Developer",
    jobType: "Partner Job",
    location: "Remote",
    workType: "Remote",
    level: "Mid-level (3–5 years)",
    salaryMin: 105000,
    salaryMax: 135000,
    description: "Develop and maintain microservices and APIs supporting our cloud-native SaaS product.",
    tags: ["Java", "Spring Boot", "Kafka"],
    applicationCount: 29,
    applicationMax: 50,
    sponsorInfo: "First interview sponsored by recruiter",
    closingDate: "2026-10-28",
    closingDateLabel: "Closes Oct 28, 2026",
    postedDate: "2026-09-16",
    interviewCost: 30,
    interviewCostLabel: "30 credits · ~45 minutes",
    primaryAction: "Quick interview",
    primaryBtnShadow: "none",
  },
  {
    id: "8",
    initials: "DR",
    company: "Driftvale",
    title: "Software Engineer",
    jobType: "Screna Sponsored",
    location: "Austin, TX",
    workType: "On-site",
    level: "Entry-level (0–2 years)",
    salaryMin: 90000,
    salaryMax: 115000,
    description: "Work on frontend and backend systems across a modern web platform serving millions of users.",
    tags: ["React", "Python", "Docker"],
    applicationCount: 35,
    applicationMax: 50,
    sponsorInfo: "First 5 interviews free",
    closingDate: "2026-11-10",
    closingDateLabel: "Closes Nov 10, 2026",
    postedDate: "2026-09-23",
    interviewCost: 0,
    interviewCostLabel: "1 credit/min · Up to 30 minutes\nFree spots apply to first attempts only. Retakes are self-funded. | 4h 32m left to start",
    primaryAction: "Retake interview",
    primaryBtnShadow: "0px 4px 3px rgba(60,119,246,0.2)",
    scoreValue: "67/100",
    scoreStatus: "Not yet qualified",
  },
];

export type SortOption = "newest" | "closing-soon" | "salary-high-low" | "cost-low-high";

export function sortJobs(jobs: OpportunityJob[], sort: SortOption): OpportunityJob[] {
  const sorted = [...jobs];
  switch (sort) {
    case "newest":
      return sorted.sort((a, b) => b.postedDate.localeCompare(a.postedDate));
    case "closing-soon":
      return sorted.sort((a, b) => a.closingDate.localeCompare(b.closingDate));
    case "salary-high-low":
      return sorted.sort((a, b) => b.salaryMax - a.salaryMax);
    case "cost-low-high":
      return sorted.sort((a, b) => a.interviewCost - b.interviewCost);
    default:
      return sorted;
  }
}

// ---- My Jobs data ----

export type AssessmentStatus =
  | "In progress"
  | "Qualified"
  | "Not yet qualified"
  | "Not started";

export type ApplicationStatus =
  | "Not applied yet"
  | "Applied"
  | "Not selected";

export type MyJob = {
  id: string;
  initials: string;
  company: string;
  title: string;
  location: string;
  jobType: JobType | "Job closed";
  assessmentStatus: AssessmentStatus;
  applicationStatus: ApplicationStatus;
  bestScore: number | null;
  guidance: string;
  updatedLabel: string;
  actions: { label: string; variant: "primary" | "secondary" }[];
  creditInfo?: string;
  isClosed?: boolean;
};

export const myJobs: MyJob[] = [
  {
    id: "mj1",
    initials: "LM",
    company: "Lumen Metrics",
    title: "Backend Engineer",
    location: "San Francisco, CA · Remote",
    jobType: "Partner Job",
    assessmentStatus: "In progress",
    applicationStatus: "Not applied yet",
    bestScore: null,
    guidance: "",
    updatedLabel: "Updated Today",
    actions: [
      { label: "View details", variant: "secondary" },
      { label: "Continue interview", variant: "primary" },
    ],
  },
  {
    id: "mj2",
    initials: "IL",
    company: "Innovate Labs",
    title: "Full-stack Engineer",
    location: "New York, NY · Hybrid",
    jobType: "Screna Sponsored",
    assessmentStatus: "Qualified",
    applicationStatus: "Not applied yet",
    bestScore: 84,
    guidance: "Send your recruiter email to apply.",
    updatedLabel: "Updated Today",
    actions: [
      { label: "View report", variant: "secondary" },
      { label: "Retake interview", variant: "primary" },
    ],
    creditInfo: "30 credits · 4h 32m left to start",
  },
  {
    id: "mj3",
    initials: "DF",
    company: "DataFlow",
    title: "Software Engineer",
    location: "Austin, TX · On-site",
    jobType: "Screna Sponsored",
    assessmentStatus: "Not yet qualified",
    applicationStatus: "Not applied yet",
    bestScore: 67,
    guidance: "",
    updatedLabel: "Updated Today",
    actions: [
      { label: "View report", variant: "secondary" },
      { label: "Retake interview", variant: "primary" },
    ],
    creditInfo: "30 credits · 4h 32m left to start",
  },
  {
    id: "mj4",
    initials: "DR",
    company: "Driftvale",
    title: "Software Engineer",
    location: "Seattle, WA · Hybrid",
    jobType: "Screna Sponsored",
    assessmentStatus: "Qualified",
    applicationStatus: "Applied",
    bestScore: 86,
    guidance: "Email sent · Confirmed by you",
    updatedLabel: "Updated Today",
    actions: [
      { label: "View report", variant: "secondary" },
      { label: "Retake interview", variant: "primary" },
    ],
    creditInfo: "30 credits · 2h 15m left to start",
  },
  {
    id: "mj5",
    initials: "AG",
    company: "Atlas Grid",
    title: "Platform Engineer",
    location: "Austin, TX · Hybrid",
    jobType: "Partner Job",
    assessmentStatus: "Qualified",
    applicationStatus: "Not selected",
    bestScore: 88,
    guidance: "The recruiter has decided not to move forward with your application for this role.",
    updatedLabel: "Updated Today",
    actions: [
      { label: "View report", variant: "secondary" },
      { label: "Browse opportunities", variant: "primary" },
    ],
  },
  {
    id: "mj6",
    initials: "WC",
    company: "Wexler Cloud",
    title: "Backend Developer",
    location: "Remote",
    jobType: "Partner Job",
    assessmentStatus: "Not yet qualified",
    applicationStatus: "Applied",
    bestScore: 65,
    guidance: "Applied automatically after assessment. Retaking is optional.",
    updatedLabel: "Updated Today",
    actions: [
      { label: "View report", variant: "secondary" },
      { label: "Retake interview", variant: "primary" },
    ],
    creditInfo: "30 credits · 1h 45m left to start",
  },
  {
    id: "mj7",
    initials: "MA",
    company: "Meridian Analytics",
    title: "Data Analyst",
    location: "New York, NY · Remote",
    jobType: "Screna Sponsored",
    assessmentStatus: "Qualified",
    applicationStatus: "Applied",
    bestScore: 81,
    guidance: "Email sent · Confirmed by you",
    updatedLabel: "Updated Sep 15, 2026",
    actions: [
      { label: "View report", variant: "secondary" },
    ],
    isClosed: true,
  },
];
