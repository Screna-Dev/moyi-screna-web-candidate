import { motion } from 'motion/react';
import { Target, Users, FileText, Briefcase } from 'lucide-react';

const features = [
  {
    icon: Target,
    title: 'Master Interview Skills',
    description:
      'Our AI mock interviews don\'t just give you answers—we help you build genuine confidence and communication skills that tackle the root of interview challenges.',
  },
  {
    icon: Users,
    title: 'Community Learning',
    description:
      'Connect with fellow tech professionals in our supportive community. Share experiences, exchange insights, and grow together on your career journey.',
  },
  {
    icon: FileText,
    title: 'Personalized Training Plans',
    description:
      'Get a tailored interview preparation roadmap based on your resume, experience level, and career goals. Every plan is uniquely designed for you.',
  },
  {
    icon: Briefcase,
    title: 'High-Match Job Opportunities',
    description:
      'Discover positions that truly align with your skills and aspirations. We connect you with opportunities where you can thrive and make an impact.',
  },
];

export function LandJob() {
  return (
    <section className="py-24 bg-[#F9FAFB] relative overflow-hidden">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[hsl(221,91%,60%)]/5 to-transparent pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-[hsl(222,22%,15%)] mb-4">
            Land the job with{' '}
            <span className="bg-gradient-to-r from-[hsl(221,91%,60%)] to-[hsl(165,82%,51%)] bg-clip-text text-transparent">
              Screna AI
            </span>
          </h2>
          <p className="text-lg text-[hsl(220,9%,46%)] max-w-2xl mx-auto">
            Built for tech professionals who want to succeed through authentic growth,
            not shortcuts
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 group"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[hsl(221,91%,60%)] to-[hsl(165,82%,51%)] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-[hsl(222,22%,15%)] mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-[hsl(220,9%,46%)] leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 text-center"
        >
          <p className="text-[hsl(220,9%,46%)] text-lg mb-6">
            Join thousands of tech professionals transforming their interview performance
          </p>
          <button className="bg-gradient-to-r from-[hsl(221,91%,55%)] to-[hsl(221,91%,65%)] text-white px-8 py-4 rounded-lg font-semibold hover:opacity-90 transition-opacity duration-200 shadow-lg shadow-blue-600/25">
            Start Your Journey
          </button>
        </motion.div>
      </div>
    </section>
  );
}