import { motion } from 'motion/react';
import { Search, Sliders, LineChart, ArrowRight } from 'lucide-react';
import { Link } from 'react-router';

const steps = [
  {
    icon: Search,
    title: '1. Explore real interview insights',
    description: 'Browse company- and role-specific interview experiences shared by the community. Discover what gets asked, what interviewers care about, and what strong answers look like.',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-600',
    rotateClass: 'group-hover:rotate-6'
  },
  {
    icon: Sliders,
    title: '2. Build your personalized mock',
    description: 'Add your target role, paste a job description, or upload your resume. Screna combines your goals and background with community insights to create the most relevant practice.',
    bgClass: 'bg-cyan-50',
    textClass: 'text-cyan-600',
    rotateClass: 'group-hover:-rotate-3'
  },
  {
    icon: LineChart,
    title: '3. Practice, improve, and retry',
    description: 'Get coach-style feedback with evidence from your response, clear next steps, and instant retries on weak moments—so each round becomes more focused and effective.',
    bgClass: 'bg-sky-50',
    textClass: 'text-sky-600',
    rotateClass: 'group-hover:rotate-6'
  }
];

export function HowItWorks() {
  return (
    <section className="py-20 relative overflow-hidden bg-white">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none bg-[#f9fbfd]">
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[500px] h-[500px] bg-blue-50/50 rounded-full blur-[100px] -z-10" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-sky-50/50 rounded-full blur-[100px] -z-10" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-14">
          
          <motion.h3 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl md:text-4xl font-bold text-slate-900 mb-4"
          >
            How <span className="text-blue-600">Screna.ai</span> Personalizes Your <span className="italic" style={{ fontFamily: 'var(--font-serif)' }}>Mock</span>
          </motion.h3>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-slate-600 leading-relaxed"
          >
            Turn real interview experiences from the community into targeted practice, personalized mocks, and coach-style feedback.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-blue-100/60 to-transparent -z-10" />

          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              className="relative group"
            >
              <div className="flex flex-col items-center text-center">
                {/* Icon Card */}
                <div className="w-20 h-20 rounded-2xl bg-white border border-slate-100 shadow-lg shadow-blue-900/[0.04] flex items-center justify-center mb-6 relative z-10 group-hover:-translate-y-1.5 transition-transform duration-300 overflow-visible">
                  <div className={`absolute inset-0 ${step.bgClass} rounded-2xl transform rotate-3 ${step.rotateClass} transition-transform duration-300 -z-10`} />
                  <step.icon className={`w-8 h-8 ${step.textClass}`} />
                  {/* Bottom accent glow */}
                  <div className="absolute -bottom-px left-3 right-3 h-px bg-gradient-to-r from-transparent via-blue-300/50 to-transparent" />
                  
                  {/* Step Number Badge */}
                  <div className="absolute -top-2.5 -right-2.5 w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-lg border-2 border-white">
                    {index + 1}
                  </div>
                </div>

                <h4 className="text-lg font-bold text-slate-900 mb-2.5 min-h-[1.75rem]">{step.title}</h4>
                <p className="text-slate-500 text-sm max-w-[260px] mx-auto" style={{ lineHeight: 1.55 }}>
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-14"
        >
          
          
          <Link
            to="/personalized-practice"
            className="h-11 px-7 rounded-full text-sm font-semibold text-slate-600 border border-slate-200 bg-white hover:border-slate-300 hover:text-slate-900 active:scale-[0.98] transition-all duration-200 inline-flex items-center gap-1.5"
          >
            Start your personalized mock
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}