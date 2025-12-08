import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Circle, Upload, Plus, X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { mockMentorApplication, type MentorApplication } from '@/data/mentorMockData';

const steps = [
  { id: 1, name: 'Basic Info', fields: ['fullName', 'displayName', 'currentTitle', 'timezone'] },
  { id: 2, name: 'Experience & Motivation', fields: ['yearsOfExperience', 'industries', 'shortBio', 'motivation'] },
  { id: 3, name: 'Mentoring Settings', fields: ['baseRates', 'weeklyMaxSessions'] },
  { id: 4, name: 'Verification & Video', fields: ['linkedInUrl', 'resumeUrl', 'videoIntroUrl'] },
  { id: 5, name: 'Tax Information & Submit', fields: ['taxCountry', 'street1', 'city'] },
];

const timezones = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney'
];

const languages = ['English', '中文', 'Español', 'Français', 'Deutsch', '日本語', '한국어'];
const industries = ['Backend', 'Frontend', 'Full Stack', 'Data', 'ML', 'Product', 'QA', 'DevOps', 'FinTech'];
const expertises = ['System Design', 'Behavioral Interview', 'Resume Review', 'Career Strategy', 'Backend Architecture', 'Algorithms', 'Frontend', 'Leadership'];
const topics = [
  'Interview Prep – Algorithms',
  'Interview Prep – System Design',
  'Interview Prep – Behavioral',
  'Career Strategy / Resume Review',
  'Salary Negotiation'
];

