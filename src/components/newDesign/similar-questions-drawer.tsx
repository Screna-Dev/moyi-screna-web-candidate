import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ArrowRight,
  Users,
  TrendingUp,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { Button } from './ui/button';

// ─── Shared question pool (mock data) ────────────────────
export interface SimilarQuestion {
  id: string;
  title: string;
  company: string;
  companyLogo: string;
  difficulty: 'Junior' | 'Intermediate' | 'Senior' | 'Staff';
  category: string;
  tags: string[];
  practiced: number;
  matchScore: number; // 0-100 relevance
}

const QUESTION_POOL: SimilarQuestion[] = [
  {
    id: 'sq-1',
    title: 'Tell me about a time you resolved a conflict between two team members.',
    company: 'Google',
    companyLogo: 'G',
    difficulty: 'Intermediate',
    category: 'Behavioral',
    tags: ['Conflict Resolution', 'Leadership', 'Communication Clarity'],
    practiced: 1243,
    matchScore: 95,
  },
  {
    id: 'sq-2',
    title: 'How do you prioritize competing requests from multiple stakeholders?',
    company: 'Meta',
    companyLogo: 'M',
    difficulty: 'Senior',
    category: 'Behavioral',
    tags: ['Decision Making & Prioritization', 'Collaboration & Stakeholder Mgmt', 'Communication Clarity'],
    practiced: 876,
    matchScore: 91,
  },
  {
    id: 'sq-3',
    title: 'Describe a situation where you had to push back on a senior leader\'s decision.',
    company: 'Amazon',
    companyLogo: 'A',
    difficulty: 'Senior',
    category: 'Behavioral',
    tags: ['Ownership & Accountability', 'Leadership', 'Collaboration & Stakeholder Mgmt'],
    practiced: 1567,
    matchScore: 88,
  },
  {
    id: 'sq-4',
    title: 'Walk me through how you\'d define success metrics for a new feature.',
    company: 'Stripe',
    companyLogo: 'S',
    difficulty: 'Intermediate',
    category: 'Product Sense',
    tags: ['Problem Solving', 'Decision Making & Prioritization', 'Self-awareness & Reflection'],
    practiced: 934,
    matchScore: 85,
  },
  {
    id: 'sq-5',
    title: 'Tell me about a project that failed. What was your role and what did you learn?',
    company: 'Apple',
    companyLogo: 'A',
    difficulty: 'Intermediate',
    category: 'Behavioral',
    tags: ['Self-awareness & Reflection', 'Ownership & Accountability', 'Leadership'],
    practiced: 2103,
    matchScore: 82,
  },
  {
    id: 'sq-6',
    title: 'How do you make decisions when you have incomplete information?',
    company: 'Netflix',
    companyLogo: 'N',
    difficulty: 'Staff',
    category: 'Behavioral',
    tags: ['Decision Making & Prioritization', 'Problem Solving', 'Self-awareness & Reflection'],
    practiced: 723,
    matchScore: 79,
  },
  {
    id: 'sq-7',
    title: 'Describe how you mentored a junior engineer to help them grow.',
    company: 'Microsoft',
    companyLogo: 'M',
    difficulty: 'Intermediate',
    category: 'Behavioral',
    tags: ['Leadership', 'Communication Clarity', 'Collaboration & Stakeholder Mgmt'],
    practiced: 542,
    matchScore: 76,
  },
  {
    id: 'sq-8',
    title: 'How would you communicate a major technical decision to non-technical stakeholders?',
    company: 'Airbnb',
    companyLogo: 'A',
    difficulty: 'Junior',
    category: 'Behavioral',
    tags: ['Communication Clarity', 'Collaboration & Stakeholder Mgmt'],
    practiced: 1890,
    matchScore: 73,
  },
  {
    id: 'sq-9',
    title: 'Tell me about a time you took ownership of something outside your job description.',
    company: 'Uber',
    companyLogo: 'U',
    difficulty: 'Intermediate',
    category: 'Behavioral',
    tags: ['Ownership & Accountability', 'Leadership', 'Problem Solving'],
    practiced: 1045,
    matchScore: 70,
  },
  {
    id: 'sq-10',
    title: 'How do you handle disagreements about technical approach with your peers?',
    company: 'LinkedIn',
    companyLogo: 'L',
    difficulty: 'Intermediate',
    category: 'Behavioral',
    tags: ['Collaboration & Stakeholder Mgmt', 'Communication Clarity', 'Decision Making & Prioritization'],
    practiced: 688,
    matchScore: 67,
  },
];

