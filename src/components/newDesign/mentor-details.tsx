import { useState } from 'react';
import { Link } from 'react-router';
import { 
  ArrowLeft, Star, Clock, Calendar, CheckCircle2, ChevronDown, 
  MessageSquare, Briefcase, Award, Video, ShieldCheck
} from 'lucide-react';
import { DashboardLayout } from './dashboard-layout';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/newDesign/ui/accordion';

// ─── Dummy Data ─────────────────────────────────────────────────────────────

const MENTOR = {
  name: 'Priya Mehta',
  role: 'Senior Product Manager',
  company: 'Google',
  avatar: 'https://images.unsplash.com/photo-1689600944138-da3b150d9cb8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
  bio: 'I help candidates crack PM roles at top-tier tech companies. With 8+ years of experience across Google, Uber, and early-stage startups, I specialize in product sense, execution, and behavioral interviews.',
  tags: ['PM Interviews', 'Product Strategy', 'FAANG Prep', 'Career Transition'],
  experience: [
    { role: 'Senior Product Manager', company: 'Google', years: '2021 - Present' },
    { role: 'Product Manager', company: 'Uber', years: '2018 - 2021' },
  ],
  rating: 4.9,
  reviewsCount: 127,
};

const COACHING_PLANS = [
  {
    id: 'mock-interview',
    name: 'Mock Interview (Product Sense)',
    description: 'A realistic 45-minute mock interview focusing on product sense or execution, followed by 15 minutes of detailed, actionable feedback.',
    duration: '60 min',
    price: 120,
    icon: Video,
  },
  {
    id: 'resume-review',
    name: 'Resume & LinkedIn Review',
    description: 'Async or live teardown of your resume and LinkedIn profile. I will help you rewrite bullets to highlight impact and pass ATS screens.',
    duration: '45 min',
    price: 90,
    icon: FileTextIcon,
  },
  {
    id: 'career-planning',
    name: 'Career Strategy Session',
    description: 'Feeling stuck? We will map out your 1-3 year career goals, identify skill gaps, and create a concrete plan to get you promoted or transitioned.',
    duration: '45 min',
    price: 100,
    icon: TargetIcon,
  },
  {
    id: 'salary-negotiation',
    name: 'Offer & Salary Negotiation',
    description: 'Received an offer? Let\'s build a negotiation strategy. I\'ll share compensation bands and scripts to help you maximize your total compensation.',
    duration: '30 min',
    price: 80,
    icon: Briefcase,
  },
];

const REVIEWS = [
  {
    id: 1,
    initials: 'SK',
    name: 'Sarah K.',
    rating: 5,
    date: 'Oct 12, 2025',
    traits: ['Insightful', 'Actionable'],
    comment: 'Priya immediately identified that I was rambling in my execution answers. Her framework for structuring metrics completely changed how I approach these questions. Highly recommend!',
  },
  {
    id: 2,
    initials: 'JL',
    name: 'James L.',
    rating: 5,
    date: 'Sep 28, 2025',
    traits: ['Direct', 'Well-prepared'],
    comment: 'She read my resume beforehand and tailored the mock interview to my specific background. The feedback was direct, honest, and exactly what I needed to hear before my onsite.',
  },
  {
    id: 3,
    initials: 'MR',
    name: 'Michael R.',
    rating: 4,
    date: 'Sep 15, 2025',
    traits: ['Encouraging'],
    comment: 'Great session on career transition. Priya gave me a realistic view of what hiring managers look for in non-traditional PM candidates.',
  },
];

const RATING_BREAKDOWN = {
  overall: 4.9,
  Communication: 5.0,
  Expertise: 4.9,
  Helpfulness: 4.8,
  Preparation: 5.0,
};

