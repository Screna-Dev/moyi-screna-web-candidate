import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
export function SupportCTA() {
  return (
    <section className="mx-[0px] my-[79px] px-[24px] py-[1px]">
      <div className="max-w-5xl mx-auto relative">
        {/* Banner card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative rounded-3xl overflow-hidden px-8 py-16 sm:px-14 sm:py-20"
          style={{
            background:
              'linear-gradient(135deg, hsl(220, 40%, 97%) 0%, hsl(214, 50%, 93%) 100%)',
          }}
        >

          {/* Content */}
          <div className="relative z-10 text-center max-w-xl mx-auto">
            <h2 className="text-3xl sm:text-4xl text-white tracking-tight mb-4">
              Still have questions?🤔
            </h2>
            <p className="text-[hsl(222,12%,45%)] text-base sm:text-lg leading-relaxed mb-9 text-[#ffffff]">
              Check our FAQs or reach out anytime — we're here to help.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/faq"
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[hsl(222,22%,15%)] text-white text-sm hover:bg-[hsl(222,22%,10%)] transition-colors shadow-md shadow-[hsl(222,22%,15%)]/15"
              >
                Check our FAQs
                <ArrowRight className="w-4 h-4" />
              </Link>
              
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}