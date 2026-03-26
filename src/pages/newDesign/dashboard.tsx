import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import { getPersonalInfo, getProfile, savePersonalInfo, uploadResume, updateProfile } from '@/services/ProfileServices';
import { getTrainingPlans } from '@/services/InterviewServices';
import {
  Mic,
  BookOpen,
  TrendingUp,
  Clock,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Target,
  ArrowRight,
  MapPin,
  Briefcase,
  Upload,
  MoreHorizontal,
  Pencil,
  Calendar,
  Zap,
  Loader2,
  AlertTriangle,
  FileText,
  Download
} from 'lucide-react';
import { Button } from '@/components/newDesign/ui/button';
import { Input } from '@/components/newDesign/ui/input';
import { Label } from '@/components/newDesign/ui/label';
import { DashboardLayout } from '@/components/newDesign/dashboard-layout';
import { EditProfileModal, type EditProfileData } from '@/components/newDesign/edit-profile-modal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/newDesign/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/newDesign/ui/select";
import { useToast } from "@/hooks/use-toast";
import { usePostHog } from "posthog-js/react";
import { safeCapture } from "@/utils/posthog";
import ResumeAnalysisDialog from "@/components/profile/ResumeAnalysisDialog";
import { VISA_STATUS_OPTIONS } from "@/types/profile";
import type { ProfileData } from "@/types/profile";

type UserData = {
  firstName?: string;
  lastName?: string;
  role?: string;
  experienceLevel?: string;
  targetCompanies?: string[];
  jobStatus?: string;
  // Fields from API
  avatarUrl?: string;
  country?: string;
  resumeFileName?: string;
  resumeUploadedAt?: string;
  resume_path?:string;
  // Structured resume data
  structuredResume?: ProfileData;
};

function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

type RecentSession = {
  id: string;
  title: string;
  company: string;
  score: number;
  duration: string;
  date: string;
  tag: string;
  tagColor: 'blue' | 'green' | 'cyan';
};

function mapScore(raw: number): number {
  if (!raw) return 0;
  if (raw <= 1)  return Math.round(raw * 100);
  if (raw <= 10) return Math.round(raw * 10);
  return Math.round(raw);
}

function mapPlansToRecentSessions(plans: any[]): RecentSession[] {
  if (!Array.isArray(plans)) return [];
  return plans
    .flatMap((plan: any) => {
      const modules: any[] = Array.isArray(plan.modules) ? plan.modules : [];
      return modules
        .filter((m: any) => m.status === 'completed')
        .map((m: any): RecentSession => ({
          id: String(m.report_id ?? m.module_id ?? ''),
          title: m.title ?? plan.target_job_title ?? 'Mock Interview',
          company: plan.target_company ?? 'Practice Session',
          score: mapScore(m.score ?? 0),
          duration: m.duration_minutes ? `${m.duration_minutes} min` : '--',
          date: plan.updated_at ?? plan.created_at ?? '',
          tag: m.category ?? 'General',
          tagColor: 'blue',
        }));
    })
    .filter((s) => s.id)
    .sort(
      (a, b) =>
        (b.date ? new Date(b.date).getTime() : 0) -
        (a.date ? new Date(a.date).getTime() : 0),
    );
}

const quickActions = [
  {
    icon: BookOpen,
    title: 'Browse Questions',
    desc: 'Explore curated question bank',
    href: '/interview-insights',
    gradient: 'from-[hsl(190,90%,50%)] to-[hsl(210,80%,55%)]',
  },
  {
    icon: Mic,
    title: 'Start Mock Interview',
    desc: 'Practice with AI in real-time',
    href: '/personalized-practice',
    gradient: 'from-[hsl(221,91%,60%)] to-[hsl(200,80%,55%)]',
  },
];

