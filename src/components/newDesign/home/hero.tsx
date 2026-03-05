import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { PlayCircle, X } from 'lucide-react';

// SVG Logos for Social Proof
const Logos = {
  Google: () => (
    <svg viewBox="0 0 24 24" className="h-5 w-auto fill-current" xmlns="http://www.w3.org/2000/svg">
      <path d="M23.5 12.2C23.5 11.4 23.4 10.7 23.3 10H12V14.5H18.5C18.2 16 17.3 17.3 16 18.2V21.3H19.9C22.2 19.2 23.5 16 23.5 12.2Z" />
      <path d="M12 24C15.2 24 17.9 22.9 19.9 21.3L16 18.2C15 18.9 13.6 19.4 12 19.4C8.9 19.4 6.3 17.3 5.4 14.5H1.4V17.6C3.4 21.6 7.5 24 12 24Z" />
      <path d="M5.4 14.5C5.2 13.8 5.1 13.1 5.1 12.3C5.1 11.6 5.2 10.9 5.4 10.1V7H1.4C0.5 8.7 0 10.5 0 12.3C0 14.2 0.5 15.9 1.4 17.6L5.4 14.5Z" />
      <path d="M12 5.2C13.7 5.2 15.3 5.8 16.5 7L19.9 3.6C17.9 1.7 15.2 0.6 12 0.6C7.5 0.6 3.4 3 1.4 7L5.4 10.1C6.3 7.3 8.9 5.2 12 5.2Z" />
    </svg>
  ),
  Meta: () => (
    <svg viewBox="0 0 24 24" className="h-5 w-auto fill-current" xmlns="http://www.w3.org/2000/svg">
      <path d="M16.9 5.4C15.3 5.4 14 6.2 12 8.4C10 6.2 8.7 5.4 7.1 5.4C3.8 5.4 1.4 8.1 1.4 12C1.4 15.9 3.8 18.6 7.1 18.6C8.8 18.6 10 17.8 12 15.6C14 17.8 15.3 18.6 16.9 18.6C20.2 18.6 22.6 15.9 22.6 12C22.6 8.1 20.2 5.4 16.9 5.4ZM7.1 16.2C5.3 16.2 3.9 14.5 3.9 12C3.9 9.5 5.3 7.8 7.1 7.8C8.3 7.8 9.2 8.3 10.2 9.5C9.4 10.4 8.6 11.3 7.9 12.2C8.8 13.1 9.5 14.1 10.2 15.1C9.2 15.7 8.3 16.2 7.1 16.2ZM16.9 16.2C15.7 16.2 14.8 15.7 13.8 15.1C14.5 14.1 15.2 13.1 16.1 12.2C15.4 11.3 14.6 10.4 13.8 9.5C14.8 8.3 15.7 7.8 16.9 7.8C18.7 7.8 20.1 9.5 20.1 12C20.1 14.5 18.7 16.2 16.9 16.2Z"/>
    </svg>
  ),
  Amazon: () => (
    <svg viewBox="0 0 24 24" className="h-5 w-auto fill-current" xmlns="http://www.w3.org/2000/svg">
      <path d="M13.6 11.6C13.6 13.5 12.4 14.4 10.6 14.4C9.1 14.4 8.1 13.7 8 12.4H5.9C6 14.8 8.1 16.2 10.7 16.2C13.8 16.2 15.9 14.5 15.9 11.3V5.5H13.6V6.9C13 5.9 11.8 5.3 10.2 5.3C7.4 5.3 5.4 7.4 5.4 10.1C5.4 12.8 7.3 14.8 10 14.8C11.8 14.8 13 13.9 13.6 12.6V11.6ZM10.5 7.1C12.1 7.1 13.5 8.3 13.5 10C13.5 11.7 12.1 12.9 10.5 12.9C8.9 12.9 7.7 11.7 7.7 10C7.7 8.3 8.9 7.1 10.5 7.1ZM11.6 17.5C9.2 17.5 6.7 18.2 4.4 19.3C4 19.5 4.1 20.1 4.5 20.1C4.6 20.1 4.7 20 4.8 20C6.9 19.1 9.3 18.5 11.6 18.5C14.8 18.5 17.4 19.7 19.3 21.1C19.5 21.2 19.8 21.1 19.8 20.8C19.8 20.7 19.7 20.6 19.7 20.6C17.5 18.7 14.8 17.5 11.6 17.5Z"/>
    </svg>
  ),
  Microsoft: () => (
    <svg viewBox="0 0 24 24" className="h-5 w-auto fill-current" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="10" height="10" />
      <rect x="13" y="1" width="10" height="10" />
      <rect x="1" y="13" width="10" height="10" />
      <rect x="13" y="13" width="10" height="10" />
    </svg>
  ),
  Apple: () => (
    <svg viewBox="0 0 24 24" className="h-5 w-auto fill-current" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.1 13.4C17.1 16.3 19.6 17.2 19.7 17.3C19.6 17.8 18.8 19.7 17.5 21.6C16.4 23.2 15.3 23.2 14.1 23.2C12.9 23.2 12.5 22.5 11.1 22.5C9.7 22.5 9.3 23.2 8.3 23.2C7.1 23.2 5.9 22.2 4.9 20.7C2.8 17.6 2.8 12.9 4.9 11.7C6 11.1 7.2 10.7 8.2 10.7C9.5 10.7 10.5 11.6 11.2 11.6C12 11.6 13.2 10.5 14.5 10.5C15 10.5 16.5 10.7 17.5 11.2C17.1 11.4 17.1 13.2 17.1 13.4ZM14.9 8.2C15.5 7.4 15.9 6.4 15.9 5.3C15.9 5.2 15.9 5.1 15.9 5C14.9 5.1 13.7 5.7 13 6.5C12.4 7.2 11.9 8.3 11.9 9.3C11.9 9.4 11.9 9.5 11.9 9.6C13 9.7 14.2 9 14.9 8.2Z"/>
    </svg>
  ),
  Netflix: () => (
    <svg viewBox="0 0 24 24" className="h-5 w-auto fill-current" xmlns="http://www.w3.org/2000/svg">
       <path d="M17.3 0v24c-1.6 0-3.3-0.4-3.3-0.4L6.9 8.9V24H2.4V0c1.7 0 3.1 0.4 3.1 0.4L12.6 15V0h4.7z"/>
    </svg>
  ),
};

