import { motion } from 'motion/react';
import { UploadCloud, Mic, LineChart, ArrowRight } from 'lucide-react';

const steps = [
  {
    icon: UploadCloud,
    title: '1. Upload & Analyze',
    description: 'Upload your resume and the job description you are targeting. Our AI instantly analyzes the match rate and identifies key focus areas.',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-600',
    rotateClass: 'group-hover:rotate-6'
  },
  {
    icon: Mic,
    title: '2. Practice Interviews',
    description: 'Engage in realistic AI mock interviews tailored to the specific role. Receive real-time questions that top tech companies actually ask.',
    bgClass: 'bg-cyan-50',
    textClass: 'text-cyan-600',
    rotateClass: 'group-hover:-rotate-3'
  },
  {
    icon: LineChart,
    title: '3. Get Feedback & Improve',
    description: 'Receive instant, actionable feedback on your answers, tone, and pacing. Track your progress with detailed analytics and get hired faster.',
    bgClass: 'bg-sky-50',
    textClass: 'text-sky-600',
    rotateClass: 'group-hover:rotate-6'
  }
];

export function HowItWorks() {
  return (
    <section className="py-24 relative overflow-hidden bg-white">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none bg-[#f9fbfd]">
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[500px] h-[500px] bg-blue-50/50 rounded-full blur-[100px] -z-10" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-sky-50/50 rounded-full blur-[100px] -z-10" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.h3 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl md:text-4xl font-bold text-slate-900 mb-6"
          >
            How <span className="text-blue-600">Screna AI</span> Works
          </motion.h3>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-slate-600 leading-relaxed"
          >
            From preparation to offer letter, we guide you through every step of your interview journey with precision and ease.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-blue-100 via-sky-200 to-blue-100 -z-10" />

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
                {/* Icon Circle */}
                <div className="w-24 h-24 rounded-2xl bg-white border border-slate-100 shadow-xl shadow-blue-900/5 flex items-center justify-center mb-8 relative z-10 group-hover:-translate-y-2 transition-transform duration-300">
                  <div className={`absolute inset-0 ${step.bgClass} rounded-2xl transform rotate-3 ${step.rotateClass} transition-transform duration-300 -z-10`} />
                  <step.icon className={`w-10 h-10 ${step.textClass}`} />
                  
                  {/* Step Number Badge */}
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-lg border-2 border-white">
                    {index + 1}
                  </div>
                </div>

                <h4 className="text-xl font-bold text-slate-900 mb-4">{step.title}</h4>
                <p className="text-slate-600 leading-relaxed text-sm md:text-base px-4">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
