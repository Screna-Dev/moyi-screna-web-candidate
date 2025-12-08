export interface MentorApplication {
  id: string;
  userId: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  statusReason: string;
  createdAt: string;
  updatedAt: string;
  fullName: string;
  displayName: string;
  legalName: string;
  avatarUrl: string;
  currentTitle: string;
  currentCompany: string;
  location: string;
  timezone: string;
  languages: string[];
  yearsOfExperience: string;
  industries: string[];
  expertises: string[];
  topics: string[];
  companiesHighlights: string[];
  shortBio: string;
  motivation?: string;
  linkedInUrl: string;
  githubUrl: string;
  websiteUrl: string;
  resumeUrl: string;
  videoIntroUrl?: string;
  evidenceUrls: string[];
  sessionTypes: SessionType[];
  baseRates: BaseRate[];
  weeklyMaxSessions: number;
  availabilitySlots: AvailabilitySlot[];
  taxCountry: string;
  street1: string;
  street2: string;
  city: string;
  state: string;
  postalCode: string;
  taxClassification: string;
  isUSPerson: boolean;
  hasSSN: boolean;
  ssnMasked: string;
  w9Certified: boolean;
  backupWithholding: boolean;
  termsAcceptedAt: string;
}

export interface SessionType {
  id: string;
  name: string;
  durationMinutes: number;
  description: string;
}

export interface BaseRate {
  sessionTypeId: string;
  priceUsd: number;
  enabled: boolean;
}

export interface AvailabilitySlot {
  weekday: string;
  startTime: string;
  endTime: string;
}

export interface MentorSession {
  id: string;
  mentorId: string;
  candidateId: string;
  candidateName: string;
  type: string;
  durationMinutes: number;
  date: string;
  startTime: string;
  endTime: string;
  timezone: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  meetingLink: string;
  candidateNotes: string;
  mentorNotes: string;
  rating: number;
  ratingComment: string;
  createdAt: string;
  updatedAt: string;
}

export interface MentorAvailability {
  id: string;
  mentorId: string;
  weekday: string;
  startTime: string;
  endTime: string;
  isBookable: boolean;
}

export interface MentorEarning {
  id: string;
  mentorId: string;
  sessionId: string;
  date: string;
  description: string;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  currency: string;
  status: 'pending' | 'paid';
  payoutBatchId: string;
}

export interface MentorNotification {
  id: string;
  mentorId: string;
  type: string;
  title: string;
  message: string;
  relatedSessionId: string;
  isRead: boolean;
  createdAt: string;
}

export interface MentorReferral {
  id: string;
  mentorId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidateAvatar: string;
  jobTitle: string;
  company: string;
  referralReason: string;
  status: 'pending' | 'accepted' | 'interviewed' | 'hired' | 'declined';
  referralBonus: number;
  bonusStatus: 'pending' | 'earned' | 'paid';
  createdAt: string;
  updatedAt: string;
}