function ScoreRing({ score }: { score: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 72 72">
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke="hsl(220,16%,90%)"
          strokeWidth="5"
        />
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke={score >= 85 ? 'hsl(165,82%,45%)' : score >= 70 ? 'hsl(221,91%,60%)' : 'hsl(35,90%,55%)'}
          strokeWidth="5"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-sm font-semibold text-[hsl(222,22%,15%)]">{score}</span>
    </div>
  );
}

function ProfileHeader({ 
  userData, 
  onUpdateProfile,
  onUploadResume 
}: { 
  userData: UserData | null, 
  onUpdateProfile: (data: UserData) => void,
  onUploadResume: (file: File) => Promise<void>
}) {
  const completion = 85; // TODO: replace with userData?.profileCompletionPct once backend returns it
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveProfile = (data: EditProfileData) => {
    onUpdateProfile({
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.currentRole,
      experienceLevel: data.currentLevel,
      targetCompanies: [],
      jobStatus: data.jobStatus,
    });
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 1MB",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);
      await onUploadResume(file);
    } catch (error) {
      console.error("Error uploading resume:", error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden"
    >
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".pdf,.doc,.docx"
        onChange={handleFileSelect}
      />

      <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
        {/* Left: Avatar & Info */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
          <div className="relative shrink-0">
            {/* Completion Ring */}
            <div className="relative w-24 h-24">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="46"
                  stroke="hsl(220,16%,90%)"
                  strokeWidth="3"
                  fill="none"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="46"
                  stroke="hsl(221,91%,60%)"
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray={2 * Math.PI * 46}
                  strokeDashoffset={2 * Math.PI * 46 * (1 - completion / 100)}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-1.5 rounded-full overflow-hidden border-2 border-white shadow-inner">
                {userData?.avatarUrl ? (
                  <img
                    src={userData.avatarUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[hsl(221,91%,60%)] text-white text-xl font-bold">
                    {(userData?.firstName?.[0] || '?').toUpperCase()}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm border border-[hsl(220,16%,90%)]">
                <div className="bg-[hsl(221,91%,60%)] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {completion}%
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-[hsl(222,22%,15%)]">
                  {userData?.firstName || 'Alex'} {userData?.lastName || 'Chen'}
                </h1>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full ml-2 hover:bg-[hsl(220,16%,90%)]" onClick={() => setEditOpen(true)}>
                  <Pencil className="w-4 h-4 text-[hsl(222,12%,50%)]" />
                </Button>
                <EditProfileModal
                  open={editOpen}
                  onOpenChange={setEditOpen}
                  initialData={{
                    firstName: userData?.firstName || '',
                    lastName: userData?.lastName || '',
                    currentRole: userData?.role || '',
                    currentLevel: userData?.experienceLevel || 'Intermediate',
                    targetRoles: [],
                    targetCompanyType: [],
                    jobStatus: userData?.jobStatus || '',
                  }}
                  onSave={handleSaveProfile}
                />
              </div>
              <p className="text-sm text-[hsl(222,12%,50%)]">{userData?.role || 'Senior Software Engineer'}</p>
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              
              <div className="flex items-center gap-1.5 px-3 py-1 bg-[hsl(220,20%,97%)] rounded-full border border-[hsl(220,16%,90%)] text-xs font-medium text-[hsl(222,12%,45%)]">
                <TrendingUp className="w-3.5 h-3.5 text-[hsl(222,12%,55%)]" />
                <span>{userData?.experienceLevel || 'Intermediate'}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-[hsl(220,20%,97%)] rounded-full border border-[hsl(220,16%,90%)] text-xs font-medium text-[hsl(222,12%,45%)]">
                <Target className="w-3.5 h-3.5 text-[hsl(222,12%,55%)]" />
                <span>{userData?.jobStatus || 'Actively job hunting'}</span>
              </div>
              {userData?.country && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-[hsl(220,20%,97%)] rounded-full border border-[hsl(220,16%,90%)] text-xs font-medium text-[hsl(222,12%,45%)]">
                  <MapPin className="w-3.5 h-3.5 text-[hsl(222,12%,55%)]" />
                  <span>{userData.country}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Resume Upload Action */}
        <div className="flex flex-col items-center md:items-end gap-3 w-full md:w-auto bg-[hsl(220,20%,98%)]/50 p-5 rounded-2xl border border-[hsl(220,16%,92%)]">
           <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                 <p className="text-sm font-semibold text-[hsl(222,22%,15%)]">
                   {userData?.resume_path ? (
                     <a
                       href={userData.resume_path}
                       target="_blank"
                       rel="noopener noreferrer"
                       download
                       className="text-[hsl(221,91%,60%)] hover:underline"
                     >
                       {userData.resumeFileName || 'Resume.pdf'}
                     </a>
                   ) : (
                     'No resume yet'
                   )}
                 </p>
                 <p className="text-[10px] text-[hsl(222,12%,55%)]">
                   {userData?.resumeUploadedAt
                     ? `Uploaded ${formatRelativeTime(userData.resumeUploadedAt)}`
                     : 'Upload your resume for AI feedback'}
                 </p>
              </div>
              <Button 
                className="bg-[hsl(222,22%,15%)] hover:bg-[hsl(222,22%,25%)] text-white shadow-md transition-all hover:shadow-lg gap-2 h-10 px-5 rounded-xl font-medium"
                onClick={handleUploadClick}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Update Resume
                  </>
                )}
              </Button>
           </div>
           <p className="text-xs text-[hsl(222,12%,55%)] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[hsl(35,90%,55%)]" />
              <span>Upload for <span className="font-medium text-[hsl(222,22%,15%)]">personalized AI feedback</span></span>
           </p>
        </div>
      </div>
    </motion.div>
  );
}

function PlusIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M5 12h14" />
            <path d="M12 5v14" />
        </svg>
    )
}

export function DashboardPage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const { toast } = useToast();
  const posthog = usePostHog();

  // States for resume upload dialogs
  const [showReplaceConfirmDialog, setShowReplaceConfirmDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showVisaStatusDialog, setShowVisaStatusDialog] = useState(false);
  const [tempVisaStatus, setTempVisaStatus] = useState<string>('');
  const [isSavingVisa, setIsSavingVisa] = useState(false);
  const [showResumeAnalysis, setShowResumeAnalysis] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    // 1. Load from localStorage immediately (fast, no flicker)
    try {
      const raw = localStorage.getItem('screnaUserData');
      if (raw) setUserData(JSON.parse(raw));
    } catch { /* ignore */ }

    // 2. Fetch real data from API and merge on top
    const fetchProfileData = async () => {
      try {
        const [personalRes, resumeRes] = await Promise.allSettled([
          getPersonalInfo(),
          getProfile(),
        ]);

        setUserData((prev) => {
          const merged: UserData = { ...prev };

          if (personalRes.status === 'fulfilled') {
            const info = personalRes.value.data?.data ?? personalRes.value.data;
            if (info?.name) {
              const [first, ...rest] = (info.name as string).split(' ');
              merged.firstName = first;
              merged.lastName = rest.join(' ');
            }
            if (info?.avatarUrl) merged.avatarUrl = info.avatarUrl;
            if (info?.country)   merged.country   = info.country;
          }

          if (resumeRes.status === 'fulfilled') {
            const resume = resumeRes.value.data?.data ?? resumeRes.value.data;
            if (resume?.resumeFileName)   merged.resumeFileName   = resume.resumeFileName;
            if (resume?.resumeUploadedAt) merged.resumeUploadedAt = resume.resumeUploadedAt;
            if (resume?.resume_path) merged.resume_path = resume.resume_path
            if (resume?.structured_resume) merged.structuredResume = resume.structured_resume;
          }

          return merged;
        });
      } catch { /* silent — localStorage data remains */ }

      // Fetch interview history
      try {
        const plansRes = await getTrainingPlans();
        const plans = plansRes.data?.data ?? plansRes.data ?? [];
        const mapped = mapPlansToRecentSessions(Array.isArray(plans) ? plans : []);
        setRecentSessions(mapped.slice(0, 3));
      } catch { /* silent */ } finally {
        setSessionsLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  const firstName = userData?.firstName || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const handleUpdateProfile = async (newData: UserData) => {
    const merged = { ...userData, ...newData };
    setUserData(merged);
    localStorage.setItem('screnaUserData', JSON.stringify(merged));

    // Sync name to API
    try {
      const name = [newData.firstName, newData.lastName].filter(Boolean).join(' ');
      if (name) await savePersonalInfo({ name, country: merged.country ?? '', timezone: '' });
    } catch { /* silent — data already saved to localStorage */ }
  };

  const handleUploadResume = async (file: File) => {
    try {
      setIsUploading(true);
      
      // Show processing toast
      toast({
        title: "Processing resume...",
        description: "AI is extracting information from your resume.",
      });

      // Upload resume
      const response = await uploadResume(file);
      const structuredResume = response.data?.data?.structured_resume || response.data?.structured_resume;
      const fileName = response.data?.data?.resumeFileName || file.name;

      // Track resume upload event
      safeCapture(posthog, 'resume_uploaded', {
        file_type: file.type,
        file_size: file.size,
        upload_source: 'dashboard_page',
        is_replacement: true,
      });

      if (structuredResume) {
        // Update user data with new resume info
        setUserData(prev => ({
          ...prev,
          resumeFileName: fileName,
          resumeUploadedAt: new Date().toISOString(),
          structuredResume,
          firstName: structuredResume.profile?.full_name?.split(' ')[0] || prev?.firstName,
          lastName: structuredResume.profile?.full_name?.split(' ').slice(1).join(' ') || prev?.lastName,
          role: structuredResume.profile?.headline || prev?.role,
          country: structuredResume.profile?.location || prev?.country,
        }));

        // Check if visa status is missing and prompt user
        if (!structuredResume.profile?.visa_status) {
          setTempVisaStatus('');
          setShowVisaStatusDialog(true);
          toast({
            title: "Resume parsed successfully!",
            description: "Please complete your work authorization status.",
          });
        } else {
          // Save profile to backend
          try {
            await updateProfile(structuredResume);
            toast({
              title: "Profile updated successfully!",
              description: "Your new resume has been parsed and saved.",
            });
          } catch (saveError) {
            console.error("Error saving profile:", saveError);
            toast({
              title: "Resume parsed but save failed",
              description: "Please try again or edit your profile manually.",
              variant: "destructive",
            });
          }
        }

        // Show resume analysis dialog
        setUploadedFileName(file.name);
        setShowResumeAnalysis(true);
      }

      // Save to localStorage
      localStorage.setItem('screnaUserData', JSON.stringify(userData));

    } catch (error) {
      console.error("Error uploading resume:", error);
      toast({
        title: "Error processing resume",
        description: "Please try again later.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelectForReplace = (file: File) => {
    // Show confirmation dialog
    setPendingFile(file);
    setShowReplaceConfirmDialog(true);
  };

  const handleConfirmedUpload = async () => {
    if (!pendingFile) return;
    await handleUploadResume(pendingFile);
    setShowReplaceConfirmDialog(false);
    setPendingFile(null);
  };

  const handleVisaStatusSave = async () => {
    if (!tempVisaStatus) {
      toast({
        title: "Please select a status",
        variant: "destructive",
      });
      return;
    }

    if (!userData?.structuredResume) return;

    try {
      setIsSavingVisa(true);
      const updatedProfile = {
        ...userData.structuredResume,
        profile: { ...userData.structuredResume.profile, visa_status: tempVisaStatus }
      };
      
      await updateProfile(updatedProfile);
      setUserData(prev => ({
        ...prev!,
        structuredResume: updatedProfile
      }));
      setShowVisaStatusDialog(false);
      
      toast({
        title: "Profile updated successfully!",
        description: "Your work authorization has been saved.",
      });
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error saving profile",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSavingVisa(false);
    }
  };

  const applications = [
    { company: 'Netflix', role: 'Senior Frontend Engineer', status: 'Interview', date: '2d ago', logo: 'N' },
    { company: 'Uber', role: 'Product Designer', status: 'Applied', date: '5d ago', logo: 'U' },
    { company: 'Airbnb', role: 'Software Engineer', status: 'Offer', date: '1w ago', logo: 'A' },
  ];

  const dailyQuestion = {
    id: 'dq-1',
    title: 'Explain the concept of "Event Loop" in JavaScript',
    category: 'Frontend',
    difficulty: 'Intermediate',
    participants: 1240,
    timeEstimate: '5 min'
  };

  return (
    <DashboardLayout headerTitle={`${greeting}, ${firstName} 👋`}>
      <div className="space-y-8">
        <ProfileHeader userData={userData} onUpdateProfile={handleUpdateProfile} onUploadResume={handleUploadResume} />


        {/* Quick actions */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <h2 className="text-base font-semibold text-[hsl(222,22%,15%)] mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quickActions.map((action, i) => (
              <Link key={action.title} to={action.href}>
                {action.title === 'Browse Questions' ? (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.2 + i * 0.07 }}
                    whileHover={{ y: -3, transition: { duration: 0.18 } }}
                    className="group relative bg-white rounded-2xl p-7 shadow-[0_2px_24px_-4px_rgba(0,0,0,0.08),0_8px_48px_-12px_rgba(0,0,0,0.06)] cursor-pointer hover:shadow-[0_4px_32px_-4px_rgba(0,0,0,0.12),0_12px_60px_-16px_rgba(0,0,0,0.08)] transition-all duration-300 h-full overflow-hidden flex flex-col justify-between min-h-[200px]"
                  >
                    {/* Large watermark question mark */}
                    <div className="absolute -right-4 -bottom-6 pointer-events-none select-none">
                      <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-[0.04] group-hover:opacity-[0.07] transition-opacity duration-500">
                        <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fontSize="150" fontWeight="800" fill="currentColor" className="text-[hsl(221,91%,60%)]">?</text>
                      </svg>
                    </div>

                    {/* Content */}
                    <div className="relative z-10">
                      <div className="flex items-center gap-2.5 mb-5">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center`}>
                          <action.icon className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-[hsl(222,12%,60%)]">Community</span>
                      </div>
                      <p className="text-lg font-semibold text-[hsl(222,22%,15%)] mb-1.5">Browse Interview Insights</p>
                      <p className="text-sm text-[hsl(222,12%,50%)] leading-relaxed">{action.desc}</p>
                    </div>

                    {/* View all link */}
                    <div className="relative z-10 flex justify-end mt-4">
                      <span className="text-sm text-[hsl(221,91%,60%)] font-medium flex items-center gap-1 group-hover:gap-2 transition-all duration-200">
                        View all <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </motion.div>
                ) : (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.2 + i * 0.07 }}
                  whileHover={{ y: -2, transition: { duration: 0.18 } }}
                  className="group bg-white rounded-2xl p-7 border border-[hsl(220,16%,92%)] cursor-pointer hover:border-[hsl(220,16%,85%)] transition-all duration-200 h-full flex flex-col justify-between min-h-[200px]"
                >
                  <div>
                    <action.icon className="w-5 h-5 text-[hsl(222,12%,55%)] stroke-[1.5] mb-5" />
                    <p className="text-lg font-medium text-[hsl(222,22%,15%)] mb-1.5">{action.title}</p>
                    <p className="text-sm text-[hsl(222,12%,50%)] leading-relaxed">{action.desc}</p>
                  </div>
                  <div className="flex justify-end mt-4">
                    <span className="text-sm text-[hsl(222,12%,50%)] font-medium flex items-center gap-1 group-hover:gap-2 group-hover:text-[hsl(221,91%,60%)] transition-all duration-200">
                      Start <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </motion.div>
                )}
              </Link>
            ))}
          </div>
        </motion.section>

        {/* Main Grid: Recent sessions + Sidebar (Tips & Apps) */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column: Recent interview sessions */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="xl:col-span-2"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-[hsl(222,22%,15%)]">Recent Sessions</h2>
              <Link to="/history" className="text-xs text-[hsl(221,91%,60%)] hover:underline flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {sessionsLoading ? (
                [0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-4 px-5 py-4 animate-pulse ${i < 2 ? 'border-b border-[hsl(220,16%,92%)]' : ''}`}
                  >
                    <div className="w-16 h-16 rounded-full bg-gray-100 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-40 bg-gray-100 rounded" />
                      <div className="h-3 w-28 bg-gray-100 rounded" />
                    </div>
                    <div className="h-3 w-14 bg-gray-100 rounded" />
                  </div>
                ))
              ) : recentSessions.length === 0 ? (
                <div className="py-10 text-center text-sm text-[hsl(222,12%,55%)]">
                  No sessions yet.{' '}
                  <Link to="/dashboard/mock-interview" className="text-[hsl(221,91%,60%)] hover:underline font-medium">
                    Start your first mock interview
                  </Link>
                </div>
              ) : (
                recentSessions.map((session, i) => (
                  <Link
                    key={session.id}
                    to={`/evaluation?interviewId=${session.id}`}
                    className={`flex items-center gap-4 px-5 py-4 hover:bg-[hsl(220,18%,98%)] transition-colors ${
                      i < recentSessions.length - 1 ? 'border-b border-[hsl(220,16%,92%)]' : ''
                    }`}
                  >
                    <ScoreRing score={session.score} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium text-[hsl(222,22%,15%)] truncate">
                          {session.title}
                        </p>
                        <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,55%)]">
                          {session.tag}
                        </span>
                      </div>
                      <p className="text-xs text-[hsl(222,12%,50%)]">
                        {session.company} · {session.duration}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-[hsl(222,12%,55%)]">
                        {session.date ? formatRelativeTime(session.date) : '--'}
                      </p>
                      <ChevronRight className="w-4 h-4 text-[hsl(222,12%,65%)] mt-1 ml-auto" />
                    </div>
                  </Link>
                ))
              )}
              <div className="px-5 py-3 bg-gray-50 border-t border-[hsl(220,16%,92%)] text-center">
                <Link to="/history" className="text-sm text-[hsl(222,12%,50%)] hover:text-[hsl(221,91%,60%)] font-medium transition-colors">
                  View Full History
                </Link>
              </div>
            </div>
          </motion.section>

          {/* Right Column: AI tip & Applications */}
          <div className="flex flex-col gap-6">
             {/* AI tip card */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.32 }}
              className="flex flex-col gap-4 flex-1"
            >
              {/* Today's tip */}
              <div className="bg-gradient-to-br from-[hsl(222,45%,14%)] to-[hsl(221,40%,22%)] rounded-2xl p-5 text-white flex-1 relative overflow-hidden flex flex-col">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                    <Sparkles className="w-24 h-24 text-white" />
                </div>
                <div className="relative z-10 flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-[hsl(165,82%,51%)]/20 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-[hsl(165,82%,60%)]" />
                    </div>
                    <span className="text-xs font-semibold text-[hsl(165,82%,60%)] uppercase tracking-wide">
                        AI Insight
                    </span>
                    </div>
                    <p className="text-sm leading-relaxed text-white/90 mb-4 flex-1">
                    You're consistently strong on behavioral questions. Focus on tightening your system design answers — particularly around trade-off reasoning.
                    </p>
                    <button className="text-xs text-[hsl(165,82%,60%)] hover:text-[hsl(165,82%,75%)] flex items-center gap-1 transition-colors">
                    See detailed report <ArrowRight className="w-3 h-3" />
                    </button>
                </div>
              </div>
            </motion.section>

            {/* Daily Challenge Card */}
            

            {/* Applications Tracker Snapshot */}
            

            {/* Next suggested practice - moved to bottom right */}
            
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}