const FAQS = [
  {
    q: 'How do I book a session?',
    a: 'Choose a coaching plan above, select an available time slot that works for you, and complete the booking process. You will receive a calendar invite with a video link immediately.',
  },
  {
    q: 'What happens after I book?',
    a: 'You will be prompted to share your resume, target roles, and any specific areas you want to focus on. Your mentor will review these materials before the session begins.',
  },
  {
    q: 'Can I cancel or reschedule?',
    a: 'Yes, you can reschedule or cancel up to 24 hours before your session for a full refund or credit.',
  },
  {
    q: 'Will my session be recorded?',
    a: 'By default, sessions are not recorded for privacy. However, you can request a recording at the start of the call, or use Screna’s AI note-taker if the mentor permits.',
  },
  {
    q: 'How does payment work?',
    a: 'Payments are processed securely via Stripe when you confirm your booking. The mentor receives the full amount, as Screna does not take a commission.',
  },
  {
    q: 'What if my mentor doesn’t show up?',
    a: 'In the rare event a mentor misses a session, you will automatically receive a full refund and a priority booking token for another time.',
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

// Stub icons for ones not imported from lucide-react directly above
function FileTextIcon(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>;
}
function TargetIcon(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className={`w-4 h-4 ${
            i <= Math.floor(rating)
              ? 'text-amber-400'
              : i - 0.5 <= rating
              ? 'text-amber-400' // half star simplified for brevity
              : 'text-slate-200'
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function Progress({ value }: { value: number }) {
  return (
    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
      <div 
        className="h-full bg-amber-400 rounded-full" 
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export function MentorDetailsPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  return (
    <DashboardLayout headerTitle="Mentor Profile" noSidebar>
      <div className="w-full max-w-5xl mx-auto space-y-16 pb-24 pt-28">
        
        {/* Top Actions */}
        <div className="flex items-center justify-between mb-8">
          <Link 
            to="/marketplace" 
            className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Mentorship
          </Link>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
            <Calendar className="w-3.5 h-3.5" />
            View My Sessions
          </button>
        </div>

        {/* 1. Basic Information Section */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 mb-8 flex flex-col md:flex-row gap-8 items-start">
          <div className="shrink-0 flex flex-col items-center">
            <img 
              src={MENTOR.avatar} 
              alt={MENTOR.name} 
              className="w-32 h-32 rounded-2xl object-cover ring-1 ring-slate-100 shadow-sm mb-4"
            />
            <div className="flex items-center gap-1.5">
              <StarRating rating={MENTOR.rating} />
              <span className="font-semibold text-slate-800 text-sm ml-1">{MENTOR.rating}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">{MENTOR.reviewsCount} reviews</p>
          </div>

          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{MENTOR.name}</h1>
            <div className="flex items-center gap-2 mt-2 text-sm text-slate-600">
              <Briefcase className="w-4 h-4 text-slate-400" />
              <span>{MENTOR.role}</span>
              <span className="text-slate-300">&bull;</span>
              <span className="font-medium text-slate-800">{MENTOR.company}</span>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              {MENTOR.tags.map(tag => (
                <span key={tag} className="px-2.5 py-1 rounded-md bg-blue-50/50 border border-blue-100 text-blue-700 text-xs font-medium">
                  {tag}
                </span>
              ))}
            </div>

            <p className="mt-5 text-sm text-slate-600 leading-relaxed max-w-2xl">
              {MENTOR.bio}
            </p>

            <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Experience</p>
                <div className="space-y-3">
                  {MENTOR.experience.map((exp, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                        <Award className="w-4 h-4 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-900">{exp.role}</p>
                        <p className="text-xs text-slate-500">{exp.company} &middot; {exp.years}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Verification</p>
                <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg w-fit border border-emerald-100">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium">Identity & Experience Verified</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-8">
            {/* 2. Coaching Plans Section */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-5">Coaching Plans</h2>
              <div className="flex flex-col gap-4">
                {COACHING_PLANS.map(plan => {
                  const isSelected = selectedPlan === plan.id;
                  const Icon = plan.icon;
                  return (
                    <div 
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`relative bg-white rounded-xl border p-5 cursor-pointer transition-all duration-200 hover:shadow-md ${
                        isSelected 
                          ? 'border-[hsl(221,91%,60%)] shadow-[0_0_0_1px_hsl(221,91%,60%)]' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-4 items-start">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            isSelected ? 'bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,60%)]' : 'bg-slate-100 text-slate-500'
                          }`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-base font-semibold text-slate-900">{plan.name}</h3>
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 font-medium">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {plan.duration}
                              </span>
                              <span className="text-slate-300">&bull;</span>
                              <span className="flex items-center gap-1">
                                <Video className="w-3.5 h-3.5" />
                                1:1 Video Call
                              </span>
                            </div>
                            <p className="mt-3 text-sm text-slate-600 leading-relaxed pr-4">
                              {plan.description}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 flex flex-col items-end">
                          <p className="text-2xl font-bold text-slate-900">${plan.price}</p>
                          <button 
                            className={`mt-4 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                              isSelected
                                ? 'bg-[hsl(221,91%,60%)] text-white shadow-md shadow-blue-500/20'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            Book this Plan
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 3. Rating & Reviews Section */}
            <section className="pt-4">
              <h2 className="text-xl font-bold text-slate-900 mb-5">Ratings & Reviews</h2>
              
              <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
                <div className="flex flex-col md:flex-row gap-8 items-center">
                  <div className="text-center md:w-1/3 shrink-0">
                    <p className="text-5xl font-bold text-slate-900 tracking-tighter">{RATING_BREAKDOWN.overall}</p>
                    <div className="flex justify-center my-2">
                      <StarRating rating={RATING_BREAKDOWN.overall} />
                    </div>
                    <p className="text-xs text-slate-500 font-medium">Based on {MENTOR.reviewsCount} reviews</p>
                  </div>
                  
                  <div className="flex-1 w-full space-y-3 pl-0 md:pl-8 md:border-l border-slate-100">
                    {[
                      { label: 'Communication', val: RATING_BREAKDOWN.Communication },
                      { label: 'Expertise', val: RATING_BREAKDOWN.Expertise },
                      { label: 'Helpfulness', val: RATING_BREAKDOWN.Helpfulness },
                      { label: 'Preparation', val: RATING_BREAKDOWN.Preparation },
                    ].map(item => (
                      <div key={item.label} className="flex items-center text-sm">
                        <span className="w-32 text-slate-600">{item.label}</span>
                        <div className="flex-1 mx-3">
                          <Progress value={(item.val / 5) * 100} />
                        </div>
                        <span className="w-8 text-right font-medium text-slate-700">{item.val.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {REVIEWS.map(review => (
                  <div key={review.id} className="bg-white border border-slate-100 rounded-xl p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex gap-3 items-center">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-600 border border-slate-200 shrink-0">
                          {review.initials}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{review.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <StarRating rating={review.rating} />
                            <span className="text-xs text-slate-400">{review.date}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mb-3">
                      {review.traits.map(trait => (
                        <span key={trait} className="px-2 py-0.5 bg-slate-50 text-slate-600 text-[11px] font-medium rounded-md border border-slate-100">
                          {trait}
                        </span>
                      ))}
                    </div>
                    
                    <p className="text-sm text-slate-700 leading-relaxed">
                      "{review.comment}"
                    </p>
                  </div>
                ))}
              </div>
              <button className="mt-4 w-full py-3 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                Show more reviews
              </button>
            </section>
            
            {/* 5. FAQ Section */}
            <section className="pt-4">
              <h2 className="text-xl font-bold text-slate-900 mb-5">Frequently Asked Questions</h2>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <Accordion type="single" collapsible className="w-full">
                  {FAQS.map((faq, idx) => (
                    <AccordionItem key={idx} value={`item-${idx}`} className="px-5 border-slate-100 last:border-0">
                      <AccordionTrigger className="text-sm font-medium text-slate-800 hover:text-blue-600 py-4 hover:no-underline">
                        {faq.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-slate-600 pb-4 leading-relaxed">
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </section>
          </div>

          {/* Right Sidebar: 4. Available Time Slots Section */}
          <div className="lg:col-span-1 relative">
            <div className="sticky top-[calc(var(--top-bar-h)+5rem)]">
              <div className="bg-white rounded-xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="text-base font-semibold text-slate-900">Available Time Slots</h3>
                  <p className="text-xs text-slate-500 mt-1">Times are shown in your local timezone.</p>
                </div>
                
                <div className="p-5">
                  {/* Pseudo Calendly Widget styling */}
                  <div className="flex justify-between items-center mb-4">
                    <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                    </button>
                    <span className="text-sm font-semibold text-slate-800">October 2025</span>
                    <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {['S','M','T','W','T','F','S'].map((d,i) => (
                      <div key={i} className="text-[10px] font-semibold text-slate-400 py-1">{d}</div>
                    ))}
                    
                    {/* Dummy calendar days */}
                    {Array.from({length: 31}).map((_, i) => {
                      const day = i + 1;
                      const isAvailable = [14, 15, 17, 21, 22, 28].includes(day);
                      return (
                        <div 
                          key={day} 
                          className={`aspect-square flex items-center justify-center text-sm rounded-full mx-auto w-8 ${
                            isAvailable 
                              ? 'bg-blue-50 text-blue-700 font-semibold cursor-pointer hover:bg-blue-600 hover:text-white transition-colors' 
                              : 'text-slate-300'
                          }`}
                        >
                          {day}
                        </div>
                      )
                    })}
                  </div>

                  <div className="mt-6 pt-5 border-t border-slate-100">
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 text-center">
                      {selectedPlan ? (
                        <div className="space-y-3">
                          <p className="text-sm text-slate-700 font-medium">
                            Ready to schedule your <span className="font-bold">{COACHING_PLANS.find(p=>p.id===selectedPlan)?.name}</span>?
                          </p>
                          <button className="w-full py-2.5 bg-[hsl(221,91%,60%)] text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors shadow-md shadow-blue-500/20">
                            Continue to Booking
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center mx-auto mb-3">
                            <TargetIcon className="w-5 h-5 text-slate-400" />
                          </div>
                          <p className="text-sm text-slate-600 font-medium">Choose a coaching plan first to continue with booking.</p>
                        </>
                      )}
                    </div>
                  </div>
                  
                </div>
              </div>
              
              <div className="mt-4 flex items-start gap-3 p-4 rounded-xl bg-[hsl(221,91%,60%)]/5 border border-[hsl(221,91%,60%)]/10 text-sm text-[hsl(221,91%,60%)]">
                <ShieldCheck className="w-5 h-5 shrink-0" />
                <p className="leading-snug">
                  <span className="font-semibold block mb-0.5">Screna Guarantee</span>
                  If you're not satisfied with your session, we'll refund your credit or match you with another mentor.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