export const mockMentorApplication: MentorApplication = {
  id: "mentor-app-1",
  userId: "user-123",
  status: "approved",
  statusReason: "",
  createdAt: "2025-10-01T10:00:00Z",
  updatedAt: "2025-10-05T15:30:00Z",
  fullName: "Alex Johnson",
  displayName: "Alex J.",
  legalName: "Alexander Johnson",
  avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
  currentTitle: "Senior Software Engineer",
  currentCompany: "TechNova",
  location: "New York, USA",
  timezone: "America/New_York",
  languages: ["English", "中文"],
  yearsOfExperience: "5–10 years",
  industries: ["Backend", "FinTech"],
  expertises: ["System Design", "Backend Architecture", "Behavioral Coaching"],
  topics: [
    "Interview Prep – Algorithms",
    "Interview Prep – System Design",
    "Interview Prep – Behavioral",
    "Career Strategy / Resume Review"
  ],
  companiesHighlights: [
    "TechNova – Senior SWE",
    "FinCloud – Software Engineer II",
    "DataRocket – Backend Engineer"
  ],
  shortBio: "Senior backend engineer with 7+ years experience in large-scale distributed systems, ex-FinTech. I help candidates master system design, algorithms, and behavioral stories to confidently pass top-tier interviews.",
  motivation: "I've been through the tough interview process at top tech companies, and I know how challenging it can be. I want to give back by helping the next generation of engineers succeed and land their dream jobs. Seeing my mentees get offers brings me genuine joy.",
  linkedInUrl: "https://www.linkedin.com/in/alex-johnson",
  githubUrl: "https://github.com/alex-backend",
  websiteUrl: "https://alexj.dev",
  resumeUrl: "https://screna-demo-assets.s3.amazonaws.com/alex-johnson-resume.pdf",
  evidenceUrls: [
    "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200&h=200&fit=crop"
  ],
  sessionTypes: [
    {
      id: "session-30",
      name: "30 min – Quick Mock / Q&A",
      durationMinutes: 30,
      description: "Fast Q&A or focused feedback on one topic."
    },
    {
      id: "session-60",
      name: "60 min – Full Mock Interview",
      durationMinutes: 60,
      description: "Structured mock interview with feedback."
    },
    {
      id: "session-90",
      name: "90 min – System Design Deep Dive",
      durationMinutes: 90,
      description: "End-to-end system design practice and review."
    }
  ],
  baseRates: [
    {
      sessionTypeId: "session-30",
      priceUsd: 60,
      enabled: true
    },
    {
      sessionTypeId: "session-60",
      priceUsd: 110,
      enabled: true
    },
    {
      sessionTypeId: "session-90",
      priceUsd: 150,
      enabled: false
    }
  ],
  weeklyMaxSessions: 8,
  availabilitySlots: [
    {
      weekday: "Monday",
      startTime: "19:00",
      endTime: "22:00"
    },
    {
      weekday: "Wednesday",
      startTime: "19:00",
      endTime: "22:00"
    },
    {
      weekday: "Saturday",
      startTime: "10:00",
      endTime: "14:00"
    }
  ],
  taxCountry: "United States",
  street1: "1234 5th Ave",
  street2: "Apt 9B",
  city: "New York",
  state: "NY",
  postalCode: "10003",
  taxClassification: "Individual / Sole Proprietor",
  isUSPerson: true,
  hasSSN: true,
  ssnMasked: "***-**-6789",
  w9Certified: true,
  backupWithholding: false,
  termsAcceptedAt: "2025-10-05T15:00:00Z"
};

export const mockMentorSessions: MentorSession[] = [
  {
    id: "session-1",
    mentorId: "mentor-app-1",
    candidateId: "cand-101",
    candidateName: "Emily Chen",
    type: "60 min – Full Mock Interview",
    durationMinutes: 60,
    date: "2025-11-15",
    startTime: "19:30",
    endTime: "20:30",
    timezone: "America/New_York",
    status: "pending",
    meetingLink: "https://meet.screna.ai/session-1",
    candidateNotes: "Upcoming onsite for Senior Backend role, want to practice system design and behavioral questions.",
    mentorNotes: "",
    rating: 0,
    ratingComment: "",
    createdAt: "2025-11-10T09:00:00Z",
    updatedAt: "2025-11-10T09:00:00Z"
  },
  {
    id: "session-2",
    mentorId: "mentor-app-1",
    candidateId: "cand-102",
    candidateName: "Jason Lee",
    type: "30 min – Quick Mock / Q&A",
    durationMinutes: 30,
    date: "2025-11-12",
    startTime: "20:00",
    endTime: "20:30",
    timezone: "America/New_York",
    status: "confirmed",
    meetingLink: "https://meet.screna.ai/session-2",
    candidateNotes: "Need feedback on my STAR stories for behavioral rounds.",
    mentorNotes: "",
    rating: 5,
    ratingComment: "Very motivated, just needs to tighten behavioral examples.",
    createdAt: "2025-11-05T13:20:00Z",
    updatedAt: "2025-11-12T21:05:00Z"
  },
  {
    id: "session-3",
    mentorId: "mentor-app-1",
    candidateId: "cand-103",
    candidateName: "Priya Singh",
    type: "60 min – Full Mock Interview",
    durationMinutes: 60,
    date: "2025-10-28",
    startTime: "18:00",
    endTime: "19:00",
    timezone: "America/New_York",
    status: "completed",
    meetingLink: "https://meet.screna.ai/session-3",
    candidateNotes: "First system design interview for a mid-level backend position.",
    mentorNotes: "Needs to work on capacity planning and trade-off communication.",
    rating: 4.5,
    ratingComment: "Strong fundamentals, a bit nervous but coachable.",
    createdAt: "2025-10-20T11:00:00Z",
    updatedAt: "2025-10-28T19:30:00Z"
  }
];

