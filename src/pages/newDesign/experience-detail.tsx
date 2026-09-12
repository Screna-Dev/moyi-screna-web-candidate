import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useParams, useNavigate } from 'react-router';
import { ArrowLeft, ThumbsUp, MessageSquare, Share2, Bookmark, Clock, ChevronDown, ChevronUp, Lightbulb, Check, Sparkles, AlertCircle, Loader2, CornerDownRight, Hash, X, User, MapPin, ExternalLink, CircleAlert, ChevronsUpDown, Lock } from 'lucide-react';
import { DashboardLayout } from '@/components/newDesign/dashboard-layout';
import { InsightsLayout } from '@/components/newDesign/insights-layout';
import { Button } from '../../components/newDesign/ui/button';
import { getPost, getPublicPost, normalizePublicPosts, getComments, createComment, deleteComment, getReplies, createReply, deleteReply, likePost, unlikePost, savePost, unsavePost } from '../../services/CommunityService';
import { hasStoredSession } from '../../services/api';
import { toast } from 'sonner';
import { getQuestionAiHints } from '../../services/QuestionBankService';
import { useAuth } from '../../contexts/AuthContext';
import { useUserPlan } from '@/hooks/useUserPlan';
import { usePostHog } from 'posthog-js/react';
import { safeCapture } from '@/utils/posthog';
import { useDwellTracking } from '@/hooks/useDwellTracking';
import { EVENTS } from '@/constants/analyticsEvents';
import { Markdown } from '@/components/newDesign/ui/markdown';
import { CompanyLogo } from '../../components/newDesign/ui/company-logo';
import { LockedNoteTail } from '@/components/newDesign/interview-insights/locked-note-tail';
import { useSeo } from '@/hooks/useSeo';
import { readPrerenderSeed } from '@/utils/prerenderSeed';
import { isIndexablePost } from '@/utils/postIndexing';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
} from '../../components/newDesign/ui/alert-dialog';

// ─── Color Mappings ────────────────────────────────────
const DIFFICULTY_COLORS: Record<string, string> = {
  Junior: 'bg-green-50 text-green-700 border-green-200',
  Intermediate: 'bg-amber-50 text-amber-700 border-amber-200',
  Senior: 'bg-orange-50 text-orange-700 border-orange-200',
  Staff: 'bg-red-50 text-red-700 border-red-200',
};