const usStates = ['NY', 'CA', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'];

export default function MentorApply() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [application, setApplication] = useState<Partial<MentorApplication>>({
    ...mockMentorApplication,
    status: 'draft'
  });

  const updateField = (field: string, value: any) => {
    setApplication(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field: keyof MentorApplication, item: string) => {
    const current = (application[field] as string[]) || [];
    const updated = current.includes(item)
      ? current.filter(i => i !== item)
      : [...current, item];
    updateField(field, updated);
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    updateField('status', 'pending');
    alert('Your mentor application has been submitted and is under review. Typical review time: 1–3 business days.');
    navigate('/mentor/dashboard');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold">Become a Mentor on Screna</h1>
              <p className="text-muted-foreground mt-2">
                Share your experience, help candidates get offers, and earn by mentoring.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={application.avatarUrl} />
                <AvatarFallback>CD</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{application.fullName || 'Candidate'}</p>
                <Badge variant="secondary" className="text-xs">Candidate</Badge>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left: Stepper */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Application Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {steps.map((step, idx) => (
                    <div key={step.id} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center border-2',
                            currentStep > step.id
                              ? 'bg-primary border-primary text-primary-foreground'
                              : currentStep === step.id
                              ? 'border-primary text-primary'
                              : 'border-muted text-muted-foreground'
                          )}
                        >
                          {currentStep > step.id ? (
                            <Check className="w-4 h-4" />
                          ) : currentStep === step.id ? (
                            <Circle className="w-3 h-3 fill-current" />
                          ) : (
                            <Circle className="w-3 h-3" />
                          )}
                        </div>
                        {idx < steps.length - 1 && (
                          <div className={cn('w-0.5 h-12 mt-2', currentStep > step.id ? 'bg-primary' : 'bg-border')} />
                        )}
                      </div>
                      <div className="flex-1 pt-1">
                        <p
                          className={cn(
                            'text-sm font-medium',
                            currentStep >= step.id ? 'text-foreground' : 'text-muted-foreground'
                          )}
                        >
                          {step.name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Form */}
          <div className="lg:col-span-3">
            {currentStep === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Basic Info</CardTitle>
                  <CardDescription>Tell us about yourself and your current role</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={application.avatarUrl} />
                      <AvatarFallback>{application.fullName?.[0] || 'A'}</AvatarFallback>
                    </Avatar>
                    <Button variant="outline" size="sm">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Avatar
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input
                        id="fullName"
                        value={application.fullName || ''}
                        onChange={(e) => updateField('fullName', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="displayName">Display Name *</Label>
                      <Input
                        id="displayName"
                        value={application.displayName || ''}
                        onChange={(e) => updateField('displayName', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentTitle">Current Title *</Label>
                      <Input
                        id="currentTitle"
                        value={application.currentTitle || ''}
                        onChange={(e) => updateField('currentTitle', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currentCompany">Current Company</Label>
                      <Input
                        id="currentCompany"
                        value={application.currentCompany || ''}
                        onChange={(e) => updateField('currentCompany', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      placeholder="e.g. New York, USA"
                      value={application.location || ''}
                      onChange={(e) => updateField('location', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Time Zone *</Label>
                    <Select value={application.timezone} onValueChange={(v) => updateField('timezone', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timezones.map(tz => (
                          <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Languages *</Label>
                    <div className="flex flex-wrap gap-2">
                      {languages.map(lang => (
                        <Badge
                          key={lang}
                          variant={application.languages?.includes(lang) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => toggleArrayItem('languages', lang)}
                        >
                          {lang}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
                    <div className="flex gap-2">
                      <Button variant="outline">Save as Draft</Button>
                      <Button onClick={handleNext}>Save & Continue</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle>Experience & Motivation</CardTitle>
                  <CardDescription>Share your background, specializations, and why you want to mentor</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Years of Experience</Label>
                    <Select value={application.yearsOfExperience} onValueChange={(v) => updateField('yearsOfExperience', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="<2 years">&lt;2 years</SelectItem>
                        <SelectItem value="2–5 years">2–5 years</SelectItem>
                        <SelectItem value="5–10 years">5–10 years</SelectItem>
                        <SelectItem value="10+ years">10+ years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Industries / Domains</Label>
                    <div className="flex flex-wrap gap-2">
                      {industries.map(ind => (
                        <Badge
                          key={ind}
                          variant={application.industries?.includes(ind) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => toggleArrayItem('industries', ind)}
                        >
                          {ind}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Specializations</Label>
                    <div className="flex flex-wrap gap-2">
                      {expertises.map(exp => (
                        <Badge
                          key={exp}
                          variant={application.expertises?.includes(exp) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => toggleArrayItem('expertises', exp)}
                        >
                          {exp}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Mentoring Topics</Label>
                    <div className="flex flex-wrap gap-2">
                      {topics.map(topic => (
                        <Badge
                          key={topic}
                          variant={application.topics?.includes(topic) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => toggleArrayItem('topics', topic)}
                        >
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Company Highlights</Label>
                    <div className="flex flex-wrap gap-2">
                      {application.companiesHighlights?.map((company, idx) => (
                        <Badge key={idx} variant="secondary">
                          {company}
                          <X className="w-3 h-3 ml-1 cursor-pointer" />
                        </Badge>
                      ))}
                      <Button variant="outline" size="sm">
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shortBio">Short Bio *</Label>
                    <Textarea
                      id="shortBio"
                      rows={4}
                      placeholder="Summarize your professional background and why you're a great mentor. 200–500 characters."
                      value={application.shortBio || ''}
                      onChange={(e) => updateField('shortBio', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">{application.shortBio?.length || 0} characters</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="motivation">Why do you want to become a Screna Mentor? *</Label>
                    <Textarea
                      id="motivation"
                      rows={4}
                      placeholder="Share your motivation for helping candidates prepare for interviews and advance their careers. What drives you to mentor?"
                      value={application.motivation || ''}
                      onChange={(e) => updateField('motivation', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">{application.motivation?.length || 0} characters</p>
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={handlePrevious}>Previous</Button>
                    <Button onClick={handleNext}>Next</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle>Mentoring Settings</CardTitle>
                  <CardDescription>Configure your session types and availability</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <Label>Session Types & Pricing</Label>
                    {application.sessionTypes?.map((sessionType) => {
                      const rate = application.baseRates?.find(r => r.sessionTypeId === sessionType.id);
                      return (
                        <Card key={sessionType.id}>
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <h4 className="font-semibold">{sessionType.name}</h4>
                                <p className="text-sm text-muted-foreground">{sessionType.description}</p>
                                <p className="text-sm text-muted-foreground mt-1">{sessionType.durationMinutes} minutes</p>
                              </div>
                              <Switch
                                checked={rate?.enabled || false}
                                onCheckedChange={(checked) => {
                                  const newRates = application.baseRates?.map(r =>
                                    r.sessionTypeId === sessionType.id ? { ...r, enabled: checked } : r
                                  );
                                  updateField('baseRates', newRates);
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`price-${sessionType.id}`}>Price (USD)</Label>
                              <Input
                                id={`price-${sessionType.id}`}
                                type="number"
                                value={rate?.priceUsd || 0}
                                onChange={(e) => {
                                  const newRates = application.baseRates?.map(r =>
                                    r.sessionTypeId === sessionType.id ? { ...r, priceUsd: Number(e.target.value) } : r
                                  );
                                  updateField('baseRates', newRates);
                                }}
                              />
                              <p className="text-xs text-muted-foreground">Platform fee 20% is deducted. Net earnings are calculated automatically.</p>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weeklyMaxSessions">Max Sessions per Week</Label>
                    <Input
                      id="weeklyMaxSessions"
                      type="number"
                      value={application.weeklyMaxSessions || 0}
                      onChange={(e) => updateField('weeklyMaxSessions', Number(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Weekly Availability</Label>
                    <div className="space-y-2">
                      {application.availabilitySlots?.map((slot, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Badge>{slot.weekday}</Badge>
                          <span className="text-sm">{slot.startTime} – {slot.endTime}</span>
                          <Button variant="ghost" size="sm">
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Availability
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={handlePrevious}>Previous</Button>
                    <Button onClick={handleNext}>Next</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle>Verification & Video Introduction</CardTitle>
                  <CardDescription>Help us verify your background and introduce yourself</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="linkedInUrl">LinkedIn URL *</Label>
                    <Input
                      id="linkedInUrl"
                      placeholder="https://www.linkedin.com/in/yourprofile"
                      value={application.linkedInUrl || ''}
                      onChange={(e) => updateField('linkedInUrl', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="githubUrl">GitHub URL (Optional)</Label>
                    <Input
                      id="githubUrl"
                      placeholder="https://github.com/yourusername"
                      value={application.githubUrl || ''}
                      onChange={(e) => updateField('githubUrl', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="websiteUrl">Personal Website / Portfolio (Optional)</Label>
                    <Input
                      id="websiteUrl"
                      placeholder="https://yourwebsite.com"
                      value={application.websiteUrl || ''}
                      onChange={(e) => updateField('websiteUrl', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Resume/CV *</Label>
                    <div className="flex items-center gap-2">
                      <Button variant="outline">
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Resume
                      </Button>
                      {application.resumeUrl && (
                        <p className="text-sm text-muted-foreground">✓ {application.resumeUrl.split('/').pop()}</p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">PDF format preferred, max 5MB</p>
                  </div>

                  <div className="border-t pt-6">
                    <div className="space-y-2 mb-4">
                      <Label>Video Introduction *</Label>
                      <p className="text-sm text-muted-foreground">
                        Record a short video (1-3 minutes) introducing yourself and explaining why you want to become a Screna mentor. 
                        This helps candidates get to know you better!
                      </p>
                    </div>
                    
                    <div className="border-2 border-dashed rounded-lg p-8 text-center">
                      {application.videoIntroUrl ? (
                        <div className="space-y-4">
                          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                            <video 
                              src={application.videoIntroUrl} 
                              controls 
                              className="w-full h-full rounded-lg"
                            >
                              Your browser does not support the video tag.
                            </video>
                          </div>
                          <div className="flex items-center justify-center gap-2">
                            <Button variant="outline" size="sm">
                              <Upload className="w-4 h-4 mr-2" />
                              Replace Video
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => updateField('videoIntroUrl', '')}
                            >
                              <X className="w-4 h-4 mr-2" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                            <Upload className="w-8 h-8 text-primary" />
                          </div>
                          <div>
                            <Button variant="default">
                              <Upload className="w-4 h-4 mr-2" />
                              Upload Video
                            </Button>
                            <p className="text-xs text-muted-foreground mt-2">
                              MP4, MOV, or WebM format • Max 100MB • 1-3 minutes recommended
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <Alert className="mt-4">
                      <Info className="w-4 h-4" />
                      <AlertDescription>
                        <strong>Video tips:</strong> Introduce yourself, share your background, explain your mentoring philosophy, 
                        and why you're passionate about helping candidates succeed. Be authentic and professional!
                      </AlertDescription>
                    </Alert>
                  </div>

                  <div className="space-y-2">
                    <Label>Additional Evidence (Optional)</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Upload screenshots of achievements, certifications, or notable work
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {application.evidenceUrls?.map((url, idx) => (
                        <div key={idx} className="relative aspect-square rounded border">
                          <img src={url} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover rounded" />
                        </div>
                      ))}
                      <Button variant="outline" className="aspect-square">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4">
                    <div className="flex items-start gap-2">
                      <Checkbox id="confirm-accuracy" />
                      <Label htmlFor="confirm-accuracy" className="text-sm font-normal">
                        I confirm that all information I provided is true and accurate.
                      </Label>
                    </div>
                    <div className="flex items-start gap-2">
                      <Checkbox id="confirm-verification" />
                      <Label htmlFor="confirm-verification" className="text-sm font-normal">
                        I understand Screna may verify my employment or background information.
                      </Label>
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={handlePrevious}>Previous</Button>
                    <Button onClick={handleNext}>Next</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === 5 && (
              <Card>
                <CardHeader>
                  <CardTitle>Tax Information & Submit</CardTitle>
                  <CardDescription>Required for IRS compliance and payments</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Alert>
                    <Info className="w-4 h-4" />
                    <AlertDescription>
                      To comply with IRS regulations and issue annual tax forms (W-9 / 1099-NEC), Screna is required to collect your legal address and SSN (for U.S. mentors). Your information is encrypted, stored securely, and only used for tax reporting.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label>Legal Full Name</Label>
                    <Input value={application.legalName || application.fullName} readOnly />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taxCountry">Country *</Label>
                    <Select value={application.taxCountry} onValueChange={(v) => updateField('taxCountry', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="United States">United States</SelectItem>
                        <SelectItem value="Canada">Canada</SelectItem>
                        <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="street1">Street Address Line 1 *</Label>
                    <Input
                      id="street1"
                      value={application.street1 || ''}
                      onChange={(e) => updateField('street1', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="street2">Street Address Line 2</Label>
                    <Input
                      id="street2"
                      value={application.street2 || ''}
                      onChange={(e) => updateField('street2', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={application.city || ''}
                        onChange={(e) => updateField('city', e.target.value)}
                      />
                    </div>
                    {application.taxCountry === 'United States' && (
                      <div className="space-y-2">
                        <Label htmlFor="state">State *</Label>
                        <Select value={application.state} onValueChange={(v) => updateField('state', v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {usStates.map(state => (
                              <SelectItem key={state} value={state}>{state}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Postal Code / ZIP Code *</Label>
                    <Input
                      id="postalCode"
                      value={application.postalCode || ''}
                      onChange={(e) => updateField('postalCode', e.target.value)}
                    />
                  </div>

                  {application.taxCountry === 'United States' && (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="ssn">Social Security Number (SSN)</Label>
                          <Info className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <Input
                          id="ssn"
                          type="text"
                          placeholder="___-__-____"
                          value={application.ssnMasked || ''}
                        />
                        <p className="text-xs text-muted-foreground">
                          We securely collect your SSN for IRS 1099-NEC tax reporting. SSN is encrypted and never visible to candidates.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="taxClassification">Tax Classification</Label>
                        <Select value={application.taxClassification} onValueChange={(v) => updateField('taxClassification', v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Individual / Sole Proprietor">Individual / Sole Proprietor</SelectItem>
                            <SelectItem value="LLC – Single Member">LLC – Single Member</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-start gap-2">
                          <Checkbox id="w9-certified" checked={application.w9Certified} />
                          <Label htmlFor="w9-certified" className="text-sm font-normal">
                            I certify that the SSN I provided is correct and that I am a U.S. person as defined by the IRS.
                          </Label>
                        </div>
                        <div className="flex items-start gap-2">
                          <Checkbox id="backup-withholding" checked={!application.backupWithholding} />
                          <Label htmlFor="backup-withholding" className="text-sm font-normal">
                            I am not subject to backup withholding.
                          </Label>
                        </div>
                        <div className="flex items-start gap-2">
                          <Checkbox id="authorize-1099" />
                          <Label htmlFor="authorize-1099" className="text-sm font-normal">
                            I authorize Screna to receive and issue 1099-NEC tax forms for my annual income.
                          </Label>
                        </div>
                      </div>
                    </>
                  )}

                  {application.taxCountry !== 'United States' && (
                    <div className="flex items-start gap-2">
                      <Checkbox id="non-us-tax" />
                      <Label htmlFor="non-us-tax" className="text-sm font-normal">
                        I acknowledge that Screna Mentor payouts may be subject to local tax requirements in my country.
                      </Label>
                    </div>
                  )}

                  <div className="border-t pt-6 mt-6">
                    <h3 className="font-semibold mb-4">Review Summary</h3>
                    <div className="space-y-2">
                      <Badge>{application.status}</Badge>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Name</p>
                          <p className="font-medium">{application.fullName}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Title</p>
                          <p className="font-medium">{application.currentTitle}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Company</p>
                          <p className="font-medium">{application.currentCompany}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Location</p>
                          <p className="font-medium">{application.location}</p>
                        </div>
                      </div>
                      <div className="pt-2">
                        <p className="text-muted-foreground text-sm">Top Specialties</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {application.expertises?.slice(0, 3).map(exp => (
                            <Badge key={exp} variant="secondary">{exp}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={handlePrevious}>Back</Button>
                    <Button onClick={handleSubmit}>Submit for Review</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
