// Shared label → API-enum maps for community posts.
//
// The "Share Your Experience" form and the search filters both display
// human-readable option labels (e.g. "Product Manager"), but the backend
// stores/filters posts by enum values (e.g. "PRODUCT_MANAGER"). Keep these
// maps in one place so create-post and search filtering stay in sync.

export const ROLE_TO_ENUM: Record<string, string> = {
  'Product Manager': 'PRODUCT_MANAGER',
  'Associate Product Manager': 'ASSOCIATE_PRODUCT_MANAGER',
  'Growth Product Manager': 'GROWTH_PRODUCT_MANAGER',
  'Technical Product Manager': 'TECHNICAL_PRODUCT_MANAGER',
  'Software Engineer': 'SOFTWARE_ENGINEER',
  'Frontend Engineer': 'FRONTEND_ENGINEER',
  'Backend Engineer': 'BACKEND_ENGINEER',
  'Full Stack Engineer': 'FULL_STACK_ENGINEER',
  'Mobile Engineer': 'MOBILE_ENGINEER',
  'DevOps Engineer': 'DEVOPS_ENGINEER',
  'QA / Test Engineer': 'QA_TEST_ENGINEER',
  'Data Scientist': 'DATA_SCIENTIST',
  'Data Analyst': 'DATA_ANALYST',
  'Machine Learning Engineer': 'ML_ENGINEER',
  'AI Engineer': 'AI_ENGINEER',
  'Product Designer': 'PRODUCT_DESIGNER',
  'UX Designer': 'UX_DESIGNER',
  'UX Researcher': 'UX_RESEARCHER',
  'Business Analyst': 'BUSINESS_ANALYST',
  'Consultant': 'CONSULTANT',
};

export const ROUND_TO_ENUM: Record<string, string> = {
  'Recruiter / HR Screen': 'RECRUITER',
  'Online Assessment (OA)': 'ONLINE_ASSESSMENT',
  'Technical Phone Screen': 'TECHNICAL_PHONE_SCREEN',
  'Hiring Manager Screen': 'HIRING_MANAGER',
  'Take-home Assignment': 'TAKE_HOME',
  'Onsite - Coding / Algorithms': 'ONSITE_CODING',
  'Onsite - System Design / Architecture': 'ONSITE_SYSTEM_DESIGN',
  'Onsite - Behavioral / Leadership': 'ONSITE_BEHAVIORAL',
  'Onsite - Product Sense / Strategy': 'ONSITE_PRODUCT',
  'Onsite - Cross-functional / Panel': 'ONSITE_PANEL',
  'Executive / Final Round': 'EXECUTIVE',
};

export const CATEGORY_TO_ENUM: Record<string, string> = {
  'Behavioral': 'BEHAVIORAL',
  'Technical': 'TECHNICAL',
  'Situational / Judgment': 'SITUATIONAL_JUDGMENT',
  'Product Sense': 'PRODUCT_SENSE',
  'Execution': 'EXECUTION',
  'Strategy': 'STRATEGY',
  'Analytical / Metrics': 'ANALYTICAL_METRICS',
  'Case Study': 'CASE_STUDY',
  'Coding': 'CODING',
  'System Design': 'SYSTEM_DESIGN',
  'Debugging / Troubleshooting': 'DEBUGGING_TROUBLESHOOTING',
  'Leadership': 'LEADERSHIP',
  'Communication': 'COMMUNICATION',
  'Stakeholder Management': 'STAKEHOLDER_MANAGEMENT',
  'Collaboration / Conflict': 'COLLABORATION_CONFLICT',
  'Resume / Background': 'RESUME_BACKGROUND',
  'Experience Deep Dive': 'EXPERIENCE_DEEP_DIVE',
  'Career Motivation': 'CAREER_MOTIVATION',
  'Company-specific Questions': 'COMPANY_SPECIFIC',
};

// Convert a label to its enum, falling back to an auto-derived UPPER_SNAKE
// value for anything not in the map (e.g. free-text or newly added options).
const toEnum = (map: Record<string, string>, v: string) =>
  map[v] ?? v.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');

export const toRoleEnum = (v: string) => toEnum(ROLE_TO_ENUM, v);
export const toRoundEnum = (v: string) => toEnum(ROUND_TO_ENUM, v);
export const toCategoryEnum = (v: string) => toEnum(CATEGORY_TO_ENUM, v);
