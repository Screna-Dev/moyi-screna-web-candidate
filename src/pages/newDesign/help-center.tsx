import { useState } from 'react';
import { Search, ChevronDown, BookOpen, Mic, UserCircle, Mail, ArrowRight, ShieldCheck, Layers } from 'lucide-react';
import { Navbar } from '../../components/newDesign/home/navbar';
import { Footer } from '../../components/newDesign/home/footer';

const CATEGORIES = [
  { id: 'all', label: 'All Topics', icon: BookOpen },
  { id: 'account-onboarding', label: 'Account & Onboarding', icon: UserCircle },
  { id: 'core-features', label: 'Core Features & Practice', icon: Layers },
  { id: 'privacy-security', label: 'Privacy & Security', icon: ShieldCheck },
];

const FAQ_ITEMS = [
  {
    id: '1',
    category: 'account-onboarding',
    question: 'Is Screna.ai free? How do I get started?',
    answer:
      'For individual users, Screna.ai\'s core practice features are free forever. Simply click "Try Screna Free" on the homepage and sign up with your email. No credit card is required to start your first AI mock interview immediately.',
  },
  {
    id: '2',
    category: 'account-onboarding',
    question: 'How do I set my target role and background?',
    answer:
      'After logging in, when building your "Personalized Mock," you can enter your target role, paste a specific job description (JD), or upload your resume directly. Screna combines this information with real community interview insights to generate the most relevant practice questions for you.',
  },
  {
    id: '3',
    category: 'account-onboarding',
    question: 'Can I update my resume and goals if my job search direction changes?',
    answer:
      'Absolutely. Before starting a new mock interview, you can always replace the pasted JD or upload your latest resume. Screna\'s AI will dynamically adjust the interview focus based on your latest inputs.',
  },
  {
    id: '4',
    category: 'account-onboarding',
    question: 'Can I delete my account?',
    answer:
      'Yes. We respect your data rights. In your account settings, you can permanently delete your account, along with all associated practice data and resume information, in just one click—no waiting period.',
  },
  {
    id: '5',
    category: 'core-features',
    question: 'How does the Screna.ai mock interview process work?',
    answer:
      'The process consists of three simple steps:\n\nExplore: Browse real interview experiences (Interview Insights) relevant to your target role within the community.\n\nBuild: Generate a personalized mock interview based on your resume/JD and real community questions.\n\nPractice & Improve: Conduct the mock interview via voice or video, receive coach-style feedback, and retry your weak points.',
  },
  {
    id: '6',
    category: 'core-features',
    question: 'Does the AI interviewer support voice and video practice?',
    answer:
      'Yes. Depending on your practice needs, you can choose Voice or Video mode before starting the mock session. This helps you practice not only your verbal communication but also your body language and eye contact.',
  },
  {
    id: '7',
    category: 'core-features',
    question: 'What exactly does the Coach-style Evaluation include?',
    answer:
      'Our AI does more than just give a score. It provides comprehensive, coach-style feedback, including:\n\nEvidence Quotes: Pinpoints exact phrases from your response.\n\nWeakness Analysis: Highlights areas where your logic lacks clarity or a specific framework (like the STAR method) is missing.\n\nActionable Next Steps: Tells you exactly how to improve and allows you to use Instant Retries to practice that specific part again.',
  },
  {
    id: '8',
    category: 'core-features',
    question: 'Where can I find real interview experiences from other candidates?',
    answer:
      'You can visit our "Interview Insights" section. This is a community-driven library of real-world experiences where you can browse actual interview processes and discussions for specific roles at companies like Google, Meta, and Amazon.',
  },
  {
    id: '9',
    category: 'core-features',
    question: 'What if I get stuck during a practice session? Can I try again?',
    answer:
      'Absolutely. Screna encourages repeated practice. After receiving your AI feedback, you can use the "Instant Retries" feature to specifically practice the questions where you struggled or got stuck, until you are confident in your answer.',
  },
  {
    id: '10',
    category: 'core-features',
    question: 'What are "Readiness Metrics"?',
    answer:
      'These metrics help quantify your interview preparation. They comprehensively evaluate your structured communication, technical accuracy, and fluency across multiple mock sessions, showing you exactly how close you are to being fully "Ready."',
  },
  {
    id: '11',
    category: 'core-features',
    question: 'What roles does Screna support for mock interviews?',
    answer:
      'Screna is designed specifically for tech job seekers. Currently, our robust question bank and community support cover core technical and product roles, including but not limited to Software Engineers (SWE), Product Managers (PM), and Data Scientists (DS).',
  },
  {
    id: '12',
    category: 'privacy-security',
    question: 'Is my uploaded resume and personal data secure?',
    answer:
      'Absolutely secure. Screna is built on a "Privacy-first" principle. Your resume, profile data, and practice sessions are protected using industry-standard protocols—encrypted in transit and at rest.',
  },
  {
    id: '13',
    category: 'privacy-security',
    question: 'Will my interview recordings/videos and resume be shared with employers?',
    answer:
      'Never. You have total control over your data. Unless you explicitly choose to share it, your information will never be shared with potential employers, other users, or any third parties.',
  },
  {
    id: '14',
    category: 'privacy-security',
    question: 'Does the platform use my interview data to train public AI models?',
    answer:
      'No. Your resume and practice recordings are used solely to generate your personalized feedback. We will never use your private data to train public AI models without your explicit consent.',
  },
  {
    id: '15',
    category: 'privacy-security',
    question: 'Can I export my interview feedback reports?',
    answer:
      'Currently, all your practice records and detailed coach feedback are securely saved in your account for you to review anytime. If you need to export them, please contact our Support team. We are continuously working on improving our personal data management features.',
  },
];

