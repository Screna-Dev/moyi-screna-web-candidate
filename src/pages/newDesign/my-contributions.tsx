import { useState } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Eye,
  Pencil,
  Trash2,
  ThumbsUp,
  MessageSquare,
  Clock,
  Search,
  FileText,
  Bookmark,
  MoreHorizontal,
  AlertTriangle,
} from 'lucide-react';
import { DashboardLayout } from '../../components/newDesign/dashboard-layout';
import { Button } from '../../components/newDesign/ui/button';

// ─── Color Mappings ────────────────────────────────────
const ROLE_COLORS: Record<string, string> = {
  'Software Engineer': 'bg-blue-50 text-blue-700 border-blue-200',
  'Product Manager': 'bg-violet-50 text-violet-700 border-violet-200',
  'Data Scientist': 'bg-amber-50 text-amber-700 border-amber-200',
  'Engineering Manager': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'Product Designer': 'bg-pink-50 text-pink-700 border-pink-200',
};

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  Published: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'Under Review': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  Draft: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
};

// ─── Types ─────────────────────────────────────────────
interface Post {
  id: number;
  company: string;
  role: string;
  round: string;
  status: 'Published' | 'Under Review' | 'Draft';
  date: string;
  likes: number;
  comments: number;
  questions: number;
  views: number;
}

interface CommentItem {
  id: number;
  postTitle: string;
  postCompany: string;
  content: string;
  date: string;
  likes: number;
  referencedQuestion: string | null;
}

interface SavedPost {
  id: number;
  company: string;
  role: string;
  round: string;
  author: string;
  date: string;
  likes: number;
  comments: number;
  questions: number;
}

// ─── Mock Data ─────────────────────────────────────────
const MOCK_POSTS: Post[] = [
  {
    id: 1,
    company: 'Google',
    role: 'Software Engineer',
    round: 'Onsite - System Design',
    status: 'Published',
    date: 'Feb 28, 2026',
    likes: 142,
    comments: 38,
    questions: 4,
    views: 4280,
  },
  {
    id: 7,
    company: 'Stripe',
    role: 'Software Engineer',
    round: 'Onsite - Coding',
    status: 'Draft',
    date: 'Mar 10, 2026',
    likes: 0,
    comments: 0,
    questions: 2,
    views: 0,
  },
  {
    id: 8,
    company: 'Meta',
    role: 'Product Manager',
    round: 'Product Sense',
    status: 'Published',
    date: 'Jan 15, 2026',
    likes: 97,
    comments: 52,
    questions: 3,
    views: 3150,
  },
  {
    id: 9,
    company: 'Amazon',
    role: 'Software Engineer',
    round: 'Onsite - Behavioral',
    status: 'Published',
    date: 'Dec 3, 2025',
    likes: 64,
    comments: 19,
    questions: 5,
    views: 1920,
  },
  {
    id: 10,
    company: 'Apple',
    role: 'Software Engineer',
    round: 'Onsite - System Design',
    status: 'Under Review',
    date: 'Mar 12, 2026',
    likes: 0,
    comments: 0,
    questions: 3,
    views: 0,
  },
];

const MOCK_COMMENTS: CommentItem[] = [
  {
    id: 101,
    postTitle: 'Google · Software Engineer · Onsite - System Design',
    postCompany: 'Google',
    content: 'Thanks for sharing this! The system design round is exactly what I\'m prepping for. Did they expect you to write pseudocode for the OT algorithm?',
    date: '2 hours ago',
    likes: 24,
    referencedQuestion: 'Design a real-time collaborative document editor',
  },
  {
    id: 102,
    postTitle: 'Stripe · Software Engineer · Onsite - Coding',
    postCompany: 'Stripe',
    content: 'Stripe interviews are uniquely practical. The debugging exercise was interesting — they gave actual production-like code to fix.',
    date: '3 days ago',
    likes: 18,
    referencedQuestion: null,
  },
  {
    id: 103,
    postTitle: 'Netflix · Data Scientist · Technical Phone Screen',
    postCompany: 'Netflix',
    content: 'Great writeup on the experimentation framework questions. I had a very similar experience last month.',
    date: '1 week ago',
    likes: 12,
    referencedQuestion: 'Design an A/B test for a new recommendation algo',
  },
];

