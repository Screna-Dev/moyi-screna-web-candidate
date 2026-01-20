// Community Interview Experience Mock Data

export type UserTier = 'Free' | 'Pro' | 'Elite';

export interface TierConfig {
  dailyUploadLimit: number;
  uploadRewardCredits: number;
  answerShareReward: number;
}

export const tierConfigs: Record<UserTier, TierConfig> = {
  Free: { dailyUploadLimit: 1, uploadRewardCredits: 5, answerShareReward: 10 },
  Pro: { dailyUploadLimit: 3, uploadRewardCredits: 10, answerShareReward: 20 },
  Elite: { dailyUploadLimit: 5, uploadRewardCredits: 15, answerShareReward: 30 },
};

export const creditRules = {
  viewAnswerCostRange: [5, 50] as [number, number],
  unlockAllAnswersDefaultCost: 25,
  runMockDefaultCost: 30,
  creatorRevenueShare: 0.5,
};

export interface CurrentUser {
  userId: string;
  tier: UserTier;
  creditBalance: number;
  name: string;
}

export const currentUser: CurrentUser = {
  userId: 'u_1001',
  tier: 'Pro',
  creditBalance: 120,
  name: 'Alex Chen',
};

export interface InterviewQuestion {
  id: string;
  question: string;
}

export interface ExperienceCard {
  experienceId: string;
  companyName: string;
  companyLogo?: string;
  jobTitle: string;
  tags: string[];
  meta: {
    duration: string;
    posted: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    date?: string;
    round?: string;
  };
  highlightedAnswersCount: number;
  creditCostHint: string;
  experienceText?: string;
  questions?: InterviewQuestion[];
}

