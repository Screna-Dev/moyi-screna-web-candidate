import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router';
import {
  Shield, Check, UploadCloud, Target, ArrowRight, Loader2, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/newDesign/ui/button';
import { Card, CardContent } from '@/components/newDesign/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/newDesign/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/newDesign/ui/select';
import { Label } from '@/components/newDesign/ui/label';
import { uploadResume, updateProfile } from '@/services/ProfileServices';
import { VISA_STATUS_OPTIONS } from '@/types/profile';
import imgMascot from '@/assets/aef618fe1fbeac6dda6a449e6b61497c1dc80b4d.png';

type UploadState = 'idle' | 'uploading' | 'success';

export function GoalUploadPage({ onUploadSuccess }: { onUploadSuccess?: () => void }) {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Visa dialog state
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const processFile = async (file: File) => {
    if (file.size > 1024 * 1024) {
      setUploadError('File is too large. Max 1MB.');
      return;
    }
    setUploadError(null);
    setUploadState('uploading');
    try {
      const res = await uploadResume(file);
      const structuredResume = res.data?.data?.structured_resume ?? res.data?.structured_resume ?? res.data;
      const resumePath = res.data?.data?.resume_path ?? res.data?.resume_path;
      const visaStatus = structuredResume?.profile?.visa_status;

      if (!visaStatus) {
        setPendingResume({ structuredResume, fileName: file.name, resumePath });
        setUploadState('idle');
        setShowVisaDialog(true);
        return;
      }

      saveToLocalStorage(structuredResume, file.name, resumePath);
      setUploadState('success');
      onUploadSuccess?.();
    } catch (err: any) {
      setUploadError(err?.response?.data?.message || 'Upload failed. Please try again.');
      setUploadState('idle');
    }
  };

  const handleVisaSave = async () => {
    if (!tempVisaStatus || !pendingResume) return;
    setIsSavingVisa(true);
    try {
      await updateProfile({ visa_status: tempVisaStatus });
      saveToLocalStorage(pendingResume.structuredResume, pendingResume.fileName, pendingResume.resumePath);
      setShowVisaDialog(false);
      setPendingResume(null);
      setTempVisaStatus('');
      setUploadState('success');
      onUploadSuccess?.();
    } catch {
      // still complete upload even if visa save fails
      saveToLocalStorage(pendingResume.structuredResume, pendingResume.fileName, pendingResume.resumePath);
      setShowVisaDialog(false);
      setPendingResume(null);
      setTempVisaStatus('');
      setUploadState('success');
      onUploadSuccess?.();
    } finally {
      setIsSavingVisa(false);
    }
  };

  const isStep2Completed = uploadState === 'success';
  const activeStep = isStep2Completed ? 3 : 2;

  return (
    <div className="w-full max-w-[1226px] mx-auto px-6 md:px-8 flex flex-col">

      {/* Header & Stepper Row */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between w-full gap-12 lg:gap-8 mb-10">

        {/* Left Header */}
        <div className="mt-1">
          <h1 className="font-serif text-[40px] font-bold tracking-[-0.8px] text-[#0f172a] leading-[52px] mb-2">
            Personalized Practice
          </h1>
          <p className="text-[16px] text-[#62748e] leading-[24px]">
            AI-powered mock interviews tailored to your profile and target roles.
          </p>
        </div>

        {/* Right Stepper */}
        <div className="w-full max-w-[480px] relative mt-2 lg:mt-3">
          <div className="absolute top-[14px] left-[48px] w-[384px] h-[2px] bg-slate-200 -z-10" />
          <div className="flex justify-between w-full">
            {/* Step 1 */}
            <div className="flex flex-col items-center gap-2 relative bg-[hsl(220,20%,98%)] px-2">
              <div className="w-7 h-7 rounded-full bg-[#00bc7d] flex items-center justify-center text-white ring-4 ring-[hsl(220,20%,98%)]">
                <Check className="w-4 h-4" strokeWidth={3} />
              </div>
              <span className="text-[12px] font-medium text-slate-800 text-center">Signed in</span>
            </div>
            {/* Step 2 */}
            <div className="flex flex-col items-center gap-2 relative bg-[hsl(220,20%,98%)] px-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center ring-4 ring-[hsl(220,20%,98%)] transition-all duration-300 ${
                isStep2Completed
                  ? 'bg-[#00bc7d] text-white'
                  : 'bg-[hsl(221,91%,60%)] text-white shadow-[0_0_15px_rgba(67,118,248,0.25)]'
              }`}>
                {isStep2Completed ? <Check className="w-4 h-4" strokeWidth={3} /> : <span className="text-[13px] font-bold">2</span>}
              </div>
              <span className={`text-[12px] font-medium text-center transition-colors ${isStep2Completed ? 'text-slate-800' : 'text-[hsl(221,91%,60%)]'}`}>
                Upload Resume
              </span>
            </div>
            {/* Step 3 */}
            <div className="flex flex-col items-center gap-2 relative bg-[hsl(220,20%,98%)] px-2">
              <div className={`w-7 h-7 rounded-full border flex items-center justify-center ring-4 ring-[hsl(220,20%,98%)] transition-all duration-300 ${
                activeStep === 3
                  ? 'bg-[hsl(221,91%,60%)] text-white border-[hsl(221,91%,60%)] shadow-[0_0_15px_rgba(67,118,248,0.25)]'
                  : 'bg-slate-50 border-slate-200 text-[#90a1b9]'
              }`}>
                <span className="text-[13px] font-bold">3</span>
              </div>
              <span className={`text-[12px] font-medium text-center transition-colors ${activeStep === 3 ? 'text-[hsl(221,91%,60%)]' : 'text-[#90a1b9]'}`}>
                Add A Target Job
              </span>
            </div>
            {/* Step 4 */}
            <div className="flex flex-col items-center gap-2 relative bg-[hsl(220,20%,98%)] px-2">
              <div className="w-7 h-7 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-[#90a1b9] ring-4 ring-[hsl(220,20%,98%)]">
                <span className="text-[13px] font-bold">4</span>
              </div>
              <span className="text-[12px] font-medium text-[#90a1b9] text-center">Get Results</span>
            </div>
          </div>
        </div>
      </div>

      {/* Central Content Area */}
      <div className="w-full mx-auto flex flex-col items-center relative z-10">
        <AnimatePresence mode="wait">

          {/* Upload State */}
          {uploadState !== 'success' && (
            <motion.div
              key="upload-state"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
              className="flex flex-col items-center w-full"
            >
              <div className="text-center mb-12">
                <h2 className="font-serif text-[30px] font-bold tracking-[-0.75px] text-[#0f172b] leading-[36px] mb-4">
                  Upload your resume to unlock personalized results
                </h2>
                <p className="text-[15px] text-[#45556c] max-w-[588px] mx-auto leading-[24px]">
                  Screna uses your resume to personalize your role match, training, and practice.
                </p>
              </div>

              {/* Upload Zone */}
              <div
                className={`w-full max-w-[500px] relative overflow-hidden rounded-[16px] border-2 border-dashed transition-all duration-200 group ${
                  uploadState === 'uploading'
                    ? 'border-slate-200 bg-white/50 pointer-events-none'
                    : 'border-[rgba(60,119,246,0.3)] bg-[rgba(239,246,255,0.3)] hover:border-blue-500/50 hover:bg-blue-50/60 cursor-pointer'
                }`}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => uploadState !== 'uploading' && fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                />
                <div className="flex flex-col items-center justify-center py-10 px-6 h-[188px]">
                  {uploadState === 'uploading' ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="w-8 h-8 text-[hsl(221,91%,60%)] animate-spin mb-4" />
                      <p className="text-sm font-medium text-slate-700">Uploading your resume...</p>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] flex items-center justify-center mb-5">
                        <UploadCloud className="w-6 h-6 text-[#3c77f6]" strokeWidth={2} />
                      </div>
                      <p className="text-[14px] font-medium text-[#314158] text-center mb-1">
                        Drag and drop your resume here, or <span className="text-[#3c77f6] group-hover:underline">browse</span>
                      </p>
                      <p className="text-[12px] text-[#62748e] text-center">Supports PDF, DOCX · Max 1MB</p>
                    </>
                  )}
                </div>
              </div>

              {uploadError && (
                <div className="flex items-center gap-2 mt-3 text-red-500">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p className="text-[13px]">{uploadError}</p>
                </div>
              )}

              <div className="flex items-center gap-2 mt-6 justify-center">
                <Shield className="w-4 h-4 text-[#90a1b9]" strokeWidth={1.5} />
                <p className="text-[12px] text-[#62748e]">Your information is never shared without your consent.</p>
              </div>
            </motion.div>
          )}

          {/* Success State */}
          {uploadState === 'success' && (
            <motion.div
              key="success-state"
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="w-full flex flex-col items-center"
            >
              <div className="w-full mb-16">
                <Card className="w-full border-slate-200 shadow-sm hover:shadow-md hover:border-[hsl(221,91%,60%)]/40 transition-all duration-200 overflow-hidden cursor-pointer group">
                  <CardContent className="p-5 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-50/80 to-white">
                    <div className="flex items-start sm:items-center gap-4">
                      <div className="w-11 h-11 rounded-full bg-blue-50 border border-blue-200/60 flex items-center justify-center shrink-0">
                        <Target className="w-5 h-5 text-[hsl(221,91%,60%)]" strokeWidth={1.5} />
                      </div>
                      <div className="flex flex-col">
                        <h3 className="text-[14px] font-semibold text-slate-900 leading-tight mb-1">Target job</h3>
                        <p className="text-[14px] text-slate-500 leading-tight">
                          Add a job description to tailor sessions, or keep using recommendations based on your profile.
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" className="shrink-0 h-9 rounded-full px-4 border-slate-200 bg-white text-slate-800 text-xs font-medium shadow-sm hover:bg-slate-50 mt-3 sm:mt-0">
                      <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 16 16">
                        <path d="M3.33333 8H12.6667" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                        <path d="M8 3.33333V12.6667" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                      </svg>
                      Add target job
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="w-[384px] h-[256px] relative mb-3 pointer-events-none">
                <img src={imgMascot} alt="" className="absolute inset-0 w-full h-full object-cover" />
              </div>

              <div className="w-full flex flex-col items-center">
                <div className="h-px w-[200px] bg-[#e2e8f0] mb-6" />
                <p className="text-[14px] text-[#62748e] mb-1.5">Just exploring?</p>
                <Link
                  to="/job-board"
                  className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#45556c] hover:text-slate-900 transition-colors px-4 py-2 rounded-[12px] hover:bg-slate-100"
                >
                  Check out Trending Roles
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Visa Status Dialog */}
      <Dialog open={showVisaDialog} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>One more thing</DialogTitle>
            <DialogDescription>
              We couldn't detect your visa status from your resume. Please select it so we can tailor your results.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-sm font-medium mb-2 block">Visa Status</Label>
            <Select value={tempVisaStatus} onValueChange={setTempVisaStatus}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select your visa status" />
              </SelectTrigger>
              <SelectContent>
                {VISA_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button onClick={handleVisaSave} disabled={!tempVisaStatus || isSavingVisa} className="w-full">
              {isSavingVisa ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save & Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
