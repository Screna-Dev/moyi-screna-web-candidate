import { useState } from 'react';
import {
  Zap,
  Check,
  ArrowRight,
  ArrowDown,
  UploadCloud,
  Brain,
  Mic,
  BookOpen,
  Rocket,
  Shield,
  ChevronRight,
} from 'lucide-react';

// ─── Reusable mini UI atoms ───────────────────────────────────────────────────

const MiniChip = ({
  label,
  active,
  size = 'sm',
}: {
  label: string;
  active?: boolean;
  size?: 'xs' | 'sm';
}) => (
  <span
    className={`inline-flex items-center rounded-full font-medium whitespace-nowrap ${
      size === 'xs' ? 'px-1.5 py-px text-[6.5px]' : 'px-2 py-0.5 text-[7.5px]'
    } ${
      active
        ? 'bg-[hsl(221,91%,60%)] text-white'
        : 'bg-[hsl(220,18%,96%)] text-[hsl(222,12%,50%)] border border-[hsl(220,16%,90%)]'
    }`}
  >
    {label}
  </span>
);

const MiniInput = ({ placeholder, filled }: { placeholder: string; filled?: string }) => (
  <div className="h-[18px] rounded border border-[hsl(220,16%,90%)] px-2 flex items-center bg-white">
    <span className={`text-[7px] ${filled ? 'text-[hsl(222,22%,20%)]' : 'text-[hsl(222,12%,65%)]'}`}>
      {filled || placeholder}
    </span>
  </div>
);

const MiniBtn = ({
  label,
  variant = 'primary',
  small,
}: {
  label: string;
  variant?: 'primary' | 'ghost' | 'outline';
  small?: boolean;
}) => (
  <div
    className={`rounded-lg flex items-center justify-center ${small ? 'h-5' : 'h-[22px]'} ${
      variant === 'primary'
        ? 'bg-[hsl(221,91%,60%)]'
        : variant === 'outline'
        ? 'border border-[hsl(220,16%,90%)] bg-white'
        : 'bg-transparent'
    }`}
  >
    <span
      className={`font-semibold ${small ? 'text-[6.5px]' : 'text-[7.5px]'} ${
        variant === 'primary' ? 'text-white' : 'text-[hsl(222,22%,20%)]'
      }`}
    >
      {label}
    </span>
  </div>
);

const MiniProgressBar = ({ current, total }: { current: number; total: number }) => (
  <div className="flex gap-[2px] w-full">
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        className={`h-[3px] rounded-full flex-1 ${
          i < current
            ? 'bg-[hsl(142,70%,45%)]'
            : i === current
            ? 'bg-[hsl(221,91%,60%)]'
            : 'bg-[hsl(220,16%,90%)]'
        }`}
      />
    ))}
  </div>
);

// ─── Screen mini-UIs ──────────────────────────────────────────────────────────

function Screen1AccountCreation() {
  return (
    <div className="flex flex-col gap-2 px-1">
      <div className="flex justify-center mb-0.5">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-md bg-[hsl(221,91%,60%)] flex items-center justify-center">
            <Zap className="w-2.5 h-2.5 text-white" />
          </div>
          <span className="text-[10px] font-bold text-[hsl(222,22%,15%)] tracking-tight">Screna</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-[10.5px] font-bold text-[hsl(222,22%,15%)] leading-tight">Create your account</p>
        <p className="text-[7px] text-[hsl(222,12%,55%)] mt-0.5 leading-tight">Join 50,000+ early-career tech candidates</p>
      </div>
      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md border border-[hsl(220,16%,90%)] bg-white">
        <div className="w-3 h-3 rounded-sm bg-gradient-to-br from-[#4285F4] via-[#EA4335] to-[#FBBC05] flex-shrink-0" />
        <span className="text-[7.5px] font-medium text-[hsl(222,22%,20%)]">Continue with Google</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="flex-1 h-px bg-[hsl(220,16%,92%)]" />
        <span className="text-[6.5px] text-[hsl(222,12%,62%)]">or</span>
        <div className="flex-1 h-px bg-[hsl(220,16%,92%)]" />
      </div>
      <MiniInput placeholder="Email address" />
      <MiniInput placeholder="Password" />
      <MiniBtn label="Create account →" />
      <p className="text-center text-[6.5px] text-[hsl(222,12%,60%)]">
        Already have an account? <span className="text-[hsl(221,91%,60%)]">Sign in</span>
      </p>
    </div>
  );
}