export const experienceLibrary: ExperienceCard[] = [
  {
    experienceId: 'exp_2001',
    companyName: 'Google',
    jobTitle: 'Software Engineer (Backend)',
    tags: ['System Design', 'Backend', 'Onsite'],
    meta: { duration: '60 mins', posted: '3 days ago', difficulty: 'Hard', date: '2026-01-05', round: 'Onsite' },
    highlightedAnswersCount: 6,
    creditCostHint: 'Answers from 10 Credits',
    experienceText: 'They focused on designing a rate limiter service, tradeoffs for storage, and one deep dive on concurrency. Behavioral questions were around conflict resolution and ownership. The interviewer was very friendly and gave hints when I got stuck. Overall a challenging but fair experience.',
    questions: [
      { id: 'q1', question: 'Design a rate limiter service that can handle millions of requests per second. Discuss the tradeoffs between different algorithms like token bucket vs sliding window.' },
      { id: 'q2', question: 'How would you handle storage for the rate limiter? Compare Redis vs DynamoDB and discuss consistency implications.' },
      { id: 'q3', question: 'Deep dive on concurrency: How would you ensure thread safety when updating rate limit counters in a distributed system?' },
      { id: 'q4', question: 'Tell me about a time when you had a conflict with a teammate. How did you resolve it?' },
    ],
  },
  {
    experienceId: 'exp_2002',
    companyName: 'Amazon',
    jobTitle: 'Data Engineer',
    tags: ['Technical', 'SQL', 'Phone Screen'],
    meta: { duration: '45 mins', posted: '1 week ago', difficulty: 'Medium', date: '2025-12-28', round: 'Phone Screen' },
    highlightedAnswersCount: 3,
    creditCostHint: 'Answers from 5 Credits',
    experienceText: 'Heavy focus on SQL queries - window functions, CTEs, and optimization. Also asked about data pipeline design and how to handle late-arriving data. One behavioral question about a time I disagreed with a teammate.',
    questions: [
      { id: 'q1', question: 'Write a SQL query using window functions to find the top 3 highest paid employees in each department.' },
      { id: 'q2', question: 'Explain how you would design a data pipeline to handle late-arriving data. What strategies would you use?' },
      { id: 'q3', question: 'Tell me about a time when you disagreed with a teammate. How did you handle it?' },
    ],
  },
  {
    experienceId: 'exp_2003',
    companyName: 'Meta',
    jobTitle: 'Product Data Scientist',
    tags: ['Case Study', 'Metrics', 'Technical'],
    meta: { duration: '90+ mins', posted: '2 weeks ago', difficulty: 'Hard', date: '2025-12-20', round: 'Onsite' },
    highlightedAnswersCount: 8,
    creditCostHint: 'Answers from 15 Credits',
    experienceText: 'Multiple rounds: metrics deep dive, A/B testing case, and coding in Python. The product sense round asked me to design success metrics for Facebook Groups. Very rigorous but interviewers were helpful.',
    questions: [
      { id: 'q1', question: 'Design success metrics for Facebook Groups. What would be your north star metric and why?' },
      { id: 'q2', question: 'You run an A/B test and see a 2% lift in engagement but a 1% drop in revenue. What do you do?' },
      { id: 'q3', question: 'Write Python code to calculate the rolling 7-day average of daily active users.' },
      { id: 'q4', question: 'How would you measure the long-term impact of a new feature on user retention?' },
    ],
  },
  {
    experienceId: 'exp_2004',
    companyName: 'Stripe',
    jobTitle: 'Software Engineer',
    tags: ['API Design', 'Backend', 'Technical'],
    meta: { duration: '60 mins', posted: '5 days ago', difficulty: 'Hard', date: '2026-01-03', round: 'Technical' },
    highlightedAnswersCount: 5,
    creditCostHint: 'Answers from 10 Credits',
    experienceText: 'Asked to design a payment processing API. Deep dive into idempotency, retry logic, and handling failures gracefully. Also discussed database transactions and consistency.',
    questions: [
      { id: 'q1', question: 'Design a RESTful API for payment processing. What endpoints would you need and what would the request/response look like?' },
      { id: 'q2', question: 'How would you implement idempotency in a payment system to prevent duplicate charges?' },
      { id: 'q3', question: 'Discuss retry logic and handling failures gracefully in distributed payment systems.' },
    ],
  },
  {
    experienceId: 'exp_2005',
    companyName: 'Microsoft',
    jobTitle: 'Frontend Engineer',
    tags: ['React', 'JavaScript', 'Behavioral'],
    meta: { duration: '45 mins', posted: '1 day ago', difficulty: 'Medium', date: '2026-01-10', round: 'Technical' },
    highlightedAnswersCount: 4,
    creditCostHint: 'Answers from 8 Credits',
    experienceText: 'Built a React component live during the interview. Questions about hooks, state management, and performance optimization. Behavioral questions focused on collaboration and handling ambiguity.',
    questions: [
      { id: 'q1', question: 'Build a live search component in React that debounces API calls. Explain your approach to state management.' },
      { id: 'q2', question: 'What are the differences between useMemo and useCallback? When would you use each?' },
      { id: 'q3', question: 'How would you optimize a React application that has performance issues? Walk me through your debugging process.' },
      { id: 'q4', question: 'Tell me about a time when you had to work with ambiguous requirements. How did you handle it?' },
    ],
  },
];

export interface Answer {
  answerId: string;
  userBadge: string;
  userId: string;
  qualityTags: string[];
  helpfulCount: number;
  locked: boolean;
  unlockCostCredits: number;
  previewText: string;
  fullText: string;
  aiNotes: string;
}