export function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>('1');

  const filtered = FAQ_ITEMS.filter((item) => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch =
      !searchQuery ||
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[hsl(220,20%,98%)] flex flex-col">
      <Navbar />

      <main className="flex-1 pt-[107px]">
        {/* Hero header */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[hsl(221,91%,60%)]/[0.04] to-transparent pointer-events-none" />
          <div className="max-w-3xl mx-auto px-6 pt-16 pb-10 text-center relative">
            <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,60%)] mb-5">
              Support
            </span>
            <h1 className="text-4xl lg:text-5xl text-[hsl(222,22%,15%)] mb-3 tracking-tight font-[family-name:var(--font-serif)]">
              Help Center
            </h1>
            <p className="text-lg text-[hsl(222,12%,45%)] max-w-lg mx-auto leading-relaxed">
              Find answers to common questions about using Screna AI
            </p>
          </div>

          {/* Search bar - outside the max-w-3xl container */}
          <div className="max-w-5xl mx-auto px-6 pb-10 relative">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[hsl(222,12%,60%)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for help..."
                className="w-full h-12 pl-12 pr-4 rounded-xl border border-[hsl(220,16%,90%)] bg-white text-[hsl(222,22%,15%)] placeholder:text-[hsl(222,12%,65%)] focus:outline-none focus:ring-2 focus:ring-[hsl(221,91%,60%)]/30 focus:border-[hsl(221,91%,60%)] transition-all"
              />
            </div>
          </div>
        </section>

        {/* Content area */}
        <section className="max-w-5xl mx-auto px-6 pb-24">
          <div className="grid grid-cols-[220px_1fr] gap-10 justify-center">
            {/* Sidebar categories */}
            <aside className="pt-1">
              <h3 className="text-xs text-[hsl(222,12%,55%)] uppercase tracking-wider mb-3 px-3">
                Categories
              </h3>
              <nav className="space-y-0.5">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all ${
                        isActive
                          ? 'bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,60%)]'
                          : 'text-[hsl(222,12%,45%)] hover:bg-[hsl(220,20%,95%)] hover:text-[hsl(222,22%,15%)]'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {cat.label}
                    </button>
                  );
                })}
              </nav>
            </aside>

            {/* FAQ list */}
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm text-[hsl(222,12%,45%)]">
                  {filtered.length} {filtered.length === 1 ? 'article' : 'articles'} found
                </h2>
              </div>

              {filtered.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-14 h-14 rounded-full bg-[hsl(220,18%,94%)] flex items-center justify-center mx-auto mb-4">
                    <Search className="w-6 h-6 text-[hsl(222,12%,55%)]" />
                  </div>
                  <p className="text-[hsl(222,22%,15%)] mb-1">No results found</p>
                  <p className="text-sm text-[hsl(222,12%,55%)]">
                    Try adjusting your search or browse a different category.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map((item) => {
                    const isOpen = expandedId === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`bg-white rounded-xl border transition-all ${
                          isOpen
                            ? 'border-[hsl(221,91%,60%)]/20 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.06)]'
                            : 'border-[hsl(220,16%,90%)] hover:border-[hsl(220,16%,84%)]'
                        }`}
                      >
                        <button
                          onClick={() => setExpandedId(isOpen ? null : item.id)}
                          className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                        >
                          <span className="text-[hsl(222,22%,15%)] text-[0.95rem] leading-snug">
                            {item.question}
                          </span>
                          <ChevronDown
                            className={`w-4.5 h-4.5 text-[hsl(222,12%,55%)] shrink-0 transition-transform duration-200 ${
                              isOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                        {isOpen && (
                          <div className="px-5 pb-5 pt-0">
                            <div className="border-t border-[hsl(220,16%,93%)] pt-4">
                              <div className="text-sm text-[hsl(222,12%,40%)] leading-relaxed space-y-2">
                                {item.answer.split('\n\n').map((para, i) => (
                                  <p key={i}>{para}</p>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Contact support section */}
          
        </section>
      </main>

      <Footer />
    </div>
  );
}