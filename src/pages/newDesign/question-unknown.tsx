import { Navbar } from '@/components/newDesign/home/navbar';
import { Footer } from '@/components/newDesign/home/footer';
import { Button } from '@/components/newDesign/ui/button';
import {
  ArrowLeft,
  Bookmark,
  MoreHorizontal,
  Play,
  Check,
  ThumbsUp,
  MessageSquare,
  Share2,
  Flag,
  User,
  Info,
  Lock,
  LogIn,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router';

export function QuestionUnknownPage() {
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
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-3xl font-semibold text-slate-900 leading-tight mb-3">
                  Design a notification system that scales to 100M+ users
                </h1>

                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" className="rounded-full border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-600 gap-2">
                    <Bookmark className="w-4 h-4" />
                    <span className="text-xs font-medium bg-slate-100 px-1.5 py-0.5 rounded-full text-slate-600">37</span>
                  </Button>
                  <Button variant="ghost" size="icon" className="rounded-full text-slate-400 hover:text-slate-600">
                    <MoreHorizontal className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-500">
                <div className="w-5 h-5 rounded bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">M</div>
                <span className="font-medium text-slate-700">Meta</span>
                <span>•</span>
                <span>Asked 5 days ago</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-400"><Eye className="w-3.5 h-3.5" /> 2.4k views</span>
              </div>
            </div>

            {/* Content Module A: Video Answer Upsell */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-4">
              <div className="flex flex-col md:flex-row">
                {/* Left: Video Preview */}
                <div className="md:w-1/2 bg-slate-900 relative group cursor-pointer min-h-[240px]">
                  <img
                    src="https://images.unsplash.com/photo-1762968286778-60e65336d5ca?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWNobm9sb2d5JTIwY29uZmVyZW5jZSUyMHNwZWFrZXIlMjBwcmVzZW50YXRpb258ZW58MXx8fHwxNzcxODU5NTM0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                    alt="Video preview"
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-50 transition-opacity absolute inset-0"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 fill-white" />
                    </div>
                    <h3 className="font-semibold text-lg mb-1">Upgrade to see our video answer</h3>
                    <p className="text-sm text-white/80">See how a real interviewer answers this question</p>
                  </div>
                </div>

                {/* Right: Membership Benefits */}
                <div className="md:w-1/2 p-6 md:p-8 flex flex-col justify-center bg-white">
                  <h3 className="text-xl font-semibold mb-6">Become a member today</h3>
                  <ul className="space-y-3 mb-8">
                    {[
                      '100+ expert answer videos',
                      'Access to all courses',
                      'Peer-to-peer practice',
                      'Private Slack community',
                      'Full question database'
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm text-slate-600">
                        <div className="w-5 h-5 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3" />
                        </div>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-6 rounded-lg shadow-sm shadow-blue-200">
                    Upgrade now
                  </Button>
                </div>
              </div>
            </div>

            {/* Action Row - Auth Gated */}
            <div className="flex items-center gap-2 mb-8">
              <a href="/auth">
                <Button variant="ghost" size="sm" className="text-slate-400 gap-2 cursor-pointer">
                  <Lock className="w-3.5 h-3.5" />
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
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 mb-12">
              <div>
                <h3 className="text-lg font-semibold text-blue-600 mb-1">Practice this question with AI</h3>
                <p className="text-slate-600">Try our mock interview experience and get feedback instantly.</p>
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-md shadow-blue-500/20 whitespace-nowrap">
                Practice with AI
              </Button>
            </div>

            {/* Community Answers Section */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-slate-900">Community Answers</h2>
                  <span className="text-sm text-slate-400 font-medium">24 answers</span>
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

              {/* Visible Answer 1 */}
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-sky-100 flex items-center justify-center text-blue-600 font-semibold shrink-0">
                      SP
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-slate-900">Sai Sathwik P.</h4>
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">Member</span>
                        <span className="text-xs text-slate-400">• 3 days ago</span>
                      </div>

                      <div className="prose prose-sm text-slate-600 max-w-none mb-4">
                        <p className="mb-3">
                          For a notification system at Meta's scale (100M+ users), I'd break the design into five key layers:
                        </p>
                        <p className="mb-3 font-medium text-slate-800">Core Architecture:</p>
                        <ol className="list-decimal pl-4 space-y-1 mb-3">
                          <li><strong>Event Ingestion:</strong> Use Kafka-based event streaming to capture triggers from upstream services (likes, comments, friend requests).</li>
                          <li><strong>Routing & Fan-out:</strong> Implement a notification router that decides channel (push, in-app, email, SMS) based on user preferences and priority.</li>
                          <li><strong>Deduplication & Rate Limiting:</strong> Apply per-user rate limits (e.g., max 5 push/hour) and de-dupe identical events within a time window.</li>
                        </ol>
                        <p>
                          The key tradeoff is between latency and batching. For social interactions, users expect near real-time delivery (&lt;2s), while digest emails can be batched hourly...
                        </p>
                        <button className="text-blue-600 hover:underline font-medium text-sm">Read more</button>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-slate-500 border-t border-slate-100 pt-4">
                        <button className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                          <ThumbsUp className="w-4 h-4" /> 89
                        </button>
                        <button className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                          <MessageSquare className="w-4 h-4" /> 7
                        </button>
                        <button className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                          <Share2 className="w-4 h-4" /> Share
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Partially Visible Answer 2 (fading out) */}
                <div className="relative">
                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-slate-900">Priya M.</h4>
                          <span className="text-xs text-slate-400">• 2 days ago</span>
                        </div>

                        <div className="prose prose-sm text-slate-600 max-w-none">
                          <p className="mb-3">
                            Great answer by Sai. I'd add that the <strong>priority classification</strong> layer is crucial. Not all notifications are equal — a security alert should bypass all rate limits,
                            while a "someone liked your post" can be batched.
                          </p>
                          <p>
                            At my previous company we used a tiered priority system: P0 (security, payments) → immediate delivery with retry guarantee; P1 (social interactions) → real-time best-effort;
                            P2 (marketing, recommendations) → batched and throttled. This reduced our push notification opt-out rate by...
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Fade overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#F7F8FA] rounded-xl pointer-events-none" style={{ top: '40%' }} />
                </div>

                {/* Blurred Ghost Answer 3 */}
                <div className="relative select-none" aria-hidden="true">
                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm blur-[6px] opacity-60">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold shrink-0">
                        JL
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-slate-900">Jason L.</h4>
                          <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">Top Contributor</span>
                          <span className="text-xs text-slate-400">• 1 day ago</span>
                        </div>
                        <div className="prose prose-sm text-slate-600 max-w-none">
                          <p className="mb-3">
                            I would approach this differently. The notification delivery subsystem needs to account for device state awareness.
                            Using a presence service combined with WebSocket connections gives us real-time delivery...
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500 border-t border-slate-100 pt-4">
                          <span className="flex items-center gap-1.5"><ThumbsUp className="w-4 h-4" /> 52</span>
                          <span className="flex items-center gap-1.5"><MessageSquare className="w-4 h-4" /> 4</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Blurred Ghost Answer 4 */}
                <div className="relative select-none" aria-hidden="true">
                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm blur-[6px] opacity-40">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-semibold shrink-0">
                        AR
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-slate-900">Anika R.</h4>
                          <span className="text-xs text-slate-400">• 12 hours ago</span>
                        </div>
                        <div className="prose prose-sm text-slate-600 max-w-none">
                          <p>
                            One aspect often overlooked is notification analytics and A/B testing infrastructure.
                            You need to measure open rates, click-through, and dismissal patterns...
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sign Up to See All Answers CTA */}
                <div className="relative -mt-8 pt-2">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-8 text-center relative overflow-hidden">
                    {/* Decorative background */}
                    <div className="absolute -right-8 -top-8 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl" />
                    <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl" />

                    <div className="relative z-10">
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-4">
                        <EyeOff className="w-6 h-6 text-blue-600" />
                      </div>
                      <h3 className="text-xl font-semibold text-slate-900 mb-2">
                        Sign up to see all 24 answers
                      </h3>
                      <p className="text-sm text-slate-500 max-w-md mx-auto mb-6 leading-relaxed">
                        Create a free account to read every community answer, upvote, comment, and share your own solutions with thousands of peers.
                      </p>

                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <a href="/auth">
                          <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-8 py-2.5 shadow-sm shadow-blue-200 gap-2">
                            <Sparkles className="w-4 h-4" />
                            Sign Up Free
                          </Button>
                        </a>
                        <a href="/auth?login=true">
                          <Button variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg px-8 py-2.5 gap-2">
                            <LogIn className="w-4 h-4" />
                            Log In
                          </Button>
                        </a>
                      </div>

                      <p className="text-xs text-slate-400 mt-4">
                        Free forever • No credit card required
                      </p>
                    </div>
                  </div>
                </div>
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
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-2">Roles</span>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">Software Engineer</span>
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">Backend Engineer</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-2">Companies</span>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">Meta</span>
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">Google</span>
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">Amazon</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-2">Categories</span>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">System Design</span>
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">Distributed Systems</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-2">Difficulty</span>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">Hard</span>
                    </div>
                  </div>
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
                <div className="space-y-4">
                  {[
                    { q: 'Design a rate limiter for a distributed API gateway', company: 'Google', time: '1 week ago' },
                    { q: 'How would you design a real-time chat system?', company: 'Meta', time: '2 weeks ago' },
                    { q: 'Design a URL shortening service like bit.ly', company: 'Amazon', time: '3 weeks ago' },
                    { q: 'How would you design a news feed ranking algorithm?', company: 'Meta', time: '1 month ago' },
                    { q: 'Design a distributed cache with consistency guarantees', company: 'Netflix', time: '1 month ago' },
                  ].map((item, i) => (
                    <div key={i} className="group cursor-pointer border-b border-slate-50 last:border-0 pb-3 last:pb-0">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
                        <div className="w-3 h-3 rounded-full bg-slate-200 flex items-center justify-center text-[6px] font-bold text-slate-500">
                          {item.company[0]}
                        </div>
                        Asked at {item.company} • {item.time}
                      </div>
                      <h4 className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors leading-snug">
                        {item.q}
                      </h4>
                    </div>
                  ))}
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