export const answersForExperience: Record<string, Answer[]> = {
  exp_2001: [
    {
      answerId: 'ans_3001',
      userId: 'u_2001',
      userBadge: 'Pro User',
      qualityTags: ['AI-Verified', 'High Score', 'Clear Structure'],
      helpfulCount: 42,
      locked: true,
      unlockCostCredits: 10,
      previewText: 'I started by clarifying requirements (rate limits, burst behavior, multi-region). Then I proposed a token bucket approach with Redis + Lua for atomicity...',
      fullText: 'I started by clarifying requirements (rate limits, burst behavior, multi-region). Then I proposed a token bucket approach with Redis + Lua for atomicity. For the storage layer, I discussed using Redis Cluster for horizontal scaling and explained how to handle failover scenarios. I also mentioned monitoring with metrics like rejection rate and latency percentiles. The interviewer appreciated my discussion of trade-offs between token bucket and sliding window approaches.',
      aiNotes: 'Strong logical structure. Excellent coverage of edge cases and trade-offs. Clear communication throughout.',
    },
    {
      answerId: 'ans_3002',
      userId: 'u_2002',
      userBadge: 'Elite User',
      qualityTags: ['AI-Verified', 'Strong Tradeoffs'],
      helpfulCount: 28,
      locked: true,
      unlockCostCredits: 15,
      previewText: 'For storage I compared Redis vs DynamoDB for counters, then addressed hot key mitigation via sharding. I also discussed eventual consistency...',
      fullText: 'For storage I compared Redis vs DynamoDB for counters, analyzing latency, cost, and operational complexity. Addressed hot key mitigation via consistent hashing and key sharding. Discussed eventual consistency implications and how to handle rate limit decisions during network partitions. Also proposed a circuit breaker pattern for graceful degradation.',
      aiNotes: 'Exceptional depth on distributed systems concepts. Trade-off analysis was particularly strong.',
    },
    {
      answerId: 'ans_3003',
      userId: 'u_2003',
      userBadge: 'Free User',
      qualityTags: ['Good Example'],
      helpfulCount: 11,
      locked: true,
      unlockCostCredits: 5,
      previewText: 'I used STAR for behavioral. For the system design I wrote down constraints first and explained the API endpoints before going into data model...',
      fullText: 'I used STAR format for behavioral questions, clearly stating the Situation, Task, Action, and Result. For system design, I started by writing down constraints (QPS, latency requirements). Then I designed the API endpoints before diving into the data model. This structured approach helped me stay organized.',
      aiNotes: 'Good structured approach. Could benefit from deeper technical details.',
    },
  ],
  exp_2002: [
    {
      answerId: 'ans_4001',
      userId: 'u_2004',
      userBadge: 'Pro User',
      qualityTags: ['AI-Verified', 'SQL Expert'],
      helpfulCount: 35,
      locked: true,
      unlockCostCredits: 10,
      previewText: 'For the window function question, I used ROW_NUMBER() with PARTITION BY to find the top N records per group...',
      fullText: 'For the window function question, I used ROW_NUMBER() with PARTITION BY to find the top N records per group. Explained the difference between ROW_NUMBER, RANK, and DENSE_RANK. For the CTE question, I demonstrated a recursive CTE for hierarchical data traversal. The interviewer seemed impressed with my optimization suggestions using indexes and query plan analysis.',
      aiNotes: 'Excellent SQL knowledge demonstrated. Clear explanations of concepts.',
    },
  ],
};

export interface CreditTransaction {
  date: string;
  action: string;
  credits: string;
  type: 'earned' | 'spent';
}

export interface CreditStats {
  currentBalance: number;
  earnedFromUploads: number;
  earnedFromAnswerViews: number;
  spentOnMocks: number;
}

export const creditStats: CreditStats = {
  currentBalance: 120,
  earnedFromUploads: 80,
  earnedFromAnswerViews: 60,
  spentOnMocks: 150,
};

export const creditTransactions: CreditTransaction[] = [
  { date: 'Jan 10', action: 'Answer Viewed (Revenue Share)', credits: '+10', type: 'earned' },
  { date: 'Jan 09', action: 'Unlocked Full Answer', credits: '-15', type: 'spent' },
  { date: 'Jan 08', action: 'Uploaded Experience', credits: '+10', type: 'earned' },
  { date: 'Jan 07', action: 'AI Mock (Real Experience Mode)', credits: '-30', type: 'spent' },
  { date: 'Jan 06', action: 'Answer Viewed (Revenue Share)', credits: '+5', type: 'earned' },
  { date: 'Jan 05', action: 'Shared Public Answer', credits: '+20', type: 'earned' },
  { date: 'Jan 04', action: 'Unlocked All Answers', credits: '-25', type: 'spent' },
  { date: 'Jan 03', action: 'Uploaded Experience', credits: '+10', type: 'earned' },
];
