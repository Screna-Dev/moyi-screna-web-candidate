import { useState, useEffect } from 'react';
import { Navbar } from '../../../components/newDesign/home/navbar';
import { Footer } from '../../../components/newDesign/home/footer';
import { Button } from '../../../components/newDesign/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/newDesign/ui/select';
import {
  ArrowLeft,
  Bookmark,
  Check,
  MessageSquare,
  Share2,
  Flag,
  Info,
  FolderOpen,
  Plus,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Loader2,
  User,
  Send,
} from 'lucide-react';
import { Link, useParams } from 'react-router';
import { getQuestion, getQuestionAiHints, getAnswerReplies, createAnswerReply } from '../../../services/QuestionBankService';

const bookmarkFolders = [
  { id: 'fav', name: 'My Favorites', icon: '⭐', count: 12 },
  { id: 'tech', name: 'Technical', icon: '💻', count: 8 },
  { id: 'behavioral', name: 'Behavioral', icon: '🗣️', count: 5 },
  { id: 'system', name: 'System Design', icon: '🏗️', count: 3 },
  { id: 'pm', name: 'Product Management', icon: '📊', count: 6 },
];

interface QuestionData {
  id: string;
  question: string;
  company: string;
  role: string;
  level: string;
  round: string;
  category: string;
  createdAt: string;
}

interface AiHints {
  suggested_approach: string;
  pro_tip: string;
  framework: { step: number; title: string; description: string }[];
  key_points_to_mention: string[];
}

interface Reply {
  id: string;
  reply: string;
  createdAt: string;
}

