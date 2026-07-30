import { useState, useRef, useCallback, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check, ArrowRight, ArrowLeft, UploadCloud, FileText, RefreshCw,
  Hash, Plus, UserPlus,
} from 'lucide-react';
import { uploadResume } from '@/services/ProfileServices';
import { usePostHog } from 'posthog-js/react';
import { markOnboardingComplete } from '@/utils/analytics';
import { safeCapture } from '@/utils/posthog';
import { EVENTS } from '@/constants/analyticsEvents';
import logoImg from '@/assets/Navbar.png';

// ─── Flow configuration ───────────────────────────────────────────────────────
// New 3-step onboarding: Account (completed at signup) → Source → Resume.

const FLOW_STEPS = [
  { id: 1, label: 'Account' },
  { id: 2, label: 'Source' },
  { id: 3, label: 'Resume' },
];

// ─── Brand glyphs ─────────────────────────────────────────────────────────────

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

function RedditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M24 11.779c0-1.459-1.192-2.645-2.657-2.645-.715 0-1.363.286-1.84.746-1.81-1.191-4.259-1.949-6.971-2.046l1.483-4.669 4.016.941-.006.058c0 1.193.975 2.163 2.174 2.163 1.198 0 2.172-.97 2.172-2.163s-.975-2.164-2.172-2.164c-.92 0-1.704.574-2.021 1.379l-4.329-1.015a.379.379 0 0 0-.44.249l-1.654 5.207c-2.758.07-5.246.829-7.077 2.033-.477-.462-1.126-.749-1.842-.749C1.192 9.134 0 10.32 0 11.779c0 1.079.65 2.006 1.58 2.415-.041.263-.063.53-.063.799 0 4.038 4.591 7.322 10.238 7.322s10.239-3.284 10.239-7.322c0-.269-.023-.536-.063-.799.928-.41 1.578-1.337 1.578-2.415Zm-17.436 2.833c0-.844.685-1.531 1.526-1.531.841 0 1.526.687 1.526 1.531 0 .844-.685 1.53-1.526 1.53-.841.001-1.526-.686-1.526-1.53Zm8.878 4.242c-.867.869-2.271 1.324-4.001 1.324s-3.134-.455-4.001-1.324a.319.319 0 0 1 0-.439.316.316 0 0 1 .438 0c.653.655 1.816 1.079 3.563 1.079 1.746 0 2.91-.424 3.563-1.079a.316.316 0 0 1 .438 0 .319.319 0 0 1 0 .439Zm-.325-2.712c-.841 0-1.526-.686-1.526-1.53 0-.844.685-1.531 1.526-1.531.841 0 1.526.687 1.526 1.531 0 .844-.685 1.53-1.526 1.53Z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

// ─── Source options ───────────────────────────────────────────────────────────

interface SourceOption {
  id: string;
  label: string;
  tile: string;      // icon tile background classes
  icon: React.ReactNode;
  isReferral?: boolean;
}

const SOURCE_OPTIONS: SourceOption[] = [
  {
    id: 'xiaohongshu',
    label: 'Xiaohongshu (RED)',
    tile: 'bg-[#FF2442]',
    icon: <span className="text-white text-[8px] font-bold leading-none tracking-tight">小红书</span>,
  },
  {
    id: 'reddit',
    label: 'Reddit',
    tile: 'bg-[#FF4500]',
    icon: <RedditIcon className="w-4 h-4 text-white" />,
  },
  {
    id: 'x',
    label: 'X (Twitter)',
    tile: 'bg-black',
    icon: <XIcon className="w-3.5 h-3.5 text-white" />,
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    tile: 'bg-[#0A66C2]',
    icon: <LinkedInIcon className="w-4 h-4 text-white" />,
  },
  {
    id: 'other_social',
    label: 'Other social media',
    tile: 'bg-[hsl(330,80%,95%)]',
    icon: <Hash className="w-4 h-4 text-[hsl(330,75%,55%)]" />,
  },
  {
    id: 'somewhere_else',
    label: 'Somewhere else',
    tile: 'bg-[hsl(220,16%,93%)]',
    icon: <Plus className="w-4 h-4 text-[hsl(222,12%,45%)]" />,
  },
  {
    id: 'referral',
    label: 'Referred by someone',
    tile: 'bg-[hsl(221,91%,94%)]',
    icon: <UserPlus className="w-4 h-4 text-[hsl(221,91%,55%)]" />,
    isReferral: true,
  },
];

