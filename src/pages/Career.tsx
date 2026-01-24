import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ExternalLink, BarChart3, Brain, Briefcase, Users, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface JobPosition {
  id: string;
  title: string;
  icon: React.ReactNode;
  whatYoullDo: string[];
  whatWereLookingFor: string[];
  link: string;
}

const jobPositions: JobPosition[] = [
  {
    id: 'marketing-analyst',
    title: 'Marketing Analyst',
    icon: <BarChart3 className="w-6 h-6" />,
    whatYoullDo: [
      'Analyze user acquisition, funnel conversion, and campaign performance',
      'Support growth strategies across LinkedIn, campus, and content channels',
      'Turn data into actionable insights for marketing decisions',
    ],
    whatWereLookingFor: [
      'Strong analytical skills (Excel, SQL, or BI tools)',
      'Interest in marketing, growth, or user behavior',
      'Clear communication and structured thinking',
    ],
    link: 'https://www.screna.ai/Career/marketing-analyst',
  },
  {
    id: 'data-scientist',
    title: 'Data Scientist',
    icon: <Brain className="w-6 h-6" />,
    whatYoullDo: [
      'Build and evaluate AI/ML models for interview analysis and matching',
      'Analyze large-scale user behavior and performance data',
      'Work closely with engineers to deploy data-driven features',
    ],
    whatWereLookingFor: [
      'Experience with Python, ML, or data analysis',
      'Background in statistics, AI, or data science',
      'Curiosity about applied AI in real products',
    ],
    link: 'https://www.screna.ai/Career/data-scientist',
  },
  {
    id: 'business-analyst',
    title: 'Business Analyst',
    icon: <Briefcase className="w-6 h-6" />,
    whatYoullDo: [
      'Analyze business metrics across users, mentors, and employers',
      'Support pricing, GTM, and product strategy decisions',
      'Create dashboards and reports for leadership',
    ],
    whatWereLookingFor: [
      'Strong analytical and problem-solving skills',
      'Experience with Excel, SQL, or analytics tools',
      'Interest in startups, strategy, or operations',
    ],
    link: 'https://www.screna.ai/Career/business-analyst',
  },
  {
    id: 'customer-success-intern',
    title: 'Customer Success Intern',
    icon: <Users className="w-6 h-6" />,
    whatYoullDo: [
      'Support users, mentors, and partners on the platform',
      'Assist with onboarding, documentation, and feedback collection',
      'Help improve user experience and satisfaction',
    ],
    whatWereLookingFor: [
      'Strong communication and empathy',
      'Detail-oriented and proactive mindset',
      'Interest in customer success or operations',
    ],
    link: 'https://www.screna.ai/Career/customer-success-intern',
  },
  {
    id: 'customer-success-manager',
    title: 'Customer Success Manager',
    icon: <UserCheck className="w-6 h-6" />,
    whatYoullDo: [
      'Own relationships with key users and partners',
      'Drive onboarding, retention, and user satisfaction',
      'Act as the voice of users to product and leadership teams',
    ],
    whatWereLookingFor: [
      'Experience in customer success, account management, or operations',
      'Strong communication and problem-solving skills',
      'Ability to work cross-functionally in a fast-paced environment',
    ],
    link: 'https://www.screna.ai/Career/customer-success-manager',
  },
];

const howToApplySteps = [
  {
    step: 1,
    title: 'Create an Account',
    description: 'Visit Screna AI and create an account (Google one-click sign-up supported)',
  },
  {
    step: 2,
    title: 'Upload Your Resume',
    description: 'Upload your resume to generate your Screna profile',
  },
  {
    step: 3,
    title: 'Copy Job Description',
    description: 'Go to Screna AI and copy the target job description',
  },
  {
    step: 4,
    title: 'Complete Mock Interview',
    description: 'Enter Interview Prep, generate the corresponding AI interview, and complete at least one mock session',
  },
  {
    step: 5,
    title: 'Review Process',
    description: 'The Screna team will review your performance and contact you regarding the next steps',
  },
];

const Career = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold">Careers at Screna AI</h1>
          </div>
          <Button onClick={() => navigate('/auth')}>Join Us</Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">

        {/* Hero Section */}
        <section className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Join Our Team</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Help us revolutionize interview preparation and connect talent with opportunities worldwide.
          </p>
        </section>

        {/* Job Listings */}
        <section className="mb-16">
          <h3 className="text-2xl font-semibold mb-8">Open Positions</h3>
          <div className="grid gap-6">
            {jobPositions.map((job) => (
              <Card key={job.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        {job.icon}
                      </div>
                      <CardTitle className="text-xl">{job.title}</CardTitle>
                    </div>
                    {/* <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                      onClick={() => window.open(job.link, '_blank')}
                    >
                      Apply
                      <ExternalLink className="w-4 h-4" />
                    </Button> */}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-3">What you'll do</h4>
                      <ul className="space-y-2">
                        {job.whatYoullDo.map((item, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <span className="text-primary mt-1">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-3">What we're looking for</h4>
                      <ul className="space-y-2">
                        {job.whatWereLookingFor.map((item, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <span className="text-primary mt-1">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* How to Apply */}
        <section className="bg-card rounded-2xl p-8 md:p-12">
          <h3 className="text-2xl font-semibold mb-8 text-center">How to Apply</h3>
          <div className="grid md:grid-cols-5 gap-4">
            {howToApplySteps.map((step, index) => (
              <div key={step.step} className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold mb-3">
                    {step.step}
                  </div>
                  <h4 className="font-semibold mb-2 text-sm">{step.title}</h4>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
                {index < howToApplySteps.length - 1 && (
                  <div className="hidden md:block absolute top-5 left-[60%] w-[80%] h-0.5 bg-border" />
                )}
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Button size="lg" onClick={() => navigate('/auth')}>
              Start Your Application
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2024 Screna AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Career;