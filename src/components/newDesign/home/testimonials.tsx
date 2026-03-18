import { motion, AnimatePresence, useInView } from 'motion/react';
import {  useRef, useState, useCallback, useEffect, forwardRef } from 'react';
import { Star } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Software Engineer',
    company: 'Google',
    avatar:
      'https://images.unsplash.com/photo-1581065178026-390bc4e78dad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhc2lhbiUyMHdvbWFuJTIwcHJvZmVzc2lvbmFsJTIwcG9ydHJhaXR8ZW58MXx8fHwxNzczMjQwMjc2fDA&ixlib=rb-4.1.0&q=80&w=200',
    rating: 4.9,
    quote:
      'The voice mock interviews felt surprisingly close to the real thing. I practiced system design sessions multiple times and got coach-style feedback that pointed out exactly where I lost clarity. By my actual on-site, I felt structured and calm instead of anxious.',
  },
  {
    name: 'Marcus Johnson',
    role: 'Product Manager',
    company: 'Meta',
    avatar:
      'https://images.unsplash.com/photo-1769636929388-99eff95d3bf1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxibGFjayUyMHdvbWFuJTIwcHJvZmVzc2lvbmFsJTIwcG9ydHJhaXQlMjBoZWFkc2hvdHxlbnwxfHx8fDE3NzMyNjM4MTF8MA&ixlib=rb-4.1.0&q=80&w=200',
    rating: 4.8,
    quote:
      'I used the PM-specific practice sets to prepare for Meta. The AI evaluation didn\'t just say "good job" — it cited specific parts of my answers and gave actionable tips on how to tighten my product sense framework. That level of detail was a game-changer.',
  },
  {
    name: 'Priya Patel',
    role: 'Data Scientist',
    company: 'Amazon',
    avatar:
      'https://images.unsplash.com/photo-1649433658557-54cf58577c68?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmRpYW4lMjBtYW4lMjBwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdHxlbnwxfHx8fDE3NzMyMjIzNzd8MA&ixlib=rb-4.1.0&q=80&w=200',
    rating: 4.9,
    quote:
      'The trending DS role practice sets kept me focused on what companies are actually asking right now, not generic textbook questions. I also learned a ton from the community — seeing how others approach the same problems gave me fresh perspectives.',
  },
  {
    name: 'Daniel Torres',
    role: 'Frontend Engineer',
    company: 'Netflix',
    avatar:
      'https://images.unsplash.com/photo-1563107197-df8cd4348c5f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoaXNwYW5pYyUyMG1hbiUyMHByb2Zlc3Npb25hbCUyMGhlYWRzaG90fGVufDF8fHx8MTc3MzE1NDM3Nnww&ixlib=rb-4.1.0&q=80&w=200',
    rating: 5.0,
    quote:
      'I was terrified of video interviews. After doing a dozen practice sessions on Screna, I got comfortable with the camera and learned to structure my responses. The feedback broke down my answers with evidence so I knew exactly what to fix.',
  },
  {
    name: 'Emily Watson',
    role: 'UX Designer',
    company: 'Airbnb',
    avatar:
      'https://images.unsplash.com/photo-1655249493799-9cee4fe983bb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjB3b21hbiUyMGhlYWRzaG90JTIwcG9ydHJhaXR8ZW58MXx8fHwxNzczMjE3MDIwfDA&ixlib=rb-4.1.0&q=80&w=200',
    rating: 4.7,
    quote:
      'As a career-switcher into design, I had no idea what to expect in portfolio review interviews. The role-specific question sets and community insights gave me a realistic picture. I went in feeling prepared instead of guessing.',
  },
  {
    name: 'James Kim',
    role: 'Backend Engineer',
    company: 'Stripe',
    avatar:
      'https://images.unsplash.com/photo-1701463387028-3947648f1337?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlYXN0JTIwYXNpYW4lMjBtYW4lMjBwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdHxlbnwxfHx8fDE3NzMyNjM4MTJ8MA&ixlib=rb-4.1.0&q=80&w=200',
    rating: 4.8,
    quote:
      'The mock interview AI acts like a thoughtful coach — it doesn\'t just grade you, it explains why certain responses work and gives concrete tips to improve. I practiced at my own pace and genuinely felt less anxious going into each round.',
  },
  {
    name: 'Rachel Adams',
    role: 'ML Engineer',
    company: 'OpenAI',
    avatar:
      'https://images.unsplash.com/photo-1672685667592-0392f458f46f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBtYW4lMjBoZWFkc2hvdCUyMHBvcnRyYWl0fGVufDF8fHx8MTc3MzIwNDIwNnww&ixlib=rb-4.1.0&q=80&w=200',
    rating: 4.9,
    quote:
      'What sets Screna apart is the community learning aspect. Reading shared interview experiences from others who interviewed at the same companies gave me insider-level preparation. Combined with the AI mock sessions, I felt genuinely ready.',
  },
  {
    name: 'Kevin Liu',
    role: 'Software Engineer',
    company: 'Databricks',
    avatar:
      'https://images.unsplash.com/photo-1770894807442-108cc33c0a7a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMHByb2Zlc3Npb25hbCUyMG1hbiUyMHBvcnRyYWl0JTIwc3R1ZGlvfGVufDF8fHx8MTc3MzI2MzgxMXww&ixlib=rb-4.1.0&q=80&w=200',
    rating: 4.8,
    quote:
      'I practiced with the SWE-specific sets and the evaluation feedback was spot on — it highlighted where my explanations were vague and suggested more structured approaches. After two weeks of consistent practice, my interview confidence went up noticeably.',
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className="w-3.5 h-3.5 fill-amber-400 text-amber-400"
          />
        ))}
      </div>
      <span className="text-xs text-[hsl(222,12%,55%)] ml-0.5">
        {rating}/5
      </span>
    </div>
  );
}