// ─── Helpers ─────────────────────────────────────────────
const DIFFICULTY_COLORS: Record<string, string> = {
  Junior: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  Intermediate: 'bg-amber-50 text-amber-600 border-amber-100',
  Senior: 'bg-orange-50 text-orange-600 border-orange-100',
  Staff: 'bg-red-50 text-red-600 border-red-100',
};

const COMPANY_COLORS: Record<string, string> = {
  G: 'bg-blue-500',
  M: 'bg-blue-600',
  A: 'bg-slate-800',
  S: 'bg-violet-500',
  N: 'bg-red-600',
  U: 'bg-black',
  L: 'bg-blue-700',
};

function getRelatedQuestions(topic: string): SimilarQuestion[] {
  // Filter and sort by match relevance to the topic
  const normalized = topic.toLowerCase();
  return QUESTION_POOL
    .filter((q) =>
      q.tags.some((t) => t.toLowerCase().includes(normalized)) ||
      q.title.toLowerCase().includes(normalized)
    )
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 6);
}

// ─── Fallback: if no exact match, return top questions ───
function getFallbackQuestions(): SimilarQuestion[] {
  return [...QUESTION_POOL].sort((a, b) => b.matchScore - a.matchScore).slice(0, 6);
}

// ════════════════════════════════════════════════════════════
// SIMILAR QUESTIONS POPUP
// ════════════════════════════════════════════════════════════
export function SimilarQuestionsDrawer({
  open,
  onClose,
  topic,
}: {
  open: boolean;
  onClose: () => void;
  topic: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const questions = getRelatedQuestions(topic);
  const displayQuestions = questions.length > 0 ? questions : getFallbackQuestions();

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-[3px] z-[60]"
            onClick={onClose}
          />

          {/* Centered popup */}
          <div className="fixed inset-0 z-[61] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="pointer-events-auto w-full max-w-[560px] max-h-[85vh] bg-white rounded-2xl shadow-2xl shadow-black/10 flex flex-col overflow-hidden border border-slate-200/60"
            >
              {/* ── Header ── */}
              <div className="px-6 pt-5 pb-4 border-b border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <h2 className="text-[15px] text-slate-900">Similar Questions</h2>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider">Related to</span>
                  <span className="text-[12px] px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full border border-blue-100">
                    {topic}
                  </span>
                </div>

                <p className="text-[12px] text-slate-400 mt-2.5 leading-relaxed">
                  Practice these questions to strengthen your <span className="text-slate-600">{topic.toLowerCase()}</span> skills. Sorted by relevance.
                </p>
              </div>

              {/* ── Question List ── */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2.5">
                {displayQuestions.map((q, index) => (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                  >
                    <Link
                      to={`/question/${q.id}`}
                      className="block group"
                      onClick={onClose}
                    >
                      <div className="rounded-xl border border-slate-100 hover:border-blue-200 bg-white hover:bg-blue-50/30 p-4 transition-all duration-200 hover:shadow-sm">
                        {/* Top row: company + difficulty + match */}
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded ${COMPANY_COLORS[q.companyLogo] || 'bg-slate-500'} text-white flex items-center justify-center text-[9px]`}>
                              {q.companyLogo}
                            </div>
                            <span className="text-[11px] text-slate-600">{q.company}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${DIFFICULTY_COLORS[q.difficulty]}`}>
                              {q.difficulty}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            
                            
                          </div>
                        </div>

                        {/* Question title */}
                        <p className="text-[13px] text-slate-700 leading-relaxed mb-3 group-hover:text-slate-900 transition-colors">
                          {q.title}
                        </p>

                        {/* Bottom: tags + practiced */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {q.tags.slice(0, 2).map((tag) => (
                              <span key={tag} className="text-[10px] px-2 py-0.5 bg-slate-50 text-slate-500 rounded-full border border-slate-100">
                                {tag}
                              </span>
                            ))}
                            {q.tags.length > 2 && (
                              <span className="text-[10px] text-slate-400">+{q.tags.length - 2}</span>
                            )}
                          </div>
                          
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}

                {displayQuestions.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-sm text-slate-400">No related questions found.</p>
                  </div>
                )}
              </div>

              {/* ── Footer ── */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                <Link
                  to="/question-bank"
                  onClick={onClose}
                  className="w-full"
                >
                  <Button
                    variant="outline"
                    className="w-full h-10 text-[13px] gap-2 border-slate-200 hover:border-blue-200 hover:bg-blue-50/50 hover:text-blue-600 transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    View All in Interview Insights
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}