export const mockMentorAvailability: MentorAvailability[] = [
  {
    id: "avail-1",
    mentorId: "mentor-app-1",
    weekday: "Monday",
    startTime: "19:00",
    endTime: "22:00",
    isBookable: true
  },
  {
    id: "avail-2",
    mentorId: "mentor-app-1",
    weekday: "Wednesday",
    startTime: "19:00",
    endTime: "22:00",
    isBookable: true
  },
  {
    id: "avail-3",
    mentorId: "mentor-app-1",
    weekday: "Saturday",
    startTime: "10:00",
    endTime: "14:00",
    isBookable: true
  }
];

export const mockMentorEarnings: MentorEarning[] = [
  {
    id: "earn-1",
    mentorId: "mentor-app-1",
    sessionId: "session-3",
    date: "2025-10-28",
    description: "60 min – Full Mock Interview with Priya Singh",
    grossAmount: 110,
    platformFee: 22,
    netAmount: 88,
    currency: "USD",
    status: "paid",
    payoutBatchId: "payout-2025-11-01"
  },
  {
    id: "earn-2",
    mentorId: "mentor-app-1",
    sessionId: "session-2",
    date: "2025-11-12",
    description: "30 min – Quick Mock / Q&A with Jason Lee",
    grossAmount: 60,
    platformFee: 12,
    netAmount: 48,
    currency: "USD",
    status: "pending",
    payoutBatchId: ""
  }
];

export const mockMentorNotifications: MentorNotification[] = [
  {
    id: "notif-1",
    mentorId: "mentor-app-1",
    type: "new_booking",
    title: "New session request from Emily Chen",
    message: "Emily Chen requested a 60 min Full Mock Interview on Nov 15 at 7:30 PM.",
    relatedSessionId: "session-1",
    isRead: false,
    createdAt: "2025-11-10T09:05:00Z"
  },
  {
    id: "notif-2",
    mentorId: "mentor-app-1",
    type: "review",
    title: "New review received",
    message: "Jason Lee gave you 5 stars for your session.",
    relatedSessionId: "session-2",
    isRead: true,
    createdAt: "2025-11-12T21:10:00Z"
  }
];

export const mockMentorReferrals: MentorReferral[] = [
  {
    id: "ref-1",
    mentorId: "mentor-app-1",
    candidateId: "candidate-001",
    candidateName: "Emily Chen",
    candidateEmail: "emily.chen@email.com",
    candidateAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop",
    jobTitle: "Senior Software Engineer",
    company: "Google",
    referralReason: "Emily has demonstrated exceptional system design skills and would be a great fit for Google's backend team. She has strong experience with distributed systems and has completed 5 successful mock interviews with me.",
    status: "interviewed",
    referralBonus: 500,
    bonusStatus: "pending",
    createdAt: "2025-10-15T10:00:00Z",
    updatedAt: "2025-11-20T14:30:00Z"
  },
  {
    id: "ref-2",
    mentorId: "mentor-app-1",
    candidateId: "candidate-002",
    candidateName: "Jason Lee",
    candidateEmail: "jason.lee@email.com",
    candidateAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop",
    jobTitle: "Frontend Engineer",
    company: "Meta",
    referralReason: "Jason has solid frontend fundamentals and React expertise. He would thrive in Meta's fast-paced environment. Has excellent communication skills and cultural fit.",
    status: "hired",
    referralBonus: 1000,
    bonusStatus: "earned",
    createdAt: "2025-09-20T09:00:00Z",
    updatedAt: "2025-11-15T16:00:00Z"
  },
  {
    id: "ref-3",
    mentorId: "mentor-app-1",
    candidateId: "candidate-003",
    candidateName: "Sarah Johnson",
    candidateEmail: "sarah.j@email.com",
    candidateAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
    jobTitle: "Product Manager",
    company: "Amazon",
    referralReason: "Sarah has strong product sense and data-driven decision making skills. Her experience aligns well with Amazon's PM role requirements.",
    status: "accepted",
    referralBonus: 500,
    bonusStatus: "pending",
    createdAt: "2025-11-01T11:30:00Z",
    updatedAt: "2025-11-05T10:00:00Z"
  },
  {
    id: "ref-4",
    mentorId: "mentor-app-1",
    candidateId: "candidate-004",
    candidateName: "Michael Wang",
    candidateEmail: "m.wang@email.com",
    candidateAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
    jobTitle: "Data Engineer",
    company: "Netflix",
    referralReason: "Michael has deep expertise in data pipelines and big data technologies. Perfect match for Netflix's data platform team.",
    status: "pending",
    referralBonus: 500,
    bonusStatus: "pending",
    createdAt: "2025-11-25T08:00:00Z",
    updatedAt: "2025-11-25T08:00:00Z"
  }
];

