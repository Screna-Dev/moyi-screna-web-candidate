import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import { getPersonalInfo, getProfile, savePersonalInfo, uploadResume, updateProfile } from '@/services/ProfileServices';
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const recentSessions = [
  {
    id: 1,
    title: 'System Design Interview',
    company: 'FAANG',
    score: 82,
    duration: '28 min',
    date: 'Today, 2:30 PM',
    tag: 'Technical',
    tagColor: 'blue',
  },
  {
    id: 2,
    title: 'Behavioral — Leadership',
    company: 'Mid-size Tech',
    score: 91,
    duration: '15 min',
    date: 'Yesterday',
    tag: 'Behavioral',
    tagColor: 'green',
  },
  {
    id: 3,
    title: 'Product Sense',
    company: 'Startup',
    score: 74,
    duration: '22 min',
    date: 'Feb 15',
    tag: 'PM',
    tagColor: 'cyan',
  },
];

const quickActions = [
  {
    icon: Mic,
    title: 'Start Mock Interview',
    desc: 'Practice with AI in real-time',
    href: '/dashboard/mock-interview',
    gradient: 'from-[hsl(221,91%,60%)] to-[hsl(200,80%,55%)]',
  },
  {
    icon: BookOpen,
    title: 'Browse Questions',
    desc: 'Explore curated question bank',
    href: '/question-bank',
    gradient: 'from-[hsl(190,90%,50%)] to-[hsl(210,80%,55%)]',
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
                   {userData?.resumeFileName || 'No resume yet'}
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
      if (name) await savePersonalInfo({ name });
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
        <ProfileHeader 
          userData={userData} 
          onUpdateProfile={handleUpdateProfile}
          onUploadResume={handleFileSelectForReplace}
        />

        {/* Replace Resume Confirmation Dialog */}
        <Dialog open={showReplaceConfirmDialog} onOpenChange={setShowReplaceConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Replace Current Profile?
              </DialogTitle>
              <DialogDescription>
                Uploading a new resume will completely replace your current profile data with information extracted from the new resume.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <p className="text-sm text-muted-foreground">
                This action will overwrite:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Personal information</li>
                <li>• Work experience</li>
                <li>• Education history</li>
                <li>• Skills and certifications</li>
                <li>• All other profile data</li>
              </ul>
              <p className="text-sm font-medium text-amber-600">
                This action cannot be undone.
              </p>
            </div>
            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowReplaceConfirmDialog(false);
                  setPendingFile(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleConfirmedUpload}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Replace Profile"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Visa Status Dialog */}
        <Dialog open={showVisaStatusDialog} onOpenChange={setShowVisaStatusDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Your Work Authorization</DialogTitle>
              <DialogDescription>
                Please select your current work authorization status
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Work Authorization Status</Label>
                <Select
                  value={tempVisaStatus}
                  onValueChange={setTempVisaStatus}
                >
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
            </div>
            <DialogFooter>
              <Button
                onClick={handleVisaStatusSave}
                disabled={isSavingVisa}
              >
                {isSavingVisa ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Resume Analysis Dialog */}
        <ResumeAnalysisDialog
          open={showResumeAnalysis}
          onOpenChange={setShowResumeAnalysis}
          fileName={uploadedFileName}
        />

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
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.2 + i * 0.07 }}
                  whileHover={{ y: -3, transition: { duration: 0.18 } }}
                  className="group bg-white rounded-2xl p-5 shadow-sm cursor-pointer hover:shadow-md transition-all duration-200 h-full"
                >
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-4`}
                  >
                    <action.icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-sm font-semibold text-[hsl(222,22%,15%)] mb-1">{action.title}</p>
                  <p className="text-xs text-[hsl(222,12%,50%)] leading-relaxed">{action.desc}</p>
                  <div className="mt-3 flex items-center gap-1 text-xs text-[hsl(221,91%,60%)] opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Get started</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </motion.div>
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
              <button className="text-xs text-[hsl(221,91%,60%)] hover:underline flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {recentSessions.map((session, i) => (
                <div
                  key={session.id}
                  className={`flex items-center gap-4 px-5 py-4 hover:bg-[hsl(220,18%,98%)] transition-colors cursor-pointer ${
                    i < recentSessions.length - 1 ? 'border-b border-[hsl(220,16%,92%)]' : ''
                  }`}
                >
                  <ScoreRing score={session.score} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium text-[hsl(222,22%,15%)] truncate">
                        {session.title}
                      </p>
                      <span
                        className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                          session.tagColor === 'blue'
                            ? 'bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,55%)]'
                            : session.tagColor === 'green'
                            ? 'bg-[hsl(165,82%,51%)]/10 text-[hsl(165,65%,40%)]'
                            : 'bg-[hsl(190,90%,50%)]/10 text-[hsl(190,90%,40%)]'
                        }`}
                      >
                        {session.tag}
                      </span>
                    </div>
                    <p className="text-xs text-[hsl(222,12%,50%)]">
                      {session.company} · {session.duration}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-[hsl(222,12%,55%)]">{session.date}</p>
                    <ChevronRight className="w-4 h-4 text-[hsl(222,12%,65%)] mt-1 ml-auto" />
                  </div>
                </div>
              ))}
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
              className="flex flex-col gap-4"
            >
              {/* Today's tip */}
              <div className="bg-gradient-to-br from-[hsl(222,45%,14%)] to-[hsl(221,40%,22%)] rounded-2xl p-5 text-white flex-1 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                    <Sparkles className="w-24 h-24 text-white" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-[hsl(165,82%,51%)]/20 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-[hsl(165,82%,60%)]" />
                    </div>
                    <span className="text-xs font-semibold text-[hsl(165,82%,60%)] uppercase tracking-wide">
                        AI Insight
                    </span>
                    </div>
                    <p className="text-sm leading-relaxed text-white/90 mb-4">
                    You're consistently strong on behavioral questions. Focus on tightening your system design answers — particularly around trade-off reasoning.
                    </p>
                    <button className="text-xs text-[hsl(165,82%,60%)] hover:text-[hsl(165,82%,75%)] flex items-center gap-1 transition-colors">
                    See detailed report <ArrowRight className="w-3 h-3" />
                    </button>
                </div>
              </div>
            </motion.section>

            {/* Daily Challenge Card */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-white rounded-2xl shadow-sm p-5 relative group overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-[hsl(221,91%,60%)]/5 rounded-full blur-2xl -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-700" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-[hsl(35,90%,55%)]/10 rounded-lg">
                      <Zap className="w-4 h-4 text-[hsl(35,90%,55%)]" />
                    </div>
                    <span className="text-xs font-bold text-[hsl(222,22%,15%)] uppercase tracking-wide">
                      Daily Question
                    </span>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 bg-[hsl(220,16%,94%)] text-[hsl(222,12%,50%)] rounded-full">
                    {dailyQuestion.timeEstimate}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-[hsl(222,22%,15%)] mb-2 line-clamp-2">
                  {dailyQuestion.title}
                </h3>

                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[10px] font-medium px-2 py-0.5 bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,55%)] rounded-full">
                    {dailyQuestion.category}
                  </span>
                  <span className="text-[10px] font-medium px-2 py-0.5 bg-[hsl(35,90%,55%)]/10 text-[hsl(35,90%,45%)] rounded-full">
                    {dailyQuestion.difficulty}
                  </span>
                  <span className="text-[10px] text-[hsl(222,12%,60%)] ml-auto">
                    {dailyQuestion.participants.toLocaleString()} attempted
                  </span>
                </div>

                <Link to={`/mock-interview?q=${dailyQuestion.id}`}>
                  <Button className="w-full bg-white border border-[hsl(220,16%,90%)] hover:bg-[hsl(220,20%,97%)] text-[hsl(222,22%,15%)] shadow-sm hover:shadow transition-all group-hover:border-[hsl(221,91%,60%)]/40">
                    <Mic className="w-3.5 h-3.5 mr-2 text-[hsl(221,91%,60%)]" />
                    Start Quick Mock
                  </Button>
                </Link>
              </div>
            </motion.section>

            {/* Applications Tracker Snapshot */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.42 }}
              className="bg-white rounded-2xl shadow-sm p-5"
            >
              <div className="flex items-center justify-between mb-4">
                 <h3 className="text-base font-semibold text-[hsl(222,22%,15%)]">Applications</h3>
                 <Link to="/jobs">
                   <Button variant="ghost" size="sm" className="h-6 text-xs text-[hsl(222,12%,50%)] hover:text-[hsl(221,91%,60%)]">
                     View All
                   </Button>
                 </Link>
              </div>
              <div className="space-y-3">
                {applications.map((app, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 hover:bg-[hsl(220,20%,97%)] rounded-xl transition-colors cursor-pointer group">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm ${
                      app.company === 'Netflix' ? 'bg-[#E50914]' :
                      app.company === 'Uber' ? 'bg-black' :
                      'bg-[#FF5A5F]'
                    }`}>
                      {app.logo}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[hsl(222,22%,15%)] truncate">{app.role}</p>
                      <p className="text-xs text-[hsl(222,12%,50%)]">{app.company} · {app.date}</p>
                    </div>
                    <div className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                      app.status === 'Interview' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                      app.status === 'Offer' ? 'bg-green-50 text-green-600 border-green-100' :
                      'bg-gray-50 text-gray-500 border-gray-100'
                    }`}>
                      {app.status}
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* Next suggested practice - moved to bottom right */}
            
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}