const MOCK_SAVED: SavedPost[] = [
  {
    id: 201,
    company: 'Apple',
    role: 'Engineering Manager',
    round: 'Onsite - Behavioral / Leadership',
    author: 'Daniel W.',
    date: 'Mar 2026',
    likes: 92,
    comments: 31,
    questions: 3,
  },
  {
    id: 202,
    company: 'Netflix',
    role: 'Data Scientist',
    round: 'Technical Phone Screen',
    author: 'Priya R.',
    date: 'Dec 2025',
    likes: 68,
    comments: 21,
    questions: 2,
  },
  {
    id: 203,
    company: 'Microsoft',
    role: 'Software Engineer',
    round: 'Onsite - System Design',
    author: 'Anonymous',
    date: 'Feb 2026',
    likes: 156,
    comments: 44,
    questions: 4,
  },
];

type TabKey = 'posts' | 'comments' | 'saved';

const TABS: { key: TabKey; label: string; icon: React.ReactNode; count: number }[] = [
  { key: 'posts', label: 'Posts', icon: <FileText className="w-4 h-4" />, count: MOCK_POSTS.length },
  { key: 'comments', label: 'Comments', icon: <MessageSquare className="w-4 h-4" />, count: MOCK_COMMENTS.length },
  { key: 'saved', label: 'Saved', icon: <Bookmark className="w-4 h-4" />, count: MOCK_SAVED.length },
];

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════
export function MyContributionsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('posts');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Published' | 'Under Review' | 'Draft'>('All');

  // Filtered posts
  const filteredPosts = MOCK_POSTS.filter(p => {
    if (statusFilter !== 'All' && p.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.company.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q) ||
        p.round.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredComments = MOCK_COMMENTS.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.content.toLowerCase().includes(q) || c.postTitle.toLowerCase().includes(q);
  });

  const filteredSaved = MOCK_SAVED.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.company.toLowerCase().includes(q) ||
      s.role.toLowerCase().includes(q) ||
      s.round.toLowerCase().includes(q)
    );
  });

  const handleDelete = () => {
    // In a real app, call API. Here we just close the dialog.
    setDeleteTarget(null);
  };

  // Close action menu on outside click
  const closeActionMenu = () => setActionMenuOpen(null);

  return (
    <DashboardLayout headerTitle="My Contributions">
      <div>
        {/* ─── Header + CTA ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <p className="text-sm text-[hsl(222,12%,50%)] leading-relaxed">
              Manage your interview experiences, comments, and saved posts.
            </p>
          </div>
          <Link to="/add-experience">
            <Button className="bg-[hsl(221,91%,60%)] hover:bg-[hsl(221,91%,50%)] text-white rounded-xl h-9 text-xs gap-1.5 shadow-md shadow-[hsl(221,91%,60%)]/20 shrink-0 px-4">
              <Plus className="w-3.5 h-3.5" />
              Add Interview Experience
            </Button>
          </Link>
        </div>

        {/* ─── Tabs ─── */}
        <div className="flex items-center gap-1 bg-white rounded-xl border border-[hsl(220,16%,90%)] p-1 mb-6 w-fit">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSearchQuery(''); setStatusFilter('All'); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-[hsl(221,91%,60%)] text-white shadow-sm'
                  : 'text-[hsl(222,12%,45%)] hover:text-[hsl(222,22%,15%)] hover:bg-[hsl(220,20%,98%)]'
              }`}
            >
              {tab.icon}
              {tab.label}
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key
                  ? 'bg-white/20 text-white'
                  : 'bg-[hsl(220,20%,96%)] text-[hsl(222,12%,55%)]'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* ─── Controls Bar ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(222,12%,55%)]" />
            <input
              type="text"
              placeholder={
                activeTab === 'posts' ? 'Search your posts…' :
                activeTab === 'comments' ? 'Search your comments…' :
                'Search saved posts…'
              }
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 h-9 rounded-xl border border-[hsl(220,16%,90%)] bg-white text-sm focus:border-[hsl(221,91%,60%)] focus:ring-2 focus:ring-[hsl(221,91%,60%)]/20 outline-none transition-all"
            />
          </div>

          {activeTab === 'posts' && (
            <div className="flex items-center gap-2">
              {(['All', 'Published', 'Under Review', 'Draft'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`h-8 px-3 rounded-full text-xs font-medium border transition-all ${
                    statusFilter === s
                      ? 'bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,60%)] border-[hsl(221,91%,60%)]/30'
                      : 'bg-white text-[hsl(222,12%,45%)] border-[hsl(220,16%,90%)] hover:border-[hsl(221,91%,60%)]/30 hover:text-[hsl(221,91%,60%)]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ─── Posts Tab ─── */}
        {activeTab === 'posts' && (
          <div>
            {filteredPosts.length === 0 ? (
              <EmptyState
                title="No interview experiences yet"
                description="Share your interview journey to help others prepare — and track your contributions here."
                ctaLabel="Add Interview Experience"
                ctaHref="/add-experience"
              />
            ) : (
              <div className="bg-white rounded-2xl border border-[hsl(220,16%,90%)] overflow-hidden shadow-sm">
                {/* Table header */}
                <div className="hidden md:grid md:grid-cols-[1fr_130px_110px_140px_80px] gap-4 px-5 py-3 bg-[hsl(220,20%,98%)] border-b border-[hsl(220,16%,92%)] text-[11px] font-semibold text-[hsl(222,12%,50%)] uppercase tracking-wider">
                  <span>Post</span>
                  <span>Status</span>
                  <span>Date</span>
                  <span>Engagement</span>
                  <span className="text-right">Actions</span>
                </div>

                {/* Rows */}
                <div className="divide-y divide-[hsl(220,16%,94%)]">
                  {filteredPosts.map((post, i) => {
                    const status = STATUS_STYLES[post.status];
                    const roleColor = ROLE_COLORS[post.role] || 'bg-slate-50 text-slate-600 border-slate-200';
                    const isMenuOpen = actionMenuOpen === post.id;

                    return (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="group hover:bg-[hsl(220,20%,99%)] transition-colors"
                      >
                        {/* Desktop row */}
                        <div className="hidden md:grid md:grid-cols-[1fr_130px_110px_140px_80px] gap-4 px-5 py-4 items-center">
                          {/* Post info */}
                          <div className="min-w-0">
                            <Link
                              to={`/experience/${post.id}`}
                              className="block group/link"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-7 h-7 rounded-lg bg-[hsl(220,20%,97%)] border border-[hsl(220,16%,90%)] flex items-center justify-center text-xs font-bold text-[hsl(222,22%,15%)] shrink-0">
                                  {post.company[0]}
                                </div>
                                <h3 className="text-sm font-semibold text-[hsl(222,22%,15%)] group-hover/link:text-[hsl(221,91%,60%)] transition-colors truncate">
                                  {post.company} · {post.role}
                                </h3>
                              </div>
                              <p className="text-xs text-[hsl(222,12%,50%)] truncate pl-9">
                                {post.round} · {post.questions} questions
                              </p>
                            </Link>
                          </div>

                          {/* Status */}
                          <div>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${status.bg} ${status.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                              {post.status}
                            </span>
                          </div>

                          {/* Date */}
                          <div className="text-xs text-[hsl(222,12%,50%)]">
                            {post.date}
                          </div>

                          {/* Engagement */}
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1 text-xs text-[hsl(222,12%,50%)]">
                              <ThumbsUp className="w-3 h-3" />
                              {post.likes}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-[hsl(222,12%,50%)]">
                              <MessageSquare className="w-3 h-3" />
                              {post.comments}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-[hsl(222,12%,50%)]">
                              <Eye className="w-3 h-3" />
                              {post.views >= 1000 ? `${(post.views / 1000).toFixed(1)}k` : post.views}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="relative flex justify-end">
                            <button
                              onClick={() => setActionMenuOpen(isMenuOpen ? null : post.id)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-[hsl(222,12%,55%)] hover:bg-[hsl(220,20%,96%)] hover:text-[hsl(222,22%,15%)] transition-colors"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>

                            <AnimatePresence>
                              {isMenuOpen && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={closeActionMenu} />
                                  <motion.div
                                    initial={{ opacity: 0, y: 4, scale: 0.97 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 4, scale: 0.97 }}
                                    transition={{ duration: 0.12 }}
                                    className="absolute top-full right-0 mt-1 w-44 bg-white rounded-xl border border-[hsl(220,16%,90%)] shadow-xl shadow-slate-900/[0.06] z-50 p-1 origin-top-right"
                                  >
                                    <Link
                                      to={`/experience/${post.id}`}
                                      onClick={closeActionMenu}
                                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-[hsl(222,12%,35%)] hover:bg-[hsl(220,20%,98%)] rounded-lg transition-colors"
                                    >
                                      <Eye className="w-3.5 h-3.5 opacity-50" />
                                      View
                                    </Link>
                                    <Link
                                      to="/add-experience"
                                      onClick={closeActionMenu}
                                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-[hsl(222,12%,35%)] hover:bg-[hsl(220,20%,98%)] rounded-lg transition-colors"
                                    >
                                      <Pencil className="w-3.5 h-3.5 opacity-50" />
                                      Edit
                                    </Link>
                                    <div className="h-px bg-[hsl(220,16%,94%)] my-1" />
                                    <button
                                      onClick={() => { setDeleteTarget(post); closeActionMenu(); }}
                                      className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50/60 rounded-lg transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 opacity-60" />
                                      Delete
                                    </button>
                                  </motion.div>
                                </>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>

                        {/* Mobile card */}
                        <div className="md:hidden p-4">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <Link to={`/experience/${post.id}`} className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-6 h-6 rounded-md bg-[hsl(220,20%,97%)] border border-[hsl(220,16%,90%)] flex items-center justify-center text-[10px] font-bold text-[hsl(222,22%,15%)]">
                                  {post.company[0]}
                                </div>
                                <h3 className="text-sm font-semibold text-[hsl(222,22%,15%)] truncate">
                                  {post.company} · {post.role}
                                </h3>
                              </div>
                              <p className="text-xs text-[hsl(222,12%,50%)] pl-8 truncate">
                                {post.round} · {post.questions} questions
                              </p>
                            </Link>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${status.bg} ${status.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                              {post.status}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-3 pl-8">
                            <div className="flex items-center gap-3 text-[11px] text-[hsl(222,12%,55%)]">
                              <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{post.likes}</span>
                              <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{post.comments}</span>
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{post.date}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Link to={`/experience/${post.id}`}>
                                <button className="w-7 h-7 rounded-md flex items-center justify-center text-[hsl(222,12%,55%)] hover:bg-[hsl(220,20%,96%)]">
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </Link>
                              <Link to="/add-experience">
                                <button className="w-7 h-7 rounded-md flex items-center justify-center text-[hsl(222,12%,55%)] hover:bg-[hsl(220,20%,96%)]">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              </Link>
                              <button
                                onClick={() => setDeleteTarget(post)}
                                className="w-7 h-7 rounded-md flex items-center justify-center text-red-400 hover:bg-red-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Comments Tab ─── */}
        {activeTab === 'comments' && (
          <div>
            {filteredComments.length === 0 ? (
              <EmptyState
                title="No comments yet"
                description="Join the conversation on interview experiences shared by the community."
                ctaLabel="Browse Interview Insights"
                ctaHref="/interview-insights"
              />
            ) : (
              <div className="space-y-3">
                {filteredComments.map((comment, i) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="bg-white rounded-2xl border border-[hsl(220,16%,90%)] p-5 hover:border-[hsl(221,91%,60%)]/20 transition-all"
                  >
                    {/* Post reference */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-5 h-5 rounded-md bg-[hsl(220,20%,97%)] border border-[hsl(220,16%,90%)] flex items-center justify-center text-[8px] font-bold text-[hsl(222,22%,15%)]">
                        {comment.postCompany[0]}
                      </div>
                      <span className="text-xs text-[hsl(222,12%,50%)]">
                        Commented on
                      </span>
                      <span className="text-xs font-medium text-[hsl(222,22%,15%)] truncate">{comment.postTitle}</span>
                    </div>

                    {/* Referenced question */}
                    {comment.referencedQuestion && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-[hsl(221,91%,60%)]/6 rounded-lg border border-[hsl(221,91%,60%)]/10 mb-3 max-w-md">
                        <span className="text-[10px] font-bold text-[hsl(221,91%,60%)]">#</span>
                        <span className="text-[11px] text-[hsl(222,12%,40%)] truncate">{comment.referencedQuestion}</span>
                      </div>
                    )}

                    {/* Comment text */}
                    <p className="text-sm text-[hsl(222,12%,30%)] leading-relaxed mb-3">
                      {comment.content}
                    </p>

                    {/* Meta */}
                    <div className="flex items-center gap-4 text-[11px] text-[hsl(222,12%,55%)]">
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" />
                        {comment.likes}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {comment.date}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Saved Tab ─── */}
        {activeTab === 'saved' && (
          <div>
            {filteredSaved.length === 0 ? (
              <EmptyState
                title="No saved posts yet"
                description="Save interview experiences from the community to reference them later during your prep."
                ctaLabel="Browse Interview Insights"
                ctaHref="/interview-insights"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredSaved.map((saved, i) => {
                  const roleColor = ROLE_COLORS[saved.role] || 'bg-slate-50 text-slate-600 border-slate-200';
                  return (
                    <motion.div
                      key={saved.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <Link
                        to={`/experience/${saved.id}`}
                        className="block bg-white rounded-2xl border border-[hsl(220,16%,90%)] p-5 hover:border-[hsl(221,91%,60%)]/20 hover:shadow-lg hover:shadow-[hsl(221,91%,60%)]/[0.04] transition-all group"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-lg bg-[hsl(220,20%,97%)] border border-[hsl(220,16%,90%)] flex items-center justify-center text-xs font-bold text-[hsl(222,22%,15%)]">
                            {saved.company[0]}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-semibold text-[hsl(222,22%,15%)] group-hover:text-[hsl(221,91%,60%)] transition-colors truncate">
                              {saved.company} · {saved.role}
                            </h4>
                          </div>
                        </div>
                        <p className="text-xs text-[hsl(222,12%,50%)] mb-3 pl-9">
                          {saved.round} · {saved.questions} questions · by {saved.author}
                        </p>
                        <div className="flex items-center gap-3 pl-9 text-[11px] text-[hsl(222,12%,55%)]">
                          <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{saved.likes}</span>
                          <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{saved.comments}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{saved.date}</span>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── Delete Confirmation Dialog ─── */}
        <AnimatePresence>
          {deleteTarget && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            >
              {/* Backdrop */}
              <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => setDeleteTarget(null)}
              />

              {/* Dialog */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="relative bg-white rounded-2xl border border-[hsl(220,16%,90%)] shadow-2xl shadow-slate-900/20 w-full max-w-md p-6 z-10"
              >
                {/* Warning icon */}
                <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>

                <h3 className="text-lg font-semibold text-[hsl(222,22%,15%)] text-center mb-2">
                  Delete this experience?
                </h3>
                <p className="text-sm text-[hsl(222,12%,50%)] text-center leading-relaxed mb-2">
                  This will permanently remove your interview experience for:
                </p>
                <div className="bg-[hsl(220,20%,98%)] rounded-xl border border-[hsl(220,16%,92%)] p-3 mb-5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-white border border-[hsl(220,16%,90%)] flex items-center justify-center text-[10px] font-bold text-[hsl(222,22%,15%)]">
                      {deleteTarget.company[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[hsl(222,22%,15%)] truncate">
                        {deleteTarget.company} · {deleteTarget.role}
                      </p>
                      <p className="text-[11px] text-[hsl(222,12%,50%)]">{deleteTarget.round}</p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-[hsl(222,12%,55%)] text-center mb-5 leading-relaxed">
                  All associated questions, AI hints, and community comments on this post will also be deleted. This action cannot be undone.
                </p>

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setDeleteTarget(null)}
                    className="flex-1 rounded-xl h-10 text-sm border-[hsl(220,16%,90%)]"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDelete}
                    className="flex-1 rounded-xl h-10 text-sm bg-red-600 hover:bg-red-700 text-white border-0 shadow-md shadow-red-500/20"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Delete permanently
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}

// ─── Empty State Component ─────────────────────────────
function EmptyState({
  title,
  description,
  ctaLabel,
  ctaHref,
}: {
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[hsl(220,16%,90%)] p-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[hsl(220,20%,97%)] border border-[hsl(220,16%,92%)] flex items-center justify-center mx-auto mb-5">
        <FileText className="w-7 h-7 text-[hsl(222,12%,70%)]" />
      </div>
      <h3 className="text-lg font-semibold text-[hsl(222,22%,15%)] mb-2">
        {title}
      </h3>
      <p className="text-sm text-[hsl(222,12%,50%)] max-w-sm mx-auto leading-relaxed mb-6">
        {description}
      </p>
      <Link to={ctaHref}>
        <Button className="bg-[hsl(221,91%,60%)] hover:bg-[hsl(221,91%,50%)] text-white rounded-xl h-10 text-sm gap-2 shadow-md shadow-[hsl(221,91%,60%)]/20 px-6">
          <Plus className="w-4 h-4" />
          {ctaLabel}
        </Button>
      </Link>
    </div>
  );
}