function AnswerReplySection({ answerId }: { answerId: string }) {
  const [showReplies, setShowReplies] = useState(false);
  const [repliesLoaded, setRepliesLoaded] = useState(false);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadReplies = async (pageNum: number, reset: boolean) => {
    setRepliesLoading(true);
    try {
      const res = await getAnswerReplies(answerId, pageNum);
      const data = res.data?.data ?? res.data;
      const content: Reply[] = data?.content ?? (Array.isArray(data) ? data : []);
      const pageMeta = data?.pageMeta;
      setReplies(prev => reset ? content : [...prev, ...content]);
      setHasMore(pageMeta ? !pageMeta.last : false);
      setPage(pageNum);
      setRepliesLoaded(true);
    } catch {
      setRepliesLoaded(true);
    } finally {
      setRepliesLoading(false);
    }
  };

  const handleToggle = () => {
    const next = !showReplies;
    setShowReplies(next);
    if (next && !repliesLoaded) {
      loadReplies(1, true);
    }
  };

  const handleSubmitReply = async () => {
    if (!replyText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await createAnswerReply(answerId, replyText.trim());
      const newReply: Reply = res.data?.data ?? res.data;
      setReplies(prev => [...prev, newReply]);
      setReplyText('');
      if (!showReplies) setShowReplies(true);
      setRepliesLoaded(true);
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-slate-100">
      {/* Toggle */}
      <button
        onClick={handleToggle}
        className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors mb-2"
      >
        <MessageSquare className="w-3.5 h-3.5" />
        {showReplies
          ? 'Hide replies'
          : repliesLoaded && replies.length > 0
            ? `View ${replies.length} repl${replies.length === 1 ? 'y' : 'ies'}`
            : 'Reply'}
        {!showReplies && <ChevronDown className="w-3 h-3 opacity-50" />}
        {showReplies && <ChevronUp className="w-3 h-3 opacity-50" />}
      </button>

      {showReplies && (
        <div className="ml-4 border-l-2 border-slate-100 pl-4 space-y-3">
          {/* Loading state */}
          {repliesLoading && replies.length === 0 && (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
              <span className="text-xs text-slate-400">Loading replies...</span>
            </div>
          )}

          {/* Empty state */}
          {!repliesLoading && repliesLoaded && replies.length === 0 && (
            <p className="text-xs text-slate-400 py-1">No replies yet. Be the first to reply.</p>
          )}

          {/* Reply list */}
          {replies.map(r => (
            <div key={r.id} className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <User className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="flex-1 bg-slate-50 rounded-lg px-3 py-2">
                <p className="text-xs text-slate-700 leading-relaxed">{r.reply}</p>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {new Date(r.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}

          {/* Load more */}
          {hasMore && !repliesLoading && (
            <button
              onClick={() => loadReplies(page + 1, false)}
              className="text-xs text-blue-600 hover:underline"
            >
              Load more replies
            </button>
          )}
          {repliesLoading && replies.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
              <span className="text-xs text-slate-400">Loading...</span>
            </div>
          )}

          {/* Reply composer */}
          <div className="flex gap-2 pt-1">
            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitReply(); } }}
                placeholder="Write a reply..."
                className="flex-1 text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10 outline-none transition-all"
              />
              <button
                onClick={handleSubmitReply}
                disabled={!replyText.trim() || submitting}
                className="px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 shrink-0"
              >
                {submitting
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <Send className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function QuestionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [questionData, setQuestionData] = useState<QuestionData | null>(null);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [aiHints, setAiHints] = useState<AiHints | null>(null);
  const [hintsLoading, setHintsLoading] = useState(false);
  const [bookmarkOpen, setBookmarkOpen] = useState(false);
  const [savedFolders, setSavedFolders] = useState<string[]>([]);
  const [shareCopied, setShareCopied] = useState(false);
  const [showHints, setShowHints] = useState(false);

  useEffect(() => {
    if (!id) return;
    setQuestionLoading(true);
    getQuestion(id)
      .then((res) => {
        const data = res.data?.data ?? res.data;
        setQuestionData(data);
      })
      .catch(() => {})
      .finally(() => setQuestionLoading(false));
  }, [id]);

  const handleToggleHints = () => {
    const next = !showHints;
    setShowHints(next);
    if (next && !aiHints && id && !hintsLoading) {
      setHintsLoading(true);
      getQuestionAiHints(id)
        .then((res) => {
          const data = res.data?.data ?? res.data;
          setAiHints(data);
        })
        .catch(() => {})
        .finally(() => setHintsLoading(false));
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    // Fallback for environments where Clipboard API is blocked
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(url).then(() => {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      }).catch(() => {
        fallbackCopy(url);
      });
    } else {
      fallbackCopy(url);
    }
  };

  const fallbackCopy = (text: string) => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    } catch (_) {
      // silent fail
    }
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const toggleSaveToFolder = (folderId: string) => {
    setSavedFolders((prev) =>
      prev.includes(folderId) ? prev.filter((id) => id !== folderId) : [...prev, folderId]
    );
  };

  const isSaved = savedFolders.length > 0;

  return (
    <div className="min-h-screen bg-[#F7F8FA] font-sans text-slate-900">
      <Navbar />
      
      <main className="pt-24 pb-16 px-6 max-w-[1280px] mx-auto">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Left Main Column */}
          <div className="flex-1 min-w-0 max-w-4xl">
            
            {/* Breadcrumb */}
            <Link to="/question-bank" className="inline-flex items-center text-sm text-slate-500 hover:text-blue-600 mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-1" />
              All Questions
            </Link>

            {/* Header */}
            <div className="mb-8">
              {questionLoading ? (
                <div className="flex items-center gap-3 mb-4">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  <span className="text-slate-400 text-sm">Loading question...</span>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <h1 className="text-3xl font-semibold text-slate-900 leading-tight mb-3">
                      {questionData?.question ?? 'Question not found'}
                    </h1>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    {questionData?.company && (
                      <>
                        <div className="w-5 h-5 rounded bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold">
                          {questionData.company[0]}
                        </div>
                        <span className="font-medium text-slate-700">{questionData.company}</span>
                        <span>•</span>
                      </>
                    )}
                    {questionData?.round && <><span>{questionData.round}</span><span>•</span></>}
                    {questionData?.createdAt && (
                      <span>{new Date(questionData.createdAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Action Row */}
            <div className="flex items-center gap-2 mb-8">
              <div className="relative">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`gap-2 text-center ${ isSaved ? 'text-[hsl(221,91%,60%)]' : 'text-slate-500 hover:text-blue-600' } p-[0px]`}
                  onClick={() => setBookmarkOpen(!bookmarkOpen)}
                >
                  <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} /> Save
                </Button>

                {/* Bookmark Folder Popover */}
                {bookmarkOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-30" 
                      onClick={() => setBookmarkOpen(false)} 
                    />
                    <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-[hsl(220,16%,90%)] z-40 overflow-hidden">
                      <div className="p-3 border-b border-[hsl(220,16%,90%)]">
                        <div className="flex items-center gap-2 text-xs font-semibold text-[hsl(222,12%,45%)] uppercase tracking-wider">
                          <FolderOpen className="w-3.5 h-3.5" />
                          Save to folder
                        </div>
                      </div>
                      <div className="p-1.5 max-h-48 overflow-y-auto">
                        {bookmarkFolders.map((folder) => {
                          const folderSaved = savedFolders.includes(folder.id);
                          return (
                            <button
                              key={folder.id}
                              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                                folderSaved 
                                  ? 'bg-[hsl(221,91%,60%)]/5 text-[hsl(221,91%,60%)]' 
                                  : 'hover:bg-[hsl(220,20%,98%)] text-[hsl(222,22%,15%)]'
                              }`}
                              onClick={() => toggleSaveToFolder(folder.id)}
                            >
                              <span className="text-sm">{folder.icon}</span>
                              <span className="flex-1 text-left">{folder.name}</span>
                              <span className="text-xs text-[hsl(222,12%,45%)]">{folder.count}</span>
                              {folderSaved && <Check className="w-3.5 h-3.5 text-[hsl(221,91%,60%)]" />}
                            </button>
                          );
                        })}
                      </div>
                      <div className="p-1.5 border-t border-[hsl(220,16%,90%)]">
                        <button 
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[hsl(222,12%,45%)] hover:bg-[hsl(220,20%,98%)] hover:text-[hsl(221,91%,60%)] transition-colors"
                          onClick={() => {}}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Create new folder</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <Button variant="ghost" size="sm" className="text-slate-500 hover:text-blue-600 gap-2">
                <Check className="w-4 h-4" /> I was asked this
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`gap-2 ${shareCopied ? 'text-green-600' : 'text-slate-500 hover:text-blue-600'}`}
                onClick={handleShare}
              >
                {shareCopied ? (
                  <><Check className="w-4 h-4" /> URL copied to clipboard!</>
                ) : (
                  <><Share2 className="w-4 h-4" /> Share</>
                )}
              </Button>
              <div className="grow" />
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-red-500 gap-2">
                <Flag className="w-4 h-4" /> Flag
              </Button>
            </div>

            {/* Content Module B: AI Practice Banner */}
            {/* <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
              <div>
                <h3 className="text-lg font-semibold text-blue-600 mb-1">Practice this question with AI</h3>
                <p className="text-slate-600">Try our mock interview experience and get feedback instantly.</p>
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-md shadow-blue-500/20 whitespace-nowrap">
                Practice with AI
              </Button>
            </div> */}

            {/* Hints: Answer Frameworks Module */}
            <div className="rounded-xl border border-blue-200 bg-white shadow-sm overflow-hidden mb-12">
              <button
                onClick={handleToggleHints}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-blue-50/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Lightbulb className={`w-5 h-5 ${showHints ? 'text-amber-500' : 'text-blue-600'}`} />
                  </div>
                  <div>
                    <span className="block text-slate-800" style={{ fontWeight: 600, fontSize: '0.9375rem' }}>AI Hints</span>
                    <span className="block text-slate-500" style={{ fontSize: '0.8125rem' }}>AI-generated answer framework and key points for this question</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <span className="hidden sm:inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-700" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                    {showHints ? 'Hide' : 'Show'}
                  </span>
                  {showHints
                    ? <ChevronUp className="w-5 h-5 text-blue-500" />
                    : <ChevronDown className="w-5 h-5 text-blue-500" />
                  }
                </div>
              </button>

              <div
                style={{
                  maxHeight: showHints ? '1200px' : '0px',
                  opacity: showHints ? 1 : 0,
                  transition: 'max-height 0.45s ease, opacity 0.3s ease',
                  overflow: 'hidden',
                }}
              >
                <div className="px-5 pb-5 pt-1 border-t border-blue-100">
                  {hintsLoading ? (
                    <div className="flex items-center justify-center gap-3 py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                      <span className="text-slate-400 text-sm">Generating AI hints...</span>
                    </div>
                  ) : aiHints ? (
                    <>
                      {/* AI badge */}
                      <div className="flex items-center gap-2 mt-4 mb-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 text-white" style={{ fontSize: '0.6875rem', fontWeight: 600 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26z"/></svg>
                          AI Generated
                        </span>
                        <span className="text-slate-400" style={{ fontSize: '0.75rem' }}>Tailored analysis for this specific question</span>
                      </div>

                      {/* Suggested Approach */}
                      <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50/50 rounded-xl border border-blue-100 p-5 mb-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                          </span>
                          <h4 className="text-slate-800" style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Suggested Approach</h4>
                        </div>
                        <p className="text-slate-600 mb-3" style={{ fontSize: '0.8125rem', lineHeight: '1.7' }}>
                          {aiHints.suggested_approach}
                        </p>
                        {aiHints.pro_tip && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg" style={{ fontSize: '0.8125rem' }}>
                            <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
                            <span className="text-amber-800"><strong>Pro tip:</strong> {aiHints.pro_tip}</span>
                          </div>
                        )}
                      </div>

                      {/* Step-by-step framework */}
                      {aiHints.framework?.length > 0 && (
                        <div className="space-y-3">
                          {aiHints.framework.map((item, idx) => {
                            const colors = [
                              { bg: 'from-indigo-50', border: 'border-indigo-100', dot: 'bg-indigo-500' },
                              { bg: 'from-violet-50', border: 'border-violet-100', dot: 'bg-violet-500' },
                              { bg: 'from-pink-50', border: 'border-pink-100', dot: 'bg-pink-500' },
                              { bg: 'from-teal-50', border: 'border-teal-100', dot: 'bg-teal-500' },
                            ];
                            const c = colors[idx % colors.length];
                            return (
                              <div key={item.step} className={`bg-gradient-to-br ${c.bg} to-white p-4 rounded-xl border ${c.border}`}>
                                <div className="flex items-start gap-3">
                                  <span className={`w-7 h-7 rounded-full ${c.dot} text-white flex items-center justify-center shrink-0 mt-0.5`} style={{ fontSize: '0.75rem', fontWeight: 700 }}>{item.step}</span>
                                  <div>
                                    <h4 className="text-slate-800 mb-1" style={{ fontWeight: 700, fontSize: '0.875rem' }}>{item.title}</h4>
                                    <p className="text-slate-600" style={{ fontSize: '0.8125rem', lineHeight: '1.6' }}>{item.description}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Key talking points */}
                      {aiHints.key_points_to_mention?.length > 0 && (
                        <div className="mt-4 bg-slate-50 rounded-xl border border-slate-200 p-4">
                          <h4 className="text-slate-700 mb-3 flex items-center gap-2" style={{ fontWeight: 700, fontSize: '0.8125rem' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500"><path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/></svg>
                            Key Points to Mention
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {aiHints.key_points_to_mention.map((point, i) => (
                              <div key={i} className="flex items-start gap-2 px-3 py-2 bg-white rounded-lg border border-slate-100" style={{ fontSize: '0.8125rem' }}>
                                <Check className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                                <span className="text-slate-600">{point}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-slate-400 text-sm text-center py-6">No hints available for this question.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Community Answers Section */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">Community Answers</h2>
                <div className="relative">
                  <Select defaultValue="hot">
                    <SelectTrigger className="bg-white border border-slate-200 text-slate-700 text-sm font-medium h-9 px-4 rounded-lg cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hot">🔥 Hot</SelectItem>
                      <SelectItem value="newest">Newest</SelectItem>
                      <SelectItem value="top">Top Rated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Guidelines Card */}
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 mb-6 flex gap-3">
                <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-1">Community guidelines</h4>
                  <ul className="text-xs text-slate-500 space-y-1 list-disc pl-4">
                    <li>Stay on topic. Use this section for submitting solutions and providing feedback.</li>
                    <li>Be inclusive. Respect other opinions and lived experiences.</li>
                    <li>No spam or self-promotion. Links may be removed by moderators.</li>
                  </ul>
                </div>
              </div>

              {/* Composer */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 mb-8 shadow-sm">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <textarea 
                      placeholder="Add your own answer to this question..." 
                      className="w-full min-h-[100px] resize-y p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                    />
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer group select-none">
                          <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer" />
                          <span className="text-xs font-medium text-slate-600 group-hover:text-slate-800">Post anonymously</span>
                        </label>
                        <span className="hidden sm:block w-px h-3 bg-slate-200" />
                        <span className="hidden sm:block text-xs text-slate-400">Markdown supported</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="text-slate-500">Cancel</Button>
                        <Button disabled size="sm" className="bg-blue-600 text-white opacity-50 cursor-not-allowed">Post answer</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* No answers empty state */}
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <MessageSquare className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-slate-500 font-medium mb-1">No answers yet</p>
                <p className="text-sm text-slate-400">Be the first to share your answer to this question.</p>
              </div>

              {/* Answer card template — rendered for each answer once answers API is connected.
                  Each card includes the live AnswerReplySection below. Example shape:
                  answers.map(answer => (
                    <div key={answer.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                      ...answer content...
                      <AnswerReplySection answerId={answer.id} />
                    </div>
                  ))
              */}

            </section>
          </div>

          {/* Right Sidebar */}
          <div className="lg:w-[340px] shrink-0 space-y-6">
            <div className="sticky top-24 space-y-6">
              
              {/* Interview Details */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="font-semibold text-slate-900 mb-4">Interview Details</h3>
                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-2">Role</span>
                    <div className="flex flex-wrap gap-2">
                      {questionData?.role ? (
                        <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                          {questionData.role.replace(/_/g, ' ')}
                        </span>
                      ) : <span className="text-xs text-slate-400">—</span>}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-2">Company</span>
                    <div className="flex flex-wrap gap-2">
                      {questionData?.company ? (
                        <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                          {questionData.company}
                        </span>
                      ) : <span className="text-xs text-slate-400">—</span>}
                    </div>
                  </div>
                  {questionData?.level && (
                    <div>
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-2">Level</span>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                          {questionData.level}
                        </span>
                      </div>
                    </div>
                  )}
                  {questionData?.category && (
                    <div>
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-2">Category</span>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                          {questionData.category.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Related Courses */}
              
              

              {/* Related Questions */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="font-semibold text-slate-900 mb-4">Related Questions</h3>
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <MessageSquare className="w-5 h-5 text-slate-300 mb-2" />
                  <p className="text-sm text-slate-400">No related questions</p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>
      
      <Footer />
    </div>
  );
}