const companyNames = ['Google', 'Meta', 'Amazon', 'Microsoft', 'Apple', 'Netflix'];

// Riso Texture Component to keep things clean
function RisoTexture({ className, rotation = 0 }: { className?: string; rotation?: number }) {
  return (
    <div 
      className={`absolute pointer-events-none overflow-hidden mix-blend-multiply opacity-20 ${className}`}
      style={{
        maskImage: 'radial-gradient(ellipse at center, black 0%, transparent 70%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 0%, transparent 70%)',
        transform: `rotate(${rotation}deg)`,
      }}
    >
      {/* 1. Abstract Fluid/Marble Base */}
      <div className="absolute inset-0 w-[150%] h-[150%] -top-[25%] -left-[25%] blur-[80px]">
        {/* Animated Orbs for Fluidity */}
        <motion.div 
          animate={{ x: [0, 50, 0], y: [0, -30, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-1/2 h-1/2 rounded-full bg-blue-100/80"
        />
        <motion.div 
          animate={{ x: [0, -40, 0], y: [0, 60, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-1/3 right-1/4 w-2/3 h-2/3 rounded-full bg-blue-200/50"
        />
         <motion.div 
          animate={{ rotate: [0, 180, 0], scale: [1, 0.9, 1] }}
          transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-gradient-to-tr from-white/0 via-blue-50/60 to-white/0"
        />
      </div>

      {/* 2. Ben-Day Halftone Dots Overlay */}
      <div 
        className="absolute inset-0" 
        style={{
          backgroundImage: 'radial-gradient(circle, #3b82f6 1.2px, transparent 1.2px)',
          backgroundSize: '8px 8px', // Classic halftone size
          backgroundPosition: '0 0',
        }}
      />
      
      {/* 3. Paper Grain / Noise (SVG Data URI) */}
      <div 
        className="absolute inset-0 opacity-40 mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}

export function Hero() {
  const [videoOpen, setVideoOpen] = useState(false);

  return (
    <>
      {/* ── Video Modal ── */}
      <AnimatePresence>
        {videoOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm"
            onClick={() => setVideoOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-[90vw] max-w-5xl aspect-video rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setVideoOpen(false)}
                className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <iframe
                className="w-full h-full"
                src="https://www.youtube.com/embed/FlXXDesIz0A?autoplay=1"
                title="Screna AI Demo Video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    <section
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{
        // Tech Blue Sky Gradient Base
        background: 'linear-gradient(180deg, #A8D3FF 0%, #E6F0FF 50%, #FFF4DF 100%)',
      }}
    >
      {/* ── Abstract Riso Texture Elements (Localized) ── */}
      {/* Top Right Swirl */}
      <RisoTexture 
        className="top-[-10%] right-[-5%] w-[60vw] h-[60vw] md:w-[40vw] md:h-[40vw]" 
        rotation={-12} 
      />
      
      {/* Bottom Left Swirl */}
      <RisoTexture 
        className="bottom-[-10%] left-[-10%] w-[70vw] h-[70vw] md:w-[45vw] md:h-[45vw]" 
        rotation={20} 
      />
      
      {/* Subtle Center Wash behind headline */}
      <RisoTexture 
        className="top-[20%] left-[20%] w-[60vw] h-[40vw] opacity-10" 
        rotation={0} 
      />

      {/* ── Soft Cloud Shapes (Decoration) ── */}
      <motion.div
        animate={{ x: [0, -10, 0], y: [0, 5, 0] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[15%] right-[10%] w-[30vw] h-[20vw] pointer-events-none z-[1] blur-3xl opacity-60"
        style={{
          background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0) 70%)',
        }}
      />

      <motion.div
        animate={{ x: [0, 10, 0], y: [0, -8, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute bottom-[20%] left-[5%] w-[35vw] h-[25vw] pointer-events-none z-[1] blur-3xl opacity-50"
        style={{
          background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0) 70%)',
        }}
      />
      
      {/* ── Bottom fade to white ── */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-white via-white/80 to-transparent z-[2] pointer-events-none" />

      {/* ── Main Content ── */}
      <div className="max-w-5xl mx-auto px-6 text-center z-10 relative pt-32 pb-24">

        {/* Kicker */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-xs font-bold tracking-[0.25em] text-blue-600/80 uppercase mb-8"
        >
          AI-Powered Interview Coach
        </motion.p>

        {/* Headline — High Contrast Serif */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
          className="font-[family-name:var(--font-serif)] text-5xl md:text-7xl lg:text-[5.5rem] text-slate-900 tracking-tight mb-8 leading-[1.08]"
        >
          Master your interview,{' '}<br className="hidden sm:block" />
          secure your <em className="not-italic font-[family-name:var(--font-serif)] italic text-blue-600">future</em>.
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.45, ease: 'easeOut' }}
          className="text-base md:text-xl text-slate-600 max-w-lg mx-auto mb-14 leading-relaxed font-medium"
        >
          Practice with AI in a judgment-free space. Get instant feedback
          and land the job you deserve.
        </motion.p>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.55 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-24"
        >
          {/* Primary CTA */}
          <Link to="/auth">
            <button className="h-14 px-10 rounded-full text-[15px] font-semibold bg-blue-600 text-white shadow-xl shadow-blue-600/20 hover:shadow-2xl hover:shadow-blue-600/30 hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300">
              Start Practicing Free
            </button>
          </Link>

          {/* Secondary */}
          <button
            onClick={() => setVideoOpen(true)}
            className="h-14 px-8 rounded-full text-[15px] font-medium text-slate-700 hover:text-slate-900 hover:bg-white/40 border border-transparent hover:border-slate-200 transition-all duration-300 flex items-center gap-2.5"
          >
            <PlayCircle className="w-5 h-5 text-slate-500" />
            Watch Demo
          </button>
        </motion.div>

        {/* Social Proof */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="max-w-3xl mx-auto"
        >
          <p className="text-[10px] font-bold text-slate-400 mb-8 uppercase tracking-[0.2em]">
            Trusted by candidates from
          </p>

          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
            {companyNames.map((name) => {
              const Logo = Logos[name as keyof typeof Logos];
              return Logo ? (
                <div
                  key={name}
                  className="text-slate-400 hover:text-slate-600 transition-colors duration-300 cursor-default"
                >
                  <Logo />
                </div>
              ) : null;
            })}
          </div>
        </motion.div>
      </div>
    </section>
    </>
  );
}
