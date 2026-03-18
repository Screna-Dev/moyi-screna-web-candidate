import { motion, useInView } from 'motion/react';
import { useRef } from 'react';
import { HelpCircle } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';

const faqItems = [
  {
    id: 'training-plan',
    question: 'How does the AI create my Training Plan?',
    answer:
      'After you upload your resume and set your target job, our AI analyzes your profile and generates a customized Training Plan. Each session includes targeted questions aligned with your role, experience level, and readiness metrics.',
  },
  {
    id: 'experience-library',
    question: 'How does the experience library work?',
    answer:
      'Our experience library contains real interview questions and experiences shared by candidates across all industries. You can browse by company, role, or question type to learn from others and boost your readiness.',
  },
  {
    id: 'roles-supported',
    question: 'What roles are supported?',
    answer:
      'We support all tech career fields including Frontend, Backend, Full Stack, DevOps, Data Science, ML Engineering, and more. Each role has customized Training Plans with industry-specific readiness metrics.',
  },
  {
    id: 'job-matching',
    question: 'How does daily job matching work?',
    answer:
      'Based on your target job title and profile, our system scans multiple job platforms daily and recommends the latest positions that match your criteria. You\'ll receive personalized job alerts to keep your applications timely.',
  },
  {
    id: 'readiness-metrics',
    question: 'How are Readiness Metrics calculated?',
    answer:
      'Your Readiness Score is initially calculated based on your resume, experience, and target role. As you complete Training Plan sessions, the score is dynamically updated based on your performance, improvement trends, and completion rate.',
  },
];

export function PricingFaq() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="py-24 bg-white relative overflow-hidden">
      {/* Subtle decorative background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[hsl(221,91%,60%)]/[0.03] rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-3xl mx-auto px-6 relative z-10">
        {/* Header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-[hsl(222,22%,15%)] mb-4 tracking-tight">
            Frequently asked questions
          </h2>
          <p className="text-lg text-[hsl(222,12%,45%)] max-w-xl mx-auto leading-relaxed">
            Everything you need to know about Screna AI and how it helps you land your dream job.
          </p>
        </motion.div>

        {/* Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
        >
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item, index) => (
              <AccordionItem
                key={item.id}
                value={item.id}
                className="border-b border-slate-200/80 last:border-b-0"
              >
                <AccordionTrigger className="py-5 text-base font-semibold text-[hsl(222,22%,15%)] hover:text-blue-600 hover:no-underline transition-colors [&[data-state=open]]:text-blue-600">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-[hsl(222,12%,45%)] leading-relaxed text-[15px] pb-5">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>

        {/* Bottom Help Link */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
          className="mt-12 text-center"
        >
          <div className="bg-[hsl(220,20%,97%)] border border-slate-200/60 rounded-2xl p-6 inline-flex flex-col items-center">
            <p className="text-sm text-[hsl(222,12%,45%)] mb-1">
              Still have questions?
            </p>
            <a
              href="mailto:support@screna.ai"
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              Contact our support team →
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
