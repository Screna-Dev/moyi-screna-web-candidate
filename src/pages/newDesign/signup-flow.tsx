import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/newDesign/ui/button';
import { Input } from '@/components/newDesign/ui/input';
import { Progress } from '@/components/newDesign/ui/progress';
import { Check, Upload, FileText, Shield, Lock } from 'lucide-react';

type SignupStep = 'loading' | 'verification' | 'name' | 'work' | 'role' | 'experience' | 'companies' | 'jobStatus' | 'resume';

export function SignupFlowPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<SignupStep>('loading');
  const [email] = useState('user@screna.ai'); // Mock email from auth page
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    workType: [] as string[],
    role: '',
    experienceLevel: '',
    targetCompanies: '',
    jobStatus: '',
    resume: null as File | null,
    agreedToPrivacy: false
  });
  const [isDragging, setIsDragging] = useState(false);

  // Auto-advance from loading
  useState(() => {
    if (currentStep === 'loading') {
      setTimeout(() => {
        setCurrentStep('verification');
      }, 2000);
    }
  });

  const steps: SignupStep[] = ['verification', 'name', 'work', 'role', 'experience', 'companies', 'jobStatus', 'resume'];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const workTypes = [
    'Engineering',
    'Product',
    'Design',
    'Data Science',
    'DevOps',
    'AI/ML'
  ];

  const roles = [
    'Executive', 'Contractor / Freelancer', 'C-Suite',
    'Individual Contributor', 'Department Lead', 'Team Manager'
  ];

  const experienceLevels = [
    '0–2 years',
    '3–5 years',
    '6–9 years',
    '10+ years'
  ];

  const companyTypes = [
    'Large enterprises',
    'Mid-sized companies',
    'Small companies',
    'FAANG / Big tech'
  ];

  const jobStatuses = [
    'Student',
    'Not actively looking',
    'Actively job hunting',
    'Open to opportunities'
  ];

  const handleNext = () => {
    if (currentStep === 'verification') {
      setCurrentStep('name');
    } else if (currentStep === 'name') {
      if (!formData.firstName || !formData.lastName) {
        alert('Please enter your name');
        return;
      }
      setCurrentStep('work');
    } else if (currentStep === 'work') {
      setCurrentStep('role');
    } else if (currentStep === 'role') {
      if (!formData.role) {
        alert('Please select your role');
        return;
      }
      setCurrentStep('experience');
    } else if (currentStep === 'experience') {
      if (!formData.experienceLevel) {
        alert('Please select your experience level');
        return;
      }
      setCurrentStep('companies');
    } else if (currentStep === 'companies') {
      // Optional step, no validation required
      setCurrentStep('jobStatus');
    } else if (currentStep === 'jobStatus') {
      if (!formData.jobStatus) {
        alert('Please select your job status');
        return;
      }
      setCurrentStep('resume');
    } else if (currentStep === 'resume') {
      if (!formData.resume) {
        alert('Please upload your resume');
        return;
      }
      if (!formData.agreedToPrivacy) {
        alert('Please agree to the privacy policy');
        return;
      }
      // Complete signup — set logged-in state
      const userData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
        experienceLevel: formData.experienceLevel,
        targetCompanies: formData.targetCompanies.split(',').map((c) => c.trim()).filter(Boolean),
        resumeUploaded: true,
        resumeFileName: formData.resume.name,
      };
      localStorage.setItem('screnaIsLoggedIn', 'true');
      localStorage.setItem('screnaUserData', JSON.stringify(userData));
      window.dispatchEvent(new Event('screna-auth-change'));
      navigate('/profile');
    }
  };

  const handleBack = () => {
    if (currentStep === 'name') {
      setCurrentStep('verification');
    } else if (currentStep === 'work') {
      setCurrentStep('name');
    } else if (currentStep === 'role') {
      setCurrentStep('work');
    } else if (currentStep === 'experience') {
      setCurrentStep('role');
    } else if (currentStep === 'companies') {
      setCurrentStep('experience');
    } else if (currentStep === 'jobStatus') {
      setCurrentStep('companies');
    } else if (currentStep === 'resume') {
      setCurrentStep('jobStatus');
    }
  };

  const canGoBack = currentStep !== 'loading' && currentStep !== 'verification';

  // Loading Screen
  if (currentStep === 'loading') {
    return (
      <div className="min-h-screen bg-white relative overflow-hidden flex flex-col items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-[hsl(222,22%,15%)] mb-4 tracking-tight">
            Screna AI
          </h1>
          <h2 className="text-2xl font-semibold text-[hsl(222,22%,15%)] mb-2">
            Explore your personalized path to becoming offer‑ready
          </h2>
          <p className="text-[hsl(222,12%,45%)] mb-8">
            Sign up for a free account.
          </p>
          {/* Loading spinner */}
          <div className="flex justify-center">
            <div className="w-16 h-16 border-4 border-[hsl(220,16%,90%)] border-t-black rounded-full animate-spin" />
          </div>
        </div>
        {/* Bottom gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[hsl(221,91%,60%)] to-transparent opacity-20" />
      </div>
    );
  }

  // All other steps
  return (
    <div className="min-h-screen bg-white relative overflow-hidden flex flex-col items-center justify-center px-6">
      {/* Header - positioned absolutely at top */}
      <div className="absolute top-6 left-6">
        <h1 className="text-2xl font-semibold text-[hsl(222,22%,15%)] tracking-tight">
          Screna AI
        </h1>
      </div>

      {/* Progress bar - positioned absolutely at top */}
      {currentStep !== 'loading' && (
        <div className="absolute top-20 left-6 right-6">
          <Progress value={progress} className="h-1" />
        </div>
      )}

      {/* Main content area - centered */}
      <div className="w-full max-w-6xl">
        {/* Verification Step - Centered */}
        {currentStep === 'verification' && (
          <div className="flex items-center justify-center">
            <div className="w-full max-w-md">
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-[hsl(220,16%,90%)]">
                <h2 className="text-2xl font-semibold text-[hsl(222,22%,15%)] mb-6">
                  We sent a verification email to
                </h2>
                <div className="bg-[hsl(220,18%,98%)] rounded-lg p-4 mb-6">
                  <p className="text-[hsl(222,22%,15%)] text-center">{email}</p>
                </div>
                <p className="text-sm text-[hsl(222,12%,45%)] text-center mb-6">
                  Not seeing the email?{' '}
                  <button className="text-[hsl(221,91%,60%)] hover:underline font-medium">
                    Resend
                  </button>
                </p>
                <Button
                  onClick={handleNext}
                  className="w-full py-3 bg-black text-white rounded-full hover:bg-[hsl(222,22%,15%)] transition-colors"
                >
                  Continue
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Other steps - Centered layout */}
        {currentStep !== 'verification' && (
          <div className="flex justify-center">
            {/* Form */}
            <div className="w-full max-w-lg">
              {/* Name Step */}
              {currentStep === 'name' && (
                <div>
                  <h2 className="text-4xl font-semibold text-[hsl(222,22%,15%)] mb-3">
                    Hi there, what's your name?
                  </h2>
                  <p className="text-[hsl(222,12%,45%)] mb-8">
                    Help us personalize your experience by answering three quick questions
                  </p>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label htmlFor="firstName" className="block text-sm text-[hsl(222,22%,15%)]">
                        First Name
                      </label>
                      <div className="relative">
                        <Input
                          id="firstName"
                          type="text"
                          placeholder="First name"
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          className="w-full px-4 py-2.5 bg-white border border-[hsl(220,16%,90%)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(221,91%,60%)] focus:border-transparent"
                        />
                        {formData.firstName && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="w-5 h-5 rounded-full bg-[hsl(165,82%,51%)] flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="lastName" className="block text-sm text-[hsl(222,22%,15%)]">
                        Last Name
                      </label>
                      <div className="relative">
                        <Input
                          id="lastName"
                          type="text"
                          placeholder="Last name"
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          className="w-full px-4 py-2.5 bg-white border border-[hsl(220,16%,90%)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(221,91%,60%)] focus:border-transparent"
                        />
                        {formData.lastName && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="w-5 h-5 rounded-full bg-[hsl(165,82%,51%)] flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      onClick={handleNext}
                      className="bg-black text-white rounded-xl hover:bg-[hsl(222,22%,15%)] transition-colors px-8 py-2.5"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}

              {/* Work Type Step */}
              {currentStep === 'work' && (
                <div>
                  <h2 className="text-4xl font-semibold text-[hsl(222,22%,15%)] mb-3">
                    What kind of work do you do?
                  </h2>
                  <p className="text-[hsl(222,12%,45%)] mb-8">
                    Help us personalize your experience.
                  </p>

                  <div className="flex flex-wrap gap-3 mb-8">
                    {workTypes.map((type) => {
                      const isSelected = formData.workType.includes(type);
                      return (
                        <button
                          key={type}
                          onClick={() => {
                            if (isSelected) {
                              // Remove from selection
                              setFormData({ 
                                ...formData, 
                                workType: formData.workType.filter(t => t !== type) 
                              });
                            } else {
                              // Add to selection
                              setFormData({ 
                                ...formData, 
                                workType: [...formData.workType, type] 
                              });
                            }
                          }}
                          className={`px-6 py-2.5 rounded-full border-2 transition-all ${
                            isSelected
                              ? 'border-[hsl(221,91%,60%)] bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,60%)] font-medium'
                              : 'border-[hsl(220,16%,90%)] bg-white text-[hsl(222,22%,15%)] hover:border-[hsl(221,91%,60%)]/50'
                          }`}
                        >
                          {type}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleBack}
                      variant="outline"
                      className="border-2 border-black text-black rounded-full hover:bg-black/10 px-8 py-2.5"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleNext}
                      className="bg-black text-white rounded-full hover:bg-[hsl(222,22%,15%)] transition-colors px-8 py-2.5"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}

              {/* Role Step */}
              {currentStep === 'role' && (
                <div>
                  <h2 className="text-4xl font-semibold text-[hsl(222,22%,15%)] mb-3">
                    What is your role?
                  </h2>
                  <p className="text-[hsl(222,12%,45%)] mb-8">
                    Help us personalize your experience.
                  </p>

                  <div className="flex flex-wrap gap-3 mb-8">
                    {roles.map((role) => (
                      <button
                        key={role}
                        onClick={() => setFormData({ ...formData, role })}
                        className={`px-6 py-2.5 rounded-full border-2 transition-all ${
                          formData.role === role
                            ? 'border-[hsl(221,91%,60%)] bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,60%)] font-medium'
                            : 'border-[hsl(220,16%,90%)] bg-white text-[hsl(222,22%,15%)] hover:border-[hsl(221,91%,60%)]/50'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleBack}
                      variant="outline"
                      className="border-2 border-black text-black rounded-full hover:bg-black/10 px-8 py-2.5"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleNext}
                      className="bg-black text-white rounded-full hover:bg-[hsl(222,22%,15%)] transition-colors px-8 py-2.5"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}

              {/* Experience Step */}
              {currentStep === 'experience' && (
                <div>
                  <h2 className="text-4xl font-semibold text-[hsl(222,22%,15%)] mb-3">
                    What's your experience level?
                  </h2>
                  <p className="text-[hsl(222,12%,45%)] mb-8">
                    I'll adjust question difficulty based on this.
                  </p>

                  <div className="flex flex-wrap gap-3 mb-8">
                    {experienceLevels.map((level) => {
                      const labelMap: Record<string, string> = {
                        '0–2 years': 'Junior',
                        '3–5 years': 'Intermediate / Mid-Level',
                        '6–9 years': 'Senior',
                        '10+ years': 'Staff / Principal',
                      };
                      const displayLabel = labelMap[level] || level;
                      return (
                        <button
                          key={level}
                          onClick={() => setFormData({ ...formData, experienceLevel: level })}
                          className={`px-6 py-2.5 rounded-full border-2 transition-all flex flex-col items-center ${
                            formData.experienceLevel === level
                              ? 'border-[hsl(221,91%,60%)] bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,60%)] font-medium'
                              : 'border-[hsl(220,16%,90%)] bg-white text-[hsl(222,22%,15%)] hover:border-[hsl(221,91%,60%)]/50'
                          }`}
                        >
                          <span>{displayLabel}</span>
                          <span className="text-xs opacity-60">{level}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleBack}
                      variant="outline"
                      className="border-2 border-black text-black rounded-full hover:bg-black/10 px-8 py-2.5"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleNext}
                      className="bg-black text-white rounded-full hover:bg-[hsl(222,22%,15%)] transition-colors px-8 py-2.5"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}

              {/* Companies Step */}
              {currentStep === 'companies' && (
                <div>
                  <h2 className="text-4xl font-semibold text-[hsl(222,22%,15%)] mb-3">
                    Are you targeting any specific companies?
                  </h2>
                  <p className="text-[hsl(222,12%,45%)] mb-8">
                    This helps me simulate more realistic interview styles. (Optional)
                  </p>

                  <div className="flex flex-wrap gap-3 mb-8">
                    {companyTypes.map((type) => (
                      <button
                        key={type}
                        onClick={() => setFormData({ ...formData, targetCompanies: type })}
                        className={`px-6 py-2.5 rounded-full border-2 transition-all ${
                          formData.targetCompanies === type
                            ? 'border-[hsl(221,91%,60%)] bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,60%)] font-medium'
                            : 'border-[hsl(220,16%,90%)] bg-white text-[hsl(222,22%,15%)] hover:border-[hsl(221,91%,60%)]/50'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleBack}
                      variant="outline"
                      className="border-2 border-black text-black rounded-full hover:bg-black/10 px-8 py-2.5"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleNext}
                      className="bg-black text-white rounded-full hover:bg-[hsl(222,22%,15%)] transition-colors px-8 py-2.5"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}

              {/* Job Status Step */}
              {currentStep === 'jobStatus' && (
                <div>
                  <h2 className="text-4xl font-semibold text-[hsl(222,22%,15%)] mb-3">
                    What is your current job status?
                  </h2>
                  <p className="text-[hsl(222,12%,45%)] mb-8">
                    This helps me tailor your experience.
                  </p>

                  <div className="flex flex-wrap gap-3 mb-8">
                    {jobStatuses.map((status) => (
                      <button
                        key={status}
                        onClick={() => setFormData({ ...formData, jobStatus: status })}
                        className={`px-6 py-2.5 rounded-full border-2 transition-all ${
                          formData.jobStatus === status
                            ? 'border-[hsl(221,91%,60%)] bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,60%)] font-medium'
                            : 'border-[hsl(220,16%,90%)] bg-white text-[hsl(222,22%,15%)] hover:border-[hsl(221,91%,60%)]/50'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleBack}
                      variant="outline"
                      className="border-2 border-black text-black rounded-full hover:bg-black/10 px-8 py-2.5"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleNext}
                      className="bg-black text-white rounded-full hover:bg-[hsl(222,22%,15%)] transition-colors px-8 py-2.5"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}

              {/* Resume Step */}
              {currentStep === 'resume' && (
                <div>
                  <h2 className="text-4xl font-semibold text-[hsl(222,22%,15%)] mb-3">
                    Upload your resume
                  </h2>
                  <p className="text-[hsl(222,12%,45%)] mb-6">
                    This helps me understand your background and tailor interview questions to your experience.
                  </p>

                  {/* Security badges */}
                  <div className="flex flex-wrap gap-3 mb-6">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[hsl(165,82%,51%)]/10 rounded-full">
                      <Shield className="w-4 h-4 text-[hsl(165,82%,51%)]" />
                      <span className="text-sm text-[hsl(165,82%,35%)] font-medium">End-to-end encrypted</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[hsl(221,91%,60%)]/10 rounded-full">
                      <Lock className="w-4 h-4 text-[hsl(221,91%,60%)]" />
                      <span className="text-sm text-[hsl(221,91%,50%)] font-medium">Secure storage</span>
                    </div>
                  </div>

                  {/* Drag and drop zone */}
                  <div
                    className={`relative w-full border-2 border-dashed rounded-xl transition-all cursor-pointer ${
                      isDragging 
                        ? 'border-[hsl(221,91%,60%)] bg-[hsl(221,91%,60%)]/5' 
                        : formData.resume
                        ? 'border-[hsl(165,82%,51%)] bg-[hsl(165,82%,51%)]/5'
                        : 'border-[hsl(220,16%,90%)] bg-white hover:border-[hsl(221,91%,60%)]/50'
                    }`}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files[0];
                      if (file && (file.type === 'application/pdf' || file.name.endsWith('.pdf') || file.name.endsWith('.docx'))) {
                        setFormData({ ...formData, resume: file });
                      }
                      setIsDragging(false);
                    }}
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.pdf,.docx';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                          setFormData({ ...formData, resume: file });
                        }
                      };
                      input.click();
                    }}
                  >
                    <div className="p-8 flex flex-col items-center justify-center text-center">
                      {formData.resume ? (
                        <>
                          <div className="w-16 h-16 rounded-full bg-[hsl(165,82%,51%)]/10 flex items-center justify-center mb-4">
                            <FileText className="w-8 h-8 text-[hsl(165,82%,51%)]" />
                          </div>
                          <p className="text-[hsl(222,22%,15%)] font-medium mb-1">{formData.resume.name}</p>
                          <p className="text-sm text-[hsl(222,12%,45%)]">
                            {(formData.resume.size / 1024).toFixed(1)} KB
                          </p>
                          <button
                            className="mt-4 text-sm text-[hsl(221,91%,60%)] hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFormData({ ...formData, resume: null });
                            }}
                          >
                            Remove file
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="w-16 h-16 rounded-full bg-[hsl(221,91%,60%)]/10 flex items-center justify-center mb-4">
                            <Upload className="w-8 h-8 text-[hsl(221,91%,60%)]" />
                          </div>
                          <p className="text-[hsl(222,22%,15%)] font-medium mb-2">
                            Drag and drop your resume here
                          </p>
                          <p className="text-sm text-[hsl(222,12%,45%)] mb-4">
                            or click to browse files
                          </p>
                          <p className="text-xs text-[hsl(222,12%,55%)]">
                            Supports PDF and DOCX • Max 10MB
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Privacy agreement */}
                  <div className="mt-6 p-4 bg-[hsl(220,18%,98%)] rounded-lg border border-[hsl(220,16%,90%)]">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <div className="relative flex items-center justify-center mt-0.5">
                        <input
                          type="checkbox"
                          checked={formData.agreedToPrivacy}
                          onChange={(e) => setFormData({ ...formData, agreedToPrivacy: e.target.checked })}
                          className="w-5 h-5 border-2 border-[hsl(220,16%,90%)] rounded appearance-none checked:bg-[hsl(221,91%,60%)] checked:border-[hsl(221,91%,60%)] cursor-pointer transition-all"
                        />
                        {formData.agreedToPrivacy && (
                          <Check className="w-3 h-3 text-white absolute pointer-events-none" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-[hsl(222,22%,15%)] leading-relaxed">
                          I agree to Screna AI's{' '}
                          <a href="#" className="text-[hsl(221,91%,60%)] hover:underline font-medium" onClick={(e) => e.stopPropagation()}>
                            Data Protection Policy
                          </a>
                          {' '}and{' '}
                          <a href="#" className="text-[hsl(221,91%,60%)] hover:underline font-medium" onClick={(e) => e.stopPropagation()}>
                            Terms of Use
                          </a>
                          . I understand my data will be processed securely and used only to personalize my interview experience.
                        </p>
                      </div>
                    </label>
                  </div>

                  <div className="flex gap-3 mt-8 items-center">
                    <Button
                      onClick={handleBack}
                      variant="outline"
                      className="border-2 border-black text-black rounded-full hover:bg-black/10 px-8 py-2.5"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleNext}
                      disabled={!formData.resume || !formData.agreedToPrivacy}
                      className="bg-black text-white rounded-full hover:bg-[hsl(222,22%,15%)] transition-colors px-8 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Complete Sign Up
                    </Button>
                    <button
                      onClick={() => {
                        localStorage.setItem('screnaIsLoggedIn', 'true');
                        window.dispatchEvent(new Event('screna-auth-change'));
                        navigate('/profile');
                      }}
                      className="ml-auto text-sm text-[hsl(222,12%,55%)] hover:text-[hsl(222,12%,35%)] transition-colors"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Help icon at bottom left */}
      <div className="fixed bottom-6 left-6">
        <button className="w-10 h-10 rounded-full bg-white border border-[hsl(220,16%,90%)] flex items-center justify-center hover:bg-[hsl(220,18%,96%)] transition-colors shadow-sm">
          <span className="text-[hsl(222,12%,45%)]">?</span>
        </button>
      </div>

      {/* Bottom gradient */}
      <div className="fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[hsl(221,91%,60%)] to-transparent opacity-20 pointer-events-none" />
    </div>
  );
}