function Screen2UploadResume() {
  return (
    <div className="flex flex-col gap-2 px-1">
      <MiniProgressBar current={0} total={7} />
      <div>
        <p className="text-[10.5px] font-bold text-[hsl(222,22%,15%)] leading-tight">Upload your resume</p>
        <p className="text-[7px] text-[hsl(222,12%,55%)] mt-0.5">We'll use this to personalize everything</p>
      </div>
      <div className="flex flex-col items-center justify-center py-4 rounded-lg border-[1.5px] border-dashed border-[hsl(221,91%,60%)]/40 bg-[hsl(221,91%,60%)]/4">
        <UploadCloud className="w-5 h-5 text-[hsl(221,91%,60%)]/70 mb-1" />
        <p className="text-[7.5px] font-medium text-[hsl(222,22%,25%)] text-center">Drag & drop your resume</p>
        <p className="text-[6.5px] text-[hsl(222,12%,60%)] mt-0.5">PDF, DOCX · Max 5MB</p>
        <div className="mt-1.5 px-2 py-0.5 rounded bg-[hsl(221,91%,60%)]/10 border border-[hsl(221,91%,60%)]/20">
          <span className="text-[6.5px] font-medium text-[hsl(221,91%,60%)]">Browse files</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Shield className="w-2.5 h-2.5 text-[hsl(222,12%,60%)]" />
        <p className="text-[6px] text-[hsl(222,12%,60%)]">Never shared without your consent</p>
      </div>
      <MiniBtn label="Continue →" />
      <div className="text-center">
        <span className="text-[6.5px] text-[hsl(221,91%,60%)] underline underline-offset-1">Skip for now</span>
      </div>
    </div>
  );
}

function Screen3TargetRole() {
  return (
    <div className="flex flex-col gap-2 px-1">
      <MiniProgressBar current={1} total={7} />
      <div>
        <p className="text-[10.5px] font-bold text-[hsl(222,22%,15%)] leading-tight">What role are you targeting?</p>
        <p className="text-[7px] text-[hsl(222,12%,55%)] mt-0.5">Select your primary focus area</p>
      </div>
      <div className="flex flex-wrap gap-1">
        <MiniChip label="Software Engineer" active />
        <MiniChip label="Frontend" />
        <MiniChip label="Backend" />
        <MiniChip label="Full-Stack" />
        <MiniChip label="Data Engineer" />
        <MiniChip label="ML / AI Engineer" />
        <MiniChip label="Product Manager" />
        <MiniChip label="Data Analyst" />
      </div>
      <div className="mt-0.5">
        <p className="text-[7px] font-semibold text-[hsl(222,22%,15%)] mb-1">Experience level</p>
        <div className="flex gap-1">
          <MiniChip label="Student" />
          <MiniChip label="New Grad" active />
          <MiniChip label="1–3 yrs" />
          <MiniChip label="4+ yrs" />
        </div>
      </div>
      <MiniBtn label="Continue →" />
    </div>
  );
}

function Screen4TargetCompanies() {
  return (
    <div className="flex flex-col gap-2 px-1">
      <MiniProgressBar current={2} total={7} />
      <div>
        <p className="text-[10.5px] font-bold text-[hsl(222,22%,15%)] leading-tight">Target companies</p>
        <p className="text-[7px] text-[hsl(222,12%,55%)] mt-0.5">We'll tailor interviews to these companies</p>
      </div>
      <div>
        <p className="text-[7px] font-semibold text-[hsl(222,22%,20%)] mb-1">Company type</p>
        <div className="flex flex-wrap gap-1">
          <MiniChip label="FAANG / Big Tech" active />
          <MiniChip label="Unicorn" active />
          <MiniChip label="Mid-size" />
          <MiniChip label="Startup" />
        </div>
      </div>
      <div>
        <p className="text-[7px] font-semibold text-[hsl(222,22%,20%)] mb-1">Specific companies</p>
        <div className="flex flex-wrap gap-1">
          {['Google', 'Meta', 'Apple', 'Amazon', 'Microsoft', 'Stripe', 'Airbnb'].map((co, i) => (
            <MiniChip key={co} label={co} active={i < 3} size="xs" />
          ))}
        </div>
      </div>
      <div className="h-[18px] rounded border border-[hsl(221,91%,60%)]/30 bg-[hsl(221,91%,60%)]/4 px-2 flex items-center">
        <span className="text-[7px] text-[hsl(222,12%,55%)]">+ Add a company...</span>
      </div>
      <MiniBtn label="Continue →" />
    </div>
  );
}

function Screen5JobSearchStatus() {
  return (
    <div className="flex flex-col gap-2 px-1">
      <MiniProgressBar current={3} total={7} />
      <div>
        <p className="text-[10.5px] font-bold text-[hsl(222,22%,15%)] leading-tight">Where are you in your search?</p>
        <p className="text-[7px] text-[hsl(222,12%,55%)] mt-0.5">Helps us focus your preparation</p>
      </div>
      {[
        { label: 'Just exploring', sub: 'Learning what\'s out there', active: false },
        { label: 'Actively applying', sub: 'Sending out applications now', active: true },
        { label: 'In interviews', sub: 'Have upcoming rounds to prep for', active: false },
        { label: 'Final round prep', sub: 'Closing in on an offer', active: false },
      ].map(({ label, sub, active }) => (
        <div
          key={label}
          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-all ${
            active
              ? 'border-[hsl(221,91%,60%)] bg-[hsl(221,91%,60%)]/6 shadow-[0_0_0_1px_hsl(221,91%,60%)]'
              : 'border-[hsl(220,16%,90%)] bg-white'
          }`}
        >
          <div
            className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 ${
              active ? 'border-[hsl(221,91%,60%)] bg-[hsl(221,91%,60%)]' : 'border-[hsl(220,16%,85%)]'
            }`}
          >
            {active && <div className="w-1 h-1 rounded-full bg-white" />}
          </div>
          <div>
            <p className={`text-[7.5px] font-semibold leading-tight ${active ? 'text-[hsl(221,91%,60%)]' : 'text-[hsl(222,22%,20%)]'}`}>
              {label}
            </p>
            <p className="text-[6px] text-[hsl(222,12%,60%)]">{sub}</p>
          </div>
        </div>
      ))}
      <MiniBtn label="Continue →" />
    </div>
  );
}