const TestimonialCard = forwardRef<
  HTMLDivElement,
  {
    testimonial: (typeof testimonials)[0];
    position: 'left' | 'center' | 'right';
  }
>(function TestimonialCard({ testimonial, position }, ref) {
  const isCenter = position === 'center';

  return (
    <motion.div
      ref={ref}
      layout
      className="flex flex-col items-center text-center bg-white rounded-3xl border border-gray-100/80 p-8 md:p-10 w-full max-w-[380px] shrink-0"
      style={{
        boxShadow: isCenter
          ? '0 20px 60px -12px rgba(0,19,47,0.12), 0 8px 24px -8px rgba(0,19,47,0.08)'
          : '0 8px 30px -8px rgba(0,19,47,0.08), 0 4px 12px -4px rgba(0,19,47,0.04)',
      }}
      animate={{
        scale: isCenter ? 1 : 0.9,
        rotate: position === 'left' ? -7 : position === 'right' ? 7 : 0,
        opacity: isCenter ? 1 : 0.6,
        y: isCenter ? 0 : 12,
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }}
    >
      {/* Avatar */}
      <div
        className={`rounded-full overflow-hidden mb-5 ring-4 ring-white ${isCenter ? 'w-16 h-16' : 'w-14 h-14'}`}
        style={{
          boxShadow: '0 4px 14px rgba(0,19,47,0.1)',
        }}
      >
        <ImageWithFallback
          src={testimonial.avatar}
          alt={testimonial.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Name & Role */}
      <h4 className="text-[hsl(222,22%,15%)] mb-0.5" style={{ fontWeight: 500 }}>
        {testimonial.name}
      </h4>
      <p className="text-xs text-[hsl(222,12%,55%)] mb-3">
        {testimonial.role} · {testimonial.company}
      </p>

      {/* Rating */}
      <div className="mb-5">
        <StarRating rating={testimonial.rating} />
      </div>

      {/* Quote */}
      <p className="text-sm text-[hsl(222,12%,40%)] leading-relaxed">
        "{testimonial.quote}"
      </p>
    </motion.div>
  );
});
TestimonialCard.displayName = 'TestimonialCard';

export function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  const totalSlides = testimonials.length;

  const getVisibleIndices = useCallback(
    (center: number) => {
      const left = (center - 1 + totalSlides) % totalSlides;
      const right = (center + 1) % totalSlides;
      return { left, center, right };
    },
    [totalSlides]
  );

  const visible = getVisibleIndices(activeIndex);

  // Auto-advance every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % totalSlides);
    }, 5000);
    return () => clearInterval(interval);
  }, [totalSlides]);

  return (
    <section className="py-24 md:py-32 bg-[hsl(220,20%,98%)] overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          ref={sectionRef}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-center mb-16 md:mb-20"
        >
          <h2 className="text-4xl md:text-5xl font-semibold text-[hsl(222,22%,15%)] mb-4">
            What candidates{' '}
            <span
              className="font-serif italic"
              style={{ fontFamily: 'var(--font-source-serif)' }}
            >
              say
            </span>
          </h2>
          <p className="text-lg md:text-xl text-[hsl(222,12%,45%)] max-w-xl mx-auto">
            Real feedback from people practicing with Screna.ai
          </p>
        </motion.div>

        {/* Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
          className="relative"
        >
          {/* Cards container */}
          <div className="flex items-center justify-center gap-4 md:gap-8 py-8 px-4">
            {/* Left card - hidden on small screens */}
            <div className="hidden md:block">
              <AnimatePresence mode="popLayout">
                <TestimonialCard
                  key={`left-${visible.left}`}
                  testimonial={testimonials[visible.left]}
                  position="left"
                />
              </AnimatePresence>
            </div>

            {/* Center card */}
            <AnimatePresence mode="popLayout">
              <TestimonialCard
                key={`center-${visible.center}`}
                testimonial={testimonials[visible.center]}
                position="center"
              />
            </AnimatePresence>

            {/* Right card - hidden on small screens */}
            <div className="hidden md:block">
              <AnimatePresence mode="popLayout">
                <TestimonialCard
                  key={`right-${visible.right}`}
                  testimonial={testimonials[visible.right]}
                  position="right"
                />
              </AnimatePresence>
            </div>
          </div>

          {/* Pagination dots/bars */}
          <div className="flex items-center justify-center gap-2 mt-10">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                aria-label={`Go to testimonial ${index + 1}`}
                className="relative group p-1"
              >
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === activeIndex
                      ? 'w-8 bg-[hsl(221,91%,60%)]'
                      : 'w-4 bg-[hsl(222,12%,80%)] hover:bg-[hsl(222,12%,65%)]'
                  }`}
                />
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}