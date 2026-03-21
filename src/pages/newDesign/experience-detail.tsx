import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useParams } from 'react-router';
import {
  ArrowLeft,
  ThumbsUp,
  MessageSquare,
  Share2,
  Bookmark,
  Bot,
  Play,
  Clock,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Check,
  Sparkles,
  AlertCircle,
  Loader2,
  Flag,
  CornerDownRight,
  Hash,
  X,
  User,
  Eye,
  MapPin,
  ExternalLink,
  RefreshCw,
  CircleAlert,
  Plus,
  FolderOpen,
} from 'lucide-react';
import { Navbar } from '../../components/newDesign/home/navbar';
import { Footer } from '../../components/newDesign/home/footer';
import { Button } from '../../components/newDesign/ui/button';
import { getPost, getComments, createComment, deleteComment } from '../../services/CommunityService';
import { getQuestionAiHints } from '../../services/QuestionBankService';
import { useAuth } from '../../contexts/AuthContext';

// ─── Color Mappings ────────────────────────────────────
const ROLE_COLORS: Record<string, string> = {
  'Software Engineer': 'bg-blue-50 text-blue-700 border-blue-200',
  'Product Manager': 'bg-violet-50 text-violet-700 border-violet-200',
  'Data Scientist': 'bg-amber-50 text-amber-700 border-amber-200',
  'Engineering Manager': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'Product Designer': 'bg-pink-50 text-pink-700 border-pink-200',
};

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

// ─── Hint status types ─────────────────────────────────
type HintStatus = 'ready' | 'generating' | 'failed';

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
}

// ─── Comment interface matching API ─────────────────────
interface Comment {
  id: string;
  user: { id: string; name: string };
  questionSeq: number | null;
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

// ─── Unused legacy block placeholder ────────────────────
const _LEGACY_POST_DATA_REMOVED = {
  1: {
    id: 1,
    company: 'Google',
    role: 'Software Engineer',
    round: 'Onsite - System Design',
    level: 'Senior',
    outcome: 'Offer',
    date: 'Feb 2026',
    location: 'Mountain View, CA',
    author: 'Sarah M.',
    anonymous: false,
    summary: 'placeholder',
    likes: 142,
    comments: 38,
    saves: 89,
    views: 4280,
    questions: [
      {
        id: 1,
        title: 'Design a real-time collaborative document editor',
        tags: ['System Design', 'Distributed Systems'],
        hintStatus: 'ready',
        authorNotes: 'They wanted end-to-end: from client-side operational transforms to server-side conflict resolution. I started with a high-level architecture diagram and worked down. The interviewer pushed me on consistency models — know the difference between strong consistency and eventual consistency well.',
        hints: {
          approach: 'This is a classic distributed systems design question. The interviewer wants to see that you can reason about real-time data synchronization, conflict resolution, and scalability. Structure your answer around the full stack — from client editor to backend data model to operational transforms.',
          proTip: 'Mention specific technologies (OT vs CRDT) and discuss trade-offs. Interviewers love seeing you weigh alternatives rather than jumping to one solution.',
          steps: [
            { title: 'Define the Core Requirements', content: 'Start by clarifying: How many concurrent editors? What type of content (text, rich text, drawings)? What latency is acceptable? This scoping shows maturity.' },
            { title: 'High-Level Architecture', content: 'Draw out the client ↔ WebSocket server ↔ Document service ↔ Persistence layer. Explain how each layer handles real-time sync, including message ordering and acknowledgment.' },
            { title: 'Conflict Resolution Strategy', content: 'Compare OT (Operational Transforms) and CRDTs. OT is used by Google Docs — it requires a central server to transform operations. CRDTs are serverless-friendly but have higher storage overhead. Pick one and justify your choice.' },
            { title: 'Scaling & Reliability', content: 'Discuss how to partition documents across servers, handle node failures gracefully, and ensure eventual consistency. Mention cursor presence, undo/redo in collaborative context, and offline support.' },
          ],
          keyPoints: [
            'OT vs CRDT trade-offs (latency, complexity, consistency)',
            'WebSocket connection management at scale',
            'Document versioning and history',
            'Cursor presence and awareness',
            'Offline-first with sync-on-reconnect',
            'Permission and access control models',
          ],
        },
      },
      {
        id: 2,
        title: 'How would you handle conflict resolution in CRDTs?',
        tags: ['System Design', 'Distributed Systems'],
        hintStatus: 'ready',
        authorNotes: 'This was a deep-dive follow-up. They wanted me to get specific about vector clocks and how to merge divergent states. Drawing a timeline diagram really helped.',
        hints: {
          approach: 'This is a follow-up that tests depth. You need to explain how CRDTs achieve eventual consistency without a central coordinator.',
          proTip: 'Draw a timeline with two clients making concurrent edits. Walk through how the CRDT merge function resolves them deterministically.',
          steps: [
            { title: 'Explain CRDT Types', content: 'Distinguish between state-based CRDTs (CvRDTs) and operation-based CRDTs (CmRDTs). For collaborative text, discuss sequence CRDTs like LSEQ or RGA.' },
            { title: 'Merge Semantics', content: 'Explain the merge function must be commutative, associative, and idempotent. Show how concurrent inserts at the same position are resolved using unique identifiers.' },
            { title: 'Practical Considerations', content: 'Address tombstones for deletions, garbage collection of metadata, and the trade-off between metadata overhead and merge correctness.' },
          ],
          keyPoints: [
            'CvRDT vs CmRDT distinctions',
            'Unique ID generation for conflict-free ordering',
            'Tombstone management and garbage collection',
            'Metadata overhead trade-offs',
          ],
        },
      },
      {
        id: 3,
        title: 'Discuss trade-offs between OT and CRDT approaches',
        tags: ['Technical Trade-offs'],
        hintStatus: 'generating',
        authorNotes: null,
        hints: null,
      },
      {
        id: 4,
        title: 'Design the notification system for shared docs',
        tags: ['System Design'],
        hintStatus: 'ready',
        authorNotes: 'Simpler than the first question. Focus on pub/sub, delivery guarantees, and user preference management. I talked about batching and digest notifications to avoid notification fatigue.',
        hints: {
          approach: 'A notification system design question focused on event-driven architecture. Cover the full lifecycle: event generation → processing → delivery → user preferences.',
          proTip: 'Discuss notification fatigue and how to batch/aggregate notifications intelligently. This shows product thinking alongside engineering.',
          steps: [
            { title: 'Event Sources & Types', content: 'Identify notification triggers: @mentions, comments, edits to shared docs, permission changes. Define priority levels (urgent vs informational).' },
            { title: 'Processing Pipeline', content: 'Design a pub/sub system with event queue → notification service → delivery channels (push, email, in-app). Discuss deduplication and batching logic.' },
            { title: 'Delivery & Preferences', content: 'Allow per-channel preferences, quiet hours, and digest mode. Discuss delivery guarantees (at-least-once vs exactly-once) and retry strategies.' },
          ],
          keyPoints: [
            'Event-driven pub/sub architecture',
            'Notification batching and digest algorithms',
            'Multi-channel delivery (push, email, in-app)',
            'User preference management',
          ],
        },
      },
      // end legacy placeholder
    ],
  },
};
void _LEGACY_POST_DATA_REMOVED;

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════
export function ExperienceDetailPage() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();

