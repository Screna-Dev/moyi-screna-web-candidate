import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Check, Upload } from 'lucide-react';

type OnboardingData = {
  role: string;
  experienceLevel: string;
  targetCompanies: string[];
  resumeUploaded: boolean;
  resumeFileName?: string;
};

export function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    role: '',
    experienceLevel: '',
    targetCompanies: [],
    resumeUploaded: false,
  });

  const totalSteps = 7;

  const handleNext = () => {
    // Skip step 6 if resume was not uploaded
    if (step === 5 && !data.resumeUploaded) {
      setStep(7);
    } else {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    // Skip step 6 when going back if resume was not uploaded
    if (step === 7 && !data.resumeUploaded) {
      setStep(5);
    } else {
      setStep(step - 1);
    }
  };

  const handleRoleSelect = (role: string) => {
    setData({ ...data, role });
  };

  const handleExperienceSelect = (level: string) => {
    setData({ ...data, experienceLevel: level });
  };

  const handleCompanyToggle = (company: string) => {
    const newCompanies = data.targetCompanies.includes(company)
      ? data.targetCompanies.filter((c) => c !== company)
      : [...data.targetCompanies, company];
    setData({ ...data, targetCompanies: newCompanies });
  };

  const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setData({ ...data, resumeUploaded: true, resumeFileName: file.name });
      // Store data in localStorage for profile page
      localStorage.setItem('screnaUserData', JSON.stringify({ ...data, resumeUploaded: true, resumeFileName: file.name }));
      setStep(6);
    }
  };

  const handleSkipResume = () => {
    localStorage.setItem('screnaUserData', JSON.stringify(data));
    setStep(7);
  };

  const handleStartInterview = () => {
    localStorage.setItem('screnaUserData', JSON.stringify(data));
    navigate('/mock-interview');
  };

  const handleGoToProfile = () => {
    localStorage.setItem('screnaUserData', JSON.stringify(data));
    navigate('/profile');
  };

  const progress = ((step - 1) / (totalSteps - 1)) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(221,60%,20%)] via-[hsl(221,40%,40%)] to-[hsl(220,20%,85%)] flex flex-col">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-[hsl(221,20%,30%)]/30 z-50">
        <motion.div
          className="h-full bg-[hsl(165,82%,51%)]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {/* Step 1: Welcome */}
              {step === 1 && (
                <div className="text-center">
                  <h1 className="text-5xl md:text-6xl font-semibold text-white mb-4">
                    Welcome to Screna.ai
                  </h1>
                  <p className="text-2xl text-[hsl(220,30%,80%)] mb-12">
                    Your AI-powered mock interview coach.
                  </p>
                  <p className="text-xl text-[hsl(220,20%,70%)] mb-16 max-w-xl mx-auto leading-relaxed">
                    I'll help you practice real interviews and give you structured,
                    multi-dimensional feedback.
                  </p>
                  <button
                    onClick={handleNext}
                    className="px-8 py-4 bg-[hsl(221,91%,60%)] text-white rounded-lg text-lg font-medium hover:bg-[hsl(221,91%,55%)] transition-all duration-200 shadow-lg shadow-[hsl(221,91%,30%)]/40"
                  >
                    Get started
                  </button>
                </div>
              )}

              {/* Step 2: Role Selection */}
              {step === 2 && (
                <div>
                  <h2 className="text-4xl md:text-5xl font-semibold text-white mb-3 text-center">
                    What role are you preparing for?
                  </h2>
                  <p className="text-xl text-[hsl(220,30%,75%)] mb-12 text-center">
                    This helps me tailor your mock interviews.
                  </p>
                  <div className="grid gap-3 mb-16">
                    {[
                      'Software Engineer',
                      'Machine Learning Engineer',
                      'Data Scientist',
                      'Data Engineer',
                      'Backend / Infra / SRE',
                      'Product Manager',
                      'Other',
                    ].map((role) => (
                      <button
                        key={role}
                        onClick={() => handleRoleSelect(role)}
                        className={`p-4 rounded-lg text-left text-lg transition-all duration-200 ${
                          data.role === role
                            ? 'bg-[hsl(221,91%,60%)] text-white shadow-lg shadow-[hsl(221,91%,30%)]/40'
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between">
                    <button
                      onClick={handleBack}
                      className="flex items-center gap-2 px-6 py-3 text-white hover:text-[hsl(165,82%,51%)] transition-colors duration-200"
                    >
                      <ArrowLeft className="w-5 h-5" />
                      Back
                    </button>
                    <button
                      onClick={handleNext}
                      disabled={!data.role}
                      className="px-8 py-3 bg-[hsl(221,91%,60%)] text-white rounded-lg font-medium hover:bg-[hsl(221,91%,55%)] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[hsl(221,91%,30%)]/40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Experience Level */}
              {step === 3 && (
                <div>
                  <h2 className="text-4xl md:text-5xl font-semibold text-white mb-3 text-center">
                    What's your experience level?
                  </h2>
                  <p className="text-xl text-[hsl(220,30%,75%)] mb-12 text-center">
                    I'll adjust question difficulty based on this.
                  </p>
                  <div className="grid gap-3 mb-16">
                    {[
                      'Student / New grad',
                      '0–2 years',
                      '3–5 years',
                      '6–9 years',
                      '10+ years',
                    ].map((level) => (
                      <button
                        key={level}
                        onClick={() => handleExperienceSelect(level)}
                        className={`p-4 rounded-lg text-left text-lg transition-all duration-200 ${
                          data.experienceLevel === level
                            ? 'bg-[hsl(221,91%,60%)] text-white shadow-lg shadow-[hsl(221,91%,30%)]/40'
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between">
                    <button
                      onClick={handleBack}
                      className="flex items-center gap-2 px-6 py-3 text-white hover:text-[hsl(165,82%,51%)] transition-colors duration-200"
                    >
                      <ArrowLeft className="w-5 h-5" />
                      Back
                    </button>
                    <button
                      onClick={handleNext}
                      disabled={!data.experienceLevel}
                      className="px-8 py-3 bg-[hsl(221,91%,60%)] text-white rounded-lg font-medium hover:bg-[hsl(221,91%,55%)] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[hsl(221,91%,30%)]/40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Target Companies */}
              {step === 4 && (
                <div>
                  <h2 className="text-4xl md:text-5xl font-semibold text-white mb-3 text-center">
                    Are you targeting any specific companies?
                  </h2>
                  <p className="text-xl text-[hsl(220,30%,75%)] mb-12 text-center">
                    This helps me simulate more realistic interview styles. (Optional)
                  </p>
                  <div className="grid gap-3 mb-16">
                    {[
                      'FAANG / Big Tech',
                      'Mid-size tech',
                      'Startups',
                      'Not sure yet',
                    ].map((company) => (
                      <button
                        key={company}
                        onClick={() => handleCompanyToggle(company)}
                        className={`p-4 rounded-lg text-left text-lg transition-all duration-200 flex items-center justify-between ${
                          data.targetCompanies.includes(company)
                            ? 'bg-[hsl(221,91%,60%)] text-white shadow-lg shadow-[hsl(221,91%,30%)]/40'
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                      >
                        {company}
                        {data.targetCompanies.includes(company) && (
                          <Check className="w-5 h-5" />
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between">
                    <button
                      onClick={handleBack}
                      className="flex items-center gap-2 px-6 py-3 text-white hover:text-[hsl(165,82%,51%)] transition-colors duration-200"
                    >
                      <ArrowLeft className="w-5 h-5" />
                      Back
                    </button>
                    <div className="flex gap-3">
                      <button
                        onClick={handleNext}
                        className="px-8 py-3 text-white hover:text-[hsl(165,82%,51%)] transition-colors duration-200"
                      >
                        Skip
                      </button>
                      <button
                        onClick={handleNext}
                        className="px-8 py-3 bg-[hsl(221,91%,60%)] text-white rounded-lg font-medium hover:bg-[hsl(221,91%,55%)] transition-all duration-200 shadow-lg shadow-[hsl(221,91%,30%)]/40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Resume Upload */}
              {step === 5 && (
                <div>
                  <h2 className="text-4xl md:text-5xl font-semibold text-white mb-3 text-center">
                    Upload your resume (optional)
                  </h2>
                  <p className="text-xl text-[hsl(220,30%,75%)] mb-12 text-center">
                    Unlock personalized questions and tailored feedback.
                  </p>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 mb-8">
                    <p className="text-lg text-white mb-6">
                      I'll use your resume only to:
                    </p>
                    <ul className="space-y-3 text-[hsl(220,20%,80%)] mb-8">
                      <li className="flex items-start">
                        <span className="text-[hsl(165,82%,51%)] mr-3">✓</span>
                        Generate questions based on your real experience
                      </li>
                      <li className="flex items-start">
                        <span className="text-[hsl(165,82%,51%)] mr-3">✓</span>
                        Adjust evaluation dimensions to your background
                      </li>
                      <li className="flex items-start">
                        <span className="text-[hsl(165,82%,51%)] mr-3">✓</span>
                        Suggest more relevant next steps
                      </li>
                    </ul>
                    <p className="text-lg text-white mb-4">I will NOT:</p>
                    <ul className="space-y-3 text-[hsl(220,20%,80%)]">
                      <li className="flex items-start">
                        <span className="text-red-400 mr-3">✕</span>
                        Share your resume with anyone
                      </li>
                      <li className="flex items-start">
                        <span className="text-red-400 mr-3">✕</span>
                        Use it to train models
                      </li>
                      <li className="flex items-start">
                        <span className="text-red-400 mr-3">✕</span>
                        Auto-apply to jobs on your behalf
                      </li>
                    </ul>
                  </div>
                  <div className="flex gap-4 mb-12">
                    <label className="flex-1 cursor-pointer">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleResumeUpload}
                        className="hidden"
                      />
                      <div className="flex items-center justify-center gap-2 px-8 py-4 bg-[hsl(221,91%,60%)] text-white rounded-lg font-medium hover:bg-[hsl(221,91%,55%)] transition-all duration-200 shadow-lg shadow-[hsl(221,91%,30%)]/40">
                        <Upload className="w-5 h-5" />
                        Upload resume
                      </div>
                    </label>
                  </div>
                  <div className="flex justify-between">
                    <button
                      onClick={handleBack}
                      className="flex items-center gap-2 px-6 py-3 text-white hover:text-[hsl(165,82%,51%)] transition-colors duration-200"
                    >
                      <ArrowLeft className="w-5 h-5" />
                      Back
                    </button>
                    <button
                      onClick={handleSkipResume}
                      className="px-8 py-3 text-white hover:text-[hsl(165,82%,51%)] transition-colors duration-200"
                    >
                      Skip for now
                    </button>
                  </div>
                </div>
              )}

              {/* Step 6: Resume Success */}
              {step === 6 && (
                <div className="text-center">
                  <div className="w-20 h-20 bg-[hsl(165,82%,51%)] rounded-full flex items-center justify-center mx-auto mb-8">
                    <Check className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-4xl md:text-5xl font-semibold text-white mb-3">
                    Resume added successfully
                  </h2>
                  <p className="text-xl text-[hsl(220,30%,75%)] mb-8">
                    I'll use it to personalize your mock interviews.
                  </p>
                  {data.resumeFileName && (
                    <p className="text-lg text-[hsl(220,20%,70%)] mb-12">
                      File: {data.resumeFileName}
                    </p>
                  )}
                  <p className="text-lg text-[hsl(220,20%,70%)] mb-16 max-w-xl mx-auto">
                    Next, I'll generate questions and feedback that better reflect your
                    real experience.
                  </p>
                  <button
                    onClick={handleNext}
                    className="px-8 py-4 bg-[hsl(221,91%,60%)] text-white rounded-lg text-lg font-medium hover:bg-[hsl(221,91%,55%)] transition-all duration-200 shadow-lg shadow-[hsl(221,91%,30%)]/40"
                  >
                    Continue
                  </button>
                </div>
              )}

              {/* Step 7: Ready to Start */}
              {step === 7 && (
                <div className="text-center">
                  <h2 className="text-4xl md:text-5xl font-semibold text-white mb-3">
                    You're ready for your first mock interview
                  </h2>
                  <p className="text-xl text-[hsl(220,30%,75%)] mb-8">
                    You'll get structured feedback across multiple dimensions.
                  </p>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 mb-12 max-w-xl mx-auto">
                    <p className="text-lg text-white mb-6">
                      In this session, I'll focus on:
                    </p>
                    <ul className="space-y-4 text-left text-[hsl(220,20%,80%)]">
                      <li className="flex items-start">
                        <span className="text-[hsl(165,82%,51%)] mr-3 text-xl">•</span>
                        <span className="text-lg">Communication</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-[hsl(165,82%,51%)] mr-3 text-xl">•</span>
                        <span className="text-lg">Problem solving</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-[hsl(165,82%,51%)] mr-3 text-xl">•</span>
                        <span className="text-lg">Role-specific skills</span>
                      </li>
                    </ul>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                      onClick={handleGoToProfile}
                      className="px-8 py-4 bg-white/10 text-white rounded-lg text-lg font-medium hover:bg-white/20 transition-all duration-200"
                    >
                      Later
                    </button>
                    <button
                      onClick={handleStartInterview}
                      className="px-8 py-4 bg-[hsl(221,91%,60%)] text-white rounded-lg text-lg font-medium hover:bg-[hsl(221,91%,55%)] transition-all duration-200 shadow-lg shadow-[hsl(221,91%,30%)]/40"
                    >
                      Start mock interview
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2">
        <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
          <p className="text-white text-sm font-medium">
            Step {step} of {totalSteps}
          </p>
        </div>
      </div>
    </div>
  );
}
