import { motion, useInView } from 'motion/react';
import { useRef } from 'react';
import { Star } from 'lucide-react';

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Software Engineer',
    company: 'Tech Corp',
    content:
      'Screna AI helped me overcome my interview anxiety. The AI feedback was incredibly detailed and supportive, never judgmental. I landed my dream job within 3 weeks!',
    rating: 5,
  },
  {
    name: 'Michael Torres',
    role: 'Machine Learning Engineer',
    company: 'Innovation Labs',
    content:
      'The personalized job matching saved me so much time. Instead of applying to hundreds of positions, I focused on the right ones and got multiple offers.',
    rating: 5,
  },
  {
    name: 'Emily Watson',
    role: 'Data Scientist',
    company: 'Analytics AI',
    content:
      'As someone returning to the workforce after a break, Screna AI gave me the confidence I needed. The practice sessions felt real but safe.',
    rating: 5,
  },
  {
    name: 'David Kim',
    role: 'Data Analyst',
    company: 'Analytics Plus',
    content:
      'The progress tracking feature is amazing. I could see myself improving week by week. The AI adapts to your level perfectly.',
    rating: 5,
  },
  {
    name: 'Jessica Martinez',
    role: 'DevOps Engineer',
    company: 'Cloud Systems',
    content:
      'I loved being able to practice at my own pace, late at night when I had time. No scheduling, no pressure. Just steady improvement.',
    rating: 5,
  },
  {
    name: 'Robert Zhang',
    role: 'Backend Engineer',
    company: 'Tech Solutions',
    content:
      'The role-specific scenarios were spot on. I felt completely prepared for every question in my actual interviews.',
    rating: 5,
  },
];

function TestimonialCard({
  testimonial,
}: {
  testimonial: {
    name: string;
    role: string;
    company: string;
    content: string;
    rating: number;
  };
}) {
  return (
    <div className="flex-shrink-0 w-[400px] bg-white rounded-xl p-6 shadow-lg shadow-[hsl(221,91%,30%)]/20 hover:shadow-xl hover:shadow-[hsl(221,91%,30%)]/30 transition-all duration-300 border border-gray-100">
      <div className="flex items-center gap-1 mb-4">
        {[...Array(testimonial.rating)].map((_, i) => (
          <Star
            key={i}
            className="w-4 h-4 fill-[hsl(165,82%,51%)] text-[hsl(165,82%,51%)]"
          />
        ))}
      </div>
      <p className="text-[hsl(222,12%,45%)] mb-6 leading-relaxed italic">
        "{testimonial.content}"
      </p>
      <div className="border-t border-gray-200 pt-4">
        <p className="font-semibold text-[hsl(222,22%,15%)]">
          {testimonial.name}
        </p>
        <p className="text-sm text-[hsl(222,12%,45%)]">
          {testimonial.role} at {testimonial.company}
        </p>
      </div>
    </div>
  );
}

export function Testimonials() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  // Split testimonials into two rows
  const firstRow = testimonials.slice(0, 3);
  const secondRow = testimonials.slice(3, 6);
  
  // Duplicate arrays for seamless loop
  const duplicatedFirstRow = [...firstRow, ...firstRow];
  const duplicatedSecondRow = [...secondRow, ...secondRow];

  return (
    <section className="py-24 bg-[hsl(220,20%,98%)] overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-semibold text-[hsl(222,22%,15%)] mb-4">
            Loved by{' '}
            <span
              className="font-serif italic"
              style={{ fontFamily: 'var(--font-source-serif)' }}
            >
              job seekers
            </span>
          </h2>
          <p className="text-xl text-[hsl(222,12%,45%)] max-w-2xl mx-auto">
            Join thousands who've transformed their interview skills and landed
            their dream jobs.
          </p>
        </motion.div>

        {/* First row - scrolling right to left */}
        <div className="relative mb-6">
          <motion.div
            className="flex gap-6"
            animate={{
              x: [0, -50 + '%'],
            }}
            transition={{
              x: {
                repeat: Infinity,
                repeatType: 'loop',
                duration: 40,
                ease: 'linear',
              },
            }}
          >
            {duplicatedFirstRow.map((testimonial, index) => (
              <TestimonialCard
                key={`first-${testimonial.name}-${index}`}
                testimonial={testimonial}
              />
            ))}
          </motion.div>
        </div>

        {/* Second row - scrolling left to right */}
        <div className="relative">
          <motion.div
            className="flex gap-6"
            animate={{
              x: [-50 + '%', 0],
            }}
            transition={{
              x: {
                repeat: Infinity,
                repeatType: 'loop',
                duration: 40,
                ease: 'linear',
              },
            }}
          >
            {duplicatedSecondRow.map((testimonial, index) => (
              <TestimonialCard
                key={`second-${testimonial.name}-${index}`}
                testimonial={testimonial}
              />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}