const OUTCOME_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  Offer: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  Rejected: { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500' },
  'No response': { bg: 'bg-slate-50', text: 'text-slate-500', dot: 'bg-slate-400' },
  Pending: { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500' },
};

// Company name → URL slug, matching the interview-insights directory links
// (e.g. "Meta" → "meta") so the breadcrumb lands on the post's company page.
function companySlug(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// ─── Hint status types ─────────────────────────────────
type HintStatus = 'ready' | 'generating' | 'failed' | 'none';

const HINT_STATUS_MAP: Record<HintStatus, { label: string; color: string; icon: React.ReactNode }> = {
  ready: {
    label: 'Hints Ready',
    color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    icon: <Sparkles className="w-3 h-3" />,
  },
  generating: {
    label: 'Generating…',
    color: 'bg-amber-50 text-amber-600 border-amber-200',
    icon: <Loader2 className="w-3 h-3 animate-spin" />,
  },
  failed: {
    label: 'Unavailable',
    color: 'bg-slate-50 text-slate-500 border-slate-200',
    icon: <AlertCircle className="w-3 h-3" />,
  },
  none: {
    label: 'AI Hints',
    color: 'bg-blue-50 text-blue-600 border-blue-200',
    icon: <Sparkles className="w-3 h-3" />,
  },
};

// Step gradient colors for AI Hints
const STEP_GRADIENTS = [
  { from: 'from-indigo-50', border: 'border-indigo-100', badge: 'bg-indigo-500' },
  { from: 'from-violet-50', border: 'border-violet-100', badge: 'bg-violet-500' },
  { from: 'from-pink-50', border: 'border-pink-100', badge: 'bg-pink-500' },
  { from: 'from-teal-50', border: 'border-teal-100', badge: 'bg-teal-500' },
  { from: 'from-amber-50', border: 'border-amber-100', badge: 'bg-amber-500' },
];

// ─── API Data Interfaces ────────────────────────────────
interface PostQuestion {
  id: string;
  seq: number;
  label: string;
  title: string;
  categories: string[];
  notes: string;
}

interface ExperiencePost {
  id: string;
  company: string;
  role: string;
  round: string;
  level: string;
  outcome: string;
  date: string;
  location: string;
  summary: string;
  status: string;
  createdAt: string;
  questions: PostQuestion[];
  commentCount?: number;
  likeCount?: number;
  saveCount?: number;
  liked?: boolean;
  saved?: boolean;
}

// ─── Comment interface matching API ─────────────────────
interface Comment {
  id: string;
  user: { id: string; name: string };
  questionSeq: number | null;
  content: string;
  status: string;
  createdAt: string;
  replyCount?: number;
}

// ─── Reply interface matching API ───────────────────────
interface Reply {
  id: string;
  user: { id: string; name: string };
  content: string;
  status: string;
  createdAt: string;
}

// Helper: format relative time
function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Helper: check whether a comment/reply is awaiting moderation
function isPendingStatus(status?: string): boolean {
  return !!status && status.toUpperCase() === 'PENDING';
}

// Helper: get hint status for a question
function getQuestionHintStatus(
  qId: string,
  hintsData: Record<string, any>,
  hintsLoadingSet: Set<string>,
  hintsFailedSet: Set<string>
): HintStatus {
  if (hintsData[qId]) return 'ready';
  if (hintsLoadingSet.has(qId)) return 'generating';
  if (hintsFailedSet.has(qId)) return 'failed';
  return 'none';
}

// Build-time snapshot payload for this note, read once at module scope as
// readPrerenderSeed requires (it consumes the tag). The snapshot browser has no
// route to the API — the preview server mounts no proxy — so for a prerendered
// note this is the page's only source of content.
const PRERENDER_SEED = readPrerenderSeed<{ post: ExperiencePost; comments?: Comment[] }>(
  '__prerender_experience__',
);

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════
export function ExperienceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, isAuthenticated } = useAuth();
  const { planData } = useUserPlan();
  const posthog = usePostHog();

  // Two things decide the shell, and they are not the same thing:
  // Single notes live on one path, /experience/:id, whichever surface the
  // reader came from — it is the URL middleware.ts gives an Open Graph document
  // to, so it is the only one that previews correctly when shared.
  //
  // The shell therefore follows the session, not the route: DashboardLayout
  // redirects to /auth when no token is stored, and shared links land
  // signed-out readers here directly, so a guest must get the standalone shell
  // on the very first render. Hence the synchronous storage check rather than
  // `isAuthenticated`, which is still false while AuthContext resolves.
  //
  // Back-links follow the same split: a guest is sent to the public directory
  // (the one they can actually browse), a member to the personal centre.
  const signedOut = !hasStoredSession();
  const Layout = signedOut ? InsightsLayout : DashboardLayout;
  const listPath = signedOut ? '/interview-questions' : '/interview-insights';
  const companyPath = (name?: string) =>
    name ? `${listPath}/${companySlug(name)}` : listPath;

  // note_read —— 打开某篇面经，离开时记录 duration_seconds
  useDwellTracking(EVENTS.NOTE_READ, () => ({ note_id: id }), { enabled: !!id });

  // ── Post data ──
  const [post, setPost] = useState<ExperiencePost | null>(null);
  const [postLoading, setPostLoading] = useState(true);

  // ── Plan-tier access gate ──
  // Free/Basic users can only open the 2 newest posts per company; the 3rd+
  // returns 403 INSUFFICIENT_PLAN_TIER, which we surface as an upgrade prompt.
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // ── Guest access gate ──
  // A signed-out visitor whose post fetch failed: either the public single-post
  // endpoint isn't serving it, or it sits outside the free preview set. Either
  // way the answer is "sign in", not "post not found".
  const [guestGated, setGuestGated] = useState(false);

  // paywall_viewed —— 直接打开被锁定的面经（403 INSUFFICIENT_PLAN_TIER）弹出升级引导时上报。
  // required_tier：解锁需 Advanced+（无逐条 tier 字段，按 gating 逻辑近似）。
  useEffect(() => {
    if (!showUpgradePrompt) return;
    safeCapture(posthog, EVENTS.PAYWALL_VIEWED, {
      note_id: id ?? null,
      required_tier: 'advanced',
      user_current_tier: planData.currentPlan.toLowerCase(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showUpgradePrompt]);

  // ── Comments ──
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  // ── Replies ──
  const [replies, setReplies] = useState<Record<string, Reply[]>>({});
  const [repliesLoadingSet, setRepliesLoadingSet] = useState<Set<string>>(new Set());
  const [submittingReplyId, setSubmittingReplyId] = useState<string | null>(null);
  const [deletingReplyId, setDeletingReplyId] = useState<string | null>(null);

  // ── Like / Save state ──
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saveCount, setSaveCount] = useState(0);
  const likeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingLike = useRef<boolean | null>(null);
  const pendingSave = useRef<boolean | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [expandedHints, setExpandedHints] = useState<Set<string>>(new Set());
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [hintsData, setHintsData] = useState<Record<string, { suggested_approach: string; pro_tip: string; framework: { step: number; title: string; description: string }[]; key_points_to_mention: string[] }>>({});
  const [hintsLoadingSet, setHintsLoadingSet] = useState<Set<string>>(new Set());
  const [hintsFailedSet, setHintsFailedSet] = useState<Set<string>>(new Set());
  const [commentSort, setCommentSort] = useState<'top' | 'new'>('new');
  const [commentText, setCommentText] = useState('');
  const [commentAnonymous, setCommentAnonymous] = useState(false);
  const [referencedQ, setReferencedQ] = useState<{ seq: number; title: string } | null>(null);
  const [showRefPicker, setShowRefPicker] = useState(false);
  const [showReplyId, setShowReplyId] = useState<string | null>(null);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const refPickerRef = useRef<HTMLDivElement>(null);
  const [allExpanded, setAllExpanded] = useState(true);

  // ── Data Fetching ──
  // Only usable when it is for THIS note: the SPA keeps the script tag around
  // for one navigation, and a stale seed would render another candidate's
  // write-up under this URL.
  const seed = PRERENDER_SEED && PRERENDER_SEED.post?.id === id ? PRERENDER_SEED : null;

  const fetchPost = useCallback(async () => {
    if (!id) return;
    // A prerendered note ships with its content already rendered. Refetching
    // would blank and repaint exactly what the snapshot exists to deliver.
    if (seed) {
      setPost(seed.post);
      setLiked(seed.post.liked ?? false);
      setLikeCount(seed.post.likeCount ?? 0);
      setSaved(seed.post.saved ?? false);
      setSaveCount(seed.post.saveCount ?? 0);
      if (seed.post.questions) {
        setExpandedQuestions(new Set(seed.post.questions.map((q: PostQuestion) => q.id)));
        setAllExpanded(true);
      }
      setPostLoading(false);
      return;
    }
    setPostLoading(true);
    try {
      // Guests read the redacted public payload, members the authenticated one
      // (plan-tier gated server-side). Keyed on stored session, not
      // `isAuthenticated` — the latter is false for the first render of a
      // signed-in visit, which would fire the public request and then repeat
      // the whole fetch.
      //
      // There is no public single-post endpoint: a signed-out read is the list
      // endpoint filtered to one postId, which answers 200 with zero rows for
      // a post that is missing OR merely unpublished. The API withholds that
      // distinction on purpose, so both fall through to the same gate below.
      let data: any;
      if (signedOut) {
        const { posts } = normalizePublicPosts(await getPublicPost(id));
        data = posts[0] ?? null;
        if (!data) {
          setGuestGated(true);
          return;
        }
      } else {
        const res = await getPost(id);
        data = res.data?.data ?? res.data;
      }
      setPost(data);
      // Initialize like/save from API
      setLiked(data?.liked ?? false);
      setLikeCount(data?.likeCount ?? 0);
      setSaved(data?.saved ?? false);
      setSaveCount(data?.saveCount ?? 0);
      // Auto-expand all questions
      if (data?.questions) {
        setExpandedQuestions(new Set(data.questions.map((q: PostQuestion) => q.id)));
        setAllExpanded(true);
      }
    } catch (err: any) {
      const code = err?.response?.data?.errorCode ?? err?.response?.data?.code;
      if (err?.response?.status === 403 && code === 'INSUFFICIENT_PLAN_TIER') {
        // Free/Basic users hit the plan gate on the 3rd+ post for a company.
        setShowUpgradePrompt(true);
      } else if (signedOut) {
        // A signed-out read that threw rather than returning zero rows (network,
        // 500, malformed uuid -> 400). Same message either way: the reader's
        // problem is that they have no account, not that the post is missing.
        setGuestGated(true);
      } else {
        console.error('[experience-detail] getPost failed for', id, err?.response?.status, err?.response?.data ?? err);
      }
    } finally {
      setPostLoading(false);
    }
  }, [id, signedOut, seed]);

  // One path for everyone: the read moved to /community/public/** and the
  // authenticated original was deleted, so there is nothing to branch on.
  const fetchComments = useCallback(async () => {
    if (!id) return;
    // A prerendered note ships with its thread already rendered — that is the
    // part of this page a crawler cannot reach any other way. Refetching would
    // blank and repaint exactly what the snapshot exists to deliver.
    if (seed?.comments) {
      setComments(seed.comments);
      return;
    }
    setCommentsLoading(true);
    try {
      const all: Comment[] = [];
      let page = 0;
      let totalPages = 1;
      do {
        const res = await getComments(id, { page });
        const data = res.data?.data ?? res.data;
        all.push(...(data?.content ?? []));
        totalPages = data?.pageMeta?.totalPages ?? 1;
        page += 1;
      } while (page < totalPages);
      setComments(all);
    } catch {
      // Silent: a thread that fails to load leaves the section empty rather
      // than turning the whole note into an error page.
    } finally {
      setCommentsLoading(false);
    }
  }, [id, seed]);

  useEffect(() => {
    fetchPost();
    fetchComments();
  }, [fetchPost, fetchComments, signedOut]);

  // Check if current user is author (you'll need to add authorId to your post data)
  const isAuthor = currentUser?.id === (post as any)?.authorId;

  // ── Hints Management ──
  const fetchHints = useCallback((qId: string) => {
    if (hintsData[qId] || hintsLoadingSet.has(qId) || hintsFailedSet.has(qId)) return;
    
    setHintsLoadingSet(prev => new Set(prev).add(qId));
    
    getQuestionAiHints(qId)
      .then((res: any) => {
        const data = res.data?.data ?? res.data;
        if (data) {
          setHintsData(prev => ({ ...prev, [qId]: data }));
          setExpandedHints(prev => new Set(prev).add(qId));
          setHintsFailedSet(prev => {
            const next = new Set(prev);
            next.delete(qId);
            return next;
          });
        } else {
          setHintsFailedSet(prev => new Set(prev).add(qId));
        }
      })
      .catch(() => {
        setHintsFailedSet(prev => new Set(prev).add(qId));
      })
      .finally(() => {
        setHintsLoadingSet(prev => {
          const next = new Set(prev);
          next.delete(qId);
          return next;
        });
      });
  }, [hintsData, hintsLoadingSet, hintsFailedSet]);


  // ── The signed-out gate ──
  //
  // Guests can read the note (trimmed server-side) but nothing around it:
  // likes, saves and the whole discussion are authenticated endpoints. The
  // controls stay on screen — hiding them would hide that the note has any
  // engagement at all — and every one of them routes here instead of firing a
  // request that would 401. Same shape as the locked cards on the company page.
  const signInGate = useCallback(() => {
    navigate('/auth', { state: { from: { pathname: `/experience/${id}` } } });
  }, [navigate, id]);

  // The thread is readable by everyone now — the read endpoint is public — so
  // the only gate left on this section is posting. `commentTotal` still falls
  // back to the post payload's count for the window before the thread loads,
  // so the heading does not flash "(0)" on a note that has comments.
  const commentTotal = comments.length || (post?.commentCount ?? 0);

  // ── Head tags + paywall declaration ──
  //
  // This page is the only surface carrying a whole write-up, which is why it is
  // indexed at all. Three things decide what goes in the head:
  //
  //   • While the post is loading, `null` — that is what stops the prerenderer
  //     snapshotting a spinner. Every terminal state passes an object instead,
  //     or the build hangs on this route until it times out (see useSeo).
  //   • A note that fails the content gate is noindex. robots.txt has to open
  //     /experience as a prefix and company pages link to ten notes each, so a
  //     crawler reaches thin notes regardless of the sitemap; this is the line
  //     that actually keeps them out of the index.
  //   • isAccessibleForFree is false because two things really are withheld
  //     from a signed-out reader: the notes past their first sentence, and the
  //     discussion. `.paywalled-note` is the blurred continuation span, which
  //     contains a description rather than the withheld text — the withheld
  //     text never reaches the browser, which is what makes the declaration
  //     truthful rather than a wrapper around hidden content.
  const seoTitle = post
    ? `${post.company} ${post.role} Interview${post.round ? ` — ${post.round}` : ''} | Screna AI`
    : '';
  useSeo(
    postLoading
      ? null
      : !post
      ? { title: 'Interview Note | Screna AI', description: 'This interview note is not available.', path: `/experience/${id}`, noindex: true }
      : {
          title: seoTitle.slice(0, 60),
          description: (post.summary || `A ${post.role} interview experience at ${post.company}.`).slice(0, 155),
          path: `/experience/${id}`,
          type: 'article',
          noindex: !isIndexablePost(post),
          jsonLd: isIndexablePost(post)
            ? [
                {
                  '@context': 'https://schema.org',
                  '@type': 'Article',
                  headline: `${post.company} ${post.role} interview${post.round ? ` — ${post.round}` : ''}`,
                  ...(post.summary ? { description: post.summary } : {}),
                  ...(post.date ? { datePublished: new Date(post.date).toISOString() } : {}),
                  isAccessibleForFree: false,
                  hasPart: {
                    '@type': 'WebPageElement',
                    isAccessibleForFree: false,
                    cssSelector: '.paywalled-note',
                  },
                },
              ]
            : undefined,
        },
  );

  // ── Like / Save handlers (debounced) ──
  const toggleLike = useCallback(() => {
    if (signedOut) { signInGate(); return; }
    if (!currentUser) return;
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount(prev => Math.max(0, prev + (newLiked ? 1 : -1)));
    pendingLike.current = newLiked;

    if (likeTimer.current) clearTimeout(likeTimer.current);
    likeTimer.current = setTimeout(() => {
      const shouldLike = pendingLike.current;
      if (shouldLike === null || !id) return;
      pendingLike.current = null;
      (shouldLike ? likePost(id) : unlikePost(id)).catch((err: any) => {
        if (err?.response?.data?.errorCode === 'BAD_REQUEST') {
          toast.info(shouldLike ? 'You already liked this post.' : 'You already unliked this post.');
          return;
        }
        setLiked(!shouldLike);
        setLikeCount(prev => Math.max(0, prev + (shouldLike ? -1 : 1)));
      });
    }, 1000);
  }, [liked, currentUser, id, signedOut, signInGate]);

  const toggleSave = useCallback(() => {
    if (signedOut) { signInGate(); return; }
    if (!currentUser) return;
    const newSaved = !saved;
    setSaved(newSaved);
    setSaveCount(prev => Math.max(0, prev + (newSaved ? 1 : -1)));
    pendingSave.current = newSaved;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const shouldSave = pendingSave.current;
      if (shouldSave === null || !id) return;
      pendingSave.current = null;
      (shouldSave ? savePost(id) : unsavePost(id)).catch((err: any) => {
        if (err?.response?.data?.errorCode === 'BAD_REQUEST') {
          toast.info(shouldSave ? 'You already saved this post.' : 'You already unsaved this post.');
          return;
        }
        setSaved(!shouldSave);
        setSaveCount(prev => Math.max(0, prev + (shouldSave ? -1 : 1)));
      });
    }, 1000);
  }, [saved, currentUser, id, signedOut, signInGate]);

  const toggleAllQuestions = () => {
    if (allExpanded) {
      setExpandedQuestions(new Set());
      setAllExpanded(false);
    } else {
      if (post) {
        setExpandedQuestions(new Set(post.questions.map(q => q.id)));
        setAllExpanded(true);
      }
    }
  };

  const toggleQuestion = (qId: string) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(qId)) {
        next.delete(qId);
      } else {
        next.add(qId);
      }
      return next;
    });
  };

  const toggleHint = (qId: string) => {
    setExpandedHints(prev => {
      const next = new Set(prev);
      next.has(qId) ? next.delete(qId) : next.add(qId);
      return next;
    });
  };

  const toggleSelect = (qId: string) => {
    setSelectedQuestions(prev => {
      const next = new Set(prev);
      next.has(qId) ? next.delete(qId) : next.add(qId);
      return next;
    });
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const handleComposerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === '#') {
      setTimeout(() => setShowRefPicker(true), 50);
    }
  };

  const selectReference = (seq: number, title: string) => {
    setReferencedQ({ seq, title });
    setShowRefPicker(false);
    setCommentText(prev => prev.replace(/#$/, ''));
    composerRef.current?.focus();
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !id) return;
    setSubmittingComment(true);
    try {
      const body: { content: string; isAnonymous: boolean; questionSeq?: number } = {
        content: commentText.trim(),
        isAnonymous: commentAnonymous,
      };
      if (referencedQ) body.questionSeq = referencedQ.seq;
      await createComment(id, body);
      setCommentText('');
      setReferencedQ(null);
      setCommentAnonymous(false);
      await fetchComments();
      toast.info('Comment submitted — it will be visible to others once approved.');
    } catch {
      // silent
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    setDeletingCommentId(commentId);
    try {
      await deleteComment(commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch {
      // silent
    } finally {
      setDeletingCommentId(null);
    }
  };

  const fetchReplies = useCallback(async (commentId: string, force = false) => {
    if (!force && replies[commentId]) return;
    setRepliesLoadingSet(prev => new Set(prev).add(commentId));
    try {
      const all: Reply[] = [];
      let page = 0;
      let totalPages = 1;
      do {
        const res = await getReplies(commentId, { page });
        const data = res.data?.data ?? res.data;
        all.push(...(data?.content ?? []));
        totalPages = data?.pageMeta?.totalPages ?? 1;
        page += 1;
      } while (page < totalPages);
      setReplies(prev => ({ ...prev, [commentId]: all }));
    } catch {
      // silent
    } finally {
      setRepliesLoadingSet(prev => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
    }
  }, [replies]);

  useEffect(() => {
    if (showReplyId && !replies[showReplyId]) {
      fetchReplies(showReplyId);
    }
  }, [showReplyId, replies, fetchReplies]);

  const handleSubmitReply = async (commentId: string) => {
    const text = (replyTexts[commentId] || '').trim();
    if (!text) return;
    setSubmittingReplyId(commentId);
    try {
      await createReply(commentId, { content: text });
      setReplyTexts(prev => ({ ...prev, [commentId]: '' }));
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, replyCount: (c.replyCount ?? 0) + 1 } : c));
      await fetchReplies(commentId, true);
      toast.info('Reply submitted — it will be visible to others once approved.');
    } catch {
      // silent
    } finally {
      setSubmittingReplyId(null);
    }
  };

  const handleDeleteReply = async (replyId: string, commentId: string) => {
    setDeletingReplyId(replyId);
    try {
      await deleteReply(replyId);
      setReplies(prev => ({ ...prev, [commentId]: (prev[commentId] ?? []).filter(r => r.id !== replyId) }));
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, replyCount: Math.max(0, (c.replyCount ?? 0) - 1) } : c));
    } catch {
      // silent
    } finally {
      setDeletingReplyId(null);
    }
  };


  const gateOverlays = (
    <AlertDialog open={showUpgradePrompt} onOpenChange={(open) => { if (!open) setShowUpgradePrompt(false); }}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-[hsl(221,91%,60%)]/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[hsl(221,91%,60%)]" />
            </div>
            <AlertDialogTitle className="text-[hsl(222,22%,15%)]">Upgrade to view this post</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-[hsl(222,12%,40%)] leading-relaxed">
            Free and Basic plans can open the 2 most recent posts per company. Upgrade to
            <span className="font-semibold text-[hsl(222,22%,15%)]"> Advanced</span> for unlimited access to every interview experience.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => { setShowUpgradePrompt(false); navigate(listPath); }}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={() => navigate('/#pricing')}
            className="bg-[hsl(221,91%,60%)] hover:bg-[hsl(221,91%,55%)] text-white rounded-xl"
          >
            Upgrade plan
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (postLoading) {
    return (
      <Layout fullBleed>
        <div className="pb-20 bg-[#f9fafb]">
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 animate-spin text-[hsl(221,91%,60%)]" />
          </div>
        </div>
        {gateOverlays}
      </Layout>
    );
  }

  if (!post && guestGated) {
    return (
      <Layout fullBleed>
        <div className="pb-20 bg-[#f9fafb]">
          <div className="max-w-lg mx-auto px-6 py-32 text-center">
            <h1 className="text-xl font-semibold text-[hsl(222,22%,15%)] mb-2">
              Sign in to read this interview note
            </h1>
            <p className="text-sm text-[hsl(222,12%,45%)] mb-6 leading-relaxed">
              Full write-ups — every question, the candidate's notes, and the discussion —
              are available once you have an account. It's free to start.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link to="/auth" state={{ from: { pathname: `${listPath}/experience/${id}` } }}>
                <Button className="rounded-xl bg-[hsl(221,91%,60%)] hover:bg-[hsl(221,91%,50%)] text-white h-11 px-6">
                  Sign in
                </Button>
              </Link>
              <Link to={listPath}>
                <Button variant="outline" className="rounded-xl h-11 px-6 border-[hsl(220,16%,90%)]">
                  Browse companies
                </Button>
              </Link>
            </div>
          </div>
        </div>
        {gateOverlays}
      </Layout>
    );
  }

  if (!post) {
    return (
      <Layout fullBleed>
        <div className="pb-20 bg-[#f9fafb]">
          <div className="max-w-7xl mx-auto px-6 text-center py-32 text-[hsl(222,12%,45%)]">
            {showUpgradePrompt ? 'Upgrade to Advanced to view this post.' : 'Post not found.'}
          </div>
        </div>
        {gateOverlays}
      </Layout>
    );
  }

  const outcomeStyle = OUTCOME_STYLES[post.outcome] || OUTCOME_STYLES['Pending'];
  const sortedComments = [...comments].sort((a, b) =>
    commentSort === 'new'
      ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <Layout fullBleed>
      <div className="pt-6 pb-20 bg-[#f9fafb]">
        <div className="max-w-7xl mx-auto px-6">

          {/* ─── Breadcrumb — back to this post's company insights page ─── */}
          <Link
            to={companyPath(post.company)}
            className="inline-flex items-center text-sm text-[hsl(222,12%,50%)] hover:text-[hsl(221,91%,60%)] mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            {post.company ? `${post.company} Interview Insights` : 'Interview Insights'}
          </Link>

          <div className="flex flex-col lg:flex-row gap-8">

            {/* ═══ LEFT: Main Content ═══ */}
            <div className="flex-1 min-w-0">

              {/* ── Section 1: Header ── */}
              <div className="bg-white rounded-2xl border border-[hsl(220,16%,90%)] p-6 md:p-8 mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <CompanyLogo company={post.company} className="w-10 h-10 rounded-xl" />
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-lg font-semibold text-[hsl(222,22%,15%)]">{post.company}</span>
                      <span className="text-[hsl(222,12%,70%)]">·</span>
                      <span className="text-lg text-[hsl(222,12%,35%)]">{post.role}</span>
                      <span className="text-[hsl(222,12%,70%)]">·</span>
                      <span className="text-lg text-[hsl(222,12%,35%)]">{post.round}</span>
                      {post.level && (
                        <>
                          <span className="text-[hsl(222,12%,70%)]">·</span>
                          <span className="text-lg text-[hsl(222,12%,35%)]">{post.level}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {post.level && DIFFICULTY_COLORS[post.level] && (
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${DIFFICULTY_COLORS[post.level]}`}>
                      {post.level}
                    </span>
                  )}
                  {post.outcome && (
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 ${outcomeStyle.bg} ${outcomeStyle.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${outcomeStyle.dot}`} />
                      {post.outcome}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-[hsl(222,12%,50%)] mb-5">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(post.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                  {post.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {post.location}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-[hsl(220,16%,94%)]">
                  <div className="flex items-center gap-4">
                    {/* Like / comment / save are all authenticated, so for
                        guests the three are muted and one padlock chip carries
                        the state for the group. Swapping each icon FOR a
                        padlock was the first attempt and it reads worse: three
                        identical locks in a row lose which control is which,
                        and the counts (public, and part of why a note is worth
                        opening) end up labelled by nothing. Clicking any of
                        them still goes to /auth. Share stays live — the URL is
                        public either way. */}
                    <button
                      onClick={toggleLike}
                      title={signedOut ? 'Sign in to like this note' : undefined}
                      className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${signedOut ? 'text-[hsl(222,12%,62%)]' : liked ? 'text-[hsl(221,91%,60%)]' : 'text-[hsl(222,12%,50%)] hover:text-[hsl(222,22%,15%)]'}`}
                    >
                      <ThumbsUp className={`w-4 h-4 transition-transform ${liked && !signedOut ? 'fill-current scale-110' : ''}`} />
                      {likeCount}
                    </button>
                    <a
                      href="#discussion"
                      title={signedOut ? 'Sign in to read the discussion' : undefined}
                      className={`flex items-center gap-1.5 text-sm transition-colors ${signedOut ? 'text-[hsl(222,12%,62%)]' : 'text-[hsl(222,12%,50%)] hover:text-[hsl(222,22%,15%)]'}`}
                    >
                      <MessageSquare className="w-4 h-4" />
                      {commentTotal}
                    </a>
                    <button
                      onClick={toggleSave}
                      title={signedOut ? 'Sign in to save this note' : undefined}
                      className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${signedOut ? 'text-[hsl(222,12%,62%)]' : saved ? 'text-[hsl(221,91%,60%)]' : 'text-[hsl(222,12%,50%)] hover:text-[hsl(222,22%,15%)]'}`}
                    >
                      <Bookmark className={`w-4 h-4 transition-transform ${saved && !signedOut ? 'fill-current scale-110' : ''}`} />
                      {saveCount}
                    </button>
                    {signedOut && (
                      <button
                        onClick={signInGate}
                        className="flex items-center gap-1.5 rounded-full border border-[hsl(220,16%,90%)] bg-[hsl(220,20%,98%)] px-2.5 py-1 text-xs font-medium text-[hsl(222,12%,45%)] transition-colors hover:border-[hsl(221,91%,60%)]/40 hover:text-[hsl(222,22%,15%)]"
                      >
                        <Lock className="w-3 h-3" />
                        Sign in to interact
                      </button>
                    )}
                    <button
                      onClick={handleShare}
                      className={`flex items-center gap-1.5 text-sm transition-colors ${shareCopied ? 'text-emerald-600' : 'text-[hsl(222,12%,50%)] hover:text-[hsl(222,22%,15%)]'}`}
                    >
                      {shareCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                      {shareCopied ? 'Copied!' : 'Share'}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                  </div>
                </div>
              </div>

              {/* ── Section 2: Summary ── */}
              <div className="bg-white rounded-2xl border border-[hsl(220,16%,90%)] p-6 md:p-8 mb-5">
                <h2 className="text-sm font-semibold text-[hsl(222,12%,45%)] uppercase tracking-wider mb-3">
                  Summary
                </h2>
                <div className="text-[15px] text-[hsl(222,12%,30%)] leading-relaxed">
                  <Markdown className="text-[15px] text-[hsl(222,12%,30%)]">{post.summary}</Markdown>
                </div>
              </div>

              {/* ── Section 3: Questions ── */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-4 px-1">
                  <h2 className="text-lg font-semibold text-[hsl(222,22%,15%)]">
                    Questions Asked
                    <span className="ml-2 text-sm font-normal text-[hsl(222,12%,55%)]">({post.questions.length})</span>
                  </h2>
                  {post.questions.length > 1 && (
                    <button
                      onClick={toggleAllQuestions}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-[hsl(222,12%,45%)] bg-[hsl(220,20%,97%)] border border-[hsl(220,16%,90%)] hover:bg-[hsl(220,20%,95%)] hover:border-[hsl(220,16%,85%)] transition-all"
                    >
                      <ChevronsUpDown className="w-3.5 h-3.5" />
                      {allExpanded ? 'Collapse All' : 'Expand All'}
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {post.questions.map((q, qi) => {
                    const isExpanded = expandedQuestions.has(q.id);
                    const isHintExpanded = expandedHints.has(q.id);
                    const isSelected = selectedQuestions.has(q.id);
                    const hintStatus = getQuestionHintStatus(q.id, hintsData, hintsLoadingSet, hintsFailedSet);
                    const hintInfo = HINT_STATUS_MAP[hintStatus];
                    const hints = hintsData[q.id];

                    return (
                      <div
                        key={q.id}
                        id={`question-${q.id}`}
                        className="bg-white rounded-2xl border border-[hsl(220,16%,90%)] transition-all duration-200"
                      >
                        <div className="flex items-start gap-3 p-5 md:p-6">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <button
                                  onClick={() => toggleQuestion(q.id)}
                                  className="text-left w-full group"
                                >
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-xs font-bold text-[hsl(222,12%,55%)]">Q{qi + 1}</span>
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${hintInfo.color}`}>
                                      {hintInfo.icon}
                                      {hintInfo.label}
                                    </span>
                                  </div>
                                  <h3 className="text-[15px] font-semibold text-[hsl(222,22%,15%)] group-hover:text-[hsl(221,91%,60%)] transition-colors leading-snug">
                                    {q.title}
                                  </h3>
                                </button>
                                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                  {q.categories?.map(tag => (
                                    <span key={tag} className="px-2 py-0.5 rounded-full bg-[hsl(220,20%,97%)] border border-[hsl(220,16%,92%)] text-[10px] text-[hsl(222,12%,45%)]">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={() => toggleQuestion(q.id)}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[hsl(222,12%,55%)] hover:bg-[hsl(220,20%,97%)] transition-colors"
                                >
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25 }}
                              className="overflow-hidden"
                            >
                              <div className="px-5 md:px-6 pb-5 md:pb-6 ml-8">

                                {q.notes && (
                                  <div className="mb-4 bg-[hsl(220,20%,98%)] rounded-xl p-4 border border-[hsl(220,16%,92%)]">
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="w-5 h-5 rounded-full bg-[hsl(222,12%,85%)] flex items-center justify-center text-[8px] font-bold text-[hsl(222,22%,15%)]">
                                        A
                                      </div>
                                      <span className="text-xs font-medium text-[hsl(222,12%,45%)]">Author's notes</span>
                                      {signedOut && (
                                        <span className="ml-auto flex items-center gap-1 text-[10px] font-medium text-[hsl(222,12%,55%)]">
                                          <Lock className="w-2.5 h-2.5" />
                                          First line only
                                        </span>
                                      )}
                                    </div>
                                    {/* Guests get one sentence — the backend trims it — so the
                                        note runs on into a blurred continuation rather than
                                        stopping dead. Members get the note itself, markdown and
                                        all. See LockedNoteTail for what the blurred text is. */}
                                    {signedOut ? (
                                      <LockedNoteTail
                                        text={q.notes}
                                        company={post.company}
                                        role={post.role}
                                        round={post.round}
                                        onUnlock={signInGate}
                                        // The selector this page's JSON-LD names
                                        // in hasPart.cssSelector — keep the two
                                        // in step (see the useSeo call above).
                                        paywallClass="paywalled-note"
                                      />
                                    ) : (
                                      <div className="text-sm text-[hsl(222,12%,35%)] leading-relaxed"><Markdown className="text-sm text-[hsl(222,12%,35%)]">{q.notes}</Markdown></div>
                                    )}
                                  </div>
                                )}

                                {/* AI Hints Module */}
                                {hintStatus === 'ready' && hints && (
                                  <div className="rounded-xl border border-blue-200 bg-white overflow-hidden shadow-sm shadow-blue-100/40">
                                    <button
                                      onClick={() => toggleHint(q.id)}
                                      className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-blue-50/40 transition-colors cursor-pointer"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                          <Lightbulb className={`w-5 h-5 transition-colors duration-200 ${isHintExpanded ? 'text-amber-500' : 'text-blue-600'}`} />
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-[15px] font-semibold text-slate-800">AI Hints</span>
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 text-white text-[10px] font-semibold">
                                              <Sparkles className="w-2.5 h-2.5" />
                                              AI Generated
                                            </span>
                                          </div>
                                          <span className="block text-[12px] text-slate-500 mt-0.5">Answer framework and key points tailored for this question</span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0 ml-4">
                                        <span className="hidden sm:inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-[11px] font-semibold">
                                          {isHintExpanded ? 'Hide' : 'Show'}
                                        </span>
                                        {isHintExpanded
                                          ? <ChevronUp className="w-5 h-5 text-blue-500" />
                                          : <ChevronDown className="w-5 h-5 text-blue-500" />
                                        }
                                      </div>
                                    </button>

                                    <AnimatePresence>
                                      {isHintExpanded && (
                                        <motion.div
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: 'auto', opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          transition={{ duration: 0.35 }}
                                          className="overflow-hidden"
                                        >
                                          <div className="px-5 pb-5 pt-2 border-t border-blue-100">
                                            <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50/50 rounded-xl border border-blue-100 p-5 mb-4 mt-3">
                                              <div className="flex items-center gap-2 mb-3">
                                                <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                                                </span>
                                                <h4 className="text-[15px] font-bold text-slate-800">Suggested Approach</h4>
                                              </div>
                                              <p className="text-[13px] text-slate-600 leading-[1.7] mb-3">{hints.suggested_approach}</p>
                                              {hints.pro_tip && (
                                                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-[13px]">
                                                  <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
                                                  <span className="text-amber-800"><strong>Pro tip:</strong> {hints.pro_tip}</span>
                                                </div>
                                              )}
                                            </div>

                                            <div className="space-y-2.5 mb-4">
                                              {(hints.framework ?? []).map((step, si) => {
                                                const g = STEP_GRADIENTS[si % STEP_GRADIENTS.length];
                                                return (
                                                  <div key={step.step} className={`bg-gradient-to-br ${g.from} to-white p-4 rounded-xl border ${g.border}`}>
                                                    <div className="flex items-start gap-3">
                                                      <span className={`w-7 h-7 rounded-full ${g.badge} text-white flex items-center justify-center text-[12px] font-bold shrink-0 mt-0.5`}>
                                                        {step.step}
                                                      </span>
                                                      <div>
                                                        <h4 className="text-[14px] font-bold text-slate-800 mb-1">{step.title}</h4>
                                                        <p className="text-[13px] text-slate-600 leading-[1.65]">{step.description}</p>
                                                      </div>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>

                                            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                                              <h4 className="text-[13px] font-bold text-slate-700 mb-3 flex items-center gap-2">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/></svg>
                                                Key Points to Mention
                                              </h4>
                                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {(hints.key_points_to_mention ?? []).map((point, pi) => (
                                                  <div key={pi} className="flex items-start gap-2 px-3 py-2 bg-white rounded-lg border border-slate-100 text-[12px]">
                                                    <Check className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                                                    <span className="text-slate-600">{point}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                )}

                                {hintStatus === 'generating' && (
                                  <div className="rounded-xl border border-blue-200 bg-white overflow-hidden shadow-sm shadow-blue-100/40">
                                    <div className="flex items-center justify-between px-5 py-4">
                                      <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                          <Lightbulb className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-[15px] font-semibold text-slate-800">AI Hints</span>
                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold">
                                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                              Generating
                                            </span>
                                          </div>
                                          <span className="block text-[12px] text-slate-500 mt-0.5">AI is analyzing this question — usually takes a few minutes</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="px-5 pb-5 border-t border-blue-100">
                                      <div className="bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 rounded-xl border border-blue-100/60 p-5 mt-4 mb-4">
                                        <div className="flex items-center gap-2 mb-3">
                                          <div className="w-7 h-7 rounded-lg bg-blue-200/50 animate-pulse" />
                                          <div className="h-4 w-40 rounded-md bg-slate-200/60 animate-pulse" />
                                        </div>
                                        <div className="space-y-2.5">
                                          <div className="h-3 w-full rounded-md bg-slate-200/50 animate-pulse" />
                                          <div className="h-3 w-[92%] rounded-md bg-slate-200/50 animate-pulse" />
                                          <div className="h-3 w-[78%] rounded-md bg-slate-200/50 animate-pulse" />
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50/50 border border-amber-100/60 rounded-lg mt-3">
                                          <div className="w-4 h-4 rounded bg-amber-200/50 animate-pulse shrink-0" />
                                          <div className="h-3 w-48 rounded-md bg-amber-200/40 animate-pulse" />
                                        </div>
                                      </div>
                                      <div className="space-y-2.5 mb-4">
                                        {[0, 1, 2].map((_, si) => (
                                          <div key={si} className="bg-gradient-to-br from-indigo-50/40 to-white p-4 rounded-xl border border-indigo-100/50">
                                            <div className="flex items-start gap-3">
                                              <div className="w-7 h-7 rounded-full bg-indigo-300/50 animate-pulse shrink-0" />
                                              <div className="flex-1 space-y-2">
                                                <div className="h-3.5 w-36 rounded-md bg-slate-200/50 animate-pulse" />
                                                <div className="h-3 w-full rounded-md bg-slate-200/40 animate-pulse" />
                                                <div className="h-3 w-[85%] rounded-md bg-slate-200/40 animate-pulse" />
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                      <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-blue-50">
                                        <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                                        <span className="text-[12px] text-blue-500/80">Generating AI Hints — this usually takes 1–3 minutes…</span>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {hintStatus === 'none' && (
                                  <div className="rounded-xl border border-blue-200 bg-white overflow-hidden shadow-sm shadow-blue-100/40">
                                    <button
                                      onClick={() => fetchHints(q.id)}
                                      className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-blue-50/40 transition-colors cursor-pointer"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                          <Lightbulb className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-[15px] font-semibold text-slate-800">AI Hints</span>
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 text-white text-[10px] font-semibold">
                                              <Sparkles className="w-2.5 h-2.5" />
                                              AI Generated
                                            </span>
                                          </div>
                                          <span className="block text-[12px] text-slate-500 mt-0.5">Click to generate AI hints for this question</span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0 ml-4">
                                        <span className="hidden sm:inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-[11px] font-semibold">
                                          Show
                                        </span>
                                        <ChevronDown className="w-5 h-5 text-blue-500" />
                                      </div>
                                    </button>
                                  </div>
                                )}

                                {hintStatus === 'failed' && (
                                  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                                    <div className="flex items-center justify-between px-5 py-4">
                                      <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-100 rounded-lg">
                                          <Lightbulb className="w-5 h-5 text-slate-400" />
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-[15px] font-semibold text-slate-800">AI Hints</span>
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-medium border border-slate-200">
                                              <CircleAlert className="w-2.5 h-2.5" />
                                              Unavailable
                                            </span>
                                          </div>
                                          <span className="block text-[12px] text-slate-500 mt-0.5">Hints temporarily unavailable for this question</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Section 4: Discussion ── */}
              <div id="discussion" className="bg-white rounded-2xl border border-[hsl(220,16%,90%)] p-6 md:p-8 mb-5">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-[hsl(222,22%,15%)]">
                    Discussion
                    <span className="ml-2 text-sm font-normal text-[hsl(222,12%,55%)]">({commentTotal})</span>
                  </h2>
                  <div className="flex items-center gap-1 bg-[hsl(220,20%,98%)] rounded-lg p-0.5">
                      {(['new', 'top'] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => setCommentSort(s)}
                          className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                            commentSort === s
                              ? 'bg-white text-[hsl(222,22%,15%)] shadow-sm'
                              : 'text-[hsl(222,12%,50%)] hover:text-[hsl(222,22%,15%)]'
                          }`}
                        >
                          {s === 'new' ? 'Newest' : 'Top'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* The composer, and the sign-in prompt that stands in for it.
                    Reading the thread is public now; posting is not — the write
                    routes stayed on /community/** behind a bearer token — so a
                    guest gets the thread but never the textarea. */}
                {signedOut ? (
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[hsl(220,16%,92%)] bg-[hsl(220,20%,99%)] px-4 py-3.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[hsl(220,20%,93%)]">
                        <Lock className="size-3.5 text-[hsl(222,12%,45%)]" />
                      </div>
                      <p className="text-sm text-[hsl(222,12%,40%)]">
                        Sign in to join the discussion.
                      </p>
                    </div>
                    <Button
                      onClick={signInGate}
                      size="sm"
                      className="h-8 shrink-0 rounded-lg bg-[hsl(221,91%,60%)] px-4 text-xs text-white hover:bg-[hsl(221,91%,50%)]"
                    >
                      Sign in
                    </Button>
                  </div>
                ) : (
                <div className="bg-[hsl(220,20%,99%)] rounded-xl border border-[hsl(220,16%,92%)] p-4 mb-6">
                  {referencedQ && (
                    <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-[hsl(221,91%,60%)]/8 rounded-lg border border-[hsl(221,91%,60%)]/15">
                      <Hash className="w-3 h-3 text-[hsl(221,91%,60%)]" />
                      <span className="text-xs text-[hsl(221,91%,60%)] font-medium">Q{referencedQ.seq}</span>
                      <span className="text-xs text-[hsl(222,12%,40%)] truncate flex-1">{referencedQ.title}</span>
                      <button onClick={() => setReferencedQ(null)} className="text-[hsl(222,12%,55%)] hover:text-[hsl(222,22%,15%)]">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-[hsl(220,20%,93%)] flex items-center justify-center text-[hsl(222,12%,45%)] shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0 relative" ref={refPickerRef}>
                      <textarea
                        ref={composerRef}
                        placeholder='Add a comment… Type "#" to reference a question'
                        value={commentText}
                        onChange={e => setCommentText(e.target.value)}
                        onKeyDown={handleComposerKeyDown}
                        className="w-full min-h-[80px] resize-y p-3 bg-white border border-[hsl(220,16%,90%)] rounded-xl text-sm focus:border-[hsl(221,91%,60%)] focus:ring-2 focus:ring-[hsl(221,91%,60%)]/20 outline-none transition-all"
                      />

                      <AnimatePresence>
                        {showRefPicker && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className="absolute bottom-full left-0 mb-2 w-80 bg-white rounded-xl border border-[hsl(220,16%,90%)] shadow-xl z-50 p-1.5"
                          >
                            <p className="px-2.5 py-1.5 text-[10px] font-semibold text-[hsl(222,12%,55%)] uppercase tracking-wider">Reference a question</p>
                            {post.questions.map((pq, pqi) => (
                              <button
                                key={pq.id}
                                onClick={() => selectReference(pq.seq, pq.title)}
                                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[hsl(220,20%,98%)] transition-colors flex items-start gap-2"
                              >
                                <span className="text-[10px] font-bold text-[hsl(221,91%,60%)] bg-[hsl(221,91%,60%)]/10 px-1.5 py-0.5 rounded shrink-0">Q{pqi + 1}</span>
                                <span className="text-xs text-[hsl(222,22%,15%)] line-clamp-1">{pq.title}</span>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="flex flex-wrap items-center justify-between gap-2 mt-2.5">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setShowRefPicker(!showRefPicker)}
                            className="flex items-center gap-1.5 text-xs text-[hsl(222,12%,50%)] hover:text-[hsl(221,91%,60%)] transition-colors"
                          >
                            <Hash className="w-3.5 h-3.5" />
                            Reference question
                          </button>
                        </div>
                        <div className="flex items-center gap-3 ml-auto">
                          <label className="flex items-center gap-1.5 text-xs text-[hsl(222,12%,50%)] cursor-pointer select-none hover:text-[hsl(222,22%,15%)] transition-colors">
                            <input
                              type="checkbox"
                              checked={commentAnonymous}
                              onChange={e => setCommentAnonymous(e.target.checked)}
                              className="w-3.5 h-3.5 rounded border-[hsl(220,16%,90%)] accent-[hsl(221,91%,60%)]"
                            />
                            Post anonymously
                          </label>
                          <Button
                            disabled={!commentText.trim() || submittingComment}
                            size="sm"
                            onClick={handleSubmitComment}
                            className="bg-[hsl(222,22%,15%)] hover:bg-[hsl(222,22%,20%)] text-white rounded-lg h-8 text-xs px-4 disabled:opacity-40"
                          >
                            {submittingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Post comment'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                )}

                {/* The thread, read-only for guests and interactive for
                    members. Both read the same public endpoint. */}
                {commentsLoading && (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-[hsl(222,12%,60%)]" />
                  </div>
                )}
                {!commentsLoading && sortedComments.length === 0 && (
                  <p className="text-sm text-[hsl(222,12%,55%)] text-center py-6">
                    {signedOut ? 'No comments yet.' : 'No comments yet. Be the first!'}
                  </p>
                )}
                <div className="space-y-5">
                  {sortedComments.map(comment => {
                    const authorInitials = comment.user?.name
                      ? comment.user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                      : '?';
                    const refQuestion = comment.questionSeq
                      ? post.questions.find(q => q.seq === comment.questionSeq)
                      : null;
                    const isOwn = currentUser?.id === comment.user?.id;

                    return (
                      <div key={comment.id} className="group">
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[hsl(221,91%,90%)] to-[hsl(221,91%,80%)] flex items-center justify-center text-[hsl(221,91%,50%)] text-[11px] font-bold shrink-0">
                            {authorInitials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold text-[hsl(222,22%,15%)]">{comment.user?.name || 'Anonymous'}</span>
                              <span className="text-xs text-[hsl(222,12%,55%)]">· {formatRelativeTime(comment.createdAt)}</span>
                              {isPendingStatus(comment.status) && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold">
                                  <Clock className="w-2.5 h-2.5" />
                                  Pending review
                                </span>
                              )}
                            </div>

                            {refQuestion && (
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-[hsl(221,91%,60%)]/6 rounded-lg border border-[hsl(221,91%,60%)]/10 mb-2 max-w-md">
                                <Hash className="w-3 h-3 text-[hsl(221,91%,60%)]" />
                                <span className="text-[10px] font-bold text-[hsl(221,91%,60%)]">Q{comment.questionSeq}</span>
                                <span className="text-[11px] text-[hsl(222,12%,40%)] truncate">{refQuestion.title}</span>
                              </div>
                            )}

                            <div className="text-sm text-[hsl(222,12%,30%)] leading-relaxed mb-2"><Markdown className="text-sm text-[hsl(222,12%,30%)]">{comment.content}</Markdown></div>

                            <div className="flex items-center gap-4 text-[hsl(222,12%,55%)]">
                              {/* Reading replies is public now
                                  (/community/public/comments/{id}/replies), so
                                  everyone can expand the thread. Writing one is
                                  not — the composer inside is gated separately
                                  below, which is why this no longer locks. */}
                              <button
                                onClick={() => {
                                  if (showReplyId === comment.id) {
                                    setShowReplyId(null);
                                  } else {
                                    setShowReplyId(comment.id);
                                  }
                                }}
                                className="flex items-center gap-1 text-xs transition-colors hover:text-[hsl(221,91%,60%)]"
                              >
                                <MessageSquare className="w-3 h-3" />
                                {comment.replyCount
                                  ? `${comment.replyCount} ${comment.replyCount === 1 ? 'reply' : 'replies'}`
                                  : 'Reply'}
                              </button>
                              {isOwn && !signedOut && (
                                <button
                                  onClick={() => handleDeleteComment(comment.id)}
                                  disabled={deletingCommentId === comment.id}
                                  className="flex items-center gap-1 text-xs hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  {deletingCommentId === comment.id
                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                    : <X className="w-3 h-3" />}
                                  Delete
                                </button>
                              )}
                            </div>

                            <AnimatePresence>
                              {showReplyId === comment.id && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="overflow-hidden"
                                >
                                  {repliesLoadingSet.has(comment.id) && (
                                    <div className="mt-3 pl-5 flex items-center gap-1.5 text-xs text-[hsl(222,12%,55%)]">
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      Loading replies…
                                    </div>
                                  )}
                                  {!repliesLoadingSet.has(comment.id) && (replies[comment.id] ?? []).length > 0 && (
                                    <div className="mt-3 space-y-3 pl-5 border-l-2 border-[hsl(220,16%,92%)] ml-1">
                                      {(replies[comment.id] ?? []).map(reply => {
                                        const replyInitials = reply.user?.name
                                          ? reply.user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                                          : '?';
                                        const isOwnReply = currentUser?.id === reply.user?.id;
                                        return (
                                          <div key={reply.id} className="group/reply flex gap-2">
                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[hsl(221,91%,90%)] to-[hsl(221,91%,80%)] flex items-center justify-center text-[hsl(221,91%,50%)] text-[9px] font-bold shrink-0">
                                              {replyInitials}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                                <span className="text-xs font-semibold text-[hsl(222,22%,15%)]">{reply.user?.name || 'Anonymous'}</span>
                                                <span className="text-[10px] text-[hsl(222,12%,55%)]">· {formatRelativeTime(reply.createdAt)}</span>
                                                {isPendingStatus(reply.status) && (
                                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-semibold">
                                                    <Clock className="w-2 h-2" />
                                                    Pending review
                                                  </span>
                                                )}
                                              </div>
                                              <div className="text-xs text-[hsl(222,12%,30%)] leading-relaxed"><Markdown className="text-xs text-[hsl(222,12%,30%)]">{reply.content}</Markdown></div>
                                              {isOwnReply && (
                                                <button
                                                  onClick={() => handleDeleteReply(reply.id, comment.id)}
                                                  disabled={deletingReplyId === reply.id}
                                                  className="mt-1 flex items-center gap-1 text-[10px] text-[hsl(222,12%,55%)] hover:text-red-500 transition-colors opacity-0 group-hover/reply:opacity-100"
                                                >
                                                  {deletingReplyId === reply.id
                                                    ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                                    : <X className="w-2.5 h-2.5" />}
                                                  Delete
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* Guests can now open this thread, so the
                                      reply box needs its own gate — posting a
                                      reply is still an authenticated write. */}
                                  {signedOut ? (
                                    <button
                                      type="button"
                                      onClick={signInGate}
                                      className="mt-3 ml-1 inline-flex items-center gap-1.5 text-xs font-medium text-[hsl(221,91%,60%)] hover:underline"
                                    >
                                      <Lock className="w-3 h-3" />
                                      Sign in to reply
                                    </button>
                                  ) : (
                                  <div className="mt-3 flex gap-2 pl-1">
                                    <CornerDownRight className="w-3.5 h-3.5 text-[hsl(222,12%,70%)] shrink-0 mt-2.5" />
                                    <div className="flex-1 flex gap-2">
                                      <input
                                        type="text"
                                        placeholder="Write a reply…"
                                        value={replyTexts[comment.id] || ''}
                                        onChange={e => setReplyTexts(prev => ({ ...prev, [comment.id]: e.target.value }))}
                                        onKeyDown={e => { if (e.key === 'Enter') handleSubmitReply(comment.id); }}
                                        className="flex-1 h-9 px-3 rounded-lg border border-[hsl(220,16%,90%)] bg-white text-sm focus:border-[hsl(221,91%,60%)] focus:ring-2 focus:ring-[hsl(221,91%,60%)]/20 outline-none transition-all"
                                      />
                                      <Button
                                        size="sm"
                                        disabled={!(replyTexts[comment.id] || '').trim() || submittingReplyId === comment.id}
                                        onClick={() => handleSubmitReply(comment.id)}
                                        className="bg-[hsl(222,22%,15%)] hover:bg-[hsl(222,22%,20%)] text-white rounded-lg h-9 text-xs px-3 disabled:opacity-40"
                                      >
                                        {submittingReplyId === comment.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Reply'}
                                      </Button>
                                    </div>
                                  </div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ═══ RIGHT SIDEBAR ═══ */}
            <div className="lg:w-80 shrink-0">
              <div className="sticky top-24 space-y-5">

                <div className="bg-white rounded-2xl border border-[hsl(220,16%,90%)] p-5 shadow-sm">
                  <h4 className="text-sm font-semibold text-[hsl(222,22%,15%)] mb-4">Interview Details</h4>
                  <div className="space-y-3">
                    {[
                      { label: 'Company', value: post.company },
                      { label: 'Role', value: post.role },
                      { label: 'Round', value: post.round },
                      { label: 'Level', value: post.level },
                      { label: 'Outcome', value: post.outcome },
                      { label: 'Date', value: new Date(post.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) },
                      { label: 'Location', value: post.location },
                    ].filter(item => item.value).map(item => (
                      <div key={item.label} className="flex items-center justify-between">
                        <span className="text-xs text-[hsl(222,12%,55%)]">{item.label}</span>
                        <span className="text-xs font-medium text-[hsl(222,22%,15%)]">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-[hsl(220,16%,90%)] p-5 shadow-sm">
                  <h4 className="text-sm font-semibold text-[hsl(222,22%,15%)] mb-3">Questions in this post</h4>
                  <div className="space-y-1.5">
                    {post.questions.map((q, qi) => {
                      const hintStatus = getQuestionHintStatus(q.id, hintsData, hintsLoadingSet, hintsFailedSet);
                      const hintInfo = HINT_STATUS_MAP[hintStatus];
                      return (
                        <button
                          key={q.id}
                          onClick={() => {
                            if (!expandedQuestions.has(q.id)) toggleQuestion(q.id);
                            const el = document.getElementById(`question-${q.id}`);
                            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }}
                          className="w-full text-left flex items-start gap-2 px-2.5 py-2 rounded-lg hover:bg-[hsl(220,20%,98%)] transition-colors group/q"
                        >
                          <span className="text-[10px] font-bold text-[hsl(221,91%,60%)] bg-[hsl(221,91%,60%)]/10 px-1.5 py-0.5 rounded shrink-0 mt-0.5">Q{qi + 1}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] text-[hsl(222,22%,15%)] group-hover/q:text-[hsl(221,91%,60%)] transition-colors truncate leading-snug">
                              {q.title}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className={`inline-flex items-center gap-0.5 text-[9px] font-medium ${hintInfo.color.split(' ')[0]}`}>
                                {hintInfo.icon}
                                {hintInfo.label}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-[hsl(220,16%,90%)] p-5 shadow-sm">
                  <h4 className="text-sm font-semibold text-[hsl(222,22%,15%)] mb-2">Share your own experience</h4>
                  <p className="text-xs text-[hsl(222,12%,55%)] mb-3 leading-relaxed">Help the community by sharing what you went through.</p>
                  <Link to={isAuthenticated ? '/add-experience' : '/auth'}>
                    <Button variant="outline" className="w-full rounded-xl h-9 text-xs gap-1.5 border-[hsl(220,16%,90%)]">
                      <ExternalLink className="w-3 h-3" />
                      Add Interview Experience
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
      {gateOverlays}
    </Layout>
  );
}