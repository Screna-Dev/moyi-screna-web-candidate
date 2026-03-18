import { motion, useInView } from 'motion/react';
import { useRef } from 'react';
import { Shield, Lock, Trash2, ArrowRight } from 'lucide-react';

const securityCards = [
  {
    icon: Lock,
    title: 'Encryption',
    description: 'Encrypted in transit & at rest',
    detail:
      'Your resume, profile data, and practice sessions are encrypted using industry-standard protocols — both when being transferred and when stored.',
  },
  {
    icon: Shield,
    title: 'Control',
    description: 'You control what you share',
    detail:
      'Your data is yours. Nothing is shared with employers, other users, or third parties unless you explicitly choose to share it.',
  },
  {
    icon: Trash2,
    title: 'Data rights',
    description: 'Delete your data anytime',
    detail:
      'Want to remove your account and all associated data? You can do it in one click from your settings — no hoops, no waiting period.',
  },
];

export function Security() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section
      id="security"
      className="py-24 md:py-32 bg-white scroll-mt-20"
    >
      <div className="max-w-5xl mx-auto px-6">
        {/* Header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-center mb-14 md:mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-semibold text-[hsl(222,22%,15%)] mb-4">
            Security you can{' '}
            <span
              className="font-serif italic"
              style={{ fontFamily: 'var(--font-source-serif)' }}
            >
              trust
            </span>
          </h2>
          <p className="text-base md:text-lg text-[hsl(222,12%,45%)] max-w-lg mx-auto">
            Your resume, profile, and practice data are protected by default.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {securityCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 24 }}
                animate={
                  isInView
                    ? { opacity: 1, y: 0 }
                    : { opacity: 0, y: 24 }
                }
                transition={{
                  duration: 0.5,
                  delay: 0.15 + index * 0.1,
                  ease: 'easeOut',
                }}
                className="bg-[hsl(220,20%,98%)] rounded-2xl p-7 md:p-8 border border-gray-100 hover:border-blue-100 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-5 group-hover:bg-blue-100 transition-colors duration-300">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-[hsl(222,22%,15%)] mb-1.5" style={{ fontWeight: 600 }}>
                  {card.title}
                </h3>
                <p className="text-sm text-blue-600 mb-3" style={{ fontWeight: 500 }}>
                  {card.description}
                </p>
                <p className="text-sm text-[hsl(222,12%,50%)] leading-relaxed">
                  {card.detail}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Footer link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-center"
        >
          <a
            href="#"
            className="h-11 px-7 rounded-full text-sm font-semibold text-slate-600 border border-slate-200 bg-white hover:border-slate-300 hover:text-slate-900 active:scale-[0.98] transition-all duration-200 inline-flex items-center gap-1.5"
          >
            Read Security & Privacy
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}