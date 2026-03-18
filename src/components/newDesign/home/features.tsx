import { motion, useInView } from 'motion/react';
import { useRef } from 'react';
import { Brain, Users, FileText, Target, Mic, MessageSquareText, TrendingUp, ArrowRight } from 'lucide-react';
import { Link } from 'react-router';

const features = [
  {
    icon: Mic,
    title: 'AI Mock Interviews (Voice / Video / Text)',
    description:
      'Practice realistic interviews with follow-up questions—choose voice, video, or text and build structured answers.',
    link: '/mock-interview',
    linkLabel: 'Start practicing',
  },
  {
    icon: Users,
    title: 'Interview Insights (Community)',
    description:
      'Learn from real interview experiences and discussions—then jump straight into practice based on what you read.',
    link: '/community',
    linkLabel: 'Explore insights',
  },
  {
    icon: MessageSquareText,
    title: 'Coach-style Evaluation',
    description:
      'Get evidence-based feedback (quotes + next steps), and retry weak moments instantly to improve faster.',
    link: '/mock-interview',
    linkLabel: 'See how it works',
  },
  {
    icon: TrendingUp,
    title: 'Trending Practice Sets',
    description:
      'Start from hot role/company-style sets in one click—no guessing what to practice next.',
    link: '/question-bank',
    linkLabel: 'Browse sets',
  },
];

function FeatureCard({
  icon: Icon,
  title,
  description,
  link,
  linkLabel,
  index,
}: {
  icon: any;
  title: string;
  description: string;
  link: string;
  linkLabel: string;
  index: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: 'easeOut' }}
    >
      <Link
        to={link}
        className="group block bg-white rounded-2xl p-7 border border-slate-100 shadow-sm shadow-slate-900/[0.03] transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-900/[0.06] hover:border-blue-200"
      >
        <div className="flex items-start gap-5">
          {/* Icon */}
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-slate-900 group-hover:bg-blue-600 transition-colors duration-300"
          >
            <Icon className="w-5 h-5 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-semibold text-slate-900 mb-1.5">
              {title}
            </h3>
            <p
              className="text-sm text-slate-500 mb-4"
              style={{ lineHeight: 1.6 }}
            >
              {description}
            </p>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 group-hover:gap-2 transition-all duration-200">
              {linkLabel}
              <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function Features() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section
      id="features"
      className="relative py-24 bg-[#f9fbfd]"
    >
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-semibold text-[hsl(222,22%,15%)] mb-4">
            Everything you need to{' '}
            <span
              className="font-serif italic"
              style={{ fontFamily: 'var(--font-source-serif)' }}
            >
              succeed
            </span>
          </h2>
          <p className="text-xl text-[hsl(222,12%,45%)] max-w-2xl mx-auto">
            Comprehensive tools designed to help you prepare, practice, and
            land your ideal role with confidence.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}