import { Link } from 'react-router';
import { FileText, Mic, Users, type LucideIcon } from 'lucide-react';
import { Navbar } from '../../components/newDesign/home/navbar';
import { Footer } from '../../components/newDesign/home/footer';
import { useAuth } from '@/contexts/AuthContext';
import { useSeo, SITE_URL } from '@/hooks/useSeo';
import { SEO_COPY } from '@/constants/seo';
import { ORGANIZATION_JSON_LD } from '@/constants/organization';

// /about — the company facts page. Static copy, prerendered at build time
// (scripts/routes.mjs PRERENDER_STATIC), so everything a crawler or an AI
// search engine reads here is in the snapshot without running the bundle.
// Design: the "About Us Page" FigJam board / early-bot-03566667.figma.site.

const SERIF = "'Playfair Display', serif";

// AboutPage whose subject is the same Organization object the home page
// publishes, so both pages state one set of facts about the company.
const ABOUT_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: 'About Screna AI',
  url: `${SITE_URL}/about`,
  mainEntity: ORGANIZATION_JSON_LD,
};

const PILLARS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: FileText,
    title: 'Real interview insights',
    body: "Explore interview questions and experiences to better understand the roles and companies you're preparing for.",
  },
  {
    icon: Mic,
    title: 'AI-powered practice',
    body: 'Practice answering questions tailored to your target role and receive feedback that helps you identify what to work on next.',
  },
  {
    icon: Users,
    title: 'Human guidance',
    body: 'Connect with experienced mentors for perspective, advice, and support that reflects your goals.',
  },
];

const PRINCIPLES = [
  {
    title: 'Relevant preparation',
    body: 'Your goals and experience should shape how you prepare.',
  },
  {
    title: 'Feedback you can use',
    body: 'Useful feedback helps you understand both what went well and what to improve next.',
  },
  {
    title: 'Technology with a human perspective',
    body: 'AI creates more opportunities to practice, while experienced people bring context and judgment.',
  },
];

function Eyebrow({ children, className = '' }: { children: string; className?: string }) {
  return (
    <span
      className={`block text-[11px] font-semibold uppercase tracking-[1.6px] text-[#2E5BFF] ${className}`}
    >
      {children}
    </span>
  );
}

