import { motion, useInView } from 'motion/react';
import { useRef } from 'react';
import { Brain, Users, FileText, Target } from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'AI Mock Interview - Skill Mastery',
    description:
      'Our AI doesn\'t just give you answers - it teaches you how to think and respond like a top performer. Build genuine interview skills from the ground up.',
  },
  {
    icon: Users,
    title: 'Community Learning',
    description:
      'Connect with tech professionals, share experiences, and learn together. Get peer feedback and support from people who understand your journey.',
  },
  {
    icon: FileText,
    title: 'Personalized Training Plan',
    description:
      'We analyze your resume and career goals to create a custom interview preparation roadmap tailored specifically to your strengths and areas for growth.',
  },
  {
    icon: Target,
    title: 'High-Match Job Recommendations',
    description:
      'Discover positions that truly fit your skills, experience, and aspirations. We connect you with opportunities where you\'re most likely to succeed.',
  },
];

function FeatureCard({
  icon: Icon,
  title,
  description,
  index,
}: {
  icon: any;
  title: string;
  description: string;
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
      className="bg-[#E3E3E3]/50 backdrop-blur-sm border border-[hsl(220,16%,90%)] rounded-xl p-8 hover:shadow-lg transition-all duration-300 hover:border-[hsl(221,91%,60%)]/30 flex flex-col items-center text-center"
    >
      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[hsl(221,91%,60%)] to-[hsl(165,82%,51%)] flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="text-xl font-semibold text-[hsl(222,22%,15%)] mb-3">
        {title}
      </h3>
      <p className="text-[hsl(222,12%,45%)] leading-relaxed">{description}</p>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}