function Screen6HelpPreference() {
  return (
    <div className="flex flex-col gap-2 px-1">
      <MiniProgressBar current={4} total={7} />
      <div>
        <p className="text-[10.5px] font-bold text-[hsl(222,22%,15%)] leading-tight">Where do you need the most help?</p>
        <p className="text-[7px] text-[hsl(222,12%,55%)] mt-0.5">Select up to 3 focus areas</p>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {[
          { label: 'Coding / LeetCode', active: true },
          { label: 'System Design', active: true },
          { label: 'Behavioral / STAR', active: false },
          { label: 'Resume Screening', active: false },
          { label: 'Offer Negotiation', active: false },
          { label: 'Interview Confidence', active: true },
        ].map(({ label, active }) => (
          <div
            key={label}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border ${
              active
                ? 'border-[hsl(221,91%,60%)] bg-[hsl(221,91%,60%)]/8'
                : 'border-[hsl(220,16%,90%)] bg-white'
            }`}
          >
            <div
              className={`w-2.5 h-2.5 rounded flex items-center justify-center shrink-0 ${
                active ? 'bg-[hsl(221,91%,60%)]' : 'border border-[hsl(220,16%,85%)]'
              }`}
            >
              {active && <Check className="w-1.5 h-1.5 text-white" strokeWidth={3} />}
            </div>
            <span className={`text-[6.5px] font-medium leading-tight ${active ? 'text-[hsl(221,91%,60%)]' : 'text-[hsl(222,22%,25%)]'}`}>
              {label}
            </span>
          </div>
        ))}
      </div>
      <MiniBtn label="Build my plan →" />
    </div>
  );
}

function Screen7AISynthesis() {
  return (
    <div className="flex flex-col items-center gap-2 px-1">
      <MiniProgressBar current={5} total={7} />
      <div className="relative w-14 h-14 flex items-center justify-center mt-1">
        <div className="absolute inset-0 rounded-full bg-[hsl(221,91%,60%)]/12 animate-pulse" />
        <div className="absolute inset-1.5 rounded-full bg-[hsl(221,91%,60%)]/18" />
        <div className="w-9 h-9 rounded-full bg-[hsl(221,91%,60%)] flex items-center justify-center shadow-[0_0_20px_rgba(67,118,248,0.4)] relative z-10">
          <Brain className="w-4.5 h-4.5 text-white" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-[10px] font-bold text-[hsl(222,22%,15%)] leading-tight">Building your personalized plan…</p>
        <p className="text-[6.5px] text-[hsl(222,12%,55%)] mt-0.5">Analyzing your profile and goals</p>
      </div>
      <div className="w-full">
        <div className="flex justify-between mb-1">
          <span className="text-[6.5px] text-[hsl(222,12%,55%)]">Personalizing…</span>
          <span className="text-[6.5px] font-semibold text-[hsl(221,91%,60%)]">65%</span>
        </div>
        <div className="w-full h-1 bg-[hsl(220,18%,94%)] rounded-full overflow-hidden">
          <div className="w-[65%] h-full bg-[hsl(221,91%,60%)] rounded-full" />
        </div>
      </div>
      <div className="w-full flex flex-col gap-1">
        {[
          { text: 'Analyzing resume & experience', done: true },
          { text: 'Matching role requirements', done: true },
          { text: 'Curating question bank…', done: false, active: true },
          { text: 'Calibrating difficulty & pacing', done: false },
          { text: 'Building your training roadmap', done: false },
        ].map(({ text, done, active }) => (
          <div key={text} className="flex items-center gap-1.5">
            <div
              className={`w-3 h-3 rounded-full flex items-center justify-center shrink-0 ${
                done
                  ? 'bg-[hsl(142,70%,45%)]'
                  : active
                  ? 'bg-[hsl(221,91%,60%)]'
                  : 'bg-[hsl(220,18%,94%)]'
              }`}
            >
              {done ? (
                <Check className="w-1.5 h-1.5 text-white" strokeWidth={3} />
              ) : active ? (
                <div className="w-1 h-1 rounded-full bg-white" />
              ) : null}
            </div>
            <span className={`text-[6.5px] ${done ? 'text-[hsl(222,22%,35%)] font-medium' : active ? 'text-[hsl(221,91%,60%)] font-semibold' : 'text-[hsl(222,12%,65%)]'}`}>
              {text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Screen8CommandCenter() {
  return (
    <div className="flex flex-col gap-2 px-1">
      <div className="flex items-center gap-1 mb-0.5">
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[hsl(142,70%,45%)]/12 border border-[hsl(142,70%,45%)]/20">
          <Check className="w-2 h-2 text-[hsl(142,70%,40%)]" strokeWidth={3} />
          <span className="text-[6.5px] font-semibold text-[hsl(142,70%,38%)]">Profile ready</span>
        </div>
      </div>
      <div>
        <p className="text-[10.5px] font-bold text-[hsl(222,22%,15%)] leading-tight">Your command center</p>
        <p className="text-[7px] text-[hsl(222,12%,55%)] mt-0.5">Personalized for SWE · New Grad · ASAP timeline</p>
      </div>
      <div className="flex gap-1 flex-wrap">
        {['Software Engineer', 'New Grad', 'FAANG focus'].map((tag, i) => (
          <span
            key={tag}
            className={`px-1.5 py-0.5 rounded-full text-[6px] font-medium ${
              i === 0
                ? 'bg-[hsl(221,91%,60%)]/12 text-[hsl(221,91%,55%)] border border-[hsl(221,91%,60%)]/20'
                : 'bg-[hsl(220,18%,96%)] text-[hsl(222,12%,50%)] border border-[hsl(220,16%,90%)]'
            }`}
          >
            {tag}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2 p-2 rounded-lg bg-[hsl(221,91%,60%)] shadow-[0_3px_10px_rgba(67,118,248,0.3)]">
        <div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center shrink-0">
          <Mic className="w-3 h-3 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-[7.5px] font-semibold text-white">Start AI Mock Interview</p>
          <p className="text-[6px] text-white/75">SWE · Behavioral + Technical</p>
        </div>
        <div className="px-1.5 py-0.5 rounded bg-white/20">
          <span className="text-[6px] text-white font-semibold">Go →</span>
        </div>
      </div>
      {[
        { icon: BookOpen, label: 'Question Bank', sub: 'LeetCode + System Design' },
        { icon: Rocket, label: 'Training Plan', sub: 'ASAP · 45-day roadmap' },
      ].map(({ icon: Icon, label, sub }) => (
        <div key={label} className="flex items-center gap-2 p-2 rounded-lg border border-[hsl(220,16%,90%)] bg-white">
          <div className="w-5 h-5 rounded-md bg-[hsl(220,18%,96%)] flex items-center justify-center shrink-0">
            <Icon className="w-3 h-3 text-[hsl(221,91%,60%)]" />
          </div>
          <div className="flex-1">
            <p className="text-[7px] font-semibold text-[hsl(222,22%,15%)]">{label}</p>
            <p className="text-[6px] text-[hsl(222,12%,55%)]">{sub}</p>
          </div>
          <ChevronRight className="w-2.5 h-2.5 text-[hsl(222,12%,65%)]" />
        </div>
      ))}
    </div>
  );
}

function Screen9ProgressiveProfile() {
  return (
    <div className="flex flex-col gap-2 px-1">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10.5px] font-bold text-[hsl(222,22%,15%)] leading-tight">Complete your profile</p>
          <p className="text-[7px] text-[hsl(222,12%,55%)] mt-0.5">Unlock more personalized features</p>
        </div>
        {/* Progress ring placeholder */}
        <div className="relative w-10 h-10">
          <svg viewBox="0 0 40 40" className="w-10 h-10 -rotate-90">
            <circle cx="20" cy="20" r="16" fill="none" stroke="hsl(220,18%,94%)" strokeWidth="3" />
            <circle
              cx="20" cy="20" r="16" fill="none"
              stroke="hsl(221,91%,60%)" strokeWidth="3"
              strokeDasharray={`${2 * Math.PI * 16 * 0.62} ${2 * Math.PI * 16 * 0.38}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[8px] font-bold text-[hsl(222,22%,15%)]">62%</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {[
          { label: 'Resume uploaded', done: true },
          { label: 'Target role set', done: true },
          { label: 'Target companies added', done: true },
          { label: 'Add work experience', done: false },
          { label: 'Connect LinkedIn', done: false },
          { label: 'Set salary expectations', done: false },
        ].map(({ label, done }) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full flex items-center justify-center shrink-0 border ${
                done
                  ? 'bg-[hsl(142,70%,45%)] border-[hsl(142,70%,45%)]'
                  : 'border-[hsl(220,16%,82%)] bg-white'
              }`}
            >
              {done && <Check className="w-1.5 h-1.5 text-white" strokeWidth={3} />}
            </div>
            <span className={`text-[7px] ${done ? 'text-[hsl(222,22%,35%)]' : 'text-[hsl(222,22%,20%)] font-medium'}`}>
              {label}
            </span>
            {!done && (
              <ChevronRight className="w-2.5 h-2.5 text-[hsl(221,91%,60%)] ml-auto" />
            )}
          </div>
        ))}
      </div>
      <MiniBtn label="Go to Dashboard →" />
    </div>
  );
}

// ─── Screen card wrapper ──────────────────────────────────────────────────────

interface ScreenCardProps {
  stepNumber: number;
  totalScreens: number;
  phase: string;
  phaseColor: 'blue' | 'purple' | 'green';
  title: string;
  tag: string;
  children: React.ReactNode;
  highlighted?: boolean;
}

const phaseColorMap = {
  blue: {
    bg: 'bg-[hsl(221,91%,60%)]/10',
    text: 'text-[hsl(221,91%,55%)]',
    border: 'border-[hsl(221,91%,60%)]/20',
  },
  purple: {
    bg: 'bg-[hsl(258,80%,62%)]/10',
    text: 'text-[hsl(258,80%,58%)]',
    border: 'border-[hsl(258,80%,62%)]/20',
  },
  green: {
    bg: 'bg-[hsl(142,70%,45%)]/10',
    text: 'text-[hsl(142,70%,40%)]',
    border: 'border-[hsl(142,70%,45%)]/20',
  },
};

function ScreenCard({
  stepNumber,
  totalScreens,
  phase,
  phaseColor,
  title,
  tag,
  children,
  highlighted,
}: ScreenCardProps) {
  const [hovered, setHovered] = useState(false);
  const pc = phaseColorMap[phaseColor];

  return (
    <div
      className={`relative flex flex-col rounded-2xl border bg-white transition-all duration-300 cursor-pointer ${
        hovered
          ? 'shadow-[0_8px_40px_rgba(0,0,0,0.12)] -translate-y-1 border-[hsl(221,91%,60%)]/40'
          : highlighted
          ? 'shadow-[0_4px_20px_rgba(67,118,248,0.18)] border-[hsl(221,91%,60%)]/30'
          : 'shadow-[0_2px_12px_rgba(0,0,0,0.06)] border-[hsl(220,16%,92%)]'
      }`}
      style={{ width: 248 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Card top bar */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5 border-b border-[hsl(220,16%,94%)]">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-[hsl(222,22%,15%)] flex items-center justify-center">
            <span className="text-[8px] font-bold text-white">{stepNumber}</span>
          </div>
          <span className="text-[9px] font-semibold text-[hsl(222,22%,30%)] tracking-wide uppercase">
            {tag}
          </span>
        </div>
        <span
          className={`px-1.5 py-0.5 rounded-full text-[6.5px] font-semibold border ${pc.bg} ${pc.text} ${pc.border}`}
        >
          {phase}
        </span>
      </div>

      {/* Mini screen content */}
      <div className="px-3 py-3 flex-1">
        {children}
      </div>

      {/* Screen label bottom bar */}
      <div className="px-4 pb-3 pt-1 border-t border-[hsl(220,16%,94%)]">
        <p className="text-[8.5px] font-semibold text-[hsl(222,22%,25%)] leading-tight">{title}</p>
        <p className="text-[6.5px] text-[hsl(222,12%,60%)] mt-px">Screen {stepNumber} of {totalScreens}</p>
      </div>

      {/* Hover indicator */}
      {hovered && (
        <div className="absolute inset-0 rounded-2xl ring-[1.5px] ring-[hsl(221,91%,60%)]/40 pointer-events-none" />
      )}
    </div>
  );
}

// ─── Flow connector ───────────────────────────────────────────────────────────

function FlowArrow({ vertical }: { vertical?: boolean }) {
  if (vertical) {
    return (
      <div className="flex flex-col items-center gap-1 py-1">
        <div className="w-px h-6 bg-[hsl(220,16%,88%)]" />
        <ArrowDown className="w-3 h-3 text-[hsl(222,12%,65%)]" />
      </div>
    );
  }
  return (
    <div className="flex items-center self-center" style={{ marginTop: -16 }}>
      <ArrowRight className="w-4 h-4 text-[hsl(222,12%,65%)]" />
    </div>
  );
}

function PhaseLabel({
  number,
  title,
  description,
  color,
}: {
  number: string;
  title: string;
  description: string;
  color: 'blue' | 'purple' | 'green';
}) {
  const colorMap = {
    blue: {
      dot: 'bg-[hsl(221,91%,60%)]',
      text: 'text-[hsl(221,91%,55%)]',
      badge: 'bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,55%)] border-[hsl(221,91%,60%)]/20',
    },
    purple: {
      dot: 'bg-[hsl(258,80%,62%)]',
      text: 'text-[hsl(258,80%,58%)]',
      badge: 'bg-[hsl(258,80%,62%)]/10 text-[hsl(258,80%,58%)] border-[hsl(258,80%,62%)]/20',
    },
    green: {
      dot: 'bg-[hsl(142,70%,45%)]',
      text: 'text-[hsl(142,70%,40%)]',
      badge: 'bg-[hsl(142,70%,45%)]/10 text-[hsl(142,70%,40%)] border-[hsl(142,70%,45%)]/20',
    },
  };
  const c = colorMap[color];
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className={`w-2 h-2 rounded-full ${c.dot} shrink-0`} />
      <div>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-bold uppercase tracking-widest ${c.text}`}
          >
            Phase {number}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border ${c.badge}`}>
            {title}
          </span>
        </div>
        <p className="text-[10px] text-[hsl(222,12%,55%)] mt-0.5">{description}</p>
      </div>
    </div>
  );
}

// ─── Row between-connector ────────────────────────────────────────────────────

function RowConnector({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center py-2">
      <div className="flex items-center gap-4">
        <div className="w-32 h-px bg-gradient-to-r from-transparent to-[hsl(220,16%,88%)]" />
        <div className="flex flex-col items-center gap-1">
          <div className="h-6 w-px bg-[hsl(220,16%,88%)]" />
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[hsl(220,16%,90%)] shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
            <ArrowDown className="w-3 h-3 text-[hsl(221,91%,60%)]" />
            <span className="text-[9px] font-medium text-[hsl(222,12%,50%)]">{label}</span>
          </div>
          <div className="h-6 w-px bg-[hsl(220,16%,88%)]" />
        </div>
        <div className="w-32 h-px bg-gradient-to-l from-transparent to-[hsl(220,16%,88%)]" />
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function OnboardingFlowOverviewPage() {
  return (
    <div className="min-h-screen bg-[hsl(220,20%,98%)]" style={{ paddingTop: 'var(--topbar-h, 0px)' }}>
      {/* ─ Page header ─ */}
      <header className="border-b border-[hsl(220,16%,92%)] bg-white">
        <div className="max-w-[1200px] mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[hsl(221,91%,60%)] flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              <span
                className="text-[15px] font-bold text-[hsl(222,22%,15%)]"
                style={{ letterSpacing: '-0.02em' }}
              >
                Screna
              </span>
            </div>
            <div className="w-px h-4 bg-[hsl(220,16%,88%)]" />
            <span className="text-[12px] text-[hsl(222,12%,55%)] font-medium">
              Phase 1 Onboarding Flow
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,55%)] text-[11px] font-semibold border border-[hsl(221,91%,60%)]/20">
              Product Overview
            </span>
            <span className="px-2.5 py-1 rounded-full bg-[hsl(220,18%,96%)] text-[hsl(222,12%,50%)] text-[11px] font-medium border border-[hsl(220,16%,90%)]">
              v1.0 · April 2026
            </span>
          </div>
        </div>
      </header>

      {/* ─ Hero section ─ */}
      <section className="max-w-[1200px] mx-auto px-8 pt-10 pb-6">
        <div className="flex items-start justify-between gap-8">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[hsl(142,70%,45%)]" />
              <span className="text-[11px] font-semibold text-[hsl(142,70%,40%)] uppercase tracking-widest">
                First-time user experience
              </span>
            </div>
            <h1
              className="text-[28px] font-bold text-[hsl(222,22%,12%)] mb-3 max-w-[600px]"
              style={{ letterSpacing: '-0.025em', lineHeight: 1.15 }}
            >
              Lightweight career triage →{' '}
              <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'hsl(221,91%,60%)' }}>
                personalized routing
              </span>
            </h1>
            <p className="text-[13.5px] text-[hsl(222,12%,45%)] max-w-[560px] leading-relaxed">
              A 9-screen onboarding sequence designed to feel like intelligent career triage — not a form. Each step collects just enough signal to route users into a meaningful first action rather than a generic dashboard.
            </p>
          </div>
          {/* Flow stats */}
          <div className="flex gap-4 shrink-0">
            {[
              { value: '9', label: 'Screens', sub: 'in sequence' },
              { value: '~3', label: 'Minutes', sub: 'to complete' },
              { value: '3', label: 'Phases', sub: 'distinct UX zones' },
            ].map(({ value, label, sub }) => (
              <div
                key={label}
                className="flex flex-col items-center px-5 py-4 rounded-xl bg-white border border-[hsl(220,16%,92%)] shadow-[0_1px_6px_rgba(0,0,0,0.04)]"
              >
                <span className="text-[22px] font-bold text-[hsl(221,91%,60%)]" style={{ letterSpacing: '-0.03em' }}>
                  {value}
                </span>
                <span className="text-[11px] font-semibold text-[hsl(222,22%,20%)] mt-0.5">{label}</span>
                <span className="text-[9px] text-[hsl(222,12%,60%)]">{sub}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Design principles bar */}
        <div className="flex gap-3 mt-6 flex-wrap">
          {[
            { icon: '✦', text: 'Chip & card selections — no long forms' },
            { icon: '◈', text: 'Single-focus screens — one decision at a time' },
            { icon: '⬡', text: 'AI synthesis transforms input into a personalized plan' },
            { icon: '⬤', text: 'Command center replaces the generic dashboard' },
          ].map(({ icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[hsl(220,16%,92%)] shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
            >
              <span className="text-[9px] text-[hsl(221,91%,60%)]">{icon}</span>
              <span className="text-[11px] text-[hsl(222,12%,45%)] font-medium">{text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─ Flow storyboard ─ */}
      <section className="max-w-[1200px] mx-auto px-8 pb-16">

        {/* ─────────── Phase A: Foundation ─────────── */}
        <PhaseLabel
          number="A"
          title="Foundation"
          description="Account creation and resume upload — minimal friction, maximum trust-building"
          color="blue"
        />

        <div className="flex items-start gap-4">
          <ScreenCard
            stepNumber={1}
            totalScreens={9}
            phase="Foundation"
            phaseColor="blue"
            title="Account Creation"
            tag="Sign Up"
          >
            <Screen1AccountCreation />
          </ScreenCard>

          <FlowArrow />

          <ScreenCard
            stepNumber={2}
            totalScreens={9}
            phase="Foundation"
            phaseColor="blue"
            title="Resume Upload"
            tag="Step 1 / 7"
          >
            <Screen2UploadResume />
          </ScreenCard>

          <FlowArrow />

          <ScreenCard
            stepNumber={3}
            totalScreens={9}
            phase="Foundation"
            phaseColor="blue"
            title="Target Role Selection"
            tag="Step 2 / 7"
          >
            <Screen3TargetRole />
          </ScreenCard>

          {/* Annotation aside */}
          <div className="flex flex-col justify-center gap-3 ml-6 shrink-0 max-w-[140px]">
            <div className="p-3 rounded-xl bg-[hsl(221,91%,60%)]/8 border border-[hsl(221,91%,60%)]/20">
              <p className="text-[9px] font-semibold text-[hsl(221,91%,55%)] mb-1">Foundation</p>
              <p className="text-[8.5px] text-[hsl(222,12%,50%)] leading-snug">
                Establish identity and surface the first personalization signal — target role.
              </p>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[hsl(221,91%,60%)]" />
              <span className="text-[8px] text-[hsl(222,12%,55%)]">Google OAuth or email</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[hsl(221,91%,60%)]" />
              <span className="text-[8px] text-[hsl(222,12%,55%)]">Skip available on resume</span>
            </div>
          </div>
        </div>

        <RowConnector label="Continue to career triage" />

        {/* ─────────── Phase B: Career Triage ─────────── */}
        <PhaseLabel
          number="B"
          title="Career Triage"
          description="Four focused screens — each one a lightweight signal that powers the AI synthesis"
          color="purple"
        />

        <div className="flex items-start gap-4">
          <ScreenCard
            stepNumber={4}
            totalScreens={9}
            phase="Triage"
            phaseColor="purple"
            title="Target Companies"
            tag="Step 3 / 7"
          >
            <Screen4TargetCompanies />
          </ScreenCard>

          <FlowArrow />

          <ScreenCard
            stepNumber={5}
            totalScreens={9}
            phase="Triage"
            phaseColor="purple"
            title="Job Search Status"
            tag="Step 4 / 7"
          >
            <Screen5JobSearchStatus />
          </ScreenCard>

          <FlowArrow />

          <ScreenCard
            stepNumber={6}
            totalScreens={9}
            phase="Triage"
            phaseColor="purple"
            title="Help Preference"
            tag="Step 5 / 7"
          >
            <Screen6HelpPreference />
          </ScreenCard>

          {/* Annotation */}
          <div className="flex flex-col justify-center gap-3 ml-6 shrink-0 max-w-[140px]">
            <div className="p-3 rounded-xl bg-[hsl(258,80%,62%)]/8 border border-[hsl(258,80%,62%)]/20">
              <p className="text-[9px] font-semibold text-[hsl(258,80%,58%)] mb-1">Triage</p>
              <p className="text-[8.5px] text-[hsl(222,12%,50%)] leading-snug">
                Chips and radio cards — each screen takes under 15 seconds. No text input required.
              </p>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[hsl(258,80%,62%)]" />
              <span className="text-[8px] text-[hsl(222,12%,55%)]">Multi-select chips</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[hsl(258,80%,62%)]" />
              <span className="text-[8px] text-[hsl(222,12%,55%)]">Single-focus per screen</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[hsl(258,80%,62%)]" />
              <span className="text-[8px] text-[hsl(222,12%,55%)]">Skip available on all</span>
            </div>
          </div>
        </div>

        <RowConnector label="AI synthesis begins" />

        {/* ─────────── Phase C: AI Results ─────────── */}
        <PhaseLabel
          number="C"
          title="AI-Powered Results"
          description="AI synthesizes all signals → personalized command center → progressive profile completion"
          color="green"
        />

        <div className="flex items-start gap-4">
          <ScreenCard
            stepNumber={7}
            totalScreens={9}
            phase="AI Layer"
            phaseColor="green"
            title="AI Matching & Synthesis"
            tag="Step 6 / 7"
          >
            <Screen7AISynthesis />
          </ScreenCard>

          <FlowArrow />

          <ScreenCard
            stepNumber={8}
            totalScreens={9}
            phase="Results"
            phaseColor="green"
            title="Personal Command Center"
            tag="Step 7 / 7"
            highlighted
          >
            <Screen8CommandCenter />
          </ScreenCard>

          <FlowArrow />

          <ScreenCard
            stepNumber={9}
            totalScreens={9}
            phase="Ongoing"
            phaseColor="green"
            title="Progressive Profile Completion"
            tag="Post-setup"
          >
            <Screen9ProgressiveProfile />
          </ScreenCard>

          {/* Annotation */}
          <div className="flex flex-col justify-center gap-3 ml-6 shrink-0 max-w-[140px]">
            <div className="p-3 rounded-xl bg-[hsl(142,70%,45%)]/8 border border-[hsl(142,70%,45%)]/20">
              <p className="text-[9px] font-semibold text-[hsl(142,70%,40%)] mb-1">Routing</p>
              <p className="text-[8.5px] text-[hsl(222,12%,50%)] leading-snug">
                AI combines all triage signals into a single personalized recommendation and first action.
              </p>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[hsl(142,70%,45%)]" />
              <span className="text-[8px] text-[hsl(222,12%,55%)]">Auto-advances</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[hsl(142,70%,45%)]" />
              <span className="text-[8px] text-[hsl(222,12%,55%)]">Clear first action</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[hsl(142,70%,45%)]" />
              <span className="text-[8px] text-[hsl(222,12%,55%)]">Progressive enrichment</span>
            </div>
          </div>
        </div>

        {/* ─ Flow summary bar ─ */}
        <div className="mt-12 p-6 rounded-2xl bg-white border border-[hsl(220,16%,92%)] shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[12px] font-bold text-[hsl(222,22%,15%)] mb-1" style={{ letterSpacing: '-0.01em' }}>
                Full flow summary
              </p>
              <p className="text-[11px] text-[hsl(222,12%,55%)]">
                9 screens · 3 phases · ~3 min · Personalized routing into AI Mock Interview as first action
              </p>
            </div>
            <div className="flex items-center gap-2">
              {[
                { num: '01', label: 'Account' },
                { num: '02', label: 'Resume' },
                { num: '03', label: 'Role' },
                { num: '04', label: 'Companies' },
                { num: '05', label: 'Status' },
                { num: '06', label: 'Help' },
                { num: '07', label: 'AI Match' },
                { num: '08', label: 'Hub' },
                { num: '09', label: 'Profile' },
              ].map(({ num, label }, idx) => (
                <div key={num} className="flex items-center gap-1.5">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[7px] font-bold ${
                        idx < 2
                          ? 'bg-[hsl(221,91%,60%)] text-white'
                          : idx < 6
                          ? 'bg-[hsl(258,80%,62%)] text-white'
                          : 'bg-[hsl(142,70%,45%)] text-white'
                      }`}
                    >
                      {num}
                    </div>
                    <span className="text-[6.5px] text-[hsl(222,12%,55%)] mt-0.5 font-medium">{label}</span>
                  </div>
                  {idx < 8 && (
                    <div className="w-3 h-px bg-[hsl(220,16%,88%)] mb-2.5" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─ Design principles ─ */}
        <div className="mt-8 grid grid-cols-4 gap-4">
          {[
            {
              icon: '⚡',
              title: 'Triage, not registration',
              desc: 'Every screen collects a career signal, not a form field. Users feel guided, not processed.',
            },
            {
              icon: '⬡',
              title: 'Chips over text inputs',
              desc: 'Role, company, challenge, and status selections are all tap-to-select — zero typing required in the triage phase.',
            },
            {
              icon: '◈',
              title: 'AI earns its moment',
              desc: 'The synthesis screen makes the AI work visible, building trust before the personalized results appear.',
            },
            {
              icon: '✦',
              title: 'Command center, not dashboard',
              desc: 'Users land on a personalized hub with a clear first action — never a generic empty state.',
            },
          ].map(({ icon, title, desc }) => (
            <div
              key={title}
              className="p-4 rounded-xl bg-white border border-[hsl(220,16%,92%)] shadow-[0_1px_6px_rgba(0,0,0,0.04)]"
            >
              <span className="text-[16px] mb-2 block">{icon}</span>
              <p className="text-[11.5px] font-bold text-[hsl(222,22%,15%)] mb-1.5" style={{ letterSpacing: '-0.01em' }}>
                {title}
              </p>
              <p className="text-[10.5px] text-[hsl(222,12%,50%)] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[hsl(220,16%,92%)] bg-white">
        <div className="max-w-[1200px] mx-auto px-8 py-4 flex items-center justify-between">
          <p className="text-[11px] text-[hsl(222,12%,60%)]">
            Screna AI · Phase 1 Onboarding Flow Overview · April 2026
          </p>
          <a
            href="/onboarding-process"
            className="flex items-center gap-1.5 text-[11px] font-medium text-[hsl(221,91%,60%)] hover:text-[hsl(221,91%,50%)] transition-colors"
          >
            View live onboarding flow
            <ArrowRight className="w-3 h-3" />
          </a>
        </div>
      </footer>
    </div>
  );
}