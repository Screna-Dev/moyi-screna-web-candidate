// ============================================
// API Response Types (from your backend)
// ============================================

export interface ApiResponse<T> {
  status: string;
  message: string;
  errorCode?: string;
  data: T;
}

// User Search API Response
export interface ApiUserListItem {
  id: string;
  email: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE' | 'BANNED' | 'TRIAL';
  createdAt: string;
  lastActiveAt: string;
  roles: string[];
}

export interface PageMeta {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface UserSearchResponse {
  content: ApiUserListItem[];
  pageMeta: PageMeta;
}

export interface UserSearchParams {
  page?: number;
  size?: number;
  search?: string;
  role?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Training Plan API Response
export interface ApiFocusArea {
  name: string;
  dimension: string;
  score: number;
  reason: string;
  recommended_resources: string[];
}

export interface ApiSessionQuestion {
  question: string;
  description: string;
  type: string;
  purpose: string;
}

export interface ApiSessionConfig {
  persona: string;
  topic: string;
  objectives: string[];
  evaluation_dimensions: string[];
  question_type: string[];
  purposes: string[];
  questions: ApiSessionQuestion[];
}

export interface ApiTrainingModule {
  module_id: string;
  title: string;
  category: string;
  difficulty: string;
  duration_minutes: number;
  status: string;
  persona: string;
  topic: string;
  score: number;
  report_id: string;
  session_outcome: string;
  session_config: ApiSessionConfig;
}

export interface ApiTrainingPlan {
  id: number;
  user_id: string;
  target_job_id: string;
  target_job_title: string;
  target_company: string;
  metrics_ref_id: number;
  status: string;
  progress: number;
  error: string;
  summary: string;
  focus_areas: ApiFocusArea[];
  pending_modules: number;
  modules: ApiTrainingModule[];
  created_at: string;
  updated_at: string;
}

// Reports API Response
export interface ApiReportScores {
  resume_background: number;
  domain_knowledge: number;
  technical_skills: number;
  behavioral: number;
}

export interface ApiInterviewReport {
  interview_id: string;
  generated_at: string;
  score_overall: number;
  scores: ApiReportScores;
  feedback_summary: string;
  strengths: string[];
  areas_for_improvement: string[];
  recommendations: string;
}

export interface ApiUserReportsResponse {
  user_id: string;
  total: number;
  reports: ApiInterviewReport[];
}

// ============================================
// UI Types (matching your existing AdminUser interface)
// ============================================

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: ('Candidate' | 'Mentor' | 'Admin')[];
  status: 'Active' | 'Inactive' | 'Banned' | 'Trial';
  plan: {
    name: 'Free' | 'Starter' | 'Pro' | 'Enterprise' | 'Custom';
    type: 'Monthly' | 'Yearly';
    renewalDate: string;
    status: 'Active' | 'Past due' | 'Canceled';
    stripeCustomerId: string;
    stripeSubscriptionId: string;
  };
  credits: {
    remaining: number;
    usedThisMonth: number;
    history: {
      date: string;
      package: string;
      amount: number;
      creditsAdded: number;
      status: 'Paid' | 'Failed' | 'Refunded';
    }[];
  };
  metrics: {
    readinessScore: number;
    previousScore: number;
    skillScores: {
      coding: number;
      systemDesign: number;
      communication: number;
      problemDecomposition: number;
      domainKnowledge: number;
    };
    trendOverTime: { week: string; score: number }[];
    totalAIMockSessions: number;
    totalMentorSessions: number;
    last30Days: {
      aiMockSessions: number;
      practiceHours: number;
      mentorSessions: number;
    };
  };
  profile: {
    targetRole: string;
    targetCompanies: string[];
    timezone: string;
    location: string;
  };
  trainingPlan?: {
    startDate: string;
    estimatedCompletion: string;
    progressPercent: number;
    stages: {
      name: string;
      description: string;
      completionPercent: number;
      lastCompletedTask: string;
      remainingHours: number;
    }[];
  };
  reports: {
    id: string;
    date: string;
    type: string;
    summary: string;
    readinessImpact: number;
    scores?: { category: string; score: number }[];
    strengths?: string[];
    weaknesses?: string[];
    recommendations?: string[];
  }[];
  videos: {
    id: string;
    title: string;
    thumbnail?: string;
    type: 'AI Mock' | 'Mentor Session';
    duration: string;
    date: string;
    tags: string[];
    markers?: { time: string; label: string }[];
  }[];
  mentorSessions: {
    upcoming: {
      id: string;
      date: string;
      mentor: string;
      topic: string;
      status: 'Scheduled' | 'Reschedule requested' | 'Canceled';
      meetingLink: string;
    }[];
    past: {
      id: string;
      date: string;
      duration: string;
      mentor: string;
      topic: string;
      userRating: number;
      mentorComments: string;
    }[];
  };
  payments: {
    id: string;
    date: string;
    type: 'Subscription' | 'Credits purchase' | 'Mentor session' | 'Refund';
    description: string;
    amount: number;
    paymentMethod: string;
    status: 'Paid' | 'Failed' | 'Refunded';
  }[];
  tags: string[];
  internalNotes: { date: string; author: string; note: string }[];
  auditLog: {
    date: string;
    actor: string;
    action: string;
    description: string;
    previousValue?: string;
    newValue?: string;
  }[];
  signupDate: string;
  lastActive: string;
  totalRevenue: number;
  lifetimeSpend: number;
}

// Extended type for admin page with loading state and raw API data
export interface AdminUserWithApiData extends AdminUser {
  isLoadingDetails?: boolean;
  // Raw API data (useful for components that need original structure)
  _apiTrainingPlans?: ApiTrainingPlan[];
  _apiReports?: ApiInterviewReport[];
}

export const mockAdminUsers: AdminUser[] = [
  {
    id: 'usr_001',
    name: 'Sarah Chen',
    email: 'sarah.chen@example.com',
    avatar: '',
    role: ['Candidate'],
    status: 'Active',
    plan: {
      name: 'Pro',
      type: 'Monthly',
      renewalDate: '2024-02-15',
      status: 'Active',
      stripeCustomerId: 'cus_Abc123',
      stripeSubscriptionId: 'sub_Xyz789',
    },
    credits: {
      remaining: 45,
      usedThisMonth: 15,
      history: [
        { date: '2024-01-10', package: 'Pro Monthly', amount: 49, creditsAdded: 60, status: 'Paid' },
        { date: '2023-12-10', package: 'Pro Monthly', amount: 49, creditsAdded: 60, status: 'Paid' },
      ],
    },
    metrics: {
      readinessScore: 72,
      previousScore: 54,
      skillScores: {
        coding: 78,
        systemDesign: 65,
        communication: 80,
        problemDecomposition: 70,
        domainKnowledge: 68,
      },
      trendOverTime: [
        { week: 'W1', score: 45 },
        { week: 'W2', score: 48 },
        { week: 'W3', score: 52 },
        { week: 'W4', score: 54 },
        { week: 'W5', score: 58 },
        { week: 'W6', score: 62 },
        { week: 'W7', score: 68 },
        { week: 'W8', score: 72 },
      ],
      totalAIMockSessions: 24,
      totalMentorSessions: 6,
      last30Days: {
        aiMockSessions: 8,
        practiceHours: 32,
        mentorSessions: 2,
      },
    },
    profile: {
      targetRole: 'Backend Engineer – Mid-level',
      targetCompanies: ['Google', 'Meta', 'Amazon'],
      timezone: 'PST',
      location: 'San Francisco, CA',
    },
    trainingPlan: {
      startDate: '2023-11-01',
      estimatedCompletion: '2024-03-01',
      progressPercent: 68,
      stages: [
        { name: 'Fundamentals', description: 'DSA & basic coding mocks', completionPercent: 100, lastCompletedTask: 'Array & String problems', remainingHours: 0 },
        { name: 'System Design', description: 'Architecture & scalability', completionPercent: 75, lastCompletedTask: 'URL Shortener design', remainingHours: 8 },
        { name: 'Behavioral & Leadership', description: 'STAR method & soft skills', completionPercent: 40, lastCompletedTask: 'Leadership principles', remainingHours: 12 },
        { name: 'Company-specific drills', description: 'FAANG-specific prep', completionPercent: 20, lastCompletedTask: 'Google culture fit', remainingHours: 16 },
      ],
    },
    reports: [
      { id: 'rpt_001', date: '2024-01-15', type: 'AI Mock Interview Report', summary: 'Strong performance on coding, needs work on communication clarity.', readinessImpact: 3, scores: [{ category: 'Coding', score: 85 }, { category: 'Communication', score: 70 }], strengths: ['Algorithm optimization', 'Code structure'], weaknesses: ['Verbose explanations'], recommendations: ['Practice concise explanations'] },
      { id: 'rpt_002', date: '2024-01-10', type: 'System Design Evaluation', summary: 'Good understanding of scalability concepts.', readinessImpact: 5, scores: [{ category: 'Architecture', score: 78 }], strengths: ['Database design'], weaknesses: ['Load balancing'], recommendations: ['Study CDN patterns'] },
    ],
    videos: [
      { id: 'vid_001', title: 'System Design Mock - E-commerce', type: 'AI Mock', duration: '45:22', date: '2024-01-15', tags: ['System Design', 'E-commerce'], markers: [{ time: '12:30', label: 'Great scalability answer' }, { time: '28:15', label: 'Missed caching opportunity' }] },
      { id: 'vid_002', title: 'Behavioral Interview Practice', type: 'Mentor Session', duration: '30:00', date: '2024-01-08', tags: ['Behavioral', 'Leadership'] },
    ],
    mentorSessions: {
      upcoming: [
        { id: 'ms_001', date: '2024-01-25T14:00:00', mentor: 'John Smith', topic: 'System Design Review', status: 'Scheduled', meetingLink: 'https://zoom.us/j/123456' },
        { id: 'ms_002', date: '2024-01-28T10:00:00', mentor: 'Emily Davis', topic: 'Behavioral Prep', status: 'Scheduled', meetingLink: 'https://meet.google.com/abc-def' },
      ],
      past: [
        { id: 'ms_003', date: '2024-01-10', duration: '45 min', mentor: 'John Smith', topic: 'Resume Review', userRating: 5, mentorComments: 'Excellent progress, ready for next level.' },
        { id: 'ms_004', date: '2024-01-03', duration: '60 min', mentor: 'Michael Lee', topic: 'Mock Interview', userRating: 4, mentorComments: 'Good problem-solving, work on time management.' },
      ],
    },
    payments: [
      { id: 'pay_001', date: '2024-01-10', type: 'Subscription', description: 'Pro Plan - Monthly', amount: 49, paymentMethod: 'Visa •••• 4242', status: 'Paid' },
      { id: 'pay_002', date: '2024-01-05', type: 'Credits purchase', description: '20 Extra Credits', amount: 19, paymentMethod: 'Visa •••• 4242', status: 'Paid' },
      { id: 'pay_003', date: '2023-12-10', type: 'Subscription', description: 'Pro Plan - Monthly', amount: 49, paymentMethod: 'Visa •••• 4242', status: 'Paid' },
    ],
    tags: ['VIP', 'High potential'],
    internalNotes: [
      { date: '2024-01-12', author: 'Admin Jane', note: 'User requested extended trial for system design module.' },
    ],
    auditLog: [
      { date: '2024-01-10', actor: 'System', action: 'Subscription renewed', description: 'Monthly Pro subscription renewed', previousValue: '', newValue: '' },
      { date: '2024-01-05', actor: 'Admin Jane', action: 'Credits added', description: 'Manual credit adjustment', previousValue: '25', newValue: '45' },
    ],
    signupDate: '2023-11-01',
    lastActive: '2 hours ago',
    totalRevenue: 245,
    lifetimeSpend: 245,
  },
  {
    id: 'usr_002',
    name: 'Marcus Johnson',
    email: 'marcus.j@example.com',
    avatar: '',
    role: ['Candidate', 'Mentor'],
    status: 'Active',
    plan: {
      name: 'Enterprise',
      type: 'Yearly',
      renewalDate: '2024-11-01',
      status: 'Active',
      stripeCustomerId: 'cus_Def456',
      stripeSubscriptionId: 'sub_Uvw123',
    },
    credits: {
      remaining: 120,
      usedThisMonth: 30,
      history: [
        { date: '2023-11-01', package: 'Enterprise Yearly', amount: 999, creditsAdded: 200, status: 'Paid' },
      ],
    },
    metrics: {
      readinessScore: 88,
      previousScore: 82,
      skillScores: {
        coding: 92,
        systemDesign: 85,
        communication: 90,
        problemDecomposition: 88,
        domainKnowledge: 82,
      },
      trendOverTime: [
        { week: 'W1', score: 72 },
        { week: 'W2', score: 75 },
        { week: 'W3', score: 78 },
        { week: 'W4', score: 80 },
        { week: 'W5', score: 82 },
        { week: 'W6', score: 84 },
        { week: 'W7', score: 86 },
        { week: 'W8', score: 88 },
      ],
      totalAIMockSessions: 42,
      totalMentorSessions: 12,
      last30Days: {
        aiMockSessions: 5,
        practiceHours: 20,
        mentorSessions: 1,
      },
    },
    profile: {
      targetRole: 'Staff Engineer',
      targetCompanies: ['Stripe', 'Airbnb', 'Netflix'],
      timezone: 'EST',
      location: 'New York, NY',
    },
    trainingPlan: {
      startDate: '2023-06-01',
      estimatedCompletion: '2024-02-01',
      progressPercent: 92,
      stages: [
        { name: 'Fundamentals', description: 'DSA & basic coding mocks', completionPercent: 100, lastCompletedTask: 'All fundamentals complete', remainingHours: 0 },
        { name: 'System Design', description: 'Architecture & scalability', completionPercent: 100, lastCompletedTask: 'Distributed systems', remainingHours: 0 },
        { name: 'Behavioral & Leadership', description: 'STAR method & soft skills', completionPercent: 85, lastCompletedTask: 'Conflict resolution', remainingHours: 4 },
        { name: 'Company-specific drills', description: 'Target company prep', completionPercent: 80, lastCompletedTask: 'Stripe payments system', remainingHours: 6 },
      ],
    },
    reports: [
      { id: 'rpt_003', date: '2024-01-12', type: 'Mentor Session Feedback', summary: 'Excellent system design skills, ready for Staff level interviews.', readinessImpact: 2, scores: [{ category: 'System Design', score: 92 }, { category: 'Leadership', score: 88 }], strengths: ['Distributed systems expertise', 'Clear communication of trade-offs', 'Strong architectural thinking'], weaknesses: ['Could improve on cost optimization discussions'], recommendations: ['Focus on presenting multiple solutions with cost analysis'] },
      { id: 'rpt_004', date: '2024-01-05', type: 'AI Mock Interview Report', summary: 'Demonstrated staff-level problem solving. Excellent at breaking down complex problems into manageable pieces.', readinessImpact: 4, scores: [{ category: 'Coding', score: 95 }, { category: 'Problem Decomposition', score: 90 }], strengths: ['Elegant code solutions', 'Time complexity optimization', 'Edge case handling'], weaknesses: ['Minor: could verbalize thought process more'], recommendations: ['Practice talking through solutions out loud'] },
      { id: 'rpt_005', date: '2023-12-28', type: 'System Design Evaluation', summary: 'Designed a highly scalable payment processing system. Showed deep understanding of consistency vs availability trade-offs.', readinessImpact: 5, scores: [{ category: 'Architecture', score: 94 }, { category: 'Scalability', score: 91 }], strengths: ['Database sharding strategies', 'Event-driven architecture', 'Fault tolerance design'], weaknesses: ['Could elaborate more on monitoring solutions'], recommendations: ['Add observability patterns to design discussions'] },
      { id: 'rpt_006', date: '2023-12-15', type: 'Behavioral Feedback', summary: 'Strong leadership examples with clear STAR format. Demonstrated impact at scale.', readinessImpact: 3, scores: [{ category: 'Communication', score: 89 }, { category: 'Leadership', score: 92 }], strengths: ['Compelling storytelling', 'Quantified impact', 'Team collaboration examples'], weaknesses: ['Some stories could be more concise'], recommendations: ['Trim behavioral answers to 2-3 minutes max'] },
    ],
    videos: [
      { id: 'vid_003', title: 'Staff Level System Design', type: 'AI Mock', duration: '60:00', date: '2024-01-12', tags: ['System Design', 'Staff Level'], markers: [{ time: '08:45', label: 'Excellent requirements gathering' }, { time: '22:30', label: 'Strong CAP theorem discussion' }, { time: '45:00', label: 'Great scaling strategy' }] },
      { id: 'vid_004', title: 'Distributed Systems Deep Dive', type: 'AI Mock', duration: '55:30', date: '2024-01-05', tags: ['System Design', 'Distributed Systems'], markers: [{ time: '15:00', label: 'Consensus algorithms explained well' }, { time: '35:20', label: 'Creative partition handling' }] },
      { id: 'vid_005', title: 'Leadership Interview Practice', type: 'Mentor Session', duration: '45:00', date: '2023-12-20', tags: ['Behavioral', 'Leadership'], markers: [{ time: '12:00', label: 'Strong conflict resolution story' }, { time: '28:00', label: 'Impactful project example' }] },
      { id: 'vid_006', title: 'Technical Deep Dive - Payments', type: 'AI Mock', duration: '50:15', date: '2023-12-10', tags: ['System Design', 'Fintech'], markers: [{ time: '18:30', label: 'Excellent fraud detection approach' }] },
    ],
    mentorSessions: {
      upcoming: [],
      past: [
        { id: 'ms_005', date: '2024-01-12', duration: '60 min', mentor: 'Sarah Chen', topic: 'Staff Interview Prep', userRating: 5, mentorComments: 'Ready for real interviews.' },
      ],
    },
    payments: [
      { id: 'pay_004', date: '2023-11-01', type: 'Subscription', description: 'Enterprise Plan - Yearly', amount: 999, paymentMethod: 'Amex •••• 1234', status: 'Paid' },
    ],
    tags: ['Enterprise referral', 'Beta tester'],
    internalNotes: [],
    auditLog: [
      { date: '2023-11-01', actor: 'System', action: 'Account created', description: 'Enterprise account setup', previousValue: '', newValue: '' },
    ],
    signupDate: '2023-06-01',
    lastActive: '1 day ago',
    totalRevenue: 999,
    lifetimeSpend: 999,
  },
  {
    id: 'usr_004',
    name: 'David Kim',
    email: 'david.kim@example.com',
    avatar: '',
    role: ['Mentor'],
    status: 'Active',
    plan: {
      name: 'Pro',
      type: 'Monthly',
      renewalDate: '2024-02-10',
      status: 'Active',
      stripeCustomerId: 'cus_Jkl012',
      stripeSubscriptionId: 'sub_Mno789',
    },
    credits: {
      remaining: 25,
      usedThisMonth: 5,
      history: [
        { date: '2024-01-10', package: 'Pro Monthly', amount: 49, creditsAdded: 30, status: 'Paid' },
      ],
    },
    metrics: {
      readinessScore: 95,
      previousScore: 95,
      skillScores: {
        coding: 98,
        systemDesign: 95,
        communication: 92,
        problemDecomposition: 94,
        domainKnowledge: 90,
      },
      trendOverTime: [
        { week: 'W1', score: 95 },
        { week: 'W2', score: 95 },
        { week: 'W3', score: 95 },
        { week: 'W4', score: 95 },
      ],
      totalAIMockSessions: 5,
      totalMentorSessions: 0,
      last30Days: {
        aiMockSessions: 1,
        practiceHours: 4,
        mentorSessions: 0,
      },
    },
    profile: {
      targetRole: 'Senior Software Engineer',
      targetCompanies: [],
      timezone: 'PST',
      location: 'Seattle, WA',
    },
    trainingPlan: {
      startDate: '2023-07-01',
      estimatedCompletion: '2024-01-15',
      progressPercent: 98,
      stages: [
        { name: 'Fundamentals', description: 'DSA & basic coding mocks', completionPercent: 100, lastCompletedTask: 'Advanced graph algorithms', remainingHours: 0 },
        { name: 'System Design', description: 'Architecture & scalability', completionPercent: 100, lastCompletedTask: 'Real-time systems design', remainingHours: 0 },
        { name: 'Behavioral & Leadership', description: 'STAR method & soft skills', completionPercent: 100, lastCompletedTask: 'Executive presence training', remainingHours: 0 },
        { name: 'Company-specific drills', description: 'Target company prep', completionPercent: 92, lastCompletedTask: 'AWS architecture patterns', remainingHours: 2 },
      ],
    },
    reports: [
      { id: 'rpt_010', date: '2024-01-08', type: 'AI Mock Interview Report', summary: 'Exceptional coding skills demonstrated. Clean, efficient solutions with excellent time complexity analysis.', readinessImpact: 2, scores: [{ category: 'Coding', score: 98 }, { category: 'Problem Solving', score: 96 }], strengths: ['Optimal solutions', 'Clean code practices', 'Strong testing approach'], weaknesses: ['None identified'], recommendations: ['Ready for senior/staff interviews'] },
      { id: 'rpt_011', date: '2024-01-02', type: 'System Design Evaluation', summary: 'Designed a globally distributed messaging system. Expert-level understanding of consistency models.', readinessImpact: 3, scores: [{ category: 'Architecture', score: 97 }, { category: 'Scalability', score: 95 }], strengths: ['Multi-region architecture', 'Message ordering guarantees', 'Failure recovery'], weaknesses: ['Minor: could discuss more about cost implications'], recommendations: ['Consider adding cost analysis to designs'] },
      { id: 'rpt_012', date: '2023-12-18', type: 'Mentor Session Feedback', summary: 'As a mentor, David provides exceptional guidance. Students consistently rate him highly.', readinessImpact: 0, scores: [{ category: 'Teaching', score: 95 }, { category: 'Communication', score: 92 }], strengths: ['Patient explanations', 'Real-world examples', 'Actionable feedback'], weaknesses: ['Sessions sometimes run over time'], recommendations: ['Consider stricter time management'] },
    ],
    videos: [
      { id: 'vid_010', title: 'Advanced Algorithm Techniques', type: 'AI Mock', duration: '48:30', date: '2024-01-08', tags: ['Algorithms', 'Advanced'], markers: [{ time: '12:00', label: 'Elegant DP solution' }, { time: '30:00', label: 'Optimal graph traversal' }] },
      { id: 'vid_011', title: 'Mentoring Session - System Design Basics', type: 'Mentor Session', duration: '60:00', date: '2024-01-05', tags: ['System Design', 'Mentoring'], markers: [{ time: '20:00', label: 'Great teaching moment' }, { time: '45:00', label: 'Student breakthrough' }] },
      { id: 'vid_012', title: 'Real-time Systems Architecture', type: 'AI Mock', duration: '52:15', date: '2023-12-20', tags: ['System Design', 'Real-time'], markers: [{ time: '25:00', label: 'Excellent WebSocket scaling' }] },
    ],
    mentorSessions: {
      upcoming: [
        { id: 'ms_020', date: '2024-01-28T16:00:00', mentor: 'David Kim (as mentor)', topic: 'System Design for Juniors', status: 'Scheduled', meetingLink: 'https://zoom.us/j/789012' },
      ],
      past: [
        { id: 'ms_021', date: '2024-01-15', duration: '60 min', mentor: 'David Kim (led session)', topic: 'DSA Fundamentals', userRating: 5, mentorComments: 'Great session teaching binary search variations.' },
        { id: 'ms_022', date: '2024-01-08', duration: '45 min', mentor: 'David Kim (led session)', topic: 'System Design Intro', userRating: 5, mentorComments: 'Helped student understand load balancing basics.' },
      ],
    },
    payments: [
      { id: 'pay_005', date: '2024-01-10', type: 'Subscription', description: 'Pro Plan - Monthly', amount: 49, paymentMethod: 'Mastercard •••• 5678', status: 'Paid' },
      { id: 'pay_006', date: '2024-01-15', type: 'Mentor session', description: 'Mentor earnings - 2 sessions', amount: -120, paymentMethod: 'Direct deposit', status: 'Paid' },
    ],
    tags: ['Top mentor', 'System Design expert'],
    internalNotes: [
      { date: '2024-01-05', author: 'Admin Bob', note: 'Approved as mentor after background check.' },
    ],
    auditLog: [
      { date: '2024-01-05', actor: 'Admin Bob', action: 'Role updated', description: 'Added Mentor role', previousValue: 'Candidate', newValue: 'Mentor' },
    ],
    signupDate: '2023-09-15',
    lastActive: '3 hours ago',
    totalRevenue: 450,
    lifetimeSpend: 196,
  },
  {
    id: 'usr_005',
    name: 'Jessica Williams',
    email: 'jessica.w@example.com',
    avatar: '',
    role: ['Candidate'],
    status: 'Banned',
    plan: {
      name: 'Free',
      type: 'Monthly',
      renewalDate: '',
      status: 'Canceled',
      stripeCustomerId: '',
      stripeSubscriptionId: '',
    },
    credits: {
      remaining: 0,
      usedThisMonth: 0,
      history: [],
    },
    metrics: {
      readinessScore: 35,
      previousScore: 30,
      skillScores: {
        coding: 40,
        systemDesign: 25,
        communication: 45,
        problemDecomposition: 30,
        domainKnowledge: 35,
      },
      trendOverTime: [
        { week: 'W1', score: 30 },
        { week: 'W2', score: 32 },
        { week: 'W3', score: 35 },
      ],
      totalAIMockSessions: 3,
      totalMentorSessions: 0,
      last30Days: {
        aiMockSessions: 0,
        practiceHours: 0,
        mentorSessions: 0,
      },
    },
    profile: {
      targetRole: 'Junior Developer',
      targetCompanies: [],
      timezone: 'EST',
      location: 'Miami, FL',
    },
    trainingPlan: {
      startDate: '2023-12-01',
      estimatedCompletion: '2024-06-01',
      progressPercent: 15,
      stages: [
        { name: 'Fundamentals', description: 'DSA & basic coding mocks', completionPercent: 45, lastCompletedTask: 'Basic array problems', remainingHours: 20 },
        { name: 'System Design', description: 'Architecture & scalability', completionPercent: 0, lastCompletedTask: 'Not started', remainingHours: 40 },
        { name: 'Behavioral & Leadership', description: 'STAR method & soft skills', completionPercent: 10, lastCompletedTask: 'Introduction module', remainingHours: 15 },
        { name: 'Company-specific drills', description: 'Target company prep', completionPercent: 0, lastCompletedTask: 'Not started', remainingHours: 25 },
      ],
    },
    reports: [
      { id: 'rpt_020', date: '2023-12-20', type: 'AI Mock Interview Report', summary: 'Struggled with basic data structure questions. Needs significant improvement in fundamentals.', readinessImpact: -2, scores: [{ category: 'Coding', score: 35 }, { category: 'Problem Solving', score: 28 }], strengths: ['Showed enthusiasm', 'Asked clarifying questions'], weaknesses: ['Weak algorithm knowledge', 'Poor time management', 'Incomplete solutions'], recommendations: ['Focus on fundamentals before mock interviews', 'Complete DSA course first'] },
      { id: 'rpt_021', date: '2023-12-15', type: 'Behavioral Feedback', summary: 'Communication was clear but lacked concrete examples. Stories need more structure.', readinessImpact: 1, scores: [{ category: 'Communication', score: 50 }, { category: 'Storytelling', score: 40 }], strengths: ['Friendly demeanor', 'Good eye contact'], weaknesses: ['Vague answers', 'No quantified impact'], recommendations: ['Practice STAR method', 'Prepare 5-7 strong stories'] },
      { id: 'rpt_022', date: '2023-12-10', type: 'AI Mock Interview Report', summary: 'Initial assessment shows gaps in core programming concepts. Recommended to start with basics.', readinessImpact: 0, scores: [{ category: 'Coding', score: 30 }, { category: 'Fundamentals', score: 25 }], strengths: ['Willing to learn'], weaknesses: ['Basic syntax errors', 'Logic flow issues'], recommendations: ['Complete introductory programming course'] },
    ],
    videos: [
      { id: 'vid_020', title: 'Initial Coding Assessment', type: 'AI Mock', duration: '35:00', date: '2023-12-20', tags: ['Coding', 'Assessment'], markers: [{ time: '10:00', label: 'Struggled with arrays' }, { time: '25:00', label: 'Timeout on solution' }] },
      { id: 'vid_021', title: 'Behavioral Practice Round 1', type: 'AI Mock', duration: '25:00', date: '2023-12-15', tags: ['Behavioral'], markers: [{ time: '08:00', label: 'Good communication start' }, { time: '18:00', label: 'Vague example given' }] },
    ],
    mentorSessions: {
      upcoming: [],
      past: [],
    },
    payments: [],
    tags: ['Support-heavy'],
    internalNotes: [
      { date: '2024-01-08', author: 'Admin Jane', note: 'Account banned due to ToS violation - multiple fraudulent refund requests.' },
    ],
    auditLog: [
      { date: '2024-01-08', actor: 'Admin Jane', action: 'Account banned', description: 'ToS violation', previousValue: 'Active', newValue: 'Banned' },
    ],
    signupDate: '2023-12-01',
    lastActive: '1 week ago',
    totalRevenue: 0,
    lifetimeSpend: 0,
  },
];
