/**
 * PostHog 事件名常量 —— Jul 2026 Release User Journey Event Tracking v2
 *
 * 单一事实来源，避免在埋点处手写字符串导致拼写不一致。
 * 事件名与 Notion spec（Jul 2026 埋点实现清单）完全一致（snake_case）。
 *
 * 注意：不要在 payload 里手动塞 user_id / timestamp ——
 * AuthContext 里的 identify 与 PostHog 会自动附加。
 */
export const EVENTS = {
  // 00 — Acquire
  LANDING_PAGE_VIEWED: 'landing_page_viewed',
  PRICING_VIEWED: 'pricing_viewed',
  SIGNUP_STARTED: 'signup_started',
  SIGNUP_COMPLETED: 'signup_completed',

  // 01 — Understand
  ONBOARDING_COMPLETED: 'onboarding_completed',
  ONBOARDING_STEP_VIEWED: 'onboarding_step_viewed',
  TARGET_ROLES_COMPLETED: 'target_roles_completed',
  TARGET_COMPANIES_COMPLETED: 'target_companies_completed',
  // 以下 4 个对应 7/21 新版 onboarding（Referral Source 步骤 / Resume Required Modal），
  // 功能落地时随功能 PR 接入。
  REFERRAL_SOURCE_COMPLETED: 'referral_source_completed',
  RESUME_UPLOAD_SKIPPED: 'resume_upload_skipped',
  RESUME_UPLOAD_MODAL_SHOWN: 'resume_upload_modal_shown',
  RESUME_UPLOAD_MODAL_DISMISSED: 'resume_upload_modal_dismissed',
  DASHBOARD_VIEWED: 'dashboard_viewed',

  // 02 — Mock with AI
  RESUME_PARSE_COMPLETED: 'resume_parse_completed',
  MOCK_QUICK_VIEWED: 'mock_quick_viewed',
  PERSONALIZED_PRACTICE_VIEWED: 'personalized_practice_viewed',
  MOCK_RECOMMENDATIONS_VIEWED: 'mock_recommendations_viewed',
  MOCK_SET_DETAIL_VIEWED: 'mock_set_detail_viewed',
  MOCK_STARTED: 'mock_started',
  MOCK_COMPLETED: 'mock_completed',
  MOCK_ABANDONED: 'mock_abandoned',
  MOCK_REPORT_GENERATED: 'mock_report_generated',
  MOCK_NEW_TITLES: 'mock_new_titles',

  // 02b — Interview PrepNotes（面经社区）
  INTERVIEW_NOTES_BROWSED: 'interview_notes_browsed',
  COMPANY_PAGE_VIEWED: 'company_page_viewed',
  NOTE_SEARCH_PERFORMED: 'note_search_performed',
  NOTE_READ: 'note_read',
  PAYWALL_VIEWED: 'paywall_viewed',

  // 03 — Mentors（学员侧）
  COACHING_VIEWED: 'coaching_viewed',
  MENTOR_PROFILE_VIEWED: 'mentor_profile_viewed',
  BOOKING_MODAL_OPENED: 'booking_modal_opened',
  BOOKING_PLAN_SELECTED: 'booking_plan_selected',
  // Special Offer 功能未上线，随功能 PR 接入。
  BOOKING_SPECIAL_OFFER_BLOCKED: 'booking_special_offer_blocked',
  SESSION_BOOKED: 'session_booked',
  SESSION_RESCHEDULED: 'session_rescheduled',
  SESSION_CANCELLED: 'session_cancelled',
  SESSION_COMPLETED: 'session_completed',
  SESSION_REVIEWED: 'session_reviewed',
  PAYMENT_COMPLETED: 'payment_completed',
  COACHING_FILTER_APPLIED: 'coaching_filter_applied',
  COACHING_FILTER_EMPTY_RESULT: 'coaching_filter_empty_result',

  // 03b — Mentor 供给侧
  MENTOR_DASHBOARD_VIEWED: 'mentor_dashboard_viewed',
  MENTOR_APPLY_STARTED: 'mentor_apply_started',
  MENTOR_APPLY_SUBMITTED: 'mentor_apply_submitted',
  // 三步 wizard / YoE track / waitlist / Special Offer 配置未上线，随功能 PR 接入。
  MENTOR_APPLY_TRACK_ASSIGNED: 'mentor_apply_track_assigned',
  MENTOR_APPLY_WAITLIST_JOINED: 'mentor_apply_waitlist_joined',
  MENTOR_SPECIAL_OFFER_CONFIGURED: 'mentor_special_offer_configured',

  // 04 — 变现
  PLAN_SELECTED: 'plan_selected',
  SUBSCRIPTION_STARTED: 'subscription_started',
  SUBSCRIPTION_CANCEL_CLICKED: 'subscription_cancel_clicked',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  BUY_CREDITS_CLICKED: 'buy_credits_clicked',
  CREDITS_PURCHASED: 'credits_purchased',
  CREDITS_DEPLETED: 'credits_depleted',
  UPGRADE_CLICKED: 'upgrade_clicked',
  PLAN_SWITCH_CONFIRMED: 'plan_switch_confirmed',

  // 05 — Retention
  APP_OPENED: 'app_opened',
  SESSION_END: 'session_end',
} as const;

export type AnalyticsEventName = (typeof EVENTS)[keyof typeof EVENTS];
