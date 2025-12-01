export interface SkillItem {
  name: string;
  proficiency: string;
  notes?: string;
}

export interface Skill {
  category: string;
  items: SkillItem[];
}

export interface Experience {
  title: string;
  company: string;
  location: string;
  start_date: string;
  end_date: string;
  achievements: string[];
}

export interface Education {
  institution: string;
  degree: string;
  field_of_study: string;
  start_year: string;
  end_year: string;
  gpa: number;
  honors: string[];
}

export interface Certification {
  name: string;
  issuer: string;
  issued_date: string;
  credential_id: string;
  expiry_date: string;
}

export interface Project {
  name: string;
  description: string;
  technologies: string[];
  url: string;
  highlights: string[];
}

export interface Links {
  linkedin: string;
  github: string;
  website: string;
  other: string[];
}

export interface ProfileInfo {
  full_name: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  visa_status: string;
  website: string;
  summary: string;
  total_years_experience: number;
}

export interface ProfileData {
  profile: ProfileInfo;
  job_titles: string[];
  skills: Skill[];
  experience: Experience[];
  education: Education[];
  certifications: Certification[];
  projects: Project[];
  links: Links;
}

export interface Profile {
    resume_path: string;
    structured_resume: ProfileData
}

// Constants

export const VISA_STATUS_OPTIONS = [
  { value: "US Citizen", label: "US Citizen" },
  { value: "Green Card", label: "Green Card" },
  { value: "H1B", label: "H1B Visa" },
  { value: "OPT", label: "OPT" },
  { value: "CPT", label: "CPT" },
  { value: "F1", label: "F1 Student Visa" },
  { value: "Other", label: "Other" },
] as const;

export const SKILL_CATEGORIES = [
  'Web Technologies',
  'Database',
  'Version Control',
  'Cloud Services',
  'Containerization',
  'CI/CD',
  'Machine Learning & Data Analysis',
  'Technical',
  'Other'
] as const;

export const PROFICIENCY_LEVELS = [
  'Beginner',
  'Intermediate',
  'Advanced',
  'Expert'
] as const;

// Type guards

export function isValidProfileData(data: any): data is ProfileData {
  return (
    data &&
    typeof data === 'object' &&
    'profile' in data &&
    typeof data.profile === 'object' &&
    'job_titles' in data &&
    Array.isArray(data.job_titles) &&
    'skills' in data &&
    Array.isArray(data.skills) &&
    'experience' in data &&
    Array.isArray(data.experience) &&
    'education' in data &&
    Array.isArray(data.education) &&
    'certifications' in data &&
    Array.isArray(data.certifications) &&
    'projects' in data &&
    Array.isArray(data.projects) &&
    'links' in data &&
    typeof data.links === 'object'
  );
}

// Helper functions

export function calculateProfileCompleteness(data: ProfileData): number {
  let score = 0;
  const { profile } = data;

  if (profile.full_name) score += 10;
  if (profile.email) score += 10;
  if (profile.phone) score += 5;
  if (profile.location) score += 5;
  if (profile.visa_status) score += 5;
  if (profile.headline) score += 10;
  if (profile.summary) score += 10;
  if (data.job_titles.length > 0) score += 10;
  if (data.skills.length > 0) score += 10;
  if (data.experience.length > 0) score += 15;
  if (data.education.length > 0) score += 10;

  return Math.min(score, 100);
}

export function getProfileInitials(fullName: string): string {
  if (!fullName) return "U";
  
  const names = fullName.trim().split(" ");
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  
  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
}

export function getCompletenessMessage(score: number): string {
  if (score >= 80) return "Your profile looks great!";
  if (score >= 60) return "Good progress! Add more details to stand out";
  if (score >= 40) return "Keep going! Complete your profile to get more visibility";
  return "Complete your profile to get more visibility";
}

export function getCompletenessColor(score: number): string {
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-blue-500";
  if (score >= 40) return "text-yellow-500";
  return "text-red-500";
}

// Empty state creators

export function createEmptyProfileData(): ProfileData {
  return {
    profile: {
      full_name: "",
      headline: "",
      email: "",
      phone: "",
      location: "",
      visa_status: "",
      website: "",
      summary: "",
      total_years_experience: 0,
    },
    job_titles: [],
    skills: [],
    experience: [],
    education: [],
    certifications: [],
    projects: [],
    links: {
      linkedin: "",
      github: "",
      website: "",
      other: [],
    },
  };
}

export function createEmptyExperience(): Experience {
  return {
    title: "",
    company: "",
    location: "",
    start_date: "",
    end_date: "",
    achievements: [""],
  };
}

export function createEmptyEducation(): Education {
  return {
    institution: "",
    degree: "",
    field_of_study: "",
    start_year: "",
    end_year: "",
    gpa: 0,
    honors: [],
  };
}

export function createEmptyCertification(): Certification {
  return {
    name: "",
    issuer: "",
    issued_date: "",
    credential_id: "",
    expiry_date: "",
  };
}

export function createEmptyProject(): Project {
  return {
    name: "",
    description: "",
    technologies: [],
    url: "",
    highlights: [""],
  };
}

export function createEmptySkillItem(): SkillItem {
  return {
    name: "",
    proficiency: "Intermediate",
    notes: ""
  };
}