// Export array of mentors for the mentors listing page
export const mockMentorApplications: MentorApplication[] = [
  mockMentorApplication,
  {
    ...mockMentorApplication,
    id: "mentor-app-2",
    userId: "user-456",
    displayName: "Sarah Chen",
    fullName: "Sarah Chen",
    legalName: "Sarah Chen",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
    currentTitle: "Product Manager",
    currentCompany: "Google",
    location: "San Francisco, USA",
    timezone: "America/Los_Angeles",
    languages: ["English", "中文", "日本語"],
    yearsOfExperience: "5–10 years",
    industries: ["Product", "Tech"],
    expertises: ["Product Strategy", "Behavioral Interview", "PM Mock Interviews"],
    topics: [
      "Interview Prep – Behavioral",
      "Interview Prep – Product Sense",
      "Career Strategy / Resume Review"
    ],
    companiesHighlights: [
      "Google – Sr. PM",
      "Meta – Product Manager",
      "Startup X – PM Lead"
    ],
    shortBio: "Senior PM with 8+ years at top tech companies. I specialize in product thinking, behavioral coaching, and helping PMs land their dream roles.",
    baseRates: [
      {
        sessionTypeId: "session-30",
        priceUsd: 80,
        enabled: true
      },
      {
        sessionTypeId: "session-60",
        priceUsd: 140,
        enabled: true
      },
      {
        sessionTypeId: "session-90",
        priceUsd: 200,
        enabled: true
      }
    ]
  },
  {
    ...mockMentorApplication,
    id: "mentor-app-3",
    userId: "user-789",
    displayName: "Marcus Lee",
    fullName: "Marcus Lee",
    legalName: "Marcus Lee",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
    currentTitle: "Staff Frontend Engineer",
    currentCompany: "Meta",
    location: "Seattle, USA",
    timezone: "America/Los_Angeles",
    languages: ["English", "한국어"],
    yearsOfExperience: "10+ years",
    industries: ["Frontend", "Full Stack"],
    expertises: ["Frontend Architecture", "System Design", "Technical Leadership"],
    topics: [
      "Interview Prep – Algorithms",
      "Interview Prep – Frontend System Design",
      "Interview Prep – Behavioral",
      "Career Strategy / Resume Review"
    ],
    companiesHighlights: [
      "Meta – Staff Engineer",
      "Netflix – Senior Engineer",
      "Airbnb – Frontend Lead"
    ],
    shortBio: "Staff frontend engineer with 12+ years building scalable web apps. I help engineers excel in frontend interviews and system design rounds.",
    baseRates: [
      {
        sessionTypeId: "session-30",
        priceUsd: 70,
        enabled: true
      },
      {
        sessionTypeId: "session-60",
        priceUsd: 120,
        enabled: true
      },
      {
        sessionTypeId: "session-90",
        priceUsd: 160,
        enabled: false
      }
    ]
  }
];
