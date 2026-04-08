import { useState, useEffect } from 'react';
import { Navbar } from '../../../components/newDesign/home/navbar';
import { Footer } from '../../../components/newDesign/home/footer';
import { Button } from '../../../components/newDesign/ui/button';
import {
  ArrowLeft,
  Bookmark,
  Check,
  Share2,
  Flag,
  Info,
  Lock,
  LogIn,
  Sparkles,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import { Link, useParams } from 'react-router';
import { getQuestion } from '../../../services/QuestionBankService';
import { CompanyLogo } from '../../../components/newDesign/ui/company-logo';

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

export function QuestionUnknownPage() {
  const { id } = useParams<{ id: string }>();
  const [questionData, setQuestionData] = useState<QuestionData | null>(null);
  const [questionLoading, setQuestionLoading] = useState(false);

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
                  <h1 className="text-3xl font-semibold text-slate-900 leading-tight mb-3">
                    {questionData?.question ?? 'Question not found'}
                  </h1>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    {questionData?.company && (
                      <>
                        <CompanyLogo company={questionData.company} size="sm" className="w-5 h-5" />
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

            {/* Content Module A: Video Answer Upsell */}
            

            {/* Action Row - Auth Gated */}
            <div className="flex items-center gap-2 mb-8">
              <a href="/auth">
                <Button variant="ghost" size="sm" className="text-slate-400 gap-2 cursor-pointer p-[0px]">
                  
                  <Bookmark className="w-4 h-4" /> Save
                </Button>
              </a>
              <a href="/auth">
                <Button variant="ghost" size="sm" className="text-slate-400 gap-2 cursor-pointer">
                  <Lock className="w-3.5 h-3.5" />
                  <Check className="w-4 h-4" /> I was asked this
                </Button>
              </a>
              <Button variant="ghost" size="sm" className="text-slate-500 hover:text-blue-600 gap-2">
                <Share2 className="w-4 h-4" /> Share
              </Button>
              <div className="grow" />
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-red-500 gap-2">
                <Flag className="w-4 h-4" /> Flag
              </Button>
            </div>

            {/* Content Module B: AI Practice Banner */}
            {/* <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 mb-12">
              <div>
                <h3 className="text-lg font-semibold text-blue-600 mb-1">Practice this question with AI</h3>
                <p className="text-slate-600">Try our mock interview experience and get feedback instantly.</p>
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-md shadow-blue-500/20 whitespace-nowrap">
                Practice with AI
              </Button>
            </div> */}

            {/* Community Answers Section */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-slate-900">Community Answers</h2>
                </div>
                <div className="relative">
                  <select className="appearance-none bg-white border border-slate-200 text-slate-700 text-sm font-medium py-2 pl-4 pr-10 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                    <option>Hot</option>
                    <option>Newest</option>
                    <option>Top Rated</option>
                  </select>
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

              {/* Auth-Gated Composer */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8 shadow-sm relative overflow-hidden">
                <div className="flex flex-col items-center text-center py-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-4">
                    <Lock className="w-5 h-5 text-slate-400" />
                  </div>
                  <h3 className="font-semibold text-slate-900 text-lg mb-1">Join the discussion</h3>
                  <p className="text-sm text-slate-500 mb-5 max-w-sm">
                    Sign up or log in to share your answer and engage with the community.
                  </p>
                  <div className="flex items-center gap-3">
                    <a href="/auth">
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 shadow-sm shadow-blue-200">
                        <Sparkles className="w-4 h-4 mr-2" />
                        Sign Up Free
                      </Button>
                    </a>
                    <a href="/auth?login=true">
                      <Button variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg px-6">
                        <LogIn className="w-4 h-4 mr-2" />
                        Log In
                      </Button>
                    </a>
                  </div>
                </div>
              </div>

              {/* No answers empty state */}
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <MessageSquare className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-slate-500 font-medium mb-1">No answers yet</p>
                <p className="text-sm text-slate-400">Sign up to be the first to share your answer.</p>
              </div>

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
                </div>
              </div>

              {/* Login Prompt Sidebar Card */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-5 shadow-sm text-white relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <Lock className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-wide">Members Only</span>
                  </div>
                  <h4 className="font-semibold text-white mb-1">Get full access</h4>
                  <p className="text-sm text-white/70 mb-4 leading-relaxed">
                    Unlock all answers, bookmarks, and AI practice tools.
                  </p>
                  <a href="/auth">
                    <Button className="w-full bg-white text-slate-900 hover:bg-white/90 font-medium rounded-lg shadow-sm">
                      Create Free Account
                    </Button>
                  </a>
                </div>
              </div>

              {/* Related Articles */}
              

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
