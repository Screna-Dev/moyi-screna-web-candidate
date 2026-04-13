import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UploadCloud, FileText, Check, Shield, Zap, AlertCircle, ChevronRight,
  ArrowRight, ArrowLeft, Sparkles, RefreshCw, Loader2,
  Code2, Brain, Layers, PenTool, Plus, Mic, Compass, UserCheck, HelpCircle,
  Share2, AlertTriangle, Building2, X, Search, Send, BarChart3, Target,
} from 'lucide-react';
import { uploadResume, updateProfile } from '@/services/ProfileServices';
import { VISA_STATUS_OPTIONS } from '@/types/profile';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/newDesign/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/newDesign/ui/select';
import { Button } from '@/components/newDesign/ui/button';
import { Label } from '@/components/newDesign/ui/label';

// ─── Flow configuration ───────────────────────────────────────────────────────

const FLOW_STEPS = [
  { id: 1, label: 'Account' },
  { id: 2, label: 'Resume' },
  { id: 3, label: 'Role' },
  { id: 4, label: 'Companies' },
  { id: 5, label: 'Status' },
  { id: 6, label: 'Help' },
  { id: 7, label: 'AI Match' },
  { id: 8, label: 'Your Hub' },
];

const ROLE_CATEGORIES = [
  {
    id: 'product',
    label: 'Product',
    roles: [
      { id: 'pm', label: 'Product Manager' },
      { id: 'apm', label: 'Associate Product Manager' },
      { id: 'gpm', label: 'Growth Product Manager' },
      { id: 'tpm', label: 'Technical Product Manager' },
    ],
  },
  {
    id: 'engineering',
    label: 'Engineering',
    roles: [
      { id: 'swe', label: 'Software Engineer' },
      { id: 'fe', label: 'Frontend Engineer' },
      { id: 'be', label: 'Backend Engineer' },
      { id: 'fse', label: 'Full Stack Engineer' },
      { id: 'mobile', label: 'Mobile Engineer' },
      { id: 'devops', label: 'DevOps Engineer' },
      { id: 'qa', label: 'QA / Test Engineer' },
    ],
  },
  {
    id: 'data',
    label: 'Data & AI',
    roles: [
      { id: 'ds', label: 'Data Scientist' },
      { id: 'da', label: 'Data Analyst' },
      { id: 'mle', label: 'Machine Learning Engineer' },
      { id: 'ai-eng', label: 'AI Engineer' },
    ],
  },
  {
    id: 'design',
    label: 'Design & Research',
    roles: [
      { id: 'pd', label: 'Product Designer' },
      { id: 'uxd', label: 'UX Designer' },
      { id: 'uxr', label: 'UX Researcher' },
    ],
  },
  {
    id: 'business',
    label: 'Business / Consulting',
    roles: [
      { id: 'ba', label: 'Business Analyst' },
      { id: 'consultant', label: 'Consultant' },
    ],
  },
];

const ALL_ROLES = ROLE_CATEGORIES.flatMap(cat =>
  cat.roles.map(r => ({ ...r, category: cat.label }))
);

const ROLE_CLARITY = [
  { id: 'exact', label: 'I know exactly what role I want', sub: 'Clear target, ready to prep' },
  { id: 'few', label: "I'm deciding between a few roles", sub: "Narrowing down my options" },
  { id: 'explore', label: "I'm still exploring", sub: 'Open to discovering the right fit' },
];

const COMPANY_POOL = [
  'Google', 'Meta', 'Apple', 'Amazon', 'Microsoft', 'Netflix', 'Stripe', 'Airbnb',
  'Uber', 'Lyft', 'Coinbase', 'OpenAI', 'Anthropic', 'Figma', 'Notion', 'Linear',
  'Vercel', 'Cloudflare', 'Databricks', 'Snowflake', 'Palantir', 'Spotify',
  'Adobe', 'Salesforce', 'Oracle', 'IBM', 'Intuit', 'Twitter', 'Pinterest',
  'Shopify', 'Square', 'Twilio', 'Okta', 'Datadog', 'MongoDB', 'Atlassian',
];

const JOB_STATUSES = [
  { id: 'exploring', label: 'Just exploring', sub: "Getting a sense of what's out there", icon: Compass, accent: '' },
  { id: 'applying', label: 'Actively applying', sub: 'Sending applications and waiting to hear back', icon: Send, accent: '' },
  { id: 'interviews', label: 'Getting interviews', sub: 'Screening calls and technical rounds underway', icon: Mic, accent: 'blue' },
  { id: 'final', label: 'Preparing for final rounds', sub: 'Onsites, system design, exec interviews', icon: Target, accent: 'blue' },
  { id: 'urgent', label: 'Need help urgently', sub: 'Time-sensitive — I need to be ready fast', icon: AlertTriangle, accent: 'amber' },
];

const HELP_OPTIONS = [
  { id: 'ai', label: 'Practice interviews with AI', sub: 'Mock sessions, instant feedback, unlimited reps', icon: Mic },
  { id: 'plan', label: 'Get a clearer plan for what to do next', sub: 'A structured roadmap from where I am now', icon: Compass },
  { id: 'expert', label: 'Get feedback from a real expert', sub: "Personalized coaching from someone who's been there", icon: UserCheck },
  { id: 'referrals', label: 'Help with referrals or job search support', sub: 'Warm intros, outreach strategy, and visibility', icon: Share2 },
  { id: 'unsure', label: "I'm not sure yet", sub: "Show me what's available", icon: HelpCircle },
];

const SYNTHESIS_STEPS = [
  { id: 'resume', label: 'Parsing your resume and work history', duration: 900 },
  { id: 'role', label: 'Identifying role fit and skill alignment', duration: 800 },
  { id: 'companies', label: 'Calibrating against target company patterns', duration: 1000 },
  { id: 'stage', label: 'Adjusting depth for your job search stage', duration: 700 },
  { id: 'plan', label: 'Preparing your personalized starting path', duration: 1100 },
];

// ─── Shared types ─────────────────────────────────────────────────────────────

type UploadState = 'idle' | 'dragging' | 'uploading' | 'success' | 'error';
type CompanyChoice = 'yes' | 'no' | 'exploring' | null;

interface FlowData {
  uploadState: UploadState;
  uploadedFile: File | null;
  targetRole: string;
  roleClarity: string;
  companyChoice: CompanyChoice;
  targetCompanies: string[];
  jobStatus: string;
  helpPreference: string;
}

// ─── Shared chrome ────────────────────────────────────────────────────────────

