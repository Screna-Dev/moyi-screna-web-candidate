import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, Lock, PlayCircle, Shield, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// PNG Logos for Social Proof
import googleLogo from '../../../assets/Logo-group/Google.png';
import metaLogo from '../../../assets/Logo-group/Meta.png';
import amazonLogo from '../../../assets/Logo-group/Amazon.png';
import microsoftLogo from '../../../assets/Logo-group/Microsoft.png';
import appleLogo from '../../../assets/Logo-group/Apple.png';
import adobeLogo from '../../../assets/Logo-group/adobe.png';
import stripeLogo from '../../../assets/Logo-group/stripe.png';
import { ShinyButton } from '@/components/newDesign/ui/shiny-button';

const companyLogos = [
  { name: 'Google', src: googleLogo },
  { name: 'Meta', src: metaLogo },
  { name: 'Amazon', src: amazonLogo },
  { name: 'Microsoft', src: microsoftLogo },
  { name: 'Apple', src: appleLogo },
  { name: 'Adobe', src: adobeLogo },
  { name: 'Stripe', src: stripeLogo },
];

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
  const { user } = useAuth();
  const navigate = useNavigate();

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
          LEARN &nbsp;•&nbsp; PRACTICE &nbsp;•&nbsp; GROW
        </motion.p>

        {/* Headline — High Contrast Serif */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
          className="font-[family-name:var(--font-serif)] text-5xl md:text-7xl lg:text-[5.5rem] text-slate-900 tracking-tight mb-8 leading-[1.08]"
        >
          The career community{' '}<br className="hidden sm:block" />
          for <span className="text-blue-600">tech</span> job seekers
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.45, ease: 'easeOut' }}
          className="text-base md:text-xl text-slate-600 max-w-2xl mx-auto mb-14 leading-relaxed font-medium"
        >
          Start with AI mock interviews and real interview insights
          <br />
          today and grow with a community built for your entire job search.
        </motion.p>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.55 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-24"
        >
          {/* Primary CTA */}
          <ShinyButton>
            Start Practicing Free
          </ShinyButton>

          {/* Secondary */}
          <button
            onClick={() => setVideoOpen(true)}
            className="h-14 px-8 rounded-full text-[15px] font-medium text-slate-700 hover:text-slate-900 hover:bg-white/40 border border-transparent hover:border-slate-200 transition-all duration-300 flex items-center gap-2.5"
          >
            <PlayCircle className="w-5 h-5 text-slate-500" />
            Watch Demo
          </button>
        </motion.div>

        {/* Trust Bar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.65 }}
          className="flex flex-wrap items-center justify-center gap-5 md:gap-8 mb-24"
        >
          <div className="flex items-center gap-2 text-slate-500">
            <Shield className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium">Privacy-first</span>
          </div>
          <div className="w-px h-3.5 bg-slate-300 hidden sm:block" />
          <div className="flex items-center gap-2 text-slate-500">
            <Lock className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium">Encrypted profile &amp; resume</span>
          </div>
          <div className="w-px h-3.5 bg-slate-300 hidden sm:block" />
          <div className="flex items-center gap-2 text-slate-500">
            <Eye className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium">Never shared without consent</span>
          </div>
          <a
            href="#security"
            className="text-xs font-medium text-blue-600 hover:text-blue-700 underline underline-offset-2 decoration-blue-300 hover:decoration-blue-500 transition-colors"
          >
            Learn more
          </a>
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
            {companyLogos.map(({ name, src }) => (
              <div
                key={name}
                className="opacity-40 hover:opacity-70 transition-opacity duration-300 cursor-default"
              >
                <img src={src} alt={name} className="h-6 w-auto object-contain" />
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
    </>
  );
}