  // ── Post data ──
  const [post, setPost] = useState<ExperiencePost | null>(null);
  const [postLoading, setPostLoading] = useState(true);

  // ── Comments ──
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  const fetchPost = useCallback(async () => {
    if (!id) return;
    setPostLoading(true);
    try {
      const res = await getPost(id);
      const data = res.data?.data ?? res.data;
      setPost(data);
    } catch {
      // silent
    } finally {
      setPostLoading(false);
    }
  }, [id]);

  const fetchComments = useCallback(async () => {
    if (!id) return;
    setCommentsLoading(true);
    try {
      const res = await getComments(id, { page: 0 });
      const data = res.data?.data ?? res.data;
      setComments(data?.content ?? []);
    } catch {
      // silent
    } finally {
      setCommentsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPost();
    fetchComments();
  }, [fetchPost, fetchComments]);

  const [isAuthor] = useState(false);

  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSavePopover, setShowSavePopover] = useState(false);
  const [collections, setCollections] = useState([
    { id: 'c1', name: 'System Design Prep', count: 12, saved: false },
    { id: 'c2', name: 'Google Interviews', count: 5, saved: false },
    { id: 'c3', name: 'Senior-level Rounds', count: 8, saved: false },
    { id: 'c4', name: 'Behavioral Questions', count: 3, saved: false },
  ]);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const savePopoverRef = useRef<HTMLDivElement>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [expandedHints, setExpandedHints] = useState<Set<string>>(new Set());
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [retryingHints, setRetryingHints] = useState<Set<string>>(new Set());
  const [hintsData, setHintsData] = useState<Record<string, { suggested_approach: string; pro_tip: string; framework: { step: number; title: string; description: string }[]; key_points_to_mention: string[] }>>({});
  const [hintsLoadingSet, setHintsLoadingSet] = useState<Set<string>>(new Set());
  const [hintsFailedSet, setHintsFailedSet] = useState<Set<string>>(new Set());
  const [commentSort, setCommentSort] = useState<'top' | 'new'>('top');
  const [commentText, setCommentText] = useState('');
  const [commentAnonymous, setCommentAnonymous] = useState(false);
  const [referencedQ, setReferencedQ] = useState<{ seq: number; title: string } | null>(null);
  const [showRefPicker, setShowRefPicker] = useState(false);
  const [showReplyId, setShowReplyId] = useState<string | null>(null);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const refPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (refPickerRef.current && !refPickerRef.current.contains(e.target as Node)) setShowRefPicker(false);
      if (savePopoverRef.current && !savePopoverRef.current.contains(e.target as Node)) {
        setShowSavePopover(false);
        setCreatingNew(false);
        setNewCollectionName('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleCollectionSave = (collectionId: string) => {
    setCollections(prev => prev.map(c =>
      c.id === collectionId ? { ...c, saved: !c.saved, count: c.saved ? c.count : c.count } : c
    ));
    const anySaved = collections.some(c => c.id === collectionId ? !c.saved : c.saved);
    setSaved(anySaved);
  };

  const createCollection = () => {
    if (!newCollectionName.trim()) return;
    const newCol = {
      id: `c${Date.now()}`,
      name: newCollectionName.trim(),
      count: 0,
      saved: true,
    };
    setCollections(prev => [...prev, newCol]);
    setNewCollectionName('');
    setCreatingNew(false);
    setSaved(true);
  };

  const fetchHints = (qId: string) => {
    if (hintsData[qId] || hintsLoadingSet.has(qId)) return;
    setHintsFailedSet(prev => { const s = new Set(prev); s.delete(qId); return s; });
    setHintsLoadingSet(prev => { const s = new Set(prev); s.add(qId); return s; });
    getQuestionAiHints(qId)
      .then((res: { data: { data?: unknown } | unknown }) => {
        const data = (res as { data: { data?: unknown } }).data?.data ?? (res as { data: unknown }).data;
        setHintsData(prev => ({ ...prev, [qId]: data as { suggested_approach: string; pro_tip: string; framework: { step: number; title: string; description: string }[]; key_points_to_mention: string[] } }));
      })
      .catch(() => {
        setHintsFailedSet(prev => { const s = new Set(prev); s.add(qId); return s; });
      })
      .finally(() => {
        setHintsLoadingSet(prev => { const s = new Set(prev); s.delete(qId); return s; });
      });
  };

  const toggleQuestion = (qId: string) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      next.has(qId) ? next.delete(qId) : next.add(qId);
      return next;
    });
    if (!expandedQuestions.has(qId)) fetchHints(qId);
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

  // Handle # key in composer
  const handleComposerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === '#' || (e.shiftKey && e.key === '3')) {
      // Show after the character is inserted
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

  const outcomeStyle = post
    ? (OUTCOME_STYLES[post.outcome] || OUTCOME_STYLES['Pending'])
    : OUTCOME_STYLES['Pending'];

  const sortedComments = [...comments].sort((a, b) =>
    commentSort === 'new'
      ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="pt-24 pb-20 bg-[#f9fafb]">
        <div className="max-w-7xl mx-auto px-6">

          {/* ─── Breadcrumb ─── */}
          <Link
            to="/interview-insights"
            className="inline-flex items-center text-sm text-[hsl(222,12%,50%)] hover:text-[hsl(221,91%,60%)] mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Interview Insights
          </Link>

          {postLoading && (
            <div className="flex items-center justify-center py-32">
              <Loader2 className="w-8 h-8 animate-spin text-[hsl(221,91%,60%)]" />
            </div>
          )}

          {!postLoading && !post && (
            <div className="text-center py-32 text-[hsl(222,12%,45%)]">Post not found.</div>
          )}

          {!postLoading && post && (
          <div className="flex flex-col lg:flex-row gap-8">

            {/* ═══ LEFT: Main Content ═══ */}
            <div className="flex-1 min-w-0">

              {/* ── Section 1: Header ── */}
              <div className="bg-white rounded-2xl border border-[hsl(220,16%,90%)] p-6 md:p-8 mb-5">
                {/* Company · Role · Round */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[hsl(220,20%,97%)] border border-[hsl(220,16%,90%)] flex items-center justify-center text-lg font-bold text-[hsl(222,22%,15%)] shrink-0">
                    {post.company[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-lg font-semibold text-[hsl(222,22%,15%)]">{post.company}</span>
                      <span className="text-[hsl(222,12%,70%)]">·</span>
                      <span className="text-lg text-[hsl(222,12%,35%)]">{post.role}</span>
                      <span className="text-[hsl(222,12%,70%)]">·</span>
                      <span className="text-lg text-[hsl(222,12%,35%)]">{post.round}</span>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  
                  
                  {post.outcome && (
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 ${outcomeStyle.bg} ${outcomeStyle.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${outcomeStyle.dot}`} />
                      {post.outcome}
                    </span>
                  )}
                </div>

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-[hsl(222,12%,50%)] mb-5">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {post.date ? new Date(post.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''}
                  </span>
                  {post.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {post.location}
                    </span>
                  )}
                </div>

                {/* Stats + Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-[hsl(220,16%,94%)]">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setLiked(!liked)}
                      className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${liked ? 'text-[hsl(221,91%,60%)]' : 'text-[hsl(222,12%,50%)] hover:text-[hsl(222,22%,15%)]'}`}
                    >
                      <ThumbsUp className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
                      {liked ? 1 : 0}
                    </button>
                    <a href="#discussion" className="flex items-center gap-1.5 text-sm text-[hsl(222,12%,50%)] hover:text-[hsl(222,22%,15%)] transition-colors">
                      <MessageSquare className="w-4 h-4" />
                      {comments.length}
                    </a>
                    <div className="relative" ref={savePopoverRef}>
                      <button
                        onClick={() => setShowSavePopover(!showSavePopover)}
                        className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${saved ? 'text-[hsl(221,91%,60%)]' : 'text-[hsl(222,12%,50%)] hover:text-[hsl(222,22%,15%)]'}`}
                      >
                        <Bookmark className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
                        {saved ? 1 : 0}
                      </button>
                      <AnimatePresence>
                        {showSavePopover && (
                          <motion.div
                            initial={{ opacity: 0, y: 6, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 6, scale: 0.96 }}
                            transition={{ duration: 0.15 }}
                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-white rounded-xl border border-[hsl(220,16%,90%)] shadow-xl z-50 overflow-hidden"
                          >
                            <div className="px-3.5 py-2.5 border-b border-[hsl(220,16%,94%)] flex items-center justify-between">
                              <span className="text-xs font-semibold text-[hsl(222,22%,15%)]">Save to Collection</span>
                              <button
                                onClick={() => { setShowSavePopover(false); setCreatingNew(false); setNewCollectionName(''); }}
                                className="w-5 h-5 rounded-md flex items-center justify-center text-[hsl(222,12%,55%)] hover:bg-[hsl(220,20%,96%)] transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="max-h-48 overflow-y-auto p-1.5">
                              {collections.map(col => (
                                <button
                                  key={col.id}
                                  onClick={() => toggleCollectionSave(col.id)}
                                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[hsl(220,20%,98%)] transition-colors text-left group/col"
                                >
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                    col.saved ? 'bg-[hsl(221,91%,60%)]/10' : 'bg-[hsl(220,20%,96%)]'
                                  }`}>
                                    <FolderOpen className={`w-3.5 h-3.5 ${col.saved ? 'text-[hsl(221,91%,60%)]' : 'text-[hsl(222,12%,55%)]'}`} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-[hsl(222,22%,15%)] truncate">{col.name}</p>
                                    <p className="text-[10px] text-[hsl(222,12%,60%)]">{col.count} item{col.count !== 1 ? 's' : ''}</p>
                                  </div>
                                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                                    col.saved
                                      ? 'bg-[hsl(221,91%,60%)] border-[hsl(221,91%,60%)]'
                                      : 'border-[hsl(220,16%,85%)] group-hover/col:border-[hsl(220,16%,75%)]'
                                  }`}>
                                    {col.saved && <Check className="w-3 h-3 text-white" />}
                                  </div>
                                </button>
                              ))}
                            </div>
                            <div className="border-t border-[hsl(220,16%,94%)] p-1.5">
                              {creatingNew ? (
                                <div className="flex items-center gap-1.5 px-1">
                                  <input
                                    type="text"
                                    value={newCollectionName}
                                    onChange={e => setNewCollectionName(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') createCollection(); if (e.key === 'Escape') { setCreatingNew(false); setNewCollectionName(''); } }}
                                    placeholder="Collection name..."
                                    className="flex-1 h-8 px-2.5 rounded-lg border border-[hsl(220,16%,90%)] bg-[hsl(220,20%,99%)] text-sm outline-none focus:border-[hsl(221,91%,60%)] transition-colors"
                                    autoFocus
                                  />
                                  <button
                                    onClick={createCollection}
                                    disabled={!newCollectionName.trim()}
                                    className="h-8 px-2.5 rounded-lg bg-[hsl(221,91%,60%)] text-white text-xs font-medium hover:bg-[hsl(221,91%,50%)] transition-colors disabled:opacity-40"
                                  >
                                    Save
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setCreatingNew(true)}
                                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[hsl(220,20%,98%)] transition-colors text-left"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-[hsl(221,91%,60%)]/8 flex items-center justify-center shrink-0">
                                    <Plus className="w-3.5 h-3.5 text-[hsl(221,91%,60%)]" />
                                  </div>
                                  <span className="text-sm font-medium text-[hsl(221,91%,60%)]">Create new collection</span>
                                </button>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <button
                      onClick={handleShare}
                      className={`flex items-center gap-1.5 text-sm transition-colors ${shareCopied ? 'text-emerald-600' : 'text-[hsl(222,12%,50%)] hover:text-[hsl(222,22%,15%)]'}`}
                    >
                      {shareCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                      {shareCopied ? 'Copied!' : 'Share'}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedQuestions.size > 0 && (
                      <Link to="/mock-interview">
                        <Button variant="outline" className="rounded-xl h-9 text-xs gap-1.5 border-[hsl(221,91%,60%)]/30 text-[hsl(221,91%,60%)] hover:bg-[hsl(221,91%,60%)]/5">
                          <Play className="w-3 h-3" />
                          Practice {selectedQuestions.size} selected
                        </Button>
                      </Link>
                    )}
                    <Link to="/mock-interview">
                      
                    </Link>
                  </div>
                </div>
              </div>

              {/* ── Section 2: Summary ── */}
              <div className="bg-white rounded-2xl border border-[hsl(220,16%,90%)] p-6 md:p-8 mb-5">
                <h2 className="text-sm font-semibold text-[hsl(222,12%,45%)] uppercase tracking-wider mb-3">
                  Summary
                </h2>
                <p className="text-[15px] text-[hsl(222,12%,30%)] leading-relaxed">
                  {post.summary}
                </p>
              </div>

              {/* ── Section 3: Questions ── */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-4 px-1">
                  <h2 className="text-lg font-semibold text-[hsl(222,22%,15%)]">
                    Questions Asked
                    <span className="ml-2 text-sm font-normal text-[hsl(222,12%,55%)]">({post.questions.length})</span>
                  </h2>
                  {post.questions.length > 1 && (
                    <span className="text-xs text-[hsl(222,12%,55%)]">
                      Click checkbox to select for practice
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {post.questions.map((q, qi) => {
                    const isExpanded = expandedQuestions.has(q.id);
                    const isHintExpanded = expandedHints.has(q.id);
                    const isSelected = selectedQuestions.has(q.id);
                    const hintInfo = HINT_STATUS_MAP['failed'];

                    return (
                      <div
                        key={q.id}
                        id={`question-${q.id}`}
                        className={`bg-white rounded-2xl border transition-all duration-200 ${
                          isSelected ? 'border-[hsl(221,91%,60%)]/40 ring-1 ring-[hsl(221,91%,60%)]/20' : 'border-[hsl(220,16%,90%)]'
                        }`}
                      >
                        {/* Question header */}
                        <div className="flex items-start gap-3 p-5 md:p-6">
                          {/* Select checkbox */}
                          <button
                            onClick={() => toggleSelect(q.id)}
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                              isSelected
                                ? 'bg-[hsl(221,91%,60%)] border-[hsl(221,91%,60%)] text-white'
                                : 'border-[hsl(220,16%,85%)] hover:border-[hsl(221,91%,60%)]'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <button
                                  onClick={() => toggleQuestion(q.id)}
                                  className="text-left w-full group"
                                >
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-xs font-bold text-[hsl(222,12%,55%)]">Q{qi + 1}</span>
                                    {retryingHints.has(q.id) ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border bg-blue-50 text-blue-600 border-blue-200">
                                        <RefreshCw className="w-3 h-3 animate-spin" />
                                        Retrying…
                                      </span>
                                    ) : (
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${hintInfo.color}`}>
                                        {hintInfo.icon}
                                        {hintInfo.label}
                                      </span>
                                    )}
                                  </div>
                                  <h3 className="text-[15px] font-semibold text-[hsl(222,22%,15%)] group-hover:text-[hsl(221,91%,60%)] transition-colors leading-snug">
                                    {q.title}
                                  </h3>
                                </button>
                                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                  {q.categories.map(tag => (
                                    <span key={tag} className="px-2 py-0.5 rounded-full bg-[hsl(220,20%,97%)] border border-[hsl(220,16%,92%)] text-[10px] text-[hsl(222,12%,45%)]">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <Link to="/mock-interview" className="hidden sm:block">
                                  
                                </Link>
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

                        {/* Expanded content */}
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

                                {/* Author Notes */}
                                {q.notes && (
                                  <div className="mb-4 bg-[hsl(220,20%,98%)] rounded-xl p-4 border border-[hsl(220,16%,92%)]">
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="w-5 h-5 rounded-full bg-[hsl(222,12%,85%)] flex items-center justify-center text-[8px] font-bold text-[hsl(222,22%,15%)]">
                                        A
                                      </div>
                                      <span className="text-xs font-medium text-[hsl(222,12%,45%)]">Author's notes</span>
                                    </div>
                                    <p className="text-sm text-[hsl(222,12%,35%)] leading-relaxed">{q.notes}</p>
                                  </div>
                                )}

                                {/* ━━━ AI Hints Module ━━━ */}

                                {/* ── STATE: Ready ── */}
                                {hintsData[q.id] && (
                                  <div className="rounded-xl border border-blue-200 bg-white overflow-hidden shadow-sm shadow-blue-100/40">
                                    {/* Toggle header */}
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

                                    {/* Expandable body */}
                                    <AnimatePresence>
                                      {isHintExpanded && (
                                        <motion.div
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: 'auto', opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                                          className="overflow-hidden"
                                        >
                                          <div className="px-5 pb-5 pt-2 border-t border-blue-100">

                                            {/* Suggested Approach */}
                                            <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50/50 rounded-xl border border-blue-100 p-5 mb-4 mt-3">
                                              <div className="flex items-center gap-2 mb-3">
                                                <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                                                </span>
                                                <h4 className="text-[15px] font-bold text-slate-800">Suggested Approach</h4>
                                              </div>
                                              <p className="text-[13px] text-slate-600 leading-[1.7] mb-3">{hintsData[q.id]?.suggested_approach}</p>
                                              {hintsData[q.id]?.pro_tip && (
                                              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-[13px]">
                                                <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
                                                <span className="text-amber-800"><strong>Pro tip:</strong> {hintsData[q.id]?.pro_tip}</span>
                                              </div>
                                              )}
                                            </div>

                                            {/* Steps */}
                                            <div className="space-y-2.5 mb-4">
                                              {(hintsData[q.id]?.framework ?? []).map((step, si) => {
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

                                            {/* Key Points */}
                                            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                                              <h4 className="text-[13px] font-bold text-slate-700 mb-3 flex items-center gap-2">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500"><path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/></svg>
                                                Key Points to Mention
                                              </h4>
                                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {(hintsData[q.id]?.key_points_to_mention ?? []).map((point, pi) => (
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

                                {/* ── STATE: Generating (skeleton) ── */}
                                {hintsLoadingSet.has(q.id) && (
                                  <div className="rounded-xl border border-blue-200 bg-white overflow-hidden shadow-sm shadow-blue-100/40">
                                    {/* Locked header — matches Ready header structure */}
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

                                    {/* Skeleton body */}
                                    <div className="px-5 pb-5 border-t border-blue-100">
                                      {/* Approach skeleton */}
                                      <div className="bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 rounded-xl border border-blue-100/60 p-5 mt-4 mb-4">
                                        <div className="flex items-center gap-2 mb-3">
                                          <div className="w-7 h-7 rounded-lg bg-blue-200/50 animate-pulse" />
                                          <div className="h-4 w-40 rounded-md bg-slate-200/60 animate-pulse" />
                                        </div>
                                        <div className="space-y-2.5">
                                          <div className="h-3 w-full rounded-md bg-slate-200/50 animate-pulse" />
                                          <div className="h-3 w-[92%] rounded-md bg-slate-200/50 animate-pulse" style={{ animationDelay: '75ms' }} />
                                          <div className="h-3 w-[78%] rounded-md bg-slate-200/50 animate-pulse" style={{ animationDelay: '150ms' }} />
                                        </div>
                                        {/* Pro-tip skeleton */}
                                        <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50/50 border border-amber-100/60 rounded-lg mt-3">
                                          <div className="w-4 h-4 rounded bg-amber-200/50 animate-pulse shrink-0" />
                                          <div className="h-3 w-48 rounded-md bg-amber-200/40 animate-pulse" />
                                        </div>
                                      </div>

                                      {/* Step skeletons */}
                                      <div className="space-y-2.5 mb-4">
                                        {[
                                          { from: 'from-indigo-50/40', border: 'border-indigo-100/50', badge: 'bg-indigo-300/50' },
                                          { from: 'from-violet-50/40', border: 'border-violet-100/50', badge: 'bg-violet-300/50' },
                                          { from: 'from-pink-50/40', border: 'border-pink-100/50', badge: 'bg-pink-300/50' },
                                        ].map((g, si) => (
                                          <div key={si} className={`bg-gradient-to-br ${g.from} to-white p-4 rounded-xl border ${g.border}`}>
                                            <div className="flex items-start gap-3">
                                              <div className={`w-7 h-7 rounded-full ${g.badge} animate-pulse shrink-0`} />
                                              <div className="flex-1 space-y-2">
                                                <div className="h-3.5 w-36 rounded-md bg-slate-200/50 animate-pulse" style={{ animationDelay: `${si * 100}ms` }} />
                                                <div className="h-3 w-full rounded-md bg-slate-200/40 animate-pulse" style={{ animationDelay: `${si * 100 + 50}ms` }} />
                                                <div className="h-3 w-[85%] rounded-md bg-slate-200/40 animate-pulse" style={{ animationDelay: `${si * 100 + 100}ms` }} />
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>

                                      {/* Key points skeleton */}
                                      <div className="bg-slate-50/60 rounded-xl border border-slate-200/60 p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                          <div className="w-4 h-4 rounded bg-slate-200/50 animate-pulse" />
                                          <div className="h-3.5 w-36 rounded-md bg-slate-200/50 animate-pulse" />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                          {[0, 1, 2, 3].map(i => (
                                            <div key={i} className="flex items-center gap-2 px-3 py-2 bg-white/60 rounded-lg border border-slate-100/50">
                                              <div className="w-3.5 h-3.5 rounded bg-blue-200/40 animate-pulse shrink-0" />
                                              <div className="h-3 rounded-md bg-slate-200/40 animate-pulse" style={{ width: `${60 + (i * 10) % 30}%`, animationDelay: `${i * 80}ms` }} />
                                            </div>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Subtle progress messaging */}
                                      <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-blue-50">
                                        <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                                        <span className="text-[12px] text-blue-500/80">Generating AI Hints — this usually takes 1–3 minutes…</span>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* ── STATE: Failed ── */}
                                {!hintsData[q.id] && !hintsLoadingSet.has(q.id) && hintsFailedSet.has(q.id) && !retryingHints.has(q.id) && (
                                  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                                    {/* Header — calm, not alarming */}
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

                                    {/* Body */}
                                    <div className="px-5 pb-5 border-t border-slate-100">
                                      <div className="bg-slate-50 rounded-xl p-5 mt-4 text-center">
                                        <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center mx-auto mb-3 shadow-sm">
                                          <Lightbulb className="w-6 h-6 text-slate-300" />
                                        </div>
                                        <h4 className="text-sm font-semibold text-slate-700 mb-1">Hints temporarily unavailable</h4>
                                        <p className="text-[12px] text-slate-500 max-w-xs mx-auto leading-relaxed mb-4">
                                          Our AI wasn't able to generate hints for this question right now. This can happen with very niche or complex topics.
                                        </p>

                                        <div className="flex items-center justify-center gap-2">
                                          {/* Author sees "Retry" */}
                                          {isAuthor && (
                                            <button
                                              onClick={() => {
                                                setRetryingHints(prev => {
                                                  const next = new Set(prev);
                                                  next.add(q.id);
                                                  return next;
                                                });
                                                // Simulate retry completing after 3s (back to failed for demo)
                                                setTimeout(() => {
                                                  setRetryingHints(prev => {
                                                    const next = new Set(prev);
                                                    next.delete(q.id);
                                                    return next;
                                                  });
                                                }, 3000);
                                              }}
                                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:border-[hsl(221,91%,60%)]/40 hover:text-[hsl(221,91%,60%)] shadow-sm hover:shadow transition-all"
                                            >
                                              <RefreshCw className="w-3.5 h-3.5" />
                                              Retry generation
                                            </button>
                                          )}

                                          {/* Non-author sees "Report" */}
                                          {!isAuthor && (
                                            <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-500 hover:text-slate-700 hover:border-slate-300 shadow-sm hover:shadow transition-all">
                                              <Flag className="w-3.5 h-3.5" />
                                              Report issue
                                            </button>
                                          )}
                                        </div>

                                        {isAuthor && (
                                          <p className="text-[11px] text-slate-400 mt-3">You can retry once every 5 minutes</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* ── STATE: Retrying (transition from Failed) ── */}
                                {retryingHints.has(q.id) && (
                                  <div className="rounded-xl border border-blue-200 bg-white overflow-hidden shadow-sm shadow-blue-100/40">
                                    <div className="flex items-center justify-between px-5 py-4">
                                      <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                          <Lightbulb className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-[15px] font-semibold text-slate-800">AI Hints</span>
                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-semibold">
                                              <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                                              Retrying
                                            </span>
                                          </div>
                                          <span className="block text-[12px] text-slate-500 mt-0.5">Re-analyzing this question…</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Minimal skeleton for retry */}
                                    <div className="px-5 pb-5 border-t border-blue-100">
                                      <div className="bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 rounded-xl border border-blue-100/60 p-5 mt-4">
                                        <div className="flex items-center gap-2 mb-3">
                                          <div className="w-7 h-7 rounded-lg bg-blue-200/50 animate-pulse" />
                                          <div className="h-4 w-40 rounded-md bg-slate-200/60 animate-pulse" />
                                        </div>
                                        <div className="space-y-2.5">
                                          <div className="h-3 w-full rounded-md bg-slate-200/50 animate-pulse" />
                                          <div className="h-3 w-[88%] rounded-md bg-slate-200/50 animate-pulse" style={{ animationDelay: '75ms' }} />
                                          <div className="h-3 w-[72%] rounded-md bg-slate-200/50 animate-pulse" style={{ animationDelay: '150ms' }} />
                                        </div>
                                      </div>
                                      <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-blue-50">
                                        <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                                        <span className="text-[12px] text-blue-500/80">Retrying hint generation…</span>
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
                    <span className="ml-2 text-sm font-normal text-[hsl(222,12%,55%)]">({comments.length})</span>
                  </h2>
                  <div className="flex items-center gap-1 bg-[hsl(220,20%,98%)] rounded-lg p-0.5">
                    {(['top', 'new'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => setCommentSort(s)}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                          commentSort === s
                            ? 'bg-white text-[hsl(222,22%,15%)] shadow-sm'
                            : 'text-[hsl(222,12%,50%)] hover:text-[hsl(222,22%,15%)]'
                        }`}
                      >
                        {s === 'top' ? 'Top' : 'New'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Composer */}
                <div className="bg-[hsl(220,20%,99%)] rounded-xl border border-[hsl(220,16%,92%)] p-4 mb-6">
                  {/* Referenced question badge */}
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
                    <div className="flex-1 relative" ref={refPickerRef}>
                      <textarea
                        ref={composerRef}
                        placeholder='Add a comment… Type "#" to reference a question'
                        value={commentText}
                        onChange={e => setCommentText(e.target.value)}
                        onKeyDown={handleComposerKeyDown}
                        className="w-full min-h-[80px] resize-y p-3 bg-white border border-[hsl(220,16%,90%)] rounded-xl text-sm focus:border-[hsl(221,91%,60%)] focus:ring-2 focus:ring-[hsl(221,91%,60%)]/20 outline-none transition-all"
                      />

                      {/* Question reference picker */}
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

                      <div className="flex items-center justify-between mt-2.5">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setShowRefPicker(!showRefPicker)}
                            className="flex items-center gap-1.5 text-xs text-[hsl(222,12%,50%)] hover:text-[hsl(221,91%,60%)] transition-colors"
                          >
                            <Hash className="w-3.5 h-3.5" />
                            Reference question
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
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

                {/* Comments list */}
                {commentsLoading && (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-[hsl(222,12%,60%)]" />
                  </div>
                )}
                {!commentsLoading && sortedComments.length === 0 && (
                  <p className="text-sm text-[hsl(222,12%,55%)] text-center py-6">No comments yet. Be the first!</p>
                )}
                <div className="space-y-5">
                  {sortedComments.map(comment => {
                    const authorInitials = comment.user.name
                      ? comment.user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                      : '?';
                    const refQuestion = comment.questionSeq
                      ? post.questions.find(q => q.seq === comment.questionSeq)
                      : null;
                    const isOwn = currentUser?.id === comment.user.id;

                    return (
                    <div key={comment.id} className="group">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[hsl(221,91%,90%)] to-[hsl(221,91%,80%)] flex items-center justify-center text-[hsl(221,91%,50%)] text-[11px] font-bold shrink-0">
                          {authorInitials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-[hsl(222,22%,15%)]">{comment.user.name || 'Anonymous'}</span>
                            <span className="text-xs text-[hsl(222,12%,55%)]">· {formatRelativeTime(comment.createdAt)}</span>
                          </div>

                          {/* Referenced question block */}
                          {refQuestion && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-[hsl(221,91%,60%)]/6 rounded-lg border border-[hsl(221,91%,60%)]/10 mb-2 max-w-md">
                              <Hash className="w-3 h-3 text-[hsl(221,91%,60%)]" />
                              <span className="text-[10px] font-bold text-[hsl(221,91%,60%)]">Q{comment.questionSeq}</span>
                              <span className="text-[11px] text-[hsl(222,12%,40%)] truncate">{refQuestion.title}</span>
                            </div>
                          )}

                          <p className="text-sm text-[hsl(222,12%,30%)] leading-relaxed mb-2">{comment.content}</p>

                          {/* Comment actions */}
                          <div className="flex items-center gap-4 text-[hsl(222,12%,55%)]">
                            <button
                              onClick={() => setShowReplyId(showReplyId === comment.id ? null : comment.id)}
                              className="flex items-center gap-1 text-xs hover:text-[hsl(221,91%,60%)] transition-colors"
                            >
                              <MessageSquare className="w-3 h-3" />
                              Reply
                            </button>
                            {isOwn && (
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
                            {!isOwn && (
                              <button className="flex items-center gap-1 text-xs hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                <Flag className="w-3 h-3" />
                                Report
                              </button>
                            )}
                          </div>

                          {/* Reply composer */}
                          <AnimatePresence>
                            {showReplyId === comment.id && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-3 flex gap-2 pl-1">
                                  <CornerDownRight className="w-3.5 h-3.5 text-[hsl(222,12%,70%)] shrink-0 mt-2.5" />
                                  <div className="flex-1 flex gap-2">
                                    <input
                                      type="text"
                                      placeholder="Write a reply…"
                                      value={replyTexts[comment.id] || ''}
                                      onChange={e => setReplyTexts(prev => ({ ...prev, [comment.id]: e.target.value }))}
                                      className="flex-1 h-9 px-3 rounded-lg border border-[hsl(220,16%,90%)] bg-white text-sm focus:border-[hsl(221,91%,60%)] focus:ring-2 focus:ring-[hsl(221,91%,60%)]/20 outline-none transition-all"
                                    />
                                    <Button
                                      size="sm"
                                      disabled={!(replyTexts[comment.id] || '').trim()}
                                      className="bg-[hsl(222,22%,15%)] hover:bg-[hsl(222,22%,20%)] text-white rounded-lg h-9 text-xs px-3 disabled:opacity-40"
                                    >
                                      Reply
                                    </Button>
                                  </div>
                                </div>
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

              {/* ── Section 5: Related Posts placeholder ── */}
              <div />
            </div>

            {/* ═══ RIGHT SIDEBAR ═══ */}
            <div className="lg:w-80 shrink-0">
              <div className="sticky top-24 space-y-5">

                {/* Mock CTA */}
                

                {/* Post Info */}
                <div className="bg-white rounded-2xl border border-[hsl(220,16%,90%)] p-5 shadow-sm">
                  <h4 className="text-sm font-semibold text-[hsl(222,22%,15%)] mb-4">Interview Details</h4>
                  <div className="space-y-3">
                    {[
                      { label: 'Company', value: post.company },
                      { label: 'Role', value: post.role },
                      { label: 'Round', value: post.round },
                      { label: 'Level', value: post.level },
                      { label: 'Outcome', value: post.outcome },
                      { label: 'Date', value: post.date ? new Date(post.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '' },
                      { label: 'Location', value: post.location },
                    ].filter(item => item.value).map(item => (
                      <div key={item.label} className="flex items-center justify-between">
                        <span className="text-xs text-[hsl(222,12%,55%)]">{item.label}</span>
                        <span className="text-xs font-medium text-[hsl(222,22%,15%)]">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Questions Quick Jump */}
                <div className="bg-white rounded-2xl border border-[hsl(220,16%,90%)] p-5 shadow-sm">
                  <h4 className="text-sm font-semibold text-[hsl(222,22%,15%)] mb-3">Questions in this post</h4>
                  <div className="space-y-1.5">
                    {post.questions.map((q, qi) => {
                      const hintInfo = HINT_STATUS_MAP['failed'];
                      return (
                        <button
                          key={q.id}
                          onClick={() => {
                            if (!expandedQuestions.has(q.id)) toggleQuestion(q.id);
                            // Scroll to question
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
                              {retryingHints.has(q.id) ? (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-blue-600">
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                  Retrying…
                                </span>
                              ) : (
                                <span className={`inline-flex items-center gap-0.5 text-[9px] font-medium text-slate-500`}>
                                  {hintInfo.icon}
                                  {hintInfo.label}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Share CTA */}
                <div className="bg-white rounded-2xl border border-[hsl(220,16%,90%)] p-5 shadow-sm">
                  <h4 className="text-sm font-semibold text-[hsl(222,22%,15%)] mb-2">Share your own experience</h4>
                  <p className="text-xs text-[hsl(222,12%,55%)] mb-3 leading-relaxed">Help the community by sharing what you went through.</p>
                  <Link to="/add-experience">
                    <Button variant="outline" className="w-full rounded-xl h-9 text-xs gap-1.5 border-[hsl(220,16%,90%)]">
                      <ExternalLink className="w-3 h-3" />
                      Add Interview Experience
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

          </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
