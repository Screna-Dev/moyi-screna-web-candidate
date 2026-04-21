import { Lock, ArrowRight, Shield, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export function GoalPage({ returnTo }: { returnTo?: string } = {}) {
  const qs = returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : '';
  return (
    <div className="min-h-screen bg-[hsl(220,20%,98%)] flex flex-col items-center justify-center py-16 px-4">
      <div className="w-full max-w-[680px] flex flex-col items-center relative">
        
        {/* ==========================================
            SECTION 1 — Preview Panel
        =========================================== */}
        <div className="relative w-full flex flex-col items-center">
          <div className="flex flex-row justify-center gap-4 w-full">
            
            {/* Card 1 — Resume Match */}
            <div className="relative w-[200px] h-[140px] bg-white rounded-xl border border-[hsl(220,16%,90%)] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col p-4">
              <div className="opacity-55 flex flex-col items-center justify-center h-full">
                <span className="text-[10px] font-semibold text-[hsl(222,12%,55%)] uppercase tracking-wider mb-3 w-full text-center">
                  Resume Match
                </span>
                <div className="w-[52px] h-[52px] rounded-full border-4 border-[hsl(221,91%,60%)] flex items-center justify-center mb-2.5">
                  <span className="text-[14px] font-bold text-[hsl(221,91%,60%)]">74%</span>
                </div>
                <div className="flex gap-1.5">
                  <div className="px-2 py-0.5 rounded-full bg-[hsl(220,18%,96%)] text-[8px] font-medium text-[hsl(222,12%,45%)]">React</div>
                  <div className="px-2 py-0.5 rounded-full bg-[hsl(220,18%,96%)] text-[8px] font-medium text-[hsl(222,12%,45%)]">TypeScript</div>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-[56px] bg-gradient-to-b from-transparent to-[hsl(220,20%,98%)] pointer-events-none" />
            </div>

            {/* Card 2 — Role Practice */}
            <div className="relative w-[200px] h-[140px] bg-white rounded-xl border border-[hsl(220,16%,90%)] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col p-4">
              <div className="opacity-55 flex flex-col h-full">
                <span className="text-[10px] font-semibold text-[hsl(222,12%,55%)] uppercase tracking-wider mb-3 text-center">
                  Role-specific Practice
                </span>
                <div className="flex flex-col gap-2">
                  <div className="w-full h-8 rounded-md bg-[hsl(170,70%,45%)]/15 border border-[hsl(170,70%,45%)]/30 p-2 flex items-center">
                    <div className="w-3/4 h-1.5 rounded bg-[hsl(170,70%,45%)]/50" />
                  </div>
                  <div className="w-full h-8 rounded-md bg-[hsl(220,18%,96%)] p-2 flex items-center">
                    <div className="w-2/3 h-1.5 rounded bg-[hsl(220,16%,80%)]" />
                  </div>
                  <div className="w-full h-8 rounded-md bg-[hsl(220,18%,96%)] p-2 flex items-center">
                    <div className="w-5/6 h-1.5 rounded bg-[hsl(220,16%,80%)]" />
                  </div>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-[56px] bg-gradient-to-b from-transparent to-[hsl(220,20%,98%)] pointer-events-none" />
            </div>

            {/* Card 3 — Training Plan */}
            <div className="relative w-[200px] h-[140px] bg-white rounded-xl border border-[hsl(220,16%,90%)] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col p-4">
              <div className="opacity-55 flex flex-col h-full">
                <span className="text-[10px] font-semibold text-[hsl(222,12%,55%)] uppercase tracking-wider mb-3 text-center">
                  Training Plan
                </span>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-[hsl(142,70%,45%)] shrink-0" />
                    <div className="w-full h-1.5 rounded bg-[hsl(222,22%,15%)]/20" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full border border-[hsl(220,16%,80%)] shrink-0" />
                    <div className="w-4/5 h-1.5 rounded bg-[hsl(222,22%,15%)]/20" />
                  </div>
                  <div className="flex items-center gap-2 opacity-40">
                    <div className="w-3 h-3 rounded-full border border-[hsl(220,16%,80%)] shrink-0" />
                    <div className="w-full h-1.5 rounded bg-[hsl(222,22%,15%)]/20" />
                  </div>
                  <div className="flex items-center gap-2 opacity-40">
                    <div className="w-3 h-3 rounded-full border border-[hsl(220,16%,80%)] shrink-0" />
                    <div className="w-2/3 h-1.5 rounded bg-[hsl(222,22%,15%)]/20" />
                  </div>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-[56px] bg-gradient-to-b from-transparent to-[hsl(220,20%,98%)] pointer-events-none" />
            </div>
          </div>

          {/* Centered Pill Badge */}
          <div className="mt-[-14px] relative z-10 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[hsl(220,16%,90%)] bg-[hsl(220,20%,98%)]">
            <Lock className="w-3.5 h-3.5 text-[hsl(222,12%,55%)]" />
            <span className="text-[11px] font-medium text-[hsl(222,12%,55%)]">Unlock with your profile</span>
          </div>
        </div>

        {/* ==========================================
            SECTION 2 — Main Message
        =========================================== */}
        <div className="mt-8 text-center flex flex-col items-center">
          <span className="text-[13px] font-semibold text-[hsl(221,91%,60%)] tracking-[0.4px] mb-3">
            Personalized for your target role
          </span>
          <h1 className="text-[32px] font-bold text-[hsl(222,22%,15%)] max-w-[560px] leading-[1.15] mb-4">
            Unlock personalized practice for your target job
          </h1>
                    <p className="text-[16px] text-[hsl(222,12%,45%)] max-w-[624px] leading-[1.65] text-center mx-auto">
            Sign in, upload your resume, and add your target job to get role-specific practice, a resume match snapshot, and a tailored training plan.
          </p>
        </div>

        {/* ==========================================
            SECTION 3 — 3-Step Inline Stepper
        =========================================== */}
        <div className="mt-8 flex items-center justify-center w-full overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 sm:gap-1.5 whitespace-nowrap px-4 min-w-max">
            <div className="flex items-center gap-2">
              <div className="w-[18px] h-[18px] rounded-full bg-[hsl(220,18%,96%)] flex items-center justify-center text-[10px] font-bold text-[hsl(222,12%,55%)]">
                1
              </div>
              <span className="text-[13px] font-medium text-[hsl(222,12%,55%)]">Sign in</span>
            </div>
            
            <ArrowRight className="w-3.5 h-3.5 text-[hsl(220,16%,80%)] mx-1 sm:mx-2" />
            
            <div className="flex items-center gap-2">
              <div className="w-[18px] h-[18px] rounded-full bg-[hsl(220,18%,96%)] flex items-center justify-center text-[10px] font-bold text-[hsl(222,12%,55%)]">
                2
              </div>
              <span className="text-[13px] font-medium text-[hsl(222,12%,55%)]">Upload Resume</span>
            </div>

            <ArrowRight className="w-3.5 h-3.5 text-[hsl(220,16%,80%)] mx-1 sm:mx-2" />

            <div className="flex items-center gap-2">
              <div className="w-[18px] h-[18px] rounded-full bg-[hsl(220,18%,96%)] flex items-center justify-center text-[10px] font-bold text-[hsl(222,12%,55%)]">
                3
              </div>
              <span className="text-[13px] font-medium text-[hsl(222,12%,55%)]">Add A Target Job</span>
            </div>

            <ArrowRight className="w-3.5 h-3.5 text-[hsl(220,16%,80%)] mx-1 sm:mx-2" />

            <div className="flex items-center gap-2">
              <div className="w-[18px] h-[18px] rounded-full bg-[hsl(220,18%,96%)] flex items-center justify-center text-[10px] font-bold text-[hsl(222,12%,55%)]">
                4
              </div>
              <span className="text-[13px] font-medium text-[hsl(222,12%,55%)]">Get Personalized Results</span>
            </div>
          </div>
        </div>

        {/* ==========================================
            SECTION 4 — CTA Group
        =========================================== */}
        <div className="mt-9 w-full flex flex-col items-center gap-3">
          <Link to={`/auth?login=true${qs}`} className="w-full max-w-[280px] h-11 flex items-center justify-center rounded-lg bg-[hsl(221,91%,60%)] text-white text-[14px] font-medium hover:bg-[hsl(221,91%,55%)] transition-colors">
            Sign in
          </Link>

          <Link to={returnTo ? `/auth?returnTo=${encodeURIComponent(returnTo)}` : '/auth'} className="w-full max-w-[280px] h-11 flex items-center justify-center rounded-lg bg-transparent border border-[hsl(220,16%,90%)] text-[hsl(222,22%,15%)] text-[14px] font-medium hover:bg-white hover:border-[hsl(220,16%,80%)] transition-colors">
            Create account
          </Link>

          
        </div>

        {/* ==========================================
            SECTION 5 — Reassurance Note
        =========================================== */}
        <div className="mt-8 flex items-start justify-center gap-2 max-w-[400px]">
          <Shield className="w-4 h-4 text-[hsl(222,12%,55%)] shrink-0 mt-[2px]" />
          <p className="text-[12px] text-[hsl(222,12%,55%)] leading-relaxed text-center">
            We use your resume to personalize your practice. Your information is never shared without your consent.
          </p>
        </div>

      </div>
    </div>
  );
}
