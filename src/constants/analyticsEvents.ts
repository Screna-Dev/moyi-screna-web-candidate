/**
 * PostHog 事件名常量 —— Jun 2026 Beta Phase User Journey Event Tracking
 *
 * 单一事实来源，避免在 ~20 个埋点处手写字符串导致拼写不一致。
 * 事件名与 Notion spec 完全一致（snake_case）。
 *
 * 注意：不要在 payload 里手动塞 user_id / timestamp ——
 * AuthContext 里的 identify 与 PostHog 会自动附加。
 */
export const EVENTS = {
  // 01 — Understand
  ONBOARDING_COMPLETED: 'onboarding_completed',
  DASHBOARD_VIEWED: 'dashboard_viewed',
  JOB_PREFERENCE_COMPLETED: 'job_preference_completed',
  JOB_RECOMMENDATIONS_VIEWED: 'job_recommendations_viewed',

  // 02 — Mock with AI
  MOCK_RECOMMENDATIONS_VIEWED: 'mock_recommendations_viewed',
  MOCK_SET_DETAIL_VIEWED: 'mock_set_detail_viewed',
  MOCK_STARTED: 'mock_started',
  MOCK_COMPLETED: 'mock_completed',
  MOCK_ABANDONED: 'mock_abandoned',
  MOCK_REPORT_GENERATED: 'mock_report_generated',
  MOCK_NEW_TITLES: 'mock_new_titles',

  // 03 — Get help from mentors
  MENTOR_PROFILE_VIEWED: 'mentor_profile_viewed',
  SESSION_BOOKED: 'session_booked',
  SESSION_RESCHEDULED: 'session_rescheduled',
  SESSION_COMPLETED: 'session_completed',
  SESSION_REVIEWED: 'session_reviewed',
  PAYMENT_COMPLETED: 'payment_completed',
  REFUND_REQUESTED: 'refund_requested',

  // 04 — Apply smartly
  JOB_APPLICATION_DELEGATED: 'job_application_delegated',
  JOB_APPLICATION_SUBMITTED: 'job_application_submitted',
  APPLICATION_LIMIT_APPROACHED: 'application_limit_approached',

  // 05 — Retention
  APP_OPENED: 'app_opened',
  SESSION_END: 'session_end',

  // 02b — Interview PrepNotes（面经社区）
  INTERVIEW_NOTES_BROWSED: 'interview_notes_browsed',
  PREMIUM_NOTE_CLICKED: 'premium_note_clicked',
  NOTE_READ: 'note_read',

  // Credits & 变现
  CREDITS_DEPLETED: 'credits_depleted',
  CREDITS_LOW_WARNING_SHOWN: 'credits_low_warning_shown',
} as const;

export type AnalyticsEventName = (typeof EVENTS)[keyof typeof EVENTS];