function StepProgress({ currentStep }: { currentStep: number }) {
  return (
    <div className="w-full max-w-[640px] mx-auto px-4">
      <div className="flex items-center w-full">
        {FLOW_STEPS.map((step, idx) => {
          const isCompleted = step.id < currentStep;
          const isActive = step.id === currentStep;
          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <motion.div
                  animate={isActive ? { scale: [1, 1.08, 1] } : {}}
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                  className={`w-[22px] h-[22px] rounded-full flex items-center justify-center transition-all duration-300 ${
                    isCompleted
                      ? 'bg-[hsl(142,70%,45%)]'
                      : isActive
                      ? 'bg-[hsl(221,91%,60%)] shadow-[0_0_0_4px_hsl(221,91%,60%,0.16)]'
                      : 'bg-[hsl(220,18%,97%)] border border-[hsl(220,16%,88%)]'
                  }`}
                >
                  {isCompleted
                    ? <Check className="w-3 h-3 text-white" strokeWidth={2.5} />
                    : <span className={`text-[9px] font-bold leading-none ${isActive ? 'text-white' : 'text-[hsl(222,12%,65%)]'}`}>{step.id}</span>
                  }
                </motion.div>
                <span className={`text-[9px] font-medium whitespace-nowrap transition-colors ${
                  isCompleted ? 'text-[hsl(142,70%,42%)]' : isActive ? 'text-[hsl(221,91%,60%)]' : 'text-[hsl(222,12%,65%)]'
                }`}>
                  {step.label}
                </span>
              </div>
              {idx < FLOW_STEPS.length - 1 && (
                <div className="flex-1 h-[1.5px] mb-4 mx-0.5 rounded-full overflow-hidden bg-[hsl(220,16%,92%)]">
                  <motion.div
                    className="h-full bg-[hsl(142,70%,45%)] rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: step.id < currentStep ? '100%' : '0%' }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
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

function NavHeader({ stepLabel }: { stepLabel: string }) {
  return (
    <header className="flex items-center justify-between px-8 py-4 border-b border-[hsl(220,16%,94%)] shrink-0">
      <a href="/" className="flex items-center gap-2 group">
        <div className="w-7 h-7 rounded-lg bg-[hsl(221,91%,60%)] flex items-center justify-center">
          <Zap className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-[15px] font-bold text-[hsl(222,22%,15%)]" style={{ letterSpacing: '-0.02em' }}>
          Screna
        </span>
      </a>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[hsl(142,70%,45%)]" />
          <span className="text-[11.5px] font-medium text-[hsl(222,12%,55%)]">{stepLabel}</span>
        </div>
        <button className="text-[12px] font-medium text-[hsl(222,12%,55%)] hover:text-[hsl(222,22%,20%)] transition-colors">
          Save & exit
        </button>
      </div>
    </header>
  );
}

function ProgressHeader({ currentStep }: { currentStep: number }) {
  return (
    <div className="px-8 pt-6 pb-5 flex flex-col items-center border-b border-[hsl(220,16%,94%)] bg-[hsl(220,20%,99%)]">
      <StepProgress currentStep={currentStep} />
    </div>
  );
}

function NavButtons({
  onBack, onNext, nextLabel = 'Continue', nextDisabled, showBack = true, skipLabel,
  onSkip,
}: {
  onBack?: () => void; onNext: () => void; nextLabel?: string; nextDisabled?: boolean;
  showBack?: boolean; skipLabel?: string; onSkip?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 w-full mt-2">
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className={`w-full h-12 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 transition-all duration-200 ${
          nextDisabled
            ? 'bg-[hsl(220,18%,96%)] text-[hsl(222,12%,60%)] border border-[hsl(220,16%,92%)] cursor-not-allowed'
            : 'bg-[hsl(221,91%,60%)] text-white shadow-[0_4px_16px_rgba(67,118,248,0.26)] hover:bg-[hsl(221,91%,55%)] hover:shadow-[0_6px_22px_rgba(67,118,248,0.36)] hover:-translate-y-[1px]'
        }`}
      >
        {nextLabel}
        {!nextDisabled && <ArrowRight className="w-4 h-4" />}
      </button>

      <div className="flex items-center gap-4">
        {showBack && onBack && (
          <button onClick={onBack} className="flex items-center gap-1.5 text-[12.5px] font-medium text-[hsl(222,12%,55%)] hover:text-[hsl(222,22%,25%)] transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
        )}
        {skipLabel && onSkip && (
          <button type="button" onClick={() => onSkip?.()} className="flex items-center gap-1 text-[12.5px] font-medium text-[hsl(222,12%,55%)] hover:text-[hsl(222,22%,25%)] transition-colors group">
            {skipLabel}
            <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function ScreenEyebrow({ step, total }: { step: number; total: number }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[hsl(221,91%,60%)]/8 border border-[hsl(221,91%,60%)]/20 mb-4">
      <span className="text-[10.5px] font-bold text-[hsl(221,91%,55%)] uppercase tracking-[0.6px]">
        Step {step} of {total}
      </span>
    </div>
  );
}

// ─── Screen 2: Upload Resume ──────────────────────────────────────────────────

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Screen2UploadResume({ data, update, onNext, onSkip }: {
  data: FlowData; update: (p: Partial<FlowData>) => void; onNext: () => void; onSkip: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Visa dialog state
  const [showVisaDialog, setShowVisaDialog] = useState(false);
  const [tempVisaStatus, setTempVisaStatus] = useState('');
  const [isSavingVisa, setIsSavingVisa] = useState(false);
  const [pendingResume, setPendingResume] = useState<{
    structuredResume: any; fileName: string; resumePath?: string;
  } | null>(null);

  const saveToLocalStorage = (structuredResume: any, fileName: string, resumePath?: string) => {
    const existing = (() => { try { return JSON.parse(localStorage.getItem('screnaUserData') || '{}'); } catch { return {}; } })();
    localStorage.setItem('screnaUserData', JSON.stringify({
      ...existing,
      resumeFileName: fileName,
      resumeUploadedAt: new Date().toISOString(),
      resumeUploaded: true,
      structuredResume,
      ...(resumePath ? { resume_path: resumePath } : {}),
    }));
  };

  const processFile = useCallback(async (file: File) => {
    if (file.size > 1 * 1024 * 1024) {
      setErrorMsg('Please upload a file smaller than 1MB');
      update({ uploadState: 'error', uploadedFile: file });
      return;
    }
    setErrorMsg(null);
    update({ uploadState: 'uploading', uploadedFile: file });
    try {
      const response = await uploadResume(file);
      const responseData = response.data?.data ?? response.data;
      const structuredResume = responseData?.structured_resume;
      const fileName = responseData?.resumeFileName || file.name;
      const resumePath = responseData?.resume_path;

      if (structuredResume) {
        if (!structuredResume.profile?.visa_status) {
          setPendingResume({ structuredResume, fileName, resumePath });
          setTempVisaStatus('');
          setShowVisaDialog(true);
          update({ uploadState: 'success', uploadedFile: file });
        } else {
          await updateProfile(structuredResume);
          saveToLocalStorage(structuredResume, fileName, resumePath);
          update({ uploadState: 'success', uploadedFile: file });
        }
      } else {
        saveToLocalStorage(null, fileName, resumePath);
        update({ uploadState: 'success', uploadedFile: file });
      }
    } catch {
      setErrorMsg('Upload failed. Please try again.');
      update({ uploadState: 'error', uploadedFile: file });
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [update]);

  const handleVisaStatusSave = async () => {
    if (!tempVisaStatus || !pendingResume) return;
    setIsSavingVisa(true);
    try {
      const updatedResume = {
        ...pendingResume.structuredResume,
        profile: { ...pendingResume.structuredResume.profile, visa_status: tempVisaStatus },
      };
      await updateProfile(updatedResume);
      saveToLocalStorage(updatedResume, pendingResume.fileName, pendingResume.resumePath);
      setShowVisaDialog(false);
      setPendingResume(null);
    } catch {
      setErrorMsg('Failed to save profile. Please try again.');
      setShowVisaDialog(false);
    } finally {
      setIsSavingVisa(false);
    }
  };

  const handleSkipVisaStatus = async () => {
    if (!pendingResume) return;
    setIsSavingVisa(true);
    try {
      await updateProfile(pendingResume.structuredResume);
      saveToLocalStorage(pendingResume.structuredResume, pendingResume.fileName, pendingResume.resumePath);
      setShowVisaDialog(false);
      setPendingResume(null);
    } catch {
      setErrorMsg('Failed to save profile. Please try again.');
      setShowVisaDialog(false);
    } finally {
      setIsSavingVisa(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); if (data.uploadState === 'idle') update({ uploadState: 'dragging' }); };
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); if (data.uploadState === 'dragging') update({ uploadState: 'idle' }); };
  const onDrop = (e: React.DragEvent) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) processFile(f); };
  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) processFile(f); };
  const onClear = () => { setErrorMsg(null); update({ uploadState: 'idle', uploadedFile: null }); };

  const us = data.uploadState;
  const isDragging = us === 'dragging';
  const isSuccess = us === 'success';
  const isError = us === 'error';
  const isUploading = us === 'uploading';

  return (
    <div className="flex flex-col items-center w-full max-w-[500px] mx-auto">
      <ScreenEyebrow step={2} total={8} />

      <h1 className="text-[30px] font-bold text-[hsl(222,22%,12%)] mb-3 text-center" style={{ letterSpacing: '-0.025em', lineHeight: 1.12 }}>
        Upload your{' '}
        <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'hsl(221,91%,60%)' }}>resume</span>
      </h1>
      <p className="text-[15px] text-[hsl(222,12%,48%)] leading-relaxed text-center mb-7 max-w-[400px]">
        We'll use it to personalize your practice path and recommendations.
      </p>

      {/* Upload zone */}
      <div
        onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
        className={`w-full rounded-2xl border-[1.5px] transition-all duration-300 overflow-hidden ${
          isDragging ? 'border-[hsl(221,91%,60%)] bg-[hsl(221,91%,60%)]/5 shadow-[0_0_0_4px_hsl(221,91%,60%,0.1)]'
          : isSuccess ? 'border-[hsl(142,70%,45%)] bg-[hsl(142,70%,45%)]/4 shadow-[0_2px_16px_rgba(0,0,0,0.06)]'
          : isError ? 'border-[hsl(0,60%,50%)] bg-[hsl(0,60%,50%)]/4'
          : 'border-dashed border-[hsl(220,16%,84%)] bg-white shadow-[0_2px_14px_rgba(0,0,0,0.05)] hover:border-[hsl(221,91%,60%)]/50 hover:shadow-[0_4px_22px_rgba(67,118,248,0.08)]'
        }`}
      >
        <AnimatePresence mode="wait">
          {(us === 'idle' || us === 'dragging') && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center px-8 py-11 text-center"
            >
              <motion.div animate={isDragging ? { scale: 1.1 } : { scale: 1 }} transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                className={`relative w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-colors duration-200 ${
                  isDragging ? 'bg-[hsl(221,91%,60%)] shadow-[0_8px_24px_rgba(67,118,248,0.35)]' : 'bg-[hsl(220,18%,97%)] border border-[hsl(220,16%,90%)]'
                }`}
              >
                <UploadCloud className={`w-6 h-6 transition-colors ${isDragging ? 'text-white' : 'text-[hsl(222,12%,55%)]'}`} />
                {isDragging && (
                  <motion.div className="absolute inset-0 rounded-2xl border-2 border-[hsl(221,91%,60%)]"
                    animate={{ opacity: [0.6, 0, 0], scale: [1, 1.5, 1.9] }}
                    transition={{ duration: 1.1, repeat: Infinity }}
                  />
                )}
              </motion.div>

              {isDragging ? (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                  <p className="text-[16px] font-semibold text-[hsl(221,91%,60%)] mb-1">Release to upload</p>
                  <p className="text-[12.5px] text-[hsl(221,91%,60%)]/70">PDF or DOCX · Max 1MB</p>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                  <p className="text-[15px] font-semibold text-[hsl(222,22%,18%)] mb-1.5" style={{ letterSpacing: '-0.01em' }}>
                    Drag and drop your resume here
                  </p>
                  <p className="text-[12.5px] text-[hsl(222,12%,55%)] mb-5">PDF or DOCX · Max 1MB</p>
                  <button onClick={() => inputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[hsl(221,91%,60%)] text-white text-[13px] font-semibold hover:bg-[hsl(221,91%,55%)] shadow-[0_3px_12px_rgba(67,118,248,0.28)] hover:-translate-y-px transition-all"
                  >
                    <FileText className="w-3.5 h-3.5" /> Upload PDF
                  </button>
                </motion.div>
              )}
              <input ref={inputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={onFileSelect} />
            </motion.div>
          )}

          {us === 'uploading' && data.uploadedFile && (
            <motion.div key="uploading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center px-8 py-11 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-[hsl(221,91%,60%)]/10 border border-[hsl(221,91%,60%)]/20 flex items-center justify-center mb-4">
                <Loader2 className="w-5 h-5 text-[hsl(221,91%,60%)] animate-spin" />
              </div>
              <p className="text-[13.5px] font-semibold text-[hsl(222,22%,18%)] mb-0.5 max-w-[240px] truncate">{data.uploadedFile.name}</p>
              <p className="text-[11.5px] text-[hsl(222,12%,60%)] mb-2">{formatFileSize(data.uploadedFile.size)}</p>
              <p className="text-[11.5px] text-[hsl(221,91%,60%)]">Uploading…</p>
            </motion.div>
          )}

          {us === 'success' && data.uploadedFile && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="flex flex-col items-center px-8 py-9 text-center"
            >
              <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.05, type: 'spring', stiffness: 380, damping: 16 }}
                className="relative w-12 h-12 rounded-full bg-[hsl(142,70%,45%)] flex items-center justify-center shadow-[0_6px_20px_rgba(34,197,94,0.3)] mb-4"
              >
                <Check className="w-6 h-6 text-white" strokeWidth={2.5} />
                <motion.div className="absolute inset-0 rounded-full border-2 border-[hsl(142,70%,45%)]"
                  initial={{ scale: 1, opacity: 0.7 }} animate={{ scale: 1.7, opacity: 0 }} transition={{ duration: 0.55 }}
                />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <p className="text-[14.5px] font-semibold text-[hsl(222,22%,15%)] mb-1">Resume uploaded</p>
                <p className="text-[11.5px] text-[hsl(222,12%,58%)] mb-3 max-w-[240px] truncate">{data.uploadedFile.name} · {formatFileSize(data.uploadedFile.size)}</p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[hsl(221,91%,60%)]/8 border border-[hsl(221,91%,60%)]/20 mb-3">
                  <Sparkles className="w-3 h-3 text-[hsl(221,91%,60%)]" />
                  <span className="text-[11px] font-medium text-[hsl(221,91%,55%)]">Screna is scanning your resume…</span>
                </div>
                <button onClick={onClear} className="flex items-center gap-1.5 mx-auto text-[11px] text-[hsl(222,12%,55%)] hover:text-[hsl(222,22%,25%)] transition-colors">
                  <RefreshCw className="w-3 h-3" /> Replace file
                </button>
              </motion.div>
            </motion.div>
          )}

          {us === 'error' && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center px-8 py-11 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-[hsl(0,60%,50%)]/10 border border-[hsl(0,60%,50%)]/20 flex items-center justify-center mb-4">
                <AlertCircle className="w-5 h-5 text-[hsl(0,60%,50%)]" />
              </div>
              <p className="text-[13.5px] font-semibold text-[hsl(222,22%,18%)] mb-1">Couldn't upload that file</p>
              <p className="text-[12px] text-[hsl(222,12%,55%)] mb-4 max-w-[260px]">{errorMsg || 'Please use a PDF or DOCX under 1MB.'}</p>
              <button onClick={onClear} className="px-4 py-2 rounded-lg border border-[hsl(220,16%,90%)] text-[12px] font-medium text-[hsl(222,22%,20%)] hover:border-[hsl(221,91%,60%)]/50 transition-all">
                Try again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* LinkedIn import */}
      {(us === 'idle' || us === 'dragging') && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full mt-3">
          <div className="flex items-center gap-3 my-3">
            <div className="flex-1 h-px bg-[hsl(220,16%,92%)]" />
            <span className="text-[11px] text-[hsl(222,12%,62%)] font-medium">or</span>
            <div className="flex-1 h-px bg-[hsl(220,16%,92%)]" />
          </div>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-[hsl(220,16%,90%)] bg-white hover:border-[hsl(201,100%,35%)]/30 transition-all duration-200 group">
            <div className="w-8 h-8 rounded-lg bg-[hsl(201,100%,35%)] flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>
              </svg>
            </div>
            <div className="flex-1 text-left">
              <p className="text-[13px] font-semibold text-[hsl(222,22%,18%)] leading-tight">Import from LinkedIn</p>
              <p className="text-[11px] text-[hsl(222,12%,60%)] mt-px">Auto-fill from your profile</p>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-[hsl(220,18%,96%)] border border-[hsl(220,16%,90%)] text-[9.5px] font-semibold text-[hsl(222,12%,55%)]">Coming soon</span>
          </button>
        </motion.div>
      )}

      {/* Helper note */}
      <div className="w-full mt-4 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-[hsl(220,20%,99%)] border border-[hsl(220,16%,92%)]">
        <Shield className="w-3.5 h-3.5 text-[hsl(222,12%,60%)] mt-px shrink-0" />
        <p className="text-[11.5px] text-[hsl(222,12%,55%)] leading-relaxed">
          <span className="font-medium text-[hsl(222,22%,25%)]">Uploading your resume helps Screna</span> generate more relevant practice sets. Your file is private and never shared.
        </p>
      </div>

      <div className="w-full mt-6">
        <NavButtons
          onNext={onNext} nextLabel="Continue to Target Role"
          nextDisabled={us !== 'success' || showVisaDialog}
          skipLabel="Skip for now" onSkip={onSkip}
          showBack={false}
        />
      </div>

      {/* Visa Status Dialog */}
      <Dialog open={showVisaDialog} onOpenChange={setShowVisaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Your Work Authorization</DialogTitle>
            <DialogDescription>
              Please select your current work authorization status to help employers understand your eligibility.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Work Authorization Status</Label>
            <Select value={tempVisaStatus} onValueChange={setTempVisaStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select your status" />
              </SelectTrigger>
              <SelectContent>
                {VISA_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleSkipVisaStatus} disabled={isSavingVisa}>
              Skip
            </Button>
            <Button onClick={handleVisaStatusSave} disabled={!tempVisaStatus || isSavingVisa}>
              {isSavingVisa ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Screen 3: Target Role ────────────────────────────────────────────────────

function Screen3TargetRole({ data, update, onNext, onBack }: {
  data: FlowData; update: (p: Partial<FlowData>) => void; onNext: () => void; onBack: () => void;
}) {
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedRole = useMemo(() => ALL_ROLES.find(r => r.id === data.targetRole), [data.targetRole]);

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ROLE_CATEGORIES;
    return ROLE_CATEGORIES
      .map(cat => ({ ...cat, roles: cat.roles.filter(r => r.label.toLowerCase().includes(q)) }))
      .filter(cat => cat.roles.length > 0);
  }, [query]);

  const totalFiltered = filteredCategories.reduce((n, c) => n + c.roles.length, 0);
  const canProceed = data.targetRole && data.roleClarity;

  return (
    <div className="flex flex-col items-center w-full max-w-[540px] mx-auto">
      <ScreenEyebrow step={3} total={8} />
      <h1 className="text-[28px] font-bold text-[hsl(222,22%,12%)] mb-2 text-center" style={{ letterSpacing: '-0.025em', lineHeight: 1.15 }}>
        What role are you targeting?
      </h1>
      <p className="text-[14px] text-[hsl(222,12%,50%)] text-center mb-6 max-w-[380px]">
        We'll tailor every practice session and recommendation to your specific target.
      </p>

      {/* Selected role badge */}
      <AnimatePresence>
        {selectedRole && (
          <motion.div
            initial={{ opacity: 0, y: -6, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto', marginBottom: 12 }}
            exit={{ opacity: 0, y: -4, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="w-full overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[hsl(221,91%,60%)]/8 border border-[hsl(221,91%,60%)]/25">
              <div className="w-4 h-4 rounded-full bg-[hsl(221,91%,60%)] flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
              </div>
              <span className="flex-1 text-[13px] font-semibold text-[hsl(221,91%,50%)]">{selectedRole.label}</span>
              <span className="text-[10.5px] text-[hsl(221,91%,60%)]/60 font-medium">{selectedRole.category}</span>
              <button
                onClick={() => { update({ targetRole: '', roleClarity: '' }); searchRef.current?.focus(); }}
                className="ml-1 w-4 h-4 rounded-full flex items-center justify-center text-[hsl(221,91%,60%)]/60 hover:text-[hsl(221,91%,50%)] hover:bg-[hsl(221,91%,60%)]/15 transition-all"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search input */}
      <div className="w-full relative mb-3">
        <div className="flex items-center gap-2.5 h-11 px-4 rounded-xl border border-[hsl(220,16%,88%)] bg-white focus-within:border-[hsl(221,91%,60%)] focus-within:shadow-[0_0_0_3px_hsl(221,91%,60%,0.12)] transition-all">
          <Search className="w-4 h-4 text-[hsl(222,12%,62%)] shrink-0" />
          <input
            ref={searchRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search roles…"
            className="flex-1 text-[13.5px] text-[hsl(222,22%,15%)] placeholder:text-[hsl(222,12%,62%)] bg-transparent outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-[hsl(222,12%,60%)] hover:text-[hsl(222,22%,25%)] transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Role list — scrollable */}
      <div className="w-full relative">
        <div
          className="w-full overflow-y-auto rounded-xl border border-[hsl(220,16%,90%)] bg-white"
          style={{ maxHeight: '272px' }}
        >
          {totalFiltered === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Search className="w-7 h-7 text-[hsl(222,12%,75%)] mb-3" />
              <p className="text-[13px] font-medium text-[hsl(222,22%,30%)]">No roles found</p>
              <p className="text-[11.5px] text-[hsl(222,12%,60%)] mt-1">Try a different keyword</p>
            </div>
          ) : (
            <div className="p-3 flex flex-col gap-4">
              {filteredCategories.map((cat, ci) => (
                <div key={cat.id}>
                  <p className="text-[10px] font-bold text-[hsl(222,12%,58%)] uppercase tracking-[0.7px] mb-2 px-1">
                    {cat.label}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.roles.map(role => {
                      const sel = data.targetRole === role.id;
                      return (
                        <button
                          key={role.id}
                          onClick={() => {
                            update({ targetRole: role.id, roleClarity: sel ? '' : data.roleClarity });
                            setQuery('');
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12.5px] font-medium transition-all duration-150 ${
                            sel
                              ? 'bg-[hsl(221,91%,60%)] border-[hsl(221,91%,60%)] text-white shadow-[0_2px_10px_rgba(67,118,248,0.28)]'
                              : 'bg-white border-[hsl(220,16%,88%)] text-[hsl(222,22%,22%)] hover:border-[hsl(221,91%,60%)]/50 hover:bg-[hsl(221,91%,60%)]/5 hover:text-[hsl(221,91%,55%)]'
                          }`}
                        >
                          {sel && <Check className="w-3 h-3" strokeWidth={2.5} />}
                          {role.label}
                        </button>
                      );
                    })}
                  </div>
                  {ci < filteredCategories.length - 1 && (
                    <div className="mt-4 h-px bg-[hsl(220,16%,94%)]" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Scroll fade hint */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent rounded-b-xl pointer-events-none" />
      </div>

      <p className="text-[11px] text-[hsl(222,12%,62%)] mt-2.5 self-start">
        {ALL_ROLES.length} roles across {ROLE_CATEGORIES.length} categories
      </p>

      {/* Role clarity — slides in after selection */}
      <AnimatePresence>
        {data.targetRole && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 20 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
            className="w-full overflow-hidden"
          >
            <div className="pt-1 pb-1">
              <p className="text-[13px] font-semibold text-[hsl(222,22%,16%)] mb-3">
                How clear is your target right now?
              </p>
              <div className="flex flex-col gap-2">
                {ROLE_CLARITY.map(({ id, label, sub }) => {
                  const sel = data.roleClarity === id;
                  return (
                    <button key={id} onClick={() => update({ roleClarity: id })}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-200 ${
                        sel
                          ? 'border-[hsl(221,91%,60%)] bg-[hsl(221,91%,60%)]/5 shadow-[0_0_0_1px_hsl(221,91%,60%)]'
                          : 'border-[hsl(220,16%,90%)] bg-white hover:border-[hsl(221,91%,60%)]/40'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center shrink-0 transition-all ${
                        sel ? 'border-[hsl(221,91%,60%)] bg-[hsl(221,91%,60%)]' : 'border-[hsl(220,16%,78%)]'
                      }`}>
                        {sel && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <p className={`text-[13px] font-semibold leading-tight ${sel ? 'text-[hsl(221,91%,55%)]' : 'text-[hsl(222,22%,18%)]'}`}>{label}</p>
                        <p className="text-[11px] text-[hsl(222,12%,58%)] mt-0.5">{sub}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full mt-6">
        <NavButtons onBack={onBack} onNext={onNext} nextLabel="Continue to Companies" nextDisabled={!canProceed} skipLabel="Skip" onSkip={onNext} />
      </div>
    </div>
  );
}

// ─── Screen 4: Target Companies ───────────────────────────────────────────────

function Screen4TargetCompanies({ data, update, onNext, onBack }: {
  data: FlowData; update: (p: Partial<FlowData>) => void; onNext: () => void; onBack: () => void;
}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const onQueryChange = (val: string) => {
    setQuery(val);
    if (val.length > 0) {
      const filtered = COMPANY_POOL.filter(c =>
        c.toLowerCase().startsWith(val.toLowerCase()) && !data.targetCompanies.includes(c)
      ).slice(0, 5);
      setSuggestions(filtered);
    } else setSuggestions([]);
  };

  const addCompany = (name: string) => {
    if (data.targetCompanies.length >= 5 || data.targetCompanies.includes(name)) return;
    update({ targetCompanies: [...data.targetCompanies, name] });
    setQuery(''); setSuggestions([]);
    inputRef.current?.focus();
  };

  const removeCompany = (name: string) => {
    update({ targetCompanies: data.targetCompanies.filter(c => c !== name) });
  };

  const canProceed = data.companyChoice !== null;

  return (
    <div className="flex flex-col items-center w-full max-w-[500px] mx-auto">
      <ScreenEyebrow step={4} total={8} />
      <h1 className="text-[28px] font-bold text-[hsl(222,22%,12%)] mb-2.5 text-center" style={{ letterSpacing: '-0.025em', lineHeight: 1.15 }}>
        Targeting any specific companies?
      </h1>
      <p className="text-[14px] text-[hsl(222,12%,50%)] text-center mb-7 max-w-[360px]">
        This helps us surface the most relevant interview signals and questions.
      </p>

      {/* Yes / Not yet / Still exploring */}
      <div className="flex gap-2 w-full mb-6">
        {[
          { id: 'yes', label: 'Yes', sub: 'I have companies in mind' },
          { id: 'no', label: 'Not yet', sub: 'Open to options' },
          { id: 'exploring', label: 'Still exploring', sub: 'Figuring it out' },
        ].map(({ id, label, sub }) => {
          const sel = data.companyChoice === id;
          return (
            <button key={id} onClick={() => update({ companyChoice: id as CompanyChoice })}
              className={`flex-1 flex flex-col items-center py-4 px-3 rounded-xl border transition-all duration-200 ${
                sel
                  ? 'border-[hsl(221,91%,60%)] bg-[hsl(221,91%,60%)]/6 shadow-[0_0_0_1.5px_hsl(221,91%,60%)]'
                  : 'border-[hsl(220,16%,90%)] bg-white hover:border-[hsl(221,91%,60%)]/40 hover:bg-[hsl(221,91%,60%)]/3'
              }`}
            >
              <span className={`text-[14px] font-semibold transition-colors ${sel ? 'text-[hsl(221,91%,55%)]' : 'text-[hsl(222,22%,18%)]'}`}>{label}</span>
              <span className="text-[10.5px] text-[hsl(222,12%,58%)] mt-1 text-center leading-snug">{sub}</span>
              {sel && (
                <div className="mt-2 w-4 h-4 rounded-full bg-[hsl(221,91%,60%)] flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Company input — appears when "Yes" */}
      <AnimatePresence>
        {data.companyChoice === 'yes' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="w-full overflow-hidden mb-2"
          >
            <div className="pt-1 pb-6">

              {/* ── Company type quick-select ── */}
              <p className="text-[12.5px] font-semibold text-[hsl(222,22%,18%)] mb-2.5">
                By company type
                <span className="ml-2 text-[11px] font-normal text-[hsl(222,12%,58%)]">Select all that apply</span>
              </p>
              <div className="grid grid-cols-2 gap-2 mb-5">
                {([
                  { label: 'Large enterprises',          Icon: Building2 },
                  { label: 'Mid-sized companies',        Icon: BarChart3 },
                  { label: 'Startups / Small companies', Icon: Zap       },
                  { label: 'FAANG / Big tech',           Icon: Target    },
                ] as { label: string; Icon: React.ElementType }[]).map(({ label, Icon }) => {
                  const sel = data.targetCompanies.includes(label);
                  const atLimit = data.targetCompanies.length >= 5 && !sel;
                  return (
                    <button
                      key={label}
                      type="button"
                      disabled={atLimit}
                      onClick={() => sel ? removeCompany(label) : addCompany(label)}
                      className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl border text-left transition-all duration-150 ${
                        sel
                          ? 'border-[hsl(221,91%,60%)] bg-[hsl(221,91%,60%)]/6 shadow-[0_0_0_1px_hsl(221,91%,60%)]'
                          : atLimit
                          ? 'border-[hsl(220,16%,92%)] bg-[hsl(220,18%,99%)] opacity-40 cursor-not-allowed'
                          : 'border-[hsl(220,16%,90%)] bg-white hover:border-[hsl(221,91%,60%)]/40 hover:bg-[hsl(221,91%,60%)]/4'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        sel ? 'bg-[hsl(221,91%,60%)] text-white' : 'bg-[hsl(220,18%,96%)] text-[hsl(222,12%,52%)]'
                      }`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className={`flex-1 text-[12.5px] font-medium leading-snug ${sel ? 'text-[hsl(221,91%,50%)]' : 'text-[hsl(222,22%,18%)]'}`}>
                        {label}
                      </span>
                      {sel && <Check className="w-3.5 h-3.5 text-[hsl(221,91%,55%)] shrink-0" strokeWidth={2.5} />}
                    </button>
                  );
                })}
              </div>

              {/* ── Divider ── */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-[hsl(220,16%,93%)]" />
                <span className="text-[10px] font-semibold text-[hsl(222,12%,62%)] uppercase tracking-[0.6px]">or by name</span>
                <div className="flex-1 h-px bg-[hsl(220,16%,93%)]" />
              </div>

              {/* ── Specific company counter + chips ── */}
              <p className="text-[12.5px] font-semibold text-[hsl(222,22%,18%)] mb-3">
                Specific companies
                <span className="ml-2 text-[11px] font-normal text-[hsl(222,12%,58%)]">
                  {data.targetCompanies.filter(c => !['Large enterprises','Mid-sized companies','Startups / Small companies','FAANG / Big tech'].includes(c)).length} added
                  <span className="mx-1 text-[hsl(220,16%,82%)]">·</span>
                  {data.targetCompanies.length}/5 total
                </span>
              </p>

              {data.targetCompanies.filter(c => !['Large enterprises','Mid-sized companies','Startups / Small companies','FAANG / Big tech'].includes(c)).length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {data.targetCompanies
                    .filter(c => !['Large enterprises','Mid-sized companies','Startups / Small companies','FAANG / Big tech'].includes(c))
                    .map(c => (
                      <span key={c} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[hsl(221,91%,60%)]/10 border border-[hsl(221,91%,60%)]/25 text-[12.5px] font-medium text-[hsl(221,91%,50%)]">
                        {c}
                        <button type="button" onClick={() => removeCompany(c)} className="hover:text-[hsl(221,91%,40%)] transition-colors ml-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                </div>
              )}

              {/* ── Search input ── */}
              {data.targetCompanies.length < 5 && (
                <div className="relative">
                  <div className="flex items-center gap-2 h-10 px-3.5 rounded-xl border border-[hsl(220,16%,88%)] bg-white focus-within:border-[hsl(221,91%,60%)] focus-within:shadow-[0_0_0_3px_hsl(221,91%,60%,0.12)] transition-all">
                    <Search className="w-3.5 h-3.5 text-[hsl(222,12%,60%)] shrink-0" />
                    <input
                      ref={inputRef}
                      value={query}
                      onChange={e => onQueryChange(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && suggestions[0]) addCompany(suggestions[0]); }}
                      placeholder="Search company name…"
                      className="flex-1 text-[13px] text-[hsl(222,22%,18%)] placeholder:text-[hsl(222,12%,65%)] bg-transparent outline-none"
                    />
                  </div>

                  <AnimatePresence>
                    {suggestions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                        className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-[hsl(220,16%,90%)] shadow-[0_8px_24px_rgba(0,0,0,0.1)] z-20 overflow-hidden"
                      >
                        {suggestions.map((s, i) => (
                          <button key={s} type="button" onClick={() => addCompany(s)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[hsl(221,91%,60%)]/6 transition-colors ${i > 0 ? 'border-t border-[hsl(220,16%,94%)]' : ''}`}
                          >
                            <div className="w-6 h-6 rounded-md bg-[hsl(220,18%,96%)] flex items-center justify-center shrink-0">
                              <Building2 className="w-3.5 h-3.5 text-[hsl(222,12%,55%)]" />
                            </div>
                            <span className="text-[13px] font-medium text-[hsl(222,22%,18%)]">{s}</span>
                            <span className="ml-auto text-[11px] text-[hsl(222,12%,60%)]">Add +</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <p className="text-[11px] text-[hsl(222,12%,60%)] mt-2.5">
                This helps us tailor your practice and surface more relevant interview signals.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <NavButtons onBack={onBack} onNext={onNext} nextLabel="Continue to Status" nextDisabled={!canProceed} skipLabel="Skip" onSkip={onNext} />
    </div>
  );
}

// ─── Screen 5: Job Search Status ──────────────────────────────────────────────

function Screen5JobSearchStatus({ data, update, onNext, onBack }: {
  data: FlowData; update: (p: Partial<FlowData>) => void; onNext: () => void; onBack: () => void;
}) {
  return (
    <div className="flex flex-col items-center w-full max-w-[500px] mx-auto">
      <ScreenEyebrow step={5} total={8} />
      <h1 className="text-[28px] font-bold text-[hsl(222,22%,12%)] mb-2.5 text-center" style={{ letterSpacing: '-0.025em', lineHeight: 1.15 }}>
        Where are you in your search?
      </h1>
      <p className="text-[14px] text-[hsl(222,12%,50%)] text-center mb-7 max-w-[360px]">
        This helps us calibrate the depth and urgency of your practice plan.
      </p>

      <div className="flex flex-col gap-2.5 w-full mb-7">
        {JOB_STATUSES.map(({ id, label, sub, icon: Icon, accent }) => {
          const sel = data.jobStatus === id;
          const isAmber = accent === 'amber';
          const isBlue = accent === 'blue';
          return (
            <button key={id} onClick={() => update({ jobStatus: id })}
              className={`relative flex items-center gap-4 px-5 py-4 rounded-xl border text-left transition-all duration-200 overflow-hidden ${
                sel
                  ? isAmber
                    ? 'border-[hsl(38,90%,55%)] bg-[hsl(38,90%,55%)]/6 shadow-[0_0_0_1.5px_hsl(38,90%,55%)]'
                    : 'border-[hsl(221,91%,60%)] bg-[hsl(221,91%,60%)]/5 shadow-[0_0_0_1.5px_hsl(221,91%,60%)]'
                  : 'border-[hsl(220,16%,90%)] bg-white hover:border-[hsl(221,91%,60%)]/40 hover:shadow-[0_2px_10px_rgba(0,0,0,0.05)]'
              }`}
            >
              {/* Left accent bar */}
              {sel && (
                <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full ${
                  isAmber ? 'bg-[hsl(38,90%,55%)]' : 'bg-[hsl(221,91%,60%)]'
                }`} />
              )}

              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                sel
                  ? isAmber ? 'bg-[hsl(38,90%,55%)] text-white' : 'bg-[hsl(221,91%,60%)] text-white'
                  : 'bg-[hsl(220,18%,97%)] text-[hsl(222,12%,55%)]'
              }`}>
                <Icon className="w-4.5 h-4.5" />
              </div>

              <div className="flex-1 min-w-0">
                <p className={`text-[13.5px] font-semibold leading-tight transition-colors ${
                  sel
                    ? isAmber ? 'text-[hsl(38,90%,45%)]' : 'text-[hsl(221,91%,55%)]'
                    : 'text-[hsl(222,22%,18%)]'
                }`}>{label}</p>
                <p className="text-[11.5px] text-[hsl(222,12%,58%)] mt-0.5 leading-snug">{sub}</p>
              </div>

              {sel && (
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  isAmber ? 'bg-[hsl(38,90%,55%)]' : 'bg-[hsl(221,91%,60%)]'
                }`}>
                  <Check className="w-3 h-3 text-white" strokeWidth={2.5} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Urgency hint for "Need help urgently" */}
      <AnimatePresence>
        {data.jobStatus === 'urgent' && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="w-full mb-6 flex items-start gap-3 px-4 py-3.5 rounded-xl bg-[hsl(38,90%,55%)]/8 border border-[hsl(38,90%,55%)]/25"
          >
            <Sparkles className="w-3.5 h-3.5 text-[hsl(38,90%,45%)] mt-0.5 shrink-0" />
            <p className="text-[12px] text-[hsl(38,90%,40%)] leading-relaxed">
              <span className="font-semibold">Intensive mode activated.</span> We'll prioritize high-impact practice and fast-track your setup so you're ready as quickly as possible.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <NavButtons onBack={onBack} onNext={onNext} nextLabel="Continue to Help Preference" nextDisabled={!data.jobStatus} />
    </div>
  );
}

// ─── Screen 6: Help Preference ────────────────────────────────────────────────

function Screen6HelpPreference({ data, update, onNext, onBack }: {
  data: FlowData; update: (p: Partial<FlowData>) => void; onNext: () => void; onBack: () => void;
}) {
  return (
    <div className="flex flex-col items-center w-full max-w-[500px] mx-auto">
      <ScreenEyebrow step={6} total={8} />
      <h1 className="text-[28px] font-bold text-[hsl(222,22%,12%)] mb-2.5 text-center" style={{ letterSpacing: '-0.025em', lineHeight: 1.15 }}>
        What would be most helpful right now?
      </h1>
      <p className="text-[14px] text-[hsl(222,12%,50%)] text-center mb-7 max-w-[380px]">
        No wrong answer — this shapes what we prioritize for you first.
      </p>

      <div className="flex flex-col gap-2.5 w-full mb-7">
        {HELP_OPTIONS.map(({ id, label, sub, icon: Icon }, idx) => {
          const sel = data.helpPreference === id;
          const isUnsure = id === 'unsure';
          return (
            <button key={id} onClick={() => {
                const current = data.helpPreference ? data.helpPreference.split(',') : [];
                const already = current.includes(id);
                update({ helpPreference: already ? current.filter(x => x !== id).join(',') : [...current, id].join(',') });
              }}
              className={`flex items-start gap-4 px-5 py-4 rounded-xl border text-left transition-all duration-200 ${
                data.helpPreference.split(',').includes(id)
                  ? 'border-[hsl(221,91%,60%)] bg-[hsl(221,91%,60%)]/5 shadow-[0_0_0_1.5px_hsl(221,91%,60%)]'
                  : isUnsure
                  ? 'border-dashed border-[hsl(220,16%,88%)] bg-[hsl(220,20%,99%)] hover:border-[hsl(221,91%,60%)]/30'
                  : 'border-[hsl(220,16%,90%)] bg-white hover:border-[hsl(221,91%,60%)]/40 hover:shadow-[0_2px_10px_rgba(0,0,0,0.05)]'
              }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                data.helpPreference.split(',').includes(id) ? 'bg-[hsl(221,91%,60%)] text-white' : 'bg-[hsl(220,18%,97%)] text-[hsl(222,12%,55%)]'
              }`}>
                <Icon className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1">
                <p className={`text-[13.5px] font-semibold leading-tight transition-colors ${
                  data.helpPreference.split(',').includes(id)
                    ? 'text-[hsl(221,91%,55%)]'
                    : isUnsure ? 'text-[hsl(222,22%,35%)]' : 'text-[hsl(222,22%,18%)]'
                }`}>
                  {label}
                </p>
                <p className="text-[11.5px] text-[hsl(222,12%,58%)] mt-0.5 leading-snug">{sub}</p>
              </div>
              {data.helpPreference.split(',').includes(id) && (
                <div className="w-5 h-5 rounded-[4px] bg-[hsl(221,91%,60%)] flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-white" strokeWidth={2.5} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <NavButtons onBack={onBack} onNext={onNext} nextLabel="Build my personalized plan" nextDisabled={!data.helpPreference} />
    </div>
  );
}

// ─── Screen 7: AI Synthesis ───────────────────────────────────────────────────

type SynthesisState = 'pending' | 'running' | 'done';

function Screen7AISynthesis({ data, onDone }: { data: FlowData; onDone: () => void }) {
  const [stepStates, setStepStates] = useState<SynthesisState[]>(
    SYNTHESIS_STEPS.map(() => 'pending')
  );
  const [allDone, setAllDone] = useState(false);

  const roleLabel = ALL_ROLES.find(r => r.id === data.targetRole)?.label || 'Software Engineer';
  const statusLabel = JOB_STATUSES.find(s => s.id === data.jobStatus)?.label || 'Actively applying';
  const helpLabel = HELP_OPTIONS.find(h => h.id === data.helpPreference)?.label || 'Practice interviews with AI';

  useEffect(() => {
    let elapsed = 400;
    const timers: ReturnType<typeof setTimeout>[] = [];

    SYNTHESIS_STEPS.forEach((step, i) => {
      // Start running
      timers.push(setTimeout(() => {
        setStepStates(prev => prev.map((s, idx) => idx === i ? 'running' : s));
      }, elapsed));
      elapsed += step.duration;

      // Mark done
      timers.push(setTimeout(() => {
        setStepStates(prev => prev.map((s, idx) => idx === i ? 'done' : s));
      }, elapsed));
      elapsed += 180;
    });

    // All done
    timers.push(setTimeout(() => setAllDone(true), elapsed + 300));
    return () => timers.forEach(clearTimeout);
  }, []);

  const totalDone = stepStates.filter(s => s === 'done').length;
  const progressPct = (totalDone / SYNTHESIS_STEPS.length) * 100;

  return (
    <div className="flex flex-col items-center w-full max-w-[480px] mx-auto">
      {/* Orb */}
      <div className="relative mb-8 mt-2">
        <div className="w-[88px] h-[88px] relative">
          <motion.div
            className="absolute inset-0 rounded-full bg-[hsl(221,91%,60%)]/14"
            animate={{ scale: [1, 1.15, 1], opacity: [0.7, 0.4, 0.7] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute inset-3 rounded-full bg-[hsl(221,91%,60%)]/22"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-[hsl(221,91%,60%)] flex items-center justify-center shadow-[0_0_32px_rgba(67,118,248,0.45)]">
              <Brain className="w-6 h-6 text-white" />
            </div>
          </div>
          {/* Orbiting dots */}
          {[0, 1, 2].map(i => (
            <motion.div key={i}
              className="absolute w-2 h-2 rounded-full bg-[hsl(221,91%,60%)] top-1/2 left-1/2"
              style={{ marginLeft: -4, marginTop: -4 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 3 + i * 0.8, repeat: Infinity, ease: 'linear', delay: i * 0.9 }}
            >
              <div className="absolute" style={{ transform: `translateX(${38 + i * 4}px)` }}>
                <div className="w-2 h-2 rounded-full bg-[hsl(221,91%,60%)] opacity-80" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-[26px] font-bold text-[hsl(222,22%,12%)] mb-2" style={{ letterSpacing: '-0.025em' }}>
          {allDone ? 'Your path is ready' : 'Personalizing your starting path'}
        </h1>
        <p className="text-[14px] text-[hsl(222,12%,50%)] max-w-[380px] mx-auto leading-relaxed">
          {allDone
            ? "We've built a starting point tailored to your background, stage, and goals."
            : "We're analyzing your background and goals to prepare the most relevant recommendations."}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[11.5px] font-medium text-[hsl(222,12%,55%)]">
            {allDone ? 'Complete' : 'Analyzing…'}
          </span>
          <span className="text-[11.5px] font-bold text-[hsl(221,91%,60%)]">{Math.round(progressPct)}%</span>
        </div>
        <div className="h-1.5 bg-[hsl(220,18%,94%)] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-[hsl(221,91%,60%)] to-[hsl(221,91%,72%)] rounded-full"
            animate={{ width: `${allDone ? 100 : progressPct}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Synthesis step list */}
      <div className="w-full flex flex-col gap-2.5 mb-8">
        {SYNTHESIS_STEPS.map(({ id, label }, i) => {
          const state = stepStates[i];
          return (
            <motion.div key={id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: state === 'pending' ? 0.35 : 1, x: 0 }}
              transition={{ delay: i * 0.06, duration: 0.25 }}
              className="flex items-center gap-3"
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                state === 'done' ? 'bg-[hsl(142,70%,45%)]'
                : state === 'running' ? 'bg-[hsl(221,91%,60%)]'
                : 'bg-[hsl(220,18%,94%)]'
              }`}>
                {state === 'done'
                  ? <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  : state === 'running'
                  ? <motion.div className="w-1.5 h-1.5 rounded-full bg-white" animate={{ scale: [1, 0.6, 1] }} transition={{ duration: 0.7, repeat: Infinity }} />
                  : null
                }
              </div>
              <span className={`text-[13px] transition-all duration-300 ${
                state === 'done' ? 'text-[hsl(222,22%,30%)] font-medium'
                : state === 'running' ? 'text-[hsl(221,91%,55%)] font-semibold'
                : 'text-[hsl(222,12%,65%)]'
              }`}>{label}</span>
            </motion.div>
          );
        })}
      </div>

      {/* Profile snapshot — fades in when done */}
      <AnimatePresence>
        {allDone && (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
            className="w-full mb-7"
          >
            <div className="p-5 rounded-2xl bg-[hsl(220,20%,99%)] border border-[hsl(220,16%,92%)] shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-3.5 h-3.5 text-[hsl(221,91%,60%)]" />
                <span className="text-[11px] font-bold text-[hsl(221,91%,55%)] uppercase tracking-wider">Your profile snapshot</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Target Role', value: data.targetRole ? roleLabel : 'Exploring' },
                  { label: 'Search Stage', value: data.jobStatus ? statusLabel : 'Getting started' },
                  { label: 'Focus Area', value: data.helpPreference ? helpLabel.split(' ').slice(0, 3).join(' ') + '…' : 'To be defined' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col gap-1">
                    <span className="text-[9.5px] font-semibold text-[hsl(222,12%,58%)] uppercase tracking-wider">{label}</span>
                    <span className="text-[12.5px] font-semibold text-[hsl(222,22%,18%)] leading-snug">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA */}
      <AnimatePresence>
        {allDone && (
          <motion.button
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.35, delay: 0.15 }}
            onClick={onDone}
            className="w-full h-12 rounded-xl bg-[hsl(221,91%,60%)] text-white text-[14px] font-semibold flex items-center justify-center gap-2 shadow-[0_4px_18px_rgba(67,118,248,0.32)] hover:bg-[hsl(221,91%,55%)] hover:shadow-[0_6px_24px_rgba(67,118,248,0.42)] hover:-translate-y-[1px] transition-all duration-200"
          >
            View your personalized hub
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main flow controller ─────────────────────────────────────────────────────

const stepLabels: Record<number, string> = {
  2: 'Resume upload',
  3: 'Target role',
  4: 'Target companies',
  5: 'Job search status',
  6: 'Help preference',
  7: 'AI synthesis',
};

const variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 36 : -36 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -36 : 36 }),
};

export function OnboardingUploadResumePage() {
  const [step, setStep] = useState(2);
  const [direction, setDirection] = useState(1);
  const [data, setData] = useState<FlowData>({
    uploadState: 'idle', uploadedFile: null,
    targetRole: '', roleClarity: '',
    companyChoice: null, targetCompanies: [],
    jobStatus: '', helpPreference: '',
  });

  const update = useCallback((partial: Partial<FlowData>) => {
    setData(prev => ({ ...prev, ...partial }));
  }, []);

  const goTo = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };
  const goNext = () => goTo(Math.min(step + 1, 7));
  const goBack = () => goTo(Math.max(step - 1, 2));

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <NavHeader stepLabel={stepLabels[step] || ''} />
      <ProgressHeader currentStep={step} />

      <main className="flex-1 flex flex-col items-center px-6 pt-10 pb-16 overflow-hidden">
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
            {step === 2 && <Screen2UploadResume data={data} update={update} onNext={goNext} onSkip={goNext} />}
            {step === 3 && <Screen3TargetRole data={data} update={update} onNext={goNext} onBack={goBack} />}
            {step === 4 && <Screen4TargetCompanies data={data} update={update} onNext={goNext} onBack={goBack} />}
            {step === 5 && <Screen5JobSearchStatus data={data} update={update} onNext={goNext} onBack={goBack} />}
            {step === 6 && <Screen6HelpPreference data={data} update={update} onNext={goNext} onBack={goBack} />}
            {step === 7 && <Screen7AISynthesis data={data} onDone={() => window.location.href = '/dashboard'} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="py-4 px-8 border-t border-[hsl(220,16%,94%)] flex items-center justify-center shrink-0">
        <p className="text-[11px] text-[hsl(222,12%,65%)]">© 2026 Screna · Privacy Policy · Terms</p>
      </footer>
    </div>
  );
}
