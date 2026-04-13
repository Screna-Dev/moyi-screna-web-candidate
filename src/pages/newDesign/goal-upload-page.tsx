import { Shield, Check, UploadCloud, Loader2, AlertCircle } from 'lucide-react';
import { useState, useRef } from 'react';
import { uploadResume, updateProfile } from '@/services/ProfileServices';
import { VISA_STATUS_OPTIONS } from '@/types/profile';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/newDesign/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/newDesign/ui/select';
import { Button } from '@/components/newDesign/ui/button';
import { Label } from '@/components/newDesign/ui/label';

export function GoalUploadPage({ onUploadSuccess }: { onUploadSuccess?: () => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Visa status dialog state
  const [showVisaDialog, setShowVisaDialog] = useState(false);
  const [tempVisaStatus, setTempVisaStatus] = useState('');
  const [isSavingVisa, setIsSavingVisa] = useState(false);
  const [pendingResume, setPendingResume] = useState<{
    structuredResume: any;
    fileName: string;
    resumePath?: string;
  } | null>(null);

  const saveToLocalStorage = (structuredResume: any, fileName: string, resumePath?: string) => {
    const existing = (() => {
      try { return JSON.parse(localStorage.getItem('screnaUserData') || '{}'); } catch { return {}; }
    })();
    localStorage.setItem('screnaUserData', JSON.stringify({
      ...existing,
      resumeFileName: fileName,
      resumeUploadedAt: new Date().toISOString(),
      resumeUploaded: true,
      structuredResume,
      ...(resumePath ? { resume_path: resumePath } : {}),
    }));
  };

  const handleFile = async (file: File) => {
    if (file.size > 1 * 1024 * 1024) {
      setUploadError('Please upload a file smaller than 1MB');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const response = await uploadResume(file);
      const responseData = response.data?.data ?? response.data;
      const structuredResume = responseData?.structured_resume;
      const fileName = responseData?.resumeFileName || file.name;
      const resumePath = responseData?.resume_path;

      if (structuredResume) {
        if (!structuredResume.profile?.visa_status) {
          // Visa status missing — prompt user before saving
          setPendingResume({ structuredResume, fileName, resumePath });
          setTempVisaStatus('');
          setShowVisaDialog(true);
        } else {
          await updateProfile(structuredResume);
          saveToLocalStorage(structuredResume, fileName, resumePath);
          onUploadSuccess?.();
        }
      } else {
        onUploadSuccess?.();
      }
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

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
      onUploadSuccess?.();
    } catch {
      setUploadError('Failed to save profile. Please try again.');
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
      onUploadSuccess?.();
    } catch {
      setUploadError('Failed to save profile. Please try again.');
      setShowVisaDialog(false);
    } finally {
      setIsSavingVisa(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center py-16 px-4">
      <div className="w-full max-w-[600px] flex flex-col items-center relative">

        {/* ==========================================
            SECTION 1 — Progress Indicator
        =========================================== */}
        <div className="w-full max-w-[480px] relative">
          {/* Connector Line */}
          <div className="absolute top-[14px] left-[10%] right-[10%] h-[1px] bg-[hsl(220,16%,90%)] -z-10" />

          <div className="flex justify-around w-full">
            {/* Step 1: Signed in */}
            <div className="flex flex-col items-center gap-2 relative bg-[hsl(220,20%,98%)] px-3 py-[0px]">
              <div className="w-7 h-7 rounded-full bg-[hsl(142,70%,45%)] flex items-center justify-center text-white ring-4 ring-[hsl(220,20%,98%)] transition-all">
                <Check className="w-4 h-4" strokeWidth={3} />
              </div>
              <span className="text-[12px] font-sans font-medium text-[hsl(222,22%,15%)] text-center">Signed in</span>
            </div>

            {/* Step 2: Upload resume */}
            <div className="flex flex-col items-center gap-2 relative bg-[hsl(220,20%,98%)] px-3">
              <div className="w-7 h-7 rounded-full bg-[hsl(221,91%,60%)] flex items-center justify-center text-white ring-4 ring-[hsl(220,20%,98%)] shadow-[0_0_15px_rgba(67,118,248,0.25)] transition-all">
                <span className="text-[13px] font-bold">2</span>
              </div>
              <span className="text-[12px] font-sans font-medium text-[hsl(221,91%,60%)] text-center">Upload Resume</span>
            </div>

            {/* Step 3: Add target job */}
            <div className="flex flex-col items-center gap-2 relative bg-[hsl(220,20%,98%)] px-[6px] py-[0px]">
              <div className="w-7 h-7 rounded-full bg-[hsl(220,18%,96%)] border border-[hsl(220,16%,90%)] flex items-center justify-center text-[hsl(222,12%,65%)] ring-4 ring-[hsl(220,20%,98%)] transition-all">
                <span className="text-[13px] font-bold">3</span>
              </div>
              <span className="text-[12px] font-sans font-medium text-[hsl(222,12%,65%)] text-center">Add A Target Job</span>
            </div>

            {/* Step 4: Get Personalized Results */}
            <div className="flex flex-col items-center gap-2 relative bg-[hsl(220,20%,98%)] px-3">
              <div className="w-7 h-7 rounded-full bg-[hsl(220,18%,96%)] border border-[hsl(220,16%,90%)] flex items-center justify-center text-[hsl(222,12%,65%)] ring-4 ring-[hsl(220,20%,98%)] transition-all">
                <span className="text-[13px] font-bold">4</span>
              </div>
              <span className="text-[12px] font-sans font-medium text-[hsl(222,12%,65%)] text-center">Get Personalized Results</span>
            </div>
          </div>
        </div>

        {/* ==========================================
            SECTION 2 — Main Message
        =========================================== */}
        <div className="mt-10 text-center flex flex-col items-center">
          <h1 className="text-[32px] font-bold text-[hsl(222,22%,15%)] max-w-[520px] leading-[1.15] mb-4">
            Upload your resume to unlock personalized results
          </h1>

        </div>

        {/* ==========================================
            SECTION 3 — Upload Zone
        =========================================== */}
        <div className="mt-7 w-full max-w-[480px]">
          <label className={`flex flex-col items-center justify-center w-full py-8 px-12 rounded-xl border-2 border-dashed border-[hsl(221,91%,60%)]/30 bg-[hsl(221,91%,98%)]/60 transition-all duration-200 group ${isUploading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-solid hover:border-[hsl(221,91%,60%)] hover:bg-[hsl(221,91%,96%)]'}`}>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx"
              disabled={isUploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            {isUploading ? (
              <Loader2 className="w-6 h-6 text-[hsl(221,91%,60%)] mb-3 animate-spin" />
            ) : (
              <UploadCloud className="w-6 h-6 text-[hsl(222,12%,45%)] mb-3 group-hover:text-[hsl(221,91%,60%)] transition-colors" />
            )}
            <p className="text-[14px] text-[hsl(222,12%,45%)] font-medium text-center">
              {isUploading ? 'Uploading…' : <>Drag and drop your resume here, or <span className="text-[hsl(221,91%,60%)]">browse</span></>}
            </p>
            <p className="text-[12px] text-[hsl(222,12%,55%)] mt-1.5 text-center">
              Supports PDF, DOCX · Max 1MB
            </p>
          </label>
          {uploadError && (
            <div className="mt-3 flex items-center gap-2 text-red-600 text-[13px]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {uploadError}
            </div>
          )}
        </div>

        {/* ==========================================
            SECTION 4 — CTA Group
        =========================================== */}
        <div className="mt-6 w-full flex flex-col items-center gap-2.5">
        </div>

        {/* ==========================================
            SECTION 5 — Reassurance Note
        =========================================== */}
        <div className="flex items-start justify-center gap-2 max-w-[400px] mx-[0px] mt-[5px] mb-[0px]">
          <Shield className="w-4 h-4 text-[hsl(222,12%,55%)] shrink-0 mt-[2px]" />
          <p className="text-[12px] text-[hsl(222,12%,55%)] leading-relaxed text-center">
            We use your resume to personalize your practice. Your information is never shared without your consent.
          </p>
        </div>

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
