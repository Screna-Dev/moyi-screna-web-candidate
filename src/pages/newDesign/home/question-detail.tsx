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
  Info
} from 'lucide-react';
import { Link } from 'react-router';

export default function QuestionDetailPage() {
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
                  How do you approach GenAI safety in consumer products?
                </h1>
                
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" className="rounded-full border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-600 gap-2">
                    <Bookmark className="w-4 h-4" />
                    <span className="text-xs font-medium bg-slate-100 px-1.5 py-0.5 rounded-full text-slate-600">13</span>
                  </Button>
                  <Button variant="ghost" size="icon" className="rounded-full text-slate-400 hover:text-slate-600">
                    <MoreHorizontal className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-500">
                <div className="w-5 h-5 rounded bg-black text-white flex items-center justify-center text-[10px] font-bold">O</div>
                <span className="font-medium text-slate-700">OpenAI</span>
                <span>•</span>
                <span>Asked 23 days ago</span>
              </div>
            </div>

            {/* Content Module A: Video Answer Upsell */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-4">
              <div className="flex flex-col md:flex-row">
                {/* Left: Video Preview */}
                <div className="md:w-1/2 bg-slate-900 relative group cursor-pointer">
                  <img 
                    src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1632&q=80" 
                    alt="Video preview" 
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-50 transition-opacity"
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

            {/* Action Row */}
            <div className="flex items-center gap-2 mb-8">
              <Button variant="ghost" size="sm" className="text-slate-500 hover:text-blue-600 gap-2">
                <Bookmark className="w-4 h-4" /> Save
              </Button>
              <Button variant="ghost" size="sm" className="text-slate-500 hover:text-blue-600 gap-2">
                <Check className="w-4 h-4" /> I was asked this
              </Button>
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
                <h2 className="text-xl font-bold text-slate-900">Community Answers</h2>
                <div className="relative">
                  <select className="appearance-none bg-white border border-slate-200 text-slate-700 text-sm font-medium py-2 pl-4 pr-10 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                    <option>🔥 Hot</option>
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

              {/* Realistic Answer Cards */}
              <div className="space-y-6">
                {/* Answer 1 */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-sky-100 flex items-center justify-center text-blue-600 font-semibold shrink-0">
                      SP
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-slate-900">Sai Sathwik P.</h4>
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">Member</span>
                        <span className="text-xs text-slate-400">• Last Monday at 8:07 PM</span>
                      </div>
                      
                      <div className="prose prose-sm text-slate-600 max-w-none mb-4">
                        <p className="mb-3">
                          When approaching safety in GenAI consumer products, I always start with the user trust framework. Safety isn't just a feature; it's the foundation of adoption.
                        </p>
                        <p className="mb-3 font-medium text-slate-800">My 3-step framework:</p>
                        <ol className="list-decimal pl-4 space-y-1 mb-3">
                          <li><strong>Pre-training filtering:</strong> Cleaning dataset to remove harmful biases.</li>
                          <li><strong>Model alignment (RLHF):</strong> Training the model to refuse unsafe prompts.</li>
                          <li><strong>Output moderation:</strong> Real-time scanning of generated content.</li>
                        </ol>
                        <p>
                          For example, in a product for children, false positives (blocking safe content) are acceptable tradeoffs to ensure zero harmful output...
                        </p>
                        <button className="text-blue-600 hover:underline font-medium text-sm">Read more</button>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-slate-500 border-t border-slate-100 pt-4">
                        <button className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                          <ThumbsUp className="w-4 h-4" /> 64
                        </button>
                        <button className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                          <MessageSquare className="w-4 h-4" /> 3
                        </button>
                        <button className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                          <Share2 className="w-4 h-4" /> Share
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Answer 2 */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-slate-900">Elena R.</h4>
                        <span className="text-xs text-slate-400">• 2 days ago</span>
                      </div>
                      
                      <div className="prose prose-sm text-slate-600 max-w-none mb-4">
                        <p className="mb-3">
                          I agree with Sai, but I'd also emphasize the importance of <strong>User Feedback Loops</strong>. Automated systems will always have edge cases.
                        </p>
                        <p>
                          We need clear "Report" flows that feed directly into the fine-tuning pipeline. At my last role, we implemented a "thumbs down" with categorization (e.g., "Not helpful", "Harmful", "Inaccurate") which improved our safety score by 15% in Q3.
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-slate-500 border-t border-slate-100 pt-4">
                        <button className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                          <ThumbsUp className="w-4 h-4" /> 28
                        </button>
                        <button className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                          <MessageSquare className="w-4 h-4" /> Reply
                        </button>
                      </div>
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
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">Product Manager</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-2">Companies</span>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">OpenAI</span>
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">Anthropic</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-2">Categories</span>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">Artificial Intelligence</span>
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">Product Strategy</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Related Courses */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="font-semibold text-slate-900 mb-4">Related Articles</h3>
                <div className="space-y-4">
                  <div className="group cursor-pointer">
                    <div className="aspect-video bg-slate-100 rounded-lg mb-3 overflow-hidden relative">
                      <img 
                        src="https://images.unsplash.com/photo-1555212697-194d092e3b8f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYXJlZXIlMjBhZHZpY2UlMjB3cml0aW5nJTIwb2ZmaWNlJTIwZGVza3xlbnwxfHx8fDE3NzE0NTA3NjZ8MA&ixlib=rb-4.1.0&q=80&w=1080" 
                        alt="Article thumbnail" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors duration-300" />
                    </div>
                    <h4 className="font-medium text-sm text-slate-900 group-hover:text-blue-600 transition-colors leading-snug mb-1.5">
                      How to Ace the Product Management Interview: A Comprehensive Guide
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                      <span>5 min read</span>
                      <span className="text-slate-300">•</span>
                      <span>By Sarah Jenkins</span>
                    </div>
                  </div>
                  
                  <div className="group cursor-pointer pt-4 border-t border-slate-100">
                    <h4 className="font-medium text-sm text-slate-900 group-hover:text-blue-600 transition-colors leading-snug mb-1.5">
                      The Ultimate Guide to Product Strategy Frameworks
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                      <span>8 min read</span>
                      <span className="text-slate-300">•</span>
                      <span>By Michael Chen</span>
                    </div>
                  </div>

                  <div className="group cursor-pointer pt-4 border-t border-slate-100">
                    <h4 className="font-medium text-sm text-slate-900 group-hover:text-blue-600 transition-colors leading-snug mb-1.5">
                      Top 10 Behavioral Questions and How to Answer Them
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                      <span>6 min read</span>
                      <span className="text-slate-300">•</span>
                      <span>By Eleanor Rigby</span>
                    </div>
                  </div>
                </div>
              </div>
              

              {/* Related Questions */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="font-semibold text-slate-900 mb-4">Related Questions</h3>
                <div className="space-y-4">
                  {[
                    'How do you collect insights and apply them to products?',
                    'How would you approach product planning?',
                    'How do you launch a product?',
                    'How do you create a product roadmap?',
                    'How do you approach problems you’ve never seen before?'
                  ].map((q, i) => (
                    <div key={i} className="group cursor-pointer border-b border-slate-50 last:border-0 pb-3 last:pb-0">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
                         <div className="w-3 h-3 rounded-full bg-slate-200 flex items-center justify-center text-[6px] font-bold text-slate-500">G</div>
                         Asked at Google • 2 months ago
                      </div>
                      <h4 className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors leading-snug">
                        {q}
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