// ─── Shared chrome ────────────────────────────────────────────────────────────

function NavHeader({ stepLabel }: { stepLabel: string }) {
  return (
    <header className="flex items-center justify-between px-8 py-4 border-b border-[hsl(220,16%,94%)] shrink-0">
      <a href="/" className="flex items-center gap-2">
        <img src={logoImg} alt="Screna" className="h-6 w-auto" />
      </a>
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-[hsl(142,70%,45%)]" />
        <span className="text-[12.5px] font-medium text-[hsl(222,12%,55%)]">{stepLabel}</span>
      </div>
    </header>
  );
}

function StepProgress({ currentStep }: { currentStep: number }) {
  return (
    <div className="w-full max-w-[560px] mx-auto px-4 py-5 flex items-center justify-center">
      <div className="flex items-center w-full">
        {FLOW_STEPS.map((step, idx) => {
          const isCompleted = step.id < currentStep;
          const isActive = step.id === currentStep;
          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isCompleted
                      ? 'bg-[hsl(142,70%,45%)] text-white'
                      : isActive
                      ? 'bg-[hsl(221,91%,60%)] text-white shadow-[0_0_0_4px_hsl(221,91%,60%,0.16)]'
                      : 'bg-[hsl(220,18%,97%)] border border-[hsl(220,16%,88%)] text-[hsl(222,12%,65%)]'
                  }`}
                >
                  {isCompleted
                    ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                    : <span className="text-[11px] font-bold leading-none">{step.id}</span>}
                </div>
                <span
                  className={`text-[10.5px] font-medium whitespace-nowrap transition-colors ${
                    isCompleted ? 'text-[hsl(142,70%,42%)]' : isActive ? 'text-[hsl(221,91%,60%)]' : 'text-[hsl(222,12%,65%)]'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {idx < FLOW_STEPS.length - 1 && (
                <div className="flex-1 h-[2px] mb-4 mx-2 rounded-full bg-[hsl(220,16%,92%)] overflow-hidden">
                  <div
                    className="h-full bg-[hsl(142,70%,45%)] rounded-full transition-all duration-500"
                    style={{ width: step.id < currentStep ? '100%' : '0%' }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 2: Source ───────────────────────────────────────────────────────────

function SourceStep({
  source, setSource, referralCode, setReferralCode, referralApplied, onApplyReferral, onNext,
}: {
  source: string;
  setSource: (s: string) => void;
  referralCode: string;
  setReferralCode: (v: string) => void;
  referralApplied: boolean;
  onApplyReferral: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col items-center w-full max-w-[660px] mx-auto">
      <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-[hsl(221,91%,60%)]/8 border border-[hsl(221,91%,60%)]/20 mb-4">
        <span className="text-[10.5px] font-bold text-[hsl(221,91%,55%)] uppercase tracking-[0.6px]">Step 2 of 3</span>
      </div>

      <h1 className="text-[32px] font-bold text-[hsl(222,22%,12%)] mb-4 text-center" style={{ letterSpacing: '-0.025em', lineHeight: 1.1 }}>
        How did you hear about Screna?
      </h1>

      <div className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-white border border-[hsl(221,91%,60%)]/25 shadow-[0_1px_4px_rgba(0,0,0,0.04)] mb-8">
        <span className="text-[12.5px] font-medium text-[hsl(221,91%,55%)]">Start with 30 free credits</span>
      </div>

      {/* Options grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
        {SOURCE_OPTIONS.map((opt) => {
          const sel = source === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSource(opt.id)}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all duration-200 ${
                sel
                  ? 'border-[hsl(221,91%,60%)] bg-[hsl(221,91%,60%)]/[0.04] shadow-[0_0_0_1px_hsl(221,91%,60%)]'
                  : 'border-[hsl(220,16%,90%)] bg-white hover:border-[hsl(221,91%,60%)]/40 hover:shadow-[0_2px_10px_rgba(0,0,0,0.05)]'
              }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${opt.tile}`}>
                {opt.icon}
              </div>
              <span className="flex-1 text-[14px] font-semibold text-[hsl(222,22%,18%)]">{opt.label}</span>
              <div
                className={`w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center shrink-0 transition-all ${
                  sel ? 'border-[hsl(221,91%,60%)] bg-[hsl(221,91%,60%)]' : 'border-[hsl(220,16%,80%)]'
                }`}
              >
                {sel && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Invite code — appears when "Referred by someone" is selected */}
      <AnimatePresence>
        {source === 'referral' && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 20 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            className="w-full overflow-hidden"
          >
            <label htmlFor="inviteCode" className="block text-[13px] font-semibold text-[hsl(222,22%,16%)] mb-2">
              Invite code <span className="font-normal text-[hsl(222,12%,58%)]">(optional)</span>
            </label>
            <div className="flex items-center gap-2 h-12 pl-4 pr-1.5 rounded-xl border border-[hsl(220,16%,88%)] bg-white focus-within:border-[hsl(221,91%,60%)] focus-within:shadow-[0_0_0_3px_hsl(221,91%,60%,0.12)] transition-all">
              <input
                id="inviteCode"
                type="text"
                value={referralCode}
                disabled={referralApplied}
                onChange={(e) => setReferralCode(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onApplyReferral(); } }}
                placeholder="Enter your referral code"
                className="flex-1 text-[14px] text-[hsl(222,22%,15%)] placeholder:text-[hsl(222,12%,62%)] bg-transparent outline-none disabled:text-[hsl(222,12%,50%)]"
              />
              {referralApplied ? (
                <span className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-[hsl(142,70%,45%)]/10 text-[13px] font-semibold text-[hsl(142,70%,38%)]">
                  <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> Applied
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onApplyReferral}
                  disabled={!referralCode.trim()}
                  className={`px-4 h-9 rounded-lg text-[13px] font-semibold transition-colors ${
                    referralCode.trim()
                      ? 'text-[hsl(221,91%,55%)] hover:bg-[hsl(221,91%,60%)]/10'
                      : 'text-[hsl(222,12%,65%)] cursor-not-allowed'
                  }`}
                >
                  Apply
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Continue */}
      <button
        onClick={onNext}
        disabled={!source}
        className={`w-full mt-8 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 py-4 transition-all duration-200 ${
          source
            ? 'bg-[hsl(221,91%,60%)] text-white shadow-[0_4px_16px_rgba(67,118,248,0.26)] hover:bg-[hsl(221,91%,55%)] hover:shadow-[0_6px_22px_rgba(67,118,248,0.36)] hover:-translate-y-[1px]'
            : 'bg-[hsl(220,18%,96%)] text-[hsl(222,12%,60%)] cursor-not-allowed'
        }`}
      >
        Continue to resume
        {source && <ArrowRight className="w-4 h-4" />}
      </button>
    </div>
  );
}

// ─── Step 3: Resume ───────────────────────────────────────────────────────────

type UploadState = 'idle' | 'dragging' | 'success' | 'error';

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ResumeStep({
  uploadState, setUploadState, file, setFile, isSubmitting, onFinish, onBack, onSkip,
}: {
  uploadState: UploadState;
  setUploadState: (s: UploadState) => void;
  file: File | null;
  setFile: (f: File | null) => void;
  isSubmitting: boolean;
  onFinish: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((f: File) => {
    const ext = f.name.toLowerCase().substring(f.name.lastIndexOf('.'));
    const ok = ['.pdf', '.doc', '.docx'].includes(ext) && f.size < 5 * 1024 * 1024;
    if (!ok) { setUploadState('error'); setFile(null); return; }
    setFile(f);
    setUploadState('success');
  }, [setFile, setUploadState]);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); if (uploadState === 'idle') setUploadState('dragging'); };
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); if (uploadState === 'dragging') setUploadState('idle'); };
  const onDrop = (e: React.DragEvent) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) processFile(f); };
  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) processFile(f); };
  const onClear = () => { setFile(null); setUploadState('idle'); };

  const isDragging = uploadState === 'dragging';
  const isSuccess = uploadState === 'success' && !!file;
  const isError = uploadState === 'error';

  return (
    <div className="flex flex-col items-center w-full max-w-[560px] mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-[hsl(221,91%,60%)]/8 border border-[hsl(221,91%,60%)]/20 text-[10.5px] font-bold text-[hsl(221,91%,55%)] uppercase tracking-[0.6px]">
          Step 3 of 3
        </span>
        <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-[hsl(221,91%,60%)]/8 border border-[hsl(221,91%,60%)]/20 text-[11.5px] font-semibold text-[hsl(221,91%,55%)]">
          +30 credits
        </span>
      </div>

      <h1 className="text-[32px] font-bold text-[hsl(222,22%,12%)] mb-2.5 text-center" style={{ letterSpacing: '-0.025em', lineHeight: 1.1 }}>
        Upload your{' '}
        <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'hsl(221,91%,60%)' }}>resume</span>
      </h1>
      <p className="text-[15px] text-[hsl(222,12%,48%)] text-center mb-8">
        We'll use it to build your profile and personalize your practice.
      </p>

      {/* Upload zone */}
      <div
        onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
        className={`w-full rounded-2xl border-[1.5px] transition-all duration-300 overflow-hidden ${
          isDragging ? 'border-[hsl(221,91%,60%)] bg-[hsl(221,91%,60%)]/5 shadow-[0_0_0_4px_hsl(221,91%,60%,0.1)]'
          : isSuccess ? 'border-[hsl(142,70%,45%)] bg-[hsl(142,70%,45%)]/[0.04]'
          : isError ? 'border-[hsl(0,60%,55%)] bg-[hsl(0,60%,55%)]/[0.04]'
          : 'border-dashed border-[hsl(220,16%,84%)] bg-white hover:border-[hsl(221,91%,60%)]/50'
        }`}
      >
        <AnimatePresence mode="wait">
          {(uploadState === 'idle' || uploadState === 'dragging') && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center px-8 py-12 text-center"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-colors ${
                isDragging ? 'bg-[hsl(221,91%,60%)]' : 'bg-[hsl(220,18%,96%)] border border-[hsl(220,16%,90%)]'
              }`}>
                <UploadCloud className={`w-5 h-5 ${isDragging ? 'text-white' : 'text-[hsl(222,12%,55%)]'}`} />
              </div>
              <p className="text-[15px] font-semibold text-[hsl(222,22%,18%)] mb-1.5">Drag and drop your resume here</p>
              <p className="text-[12.5px] text-[hsl(222,12%,55%)] mb-5">PDF or DOCX · Max 5 MB</p>
              <button onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[hsl(221,91%,60%)] text-white text-[13.5px] font-semibold hover:bg-[hsl(221,91%,55%)] shadow-[0_3px_12px_rgba(67,118,248,0.28)] hover:-translate-y-px transition-all"
              >
                Choose a file
              </button>
              <input ref={inputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={onFileSelect} />
            </motion.div>
          )}

          {isSuccess && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center px-8 py-10 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-[hsl(142,70%,45%)] flex items-center justify-center shadow-[0_6px_20px_rgba(34,197,94,0.3)] mb-4">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <p className="text-[14.5px] font-semibold text-[hsl(222,22%,15%)] mb-1">Resume ready</p>
              <p className="text-[12px] text-[hsl(222,12%,58%)] mb-3 max-w-[280px] truncate">{file.name} · {formatFileSize(file.size)}</p>
              <button onClick={onClear} className="flex items-center gap-1.5 text-[11.5px] text-[hsl(222,12%,55%)] hover:text-[hsl(222,22%,25%)] transition-colors">
                <RefreshCw className="w-3 h-3" /> Choose a different file
              </button>
            </motion.div>
          )}

          {isError && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center px-8 py-12 text-center"
            >
              <p className="text-[13.5px] font-semibold text-[hsl(222,22%,18%)] mb-1">Can't use that file</p>
              <p className="text-[12px] text-[hsl(222,12%,55%)] mb-4 max-w-[260px]">Please use a PDF or DOCX under 5 MB.</p>
              <button onClick={onClear} className="px-4 py-2 rounded-lg border border-[hsl(220,16%,90%)] text-[12px] font-medium text-[hsl(222,22%,20%)] hover:border-[hsl(221,91%,60%)]/50 transition-all">
                Try again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Privacy note */}
      <div className="w-full mt-4 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[hsl(220,20%,99%)] border border-[hsl(220,16%,92%)]">
        <div className="w-5 h-5 rounded-full bg-[hsl(142,70%,45%)]/12 flex items-center justify-center shrink-0">
          <Check className="w-3 h-3 text-[hsl(142,70%,42%)]" strokeWidth={2.5} />
        </div>
        <p className="text-[12px] text-[hsl(222,12%,52%)]">
          Your resume is private. We only use it to personalize your Screna experience.
        </p>
      </div>

      {/* Finish */}
      <button
        onClick={onFinish}
        disabled={!isSuccess || isSubmitting}
        className={`w-full mt-6 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 py-4 transition-all duration-200 ${
          isSuccess && !isSubmitting
            ? 'bg-[hsl(221,91%,60%)] text-white shadow-[0_4px_16px_rgba(67,118,248,0.26)] hover:bg-[hsl(221,91%,55%)] hover:shadow-[0_6px_22px_rgba(67,118,248,0.36)] hover:-translate-y-[1px]'
            : 'bg-[hsl(220,18%,96%)] text-[hsl(222,12%,60%)] cursor-not-allowed'
        }`}
      >
        {isSubmitting ? (
          <><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Setting up…</>
        ) : (
          <>Finish setup <ArrowRight className="w-4 h-4" /></>
        )}
      </button>

      {/* Back / Skip */}
      <div className="w-full mt-4 flex items-center justify-between">
        <button onClick={onBack} disabled={isSubmitting}
          className="flex items-center gap-1.5 text-[13px] font-medium text-[hsl(222,12%,55%)] hover:text-[hsl(222,22%,25%)] transition-colors disabled:opacity-50">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <button onClick={onSkip} disabled={isSubmitting}
          className="text-[13px] font-medium text-[hsl(222,12%,55%)] hover:text-[hsl(222,22%,25%)] transition-colors disabled:opacity-50">
          Do it later in my profile
        </button>
      </div>
    </div>
  );
}

// ─── Main flow controller ─────────────────────────────────────────────────────

const STEP_LABELS: Record<number, string> = {
  2: 'About you',
  3: 'Resume upload',
};

const variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 36 : -36 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -36 : 36 }),
};

export function OnboardingUploadResumePage() {
  const posthog = usePostHog();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '';

  const [step, setStep] = useState(2);
  const [direction, setDirection] = useState(1);

  // Source step state
  const [source, setSource] = useState('');
  const urlReferral =
    searchParams.get('ref') ||
    searchParams.get('referral_code') ||
    searchParams.get('referralCode') ||
    '';
  const [referralCode, setReferralCode] = useState(urlReferral);
  const [referralApplied, setReferralApplied] = useState(false);

  // Resume step state
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-select "Referred by someone" if a referral code arrived via URL
  useEffect(() => {
    if (urlReferral) setSource('referral');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // onboarding_step_viewed
  useEffect(() => {
    safeCapture(posthog, EVENTS.ONBOARDING_STEP_VIEWED, {
      step_number: step,
      step_name: FLOW_STEPS.find(s => s.id === step)?.label ?? String(step),
    });
  }, [step, posthog]);

  const goTo = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  const applyReferral = () => {
    if (!referralCode.trim()) return;
    setReferralApplied(true);
    try {
      const existing = JSON.parse(localStorage.getItem('screnaUserData') || '{}');
      localStorage.setItem('screnaUserData', JSON.stringify({ ...existing, referralCode: referralCode.trim() }));
    } catch { /* localStorage unavailable — ignore */ }
  };

  const handleSourceNext = () => {
    // referral_source_completed
    safeCapture(posthog, EVENTS.REFERRAL_SOURCE_COMPLETED, {
      source,
      referral_code: source === 'referral' && referralApplied ? referralCode.trim() : null,
    });
    goTo(3);
  };

  const completeOnboarding = (resumeUploaded: boolean) => {
    markOnboardingComplete(posthog, 'onboarding_resume', {
      source: source || null,
      resume_uploaded: resumeUploaded,
    });
    navigate(returnTo || '/dashboard');
  };

  const handleFinish = async () => {
    if (!file) return;
    setIsSubmitting(true);
    const startedAt = Date.now();
    try {
      const res = await uploadResume(file);
      safeCapture(posthog, EVENTS.RESUME_PARSE_COMPLETED, {
        duration_ms: Date.now() - startedAt,
        cache_hit: res?.data?.cache_hit ?? res?.data?.data?.cache_hit ?? null,
        source: 'onboarding',
      });
      try {
        const structuredResume = res?.data?.data?.structured_resume ?? res?.data?.structured_resume ?? res?.data;
        const existing = JSON.parse(localStorage.getItem('screnaUserData') || '{}');
        localStorage.setItem('screnaUserData', JSON.stringify({
          ...existing,
          resumeFileName: file.name,
          resumeUploadedAt: new Date().toISOString(),
          resumeUploaded: true,
          structuredResume,
        }));
      } catch { /* ignore */ }
    } catch (err) {
      // Non-blocking — proceed into the app even if parsing fails.
      console.error('[uploadResume] failed', err);
    } finally {
      setIsSubmitting(false);
      completeOnboarding(true);
    }
  };

  const handleSkip = () => {
    safeCapture(posthog, EVENTS.RESUME_UPLOAD_SKIPPED, { step: 'onboarding' });
    completeOnboarding(false);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <NavHeader stepLabel={STEP_LABELS[step] || ''} />
      <div className="border-b border-[hsl(220,16%,94%)] bg-[hsl(220,20%,99%)]">
        <StepProgress currentStep={step} />
      </div>

      <main className="flex-1 flex flex-col items-center px-6 pt-12 pb-16 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
            className="w-full flex flex-col items-center"
          >
            {step === 2 && (
              <SourceStep
                source={source}
                setSource={setSource}
                referralCode={referralCode}
                setReferralCode={setReferralCode}
                referralApplied={referralApplied}
                onApplyReferral={applyReferral}
                onNext={handleSourceNext}
              />
            )}
            {step === 3 && (
              <ResumeStep
                uploadState={uploadState}
                setUploadState={setUploadState}
                file={file}
                setFile={setFile}
                isSubmitting={isSubmitting}
                onFinish={handleFinish}
                onBack={() => goTo(2)}
                onSkip={handleSkip}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="py-4 px-8 border-t border-[hsl(220,16%,94%)] flex items-center justify-center shrink-0">
        <p className="text-[11px] text-[hsl(222,12%,65%)]">© 2026 Screna · Privacy Policy · Terms</p>
      </footer>
    </div>
  );
}