export function AboutPage() {
  useSeo({ ...SEO_COPY.about, path: '/about', jsonLd: [ABOUT_JSON_LD] });
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Navbar />

      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="px-6 pt-[168px] pb-24 md:pt-[200px] md:pb-32 text-center">
          <div className="mx-auto max-w-[800px]">
            <Eyebrow>About Screna</Eyebrow>
            <h1
              className="mt-6 text-[34px] leading-[1.25] md:text-[52px] md:leading-[65px] font-medium tracking-[-1.2px] text-[#0A0A0A]"
              style={{ fontFamily: SERIF }}
            >
              Helping you take the next step in your career—{' '}
              <br className="hidden md:block" />
              <span className="text-[#2E5BFF]">with confidence.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-[700px] text-[17px] md:text-[18px] leading-[1.625] text-[#4A4D57]">
              Screna brings together AI-powered interview practice, real interview insights, and guidance from
              experienced mentors to help you prepare for your next opportunity.
            </p>
            <p className="mx-auto mt-4 max-w-[620px] text-[16px] md:text-[17px] leading-[1.625] text-[#62748E]">
              We help you understand what to expect, identify where to improve, and approach interviews with greater
              clarity.
            </p>
          </div>
        </section>

        {/* ── Our story ── */}
        <section className="bg-[#F9FAFB] px-6 py-24 md:py-28">
          <div className="mx-auto grid max-w-[1200px] gap-16 md:grid-cols-[minmax(0,442px)_minmax(0,1fr)] md:gap-24">
            <div>
              <Eyebrow>Our story</Eyebrow>
              <h2
                className="mt-5 text-[28px] leading-[1.375] md:text-[36px] md:leading-[49.5px] font-medium tracking-[-0.8px] text-[#0A0A0A]"
                style={{ fontFamily: SERIF }}
              >
                Preparing for your next role shouldn't feel like figuring everything out alone.
              </h2>
            </div>
            <div className="space-y-6 text-[17px] leading-[1.75] text-[#4A4D57]">
              <p>
                Job seekers often piece together advice, interview questions, and practice tools from different
                places—without knowing what matters most for their target role or whether they're making progress.
              </p>
              <p>
                We built Screna to bring that preparation together: a place to learn from interview experiences,
                practice your answers, and get guidance for your next step.
              </p>
            </div>
          </div>
        </section>

        {/* ── What Screna does ── */}
        <section className="px-6 py-24 md:py-28">
          <div className="mx-auto max-w-[1200px]">
            <h2
              className="mx-auto max-w-[700px] text-center text-[26px] leading-[1.375] md:text-[34px] md:leading-[46.75px] font-medium tracking-[-0.8px] text-[#0A0A0A]"
              style={{ fontFamily: SERIF }}
            >
              Learn what to expect. Practice with purpose. Get guidance.
            </h2>
            <div className="mt-16 grid gap-8 md:grid-cols-3">
              {PILLARS.map(({ icon: Icon, title, body }) => (
                <div key={title} className="rounded-2xl border border-[hsl(220,16%,90%)] bg-white p-8">
                  <div className="flex size-[52px] items-center justify-center rounded-xl border border-[#2E5BFF]/15 bg-[#2E5BFF]/[0.06]">
                    <Icon className="size-6 text-[#2E5BFF]" strokeWidth={1.5} />
                  </div>
                  <h3 className="mt-5 text-[17px] font-semibold leading-[1.5] text-[#0A0A0A]">{title}</h3>
                  <p className="mt-2 text-[15px] leading-[1.7] text-[#4A4D57]">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Our principles ── */}
        <section className="bg-[#F9FAFB] px-6 py-24 md:py-28">
          <div className="mx-auto grid max-w-[1200px] gap-12 md:grid-cols-[minmax(0,442px)_minmax(0,1fr)] md:gap-24">
            <div>
              <Eyebrow>Our principles</Eyebrow>
              <h2
                className="mt-5 text-[28px] leading-[1.375] md:text-[36px] md:leading-[49.5px] font-medium tracking-[-0.8px] text-[#0A0A0A]"
                style={{ fontFamily: SERIF }}
              >
                Built around the person preparing.
              </h2>
            </div>
            <div className="border-t border-[hsl(220,16%,90%)]">
              {PRINCIPLES.map(({ title, body }) => (
                <div key={title} className="border-b border-[hsl(220,16%,90%)] py-8">
                  <h3 className="text-[17px] font-semibold leading-[1.5] text-[#0A0A0A]">{title}</h3>
                  <p className="mt-2 text-[15px] leading-[1.7] text-[#4A4D57]">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Get started ── */}
        <section
          className="px-6 py-28 md:py-32 text-center"
          style={{
            background:
              'linear-gradient(172.342deg, rgb(18, 49, 184) 8.49%, rgb(46, 91, 255) 50%, rgb(74, 123, 255) 91.51%)',
          }}
        >
          <div className="mx-auto max-w-[700px]">
            <div className="flex items-center justify-center gap-3">
              <span className="h-px w-6 bg-white/40" />
              <span className="text-[12px] font-semibold uppercase tracking-[1.68px] text-white/85">Get started</span>
              <span className="h-px w-6 bg-white/40" />
            </div>
            <h2
              className="mt-8 text-[34px] leading-[1.25] md:text-[48px] md:leading-[60px] font-medium tracking-[-1.5px] text-white"
              style={{ fontFamily: SERIF }}
            >
              Get ready for what's next.
            </h2>
            <p className="mt-4 text-[17px] md:text-[18px] leading-[1.5] text-white/80">
              Explore the tools and guidance that can help you prepare for your next interview.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                to={user ? '/dashboard' : '/auth?signup=true'}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-8 text-[14px] font-semibold text-[#1231B8] transition-opacity hover:opacity-90"
              >
                <span className="size-1.5 rounded-full bg-[#2E5BFF]" />
                Start practicing
              </Link>
              <Link
                to="/contact"
                className="inline-flex h-12 items-center rounded-full border border-white/40 px-8 text-[14px] font-semibold text-white/90 transition-colors hover:bg-white/10"
              >
                Contact us
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
