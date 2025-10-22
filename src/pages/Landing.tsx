import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { 
  Target, BarChart3, Rocket, Trophy, Shield, CheckCircle2, 
  Play, Users, TrendingUp, Zap, Lock, Globe, ChevronRight,
  Star, Clock, Award, Brain, Eye, Check, ArrowRight, XCircle,
  CheckCircle, Code, Database, Smartphone, Cloud, TestTube, Layout, Palette,
  Briefcase, FileText, Video
} from 'lucide-react';
import { Link } from 'react-router-dom';
import heroImage from "@/assets/hero-interview.jpg";
import dashboardPreview from "@/assets/dashboard-preview.jpg";
import aiBrain from "@/assets/ai-brain.png";
import logo from "@/assets/logo.png";

const StickyNav = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b border-border shadow-sm">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Screna AI" className="w-8 h-8" />
          <span className="font-bold text-xl">Screna AI</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm">
          <a href="#features" className="hover:text-primary transition-smooth">Features</a>
          <a href="#how-it-works" className="hover:text-primary transition-smooth">How It Works</a>
          <a href="#categories" className="hover:text-primary transition-smooth">Job Categories</a>
          <a href="#recruiter-network" className="hover:text-primary transition-smooth">Recruiter Network</a>
          <Link to="/pricing" className="hover:text-primary transition-smooth">Pricing</Link>
          <a href="#faq" className="hover:text-primary transition-smooth">FAQ</a>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link to="/signup">Login</Link>
          </Button>
          <Button asChild variant="cta">
            <Link to="/signup">Start Free</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default function Landing() {
  const [demoModalOpen, setDemoModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <StickyNav />
      
      {/* Hero Section - Cinematic */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-40" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in">
              <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                Your AI Career Coach — Interview, Improve, and Get Discovered
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Train with Screna AI, refine your answers, and rise in recruiter rankings — for any industry, any role.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <Button size="lg" className="gradient-primary shadow-glow hover:scale-105 transition-all" asChild>
                  <Link to="/signup">
                    Start Free AI Interview
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" onClick={() => setDemoModalOpen(true)}>
                  <Play className="mr-2 w-5 h-5" />
                  Watch 60s Demo
                </Button>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" /> No credit card
                </span>
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" /> GDPR compliant
                </span>
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" /> Private by design
                </span>
              </div>
            </div>
            <div className="relative animate-fade-in">
              <div className="relative">
                <img 
                  src={heroImage} 
                  alt="AI-powered interview platform" 
                  className="rounded-2xl shadow-card w-full"
                />
                <div className="absolute -bottom-4 -left-4 bg-background/95 backdrop-blur-lg border border-border rounded-xl p-4 shadow-glow">
                  <p className="text-sm font-semibold text-primary">+12% avg improvement</p>
                </div>
                <div className="absolute -top-4 -right-4 bg-background/95 backdrop-blur-lg border border-border rounded-xl p-4 shadow-glow">
                  <p className="text-sm font-semibold text-primary">5,000+ contractors</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="py-8 bg-muted/30 border-y border-border">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-muted-foreground mb-6">Trusted by contractors from</p>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
            {["Randstad", "TEKsystems", "Apex Systems", "Insight Global", "Kforce", "Robert Half", "Capgemini", "Infosys"].map((company) => (
              <span key={company} className="text-lg font-semibold text-muted-foreground hover:text-foreground transition-smooth">{company}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Value Proposition Grid */}
      <section id="features" className="py-20">
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-4">
            Tired of unpredictable interviews?
          </h2>
          <p className="text-xl text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Traditional interview prep is expensive, slow, and lacks personalized feedback.
          </p>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="p-8 bg-destructive/5 border-destructive/20">
              <div className="flex items-center gap-3 mb-6">
                <XCircle className="w-8 h-8 text-destructive" />
                <h3 className="text-2xl font-bold">Traditional Interview</h3>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="text-destructive font-bold">💸</span>
                  <span className="text-muted-foreground">High cost for mock interviews</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-destructive font-bold">⏱️</span>
                  <span className="text-muted-foreground">Slow feedback turnaround</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-destructive font-bold">⚙️</span>
                  <span className="text-muted-foreground">No data-driven insights</span>
                </li>
              </ul>
            </Card>

            <Card className="p-8 bg-primary/5 border-primary/20 shadow-glow">
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle className="w-8 h-8 text-primary" />
                <h3 className="text-2xl font-bold">Screna AI</h3>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold">✓</span>
                  <span className="font-medium">Free AI-powered interviews</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold">✓</span>
                  <span className="font-medium">Instant detailed feedback</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold">✓</span>
                  <span className="font-medium">AI-driven performance analytics</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <Card className="p-6 bg-card/50 backdrop-blur-sm hover:shadow-glow transition-all border-primary/20">
              <Target className="w-10 h-10 text-primary mb-4" />
              <h3 className="font-bold mb-2">Objective and Fair Background Evaluation</h3>
              <p className="text-sm text-muted-foreground">Unbiased assessment of your skills and experience</p>
            </Card>
            <Card className="p-6 bg-card/50 backdrop-blur-sm hover:shadow-glow transition-all border-primary/20">
              <Brain className="w-10 h-10 text-primary mb-4" />
              <h3 className="font-bold mb-2">Continuous Q&A-Based Training</h3>
              <p className="text-sm text-muted-foreground">Ongoing assessment to sharpen your interview skills</p>
            </Card>
            <Card className="p-6 bg-card/50 backdrop-blur-sm hover:shadow-glow transition-all border-primary/20">
              <TrendingUp className="w-10 h-10 text-primary mb-4" />
              <h3 className="font-bold mb-2">New Training Sessions Generated</h3>
              <p className="text-sm text-muted-foreground">Fresh content based on your evaluation and training results</p>
            </Card>
            <Card className="p-6 bg-card/50 backdrop-blur-sm hover:shadow-glow transition-all border-primary/20">
              <Award className="w-10 h-10 text-primary mb-4" />
              <h3 className="font-bold mb-2">Personalized Course Recommendations</h3>
              <p className="text-sm text-muted-foreground">Third-party courses tailored to your career goals</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Interactive Demo Strip */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div>
              <img src={aiBrain} alt="AI Interview Demo" className="rounded-2xl shadow-card w-full" />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-4">See AI in action</h2>
              <p className="text-muted-foreground mb-6">
                Watch how our AI evaluates responses in real-time, providing instant feedback on communication, structure, and technical depth.
              </p>
              <img src={dashboardPreview} alt="Report Preview" className="rounded-xl shadow-card mb-6" />
              <Button className="gradient-primary" asChild>
                <Link to="/signup">Try Your Free Interview</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 gradient-subtle opacity-50" />
        <div className="container mx-auto px-4 relative z-10">
          <h2 className="text-4xl font-bold text-center mb-4">How It Works</h2>
          <p className="text-center text-muted-foreground mb-16 max-w-2xl mx-auto">
            Get started in minutes and see results immediately
          </p>
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8">
              {[
                { 
                  step: "1", 
                  icon: Users,
                  title: "Register", 
                  desc: "Create your profile in under 2 minutes",
                  color: "from-blue-500 to-cyan-500"
                },
                { 
                  step: "2", 
                  icon: Brain,
                  title: "AI Interview", 
                  desc: "Complete technical + behavioral questions",
                  color: "from-purple-500 to-pink-500"
                },
                { 
                  step: "3", 
                  icon: BarChart3,
                  title: "Get Report", 
                  desc: "Instant feedback with charts and insights",
                  color: "from-orange-500 to-red-500"
                },
                { 
                  step: "4", 
                  icon: TrendingUp,
                  title: "Retake & Improve", 
                  desc: "Practice until you're confident and see improvement",
                  color: "from-green-500 to-emerald-500"
                }
              ].map((item, i) => (
                <div 
                  key={i} 
                  className="relative group"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <Card className="p-6 text-center h-full hover:shadow-glow transition-all duration-300 hover:-translate-y-2 bg-card/50 backdrop-blur-sm border-primary/20">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br ${item.color} mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <item.icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shadow-glow">
                      {item.step}
                    </div>
                    <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </Card>
                  {i < 3 && (
                    <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-20">
                      <ChevronRight className="w-8 h-8 text-primary animate-pulse" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Job Categories Carousel */}
      <section id="categories" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-4">Choose Your STEM Role</h2>
          <p className="text-center text-muted-foreground mb-12">AI interviews tailored for Science, Technology, Engineering & Mathematics professionals</p>
          <Carousel className="max-w-5xl mx-auto">
            <CarouselContent>
              {[
                { role: "Software Engineer", icon: Code, rate: "$100-160/hr" },
                { role: "Data Scientist", icon: BarChart3, rate: "$110-180/hr" },
                { role: "Research Scientist", icon: TestTube, rate: "$90-150/hr" },
                { role: "Mechanical Engineer", icon: Zap, rate: "$85-140/hr" },
                { role: "Electrical Engineer", icon: Zap, rate: "$90-145/hr" },
                { role: "DevOps Engineer", icon: Cloud, rate: "$110-170/hr" },
                { role: "Biomedical Engineer", icon: Target, rate: "$85-135/hr" },
                { role: "Civil Engineer", icon: Layout, rate: "$80-130/hr" },
                { role: "Chemical Engineer", icon: TestTube, rate: "$90-140/hr" },
                { role: "Quality Engineer", icon: CheckCircle2, rate: "$75-125/hr" },
                { role: "Environmental Engineer", icon: Globe, rate: "$80-130/hr" },
                { role: "Statistician", icon: BarChart3, rate: "$85-140/hr" }
              ].map((cat) => (
                <CarouselItem key={cat.role} className="md:basis-1/3 lg:basis-1/4">
                  <Card className="p-6 text-center hover:shadow-glow transition-all hover:-translate-y-1">
                    <cat.icon className="w-12 h-12 mx-auto mb-4 text-primary" />
                    <h3 className="font-bold mb-2">{cat.role}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{cat.rate}</p>
                    <Button size="sm" variant="outline" asChild>
                      <Link to="/signup">Start Interview</Link>
                    </Button>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      </section>

      {/* Role-Based Outcomes */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-4">Built for Every STEM Experience Level</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            From entry-level scientists to senior engineers, our AI adapts to your expertise
          </p>
          <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              { title: "Entry-Level STEM", outcome: "Master interview fundamentals and technical communication", icon: Rocket },
              { title: "Mid-Level Professional", outcome: "Demonstrate expertise with data-driven insights", icon: Trophy },
              { title: "Senior Engineer/Scientist", outcome: "Showcase leadership, system thinking & research depth", icon: Award },
              { title: "Specialized Roles", outcome: "Domain-specific scenarios for QA, Data, Research & more", icon: Target }
            ].map((persona) => (
              <Card key={persona.title} className="p-6 text-center bg-card/50 backdrop-blur-sm hover:shadow-glow transition-all hover:-translate-y-1 border-primary/20">
                <persona.icon className="w-10 h-10 mx-auto mb-4 text-primary" />
                <h3 className="font-bold mb-3">{persona.title}</h3>
                <p className="text-sm text-muted-foreground">{persona.outcome}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">Why Choose Screna AI?</h2>
          <div className="max-w-5xl mx-auto overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-4 text-left font-bold">Feature</th>
                  <th className="p-4 text-center font-bold text-primary">Screna AI</th>
                  <th className="p-4 text-center text-muted-foreground">Job Boards</th>
                  <th className="p-4 text-center text-muted-foreground">Human Mock</th>
                  <th className="p-4 text-center text-muted-foreground">Recruiter Screen</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "Cost", vr: "Free/Low", job: "Free", human: "$100+/session", recruiter: "N/A" },
                  { feature: "Feedback Speed", vr: "Instant", job: "None", human: "Days", recruiter: "Never" },
                  { feature: "Objectivity", vr: "AI-driven", job: "None", human: "Subjective", recruiter: "Biased" },
                  { feature: "Video Evidence", vr: "✓", job: "✗", human: "Maybe", recruiter: "✗" },
                  { feature: "Repeatability", vr: "Unlimited", job: "N/A", human: "Limited", recruiter: "Once" },
                  { feature: "Real Job Matching", vr: "✓", job: "✓", human: "✗", recruiter: "Maybe" }
                ].map((row, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="p-4 font-medium">{row.feature}</td>
                    <td className="p-4 text-center font-semibold text-primary">{row.vr}</td>
                    <td className="p-4 text-center text-muted-foreground">{row.job}</td>
                    <td className="p-4 text-center text-muted-foreground">{row.human}</td>
                    <td className="p-4 text-center text-muted-foreground">{row.recruiter}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Security & Privacy */}
      <section id="security" className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-4">Your Data, Your Control</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Enterprise-grade security with complete transparency
          </p>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card className="p-6 text-center">
              <Lock className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h3 className="font-bold mb-2">Encrypted Storage</h3>
              <p className="text-sm text-muted-foreground">Data encrypted at rest and in transit</p>
            </Card>
            <Card className="p-6 text-center">
              <Shield className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h3 className="font-bold mb-2">User-Controlled Sharing</h3>
              <p className="text-sm text-muted-foreground">You decide who sees your results</p>
            </Card>
            <Card className="p-6 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h3 className="font-bold mb-2">Anonymized Benchmarking</h3>
              <p className="text-sm text-muted-foreground">Compare without exposing identity</p>
            </Card>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-8">
            GDPR compliant • Delete your data anytime • <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
          </p>
        </div>
      </section>

      {/* Testimonials Carousel */}
      <section id="testimonials" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">Trusted by IT Professionals</h2>
          <Carousel className="max-w-5xl mx-auto">
            <CarouselContent>
              {[
                { name: "Sarah Chen", role: "Full-Stack Developer", company: "Independent", quote: "I landed a contract in 3 weeks after using the AI reports to fix my behavioral answers." },
                { name: "Marcus Rodriguez", role: "DevOps Engineer", company: "H-1B Contractor", quote: "The real-time analytics gave me confidence. I improved my score by 35% in two weeks." },
                { name: "Emily Park", role: "Data Engineer", company: "C2C Professional", quote: "Finally, a platform that understands contractor interviews. Connected me with 3 perfect opportunities." },
                { name: "David Kim", role: "Backend Developer", company: "Freelancer", quote: "Virtual Recruiter helped me land a $120/hr contract. The AI feedback was spot-on." },
                { name: "Lisa Johnson", role: "QA Engineer", company: "Contract", quote: "The video replay feature showed me exactly where I was losing points. Game changer!" }
              ].map((t) => (
                <CarouselItem key={t.name} className="md:basis-1/2 lg:basis-1/3">
                  <Card className="p-6 h-full">
                    <div className="flex gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-sm italic mb-6">"{t.quote}"</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full gradient-primary" />
                      <div>
                        <p className="font-semibold text-sm">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.role}</p>
                      </div>
                    </div>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      </section>

      {/* Micro Case Study */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="max-w-4xl mx-auto p-8 md:p-12 gradient-primary text-white">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-4">Real Results in 14 Days</h2>
                <p className="mb-6 opacity-90">See how contractors improve their interview performance with AI-powered practice</p>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="font-semibold">Communication</span>
                      <span>+12%</span>
                    </div>
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-white rounded-full w-3/4" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="font-semibold">Structure</span>
                      <span>+18%</span>
                    </div>
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-white rounded-full w-4/5" />
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <Button variant="outline" className="bg-white text-primary hover:bg-white/90">
                  See Sample Report
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section id="pricing" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">Start Free, Upgrade Anytime</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="p-8">
              <h3 className="text-2xl font-bold mb-4">Free</h3>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2"><Check className="w-5 h-5 text-primary" /> 1 role category</li>
                <li className="flex items-center gap-2"><Check className="w-5 h-5 text-primary" /> 2 AI interviews</li>
                <li className="flex items-center gap-2"><Check className="w-5 h-5 text-primary" /> 1 detailed report</li>
              </ul>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/signup">Get Started Free</Link>
              </Button>
            </Card>
            <Card className="p-8 border-primary shadow-glow relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-primary text-white text-xs px-3 py-1 rounded-full">Popular</div>
              <h3 className="text-2xl font-bold mb-4">Premium</h3>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2"><Check className="w-5 h-5 text-primary" /> Unlimited interviews</li>
                <li className="flex items-center gap-2"><Check className="w-5 h-5 text-primary" /> Full report archive</li>
                <li className="flex items-center gap-2"><Check className="w-5 h-5 text-primary" /> Advanced analytics</li>
                <li className="flex items-center gap-2"><Check className="w-5 h-5 text-primary" /> Real job matching</li>
              </ul>
              <Button className="w-full gradient-primary" asChild>
                <Link to="/pricing">See Pricing</Link>
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section id="faq" className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="max-w-3xl mx-auto">
            <AccordionItem value="item-1">
              <AccordionTrigger>How does the AI grade my interview?</AccordionTrigger>
              <AccordionContent>
                Our AI analyzes your responses across multiple dimensions: communication clarity, technical depth, structure (STAR method), confidence, and relevance. It compares your answers to thousands of successful contractor interviews.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>Is my video private?</AccordionTrigger>
              <AccordionContent>
                Absolutely. Your interview videos are encrypted and only visible to you. You control if and when to share reports with recruiters. We never sell or share your data with third parties.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>What roles are supported?</AccordionTrigger>
              <AccordionContent>
                We support 8+ IT roles: Backend, Frontend, Full-Stack, Data Engineer, DevOps, QA, Mobile, and Product/Design. Each has role-specific technical and behavioral questions.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger>Will this help with real jobs?</AccordionTrigger>
              <AccordionContent>
                Yes! Premium users get matched with active contract roles based on their skills and interview performance. We partner with staffing agencies across North America.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-5">
              <AccordionTrigger>What's included in Premium?</AccordionTrigger>
              <AccordionContent>
                Premium includes unlimited interviews across all roles, full report archive, advanced analytics dashboards, peer benchmarking, and access to real job matching with our staffing partners.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-6">
              <AccordionTrigger>Can I export my report?</AccordionTrigger>
              <AccordionContent>
                Yes, all reports can be downloaded as PDF. Premium users also get video highlights and timestamped coaching notes they can share with recruiters or hiring managers.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Final CTA Banner */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              Join 5,000+ Contractors Boosting Their Interview Skills
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Start practicing with AI today and land your dream contract role
            </p>
            <Button size="xl" className="gradient-primary shadow-glow hover:shadow-glow hover:scale-105 transition-all duration-300 mb-4" asChild>
              <Link to="/register">
                Start Free AI Interview Now
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              Free for first 2 interviews • Upgrade anytime for unlimited access
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-bold mb-4">Virtual Recruiter</h4>
              <p className="text-sm text-muted-foreground">
                AI-powered mock interviews for IT contractors
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/dashboard" className="hover:text-foreground transition-smooth">Dashboard</Link></li>
                <li><Link to="/pricing" className="hover:text-foreground transition-smooth">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-smooth">About</a></li>
                <li><a href="#" className="hover:text-foreground transition-smooth">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-smooth">Privacy</a></li>
                <li><a href="#" className="hover:text-foreground transition-smooth">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>© 2025 Screna AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
