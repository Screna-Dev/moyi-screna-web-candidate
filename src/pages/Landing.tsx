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

const StickyNav = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b border-border shadow-sm">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-7 h-7 text-primary" />
          <span className="font-bold text-xl">Screna AI</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm">
          <a href="#features" className="hover:text-primary transition-smooth">Features</a>
          <a href="#how-it-works" className="hover:text-primary transition-smooth">How It Works</a>
          <a href="#categories" className="hover:text-primary transition-smooth">Job Categories</a>
          <a href="#why-screna" className="hover:text-primary transition-smooth">Why Screna</a>
          <a href="#pricing" className="hover:text-primary transition-smooth">Pricing</a>
          <a href="#faq" className="hover:text-primary transition-smooth">FAQ</a>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link to="/auth">Login</Link>
          </Button>
          <Button asChild variant="cta">
            <Link to="/auth">Start Free</Link>
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
                Ace Your Interview with Structured Preparation
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Comprehensive, multi-dimensional training with AI-powered practice, tailored preparation paths, and daily job insights — your all-in-one interview preparation platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <Button size="lg" className="gradient-primary shadow-glow hover:scale-105 transition-all" asChild>
                  <Link to="/auth">
                    Start Your Preparation Journey
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
                  alt="AI-powered interview preparation platform" 
                  className="rounded-2xl shadow-card w-full"
                />
                <div className="absolute -bottom-4 -left-4 bg-background/95 backdrop-blur-lg border border-border rounded-xl p-4 shadow-glow">
                  <p className="text-sm font-semibold text-primary">+35% avg improvement</p>
                </div>
                <div className="absolute -top-4 -right-4 bg-background/95 backdrop-blur-lg border border-border rounded-xl p-4 shadow-glow">
                  <p className="text-sm font-semibold text-primary">10,000+ candidates</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Value Proposition Grid */}
      <section id="features" className="py-20">
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-4">
            Stop Guessing, Start Preparing
          </h2>
          <p className="text-xl text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Traditional interview prep lacks structure, personalization, and real-time job insights.
          </p>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="p-8 bg-destructive/5 border-destructive/20">
              <div className="flex items-center gap-3 mb-6">
                <XCircle className="w-8 h-8 text-destructive" />
                <h3 className="text-2xl font-bold">Traditional Prep</h3>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="text-destructive font-bold">💸</span>
                  <span className="text-muted-foreground">Expensive coaching sessions</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-destructive font-bold">⏱️</span>
                  <span className="text-muted-foreground">Generic, one-size-fits-all approach</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-destructive font-bold">⚙️</span>
                  <span className="text-muted-foreground">No job market integration</span>
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
                  <span className="font-medium">Personalized AI prep sessions</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold">✓</span>
                  <span className="font-medium">Community experiences + daily job matches</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold">✓</span>
                  <span className="font-medium">Progressive performance tracking</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <Card className="p-6 bg-card/50 backdrop-blur-sm hover:shadow-glow transition-all border-primary/20">
              <Brain className="w-10 h-10 text-primary mb-4" />
              <h3 className="font-bold mb-2">AI-Assisted Preparation</h3>
              <p className="text-sm text-muted-foreground">Auto-generated session lists tailored to your target role and interview date</p>
            </Card>
            <Card className="p-6 bg-card/50 backdrop-blur-sm hover:shadow-glow transition-all border-primary/20">
              <Users className="w-10 h-10 text-primary mb-4" />
              <h3 className="font-bold mb-2">Community Experiences</h3>
              <p className="text-sm text-muted-foreground">Learn from real interview experiences shared by candidates who've been there</p>
            </Card>
            <Card className="p-6 bg-card/50 backdrop-blur-sm hover:shadow-glow transition-all border-primary/20">
              <Briefcase className="w-10 h-10 text-primary mb-4" />
              <h3 className="font-bold mb-2">Daily Job Matching</h3>
              <p className="text-sm text-muted-foreground">Latest positions from multiple platforms, matched to your target role daily</p>
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
              <h2 className="text-3xl font-bold mb-4">See Your Progress Dashboard</h2>
              <p className="text-muted-foreground mb-6">
                Track your profile score, session completion, and performance improvements in real-time as you prepare for your target interview.
              </p>
              <img src={dashboardPreview} alt="Progress Dashboard" className="rounded-xl shadow-card mb-6" />
              <Button className="gradient-primary" asChild>
                <Link to="/auth">Start Your Prep Journey</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 gradient-subtle opacity-50" />
        <div className="container mx-auto px-4 relative z-10">
          <h2 className="text-4xl font-bold text-center mb-4">Your Preparation Journey</h2>
          <p className="text-center text-muted-foreground mb-16 max-w-2xl mx-auto">
            From registration to interview day — a complete preparation roadmap
          </p>
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-4 gap-6">
              {[
                { 
                  step: "1", 
                  icon: FileText,
                  title: "Upload & Profile", 
                  desc: "Register, upload resume, set target job & interview date",
                  color: "from-blue-500 to-cyan-500"
                },
                { 
                  step: "2", 
                  icon: Target,
                  title: "AI Scoring", 
                  desc: "Get initial profile score based on your background",
                  color: "from-purple-500 to-pink-500"
                },
                { 
                  step: "3", 
                  icon: Brain,
                  title: "AI Sessions", 
                  desc: "Auto-generated prep sessions matched to your role",
                  color: "from-orange-500 to-red-500"
                },
                { 
                  step: "4", 
                  icon: TrendingUp,
                  title: "Track Progress", 
                  desc: "Complete sessions, get reports, improve your score",
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
                    <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-20">
                      <ChevronRight className="w-8 h-8 text-primary animate-pulse" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-16 grid md:grid-cols-3 gap-6">
              <Card className="p-6 bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/30">
                <Video className="w-10 h-10 text-primary mb-3" />
                <h3 className="font-bold mb-2">Post-Session Reports</h3>
                <p className="text-sm text-muted-foreground">Question-by-question analysis with strengths, weaknesses, and improvement tips</p>
              </Card>
              <Card className="p-6 bg-gradient-to-br from-secondary/10 to-primary/10 border-secondary/30">
                <Users className="w-10 h-10 text-secondary mb-3" />
                <h3 className="font-bold mb-2">Community Insights</h3>
                <p className="text-sm text-muted-foreground">Browse real interview questions and experiences shared by the community</p>
              </Card>
              <Card className="p-6 bg-gradient-to-br from-primary/10 to-accent/10 border-accent/30">
                <Briefcase className="w-10 h-10 text-accent mb-3" />
                <h3 className="font-bold mb-2">Job Recommendations</h3>
                <p className="text-sm text-muted-foreground">Receive daily job matches tailored to your profile and target role</p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Job Categories Grid */}
      <section id="categories" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-4">Choose Your Career Field</h2>
          <p className="text-center text-muted-foreground mb-12">Tailored preparation sessions for professionals across all industries and roles</p>
          <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-4 max-w-6xl mx-auto">
            {[
              { role: "Software Engineer", icon: Code },
              { role: "Product Manager", icon: Target },
              { role: "Marketing", icon: TrendingUp },
              { role: "Finance", icon: BarChart3 },
              { role: "Sales", icon: Users },
              { role: "Data Science", icon: Database },
              { role: "UX Design", icon: Palette },
              { role: "Project Mgmt", icon: Briefcase },
              { role: "HR", icon: Users },
              { role: "Consulting", icon: Award },
              { role: "Account Mgmt", icon: CheckCircle2 },
              { role: "Operations", icon: Layout },
              { role: "Engineering", icon: Zap },
              { role: "Legal", icon: Shield },
              { role: "Healthcare", icon: Eye },
              { role: "Education", icon: Brain },
              { role: "Real Estate", icon: Globe },
              { role: "Media", icon: Video },
              { role: "Research", icon: TestTube },
              { role: "Customer Success", icon: Trophy }
            ].map((cat) => (
              <Link key={cat.role} to="/auth" className="flex flex-col items-center p-3 rounded-xl hover:bg-primary/5 transition-all cursor-pointer group">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                  <cat.icon className="w-6 h-6 text-primary" />
                </div>
                <span className="text-xs text-center font-medium text-muted-foreground group-hover:text-foreground transition-colors">{cat.role}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Role-Based Outcomes */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-4">Built for Every Experience Level</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Personalized prep sessions that adapt to your experience — from entry-level to executive roles
          </p>
          <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              { title: "Entry-Level", outcome: "Build confidence with foundational interview prep and Q&A practice", icon: Rocket },
              { title: "Mid-Level Professional", outcome: "Sharpen expertise and structured communication skills", icon: Trophy },
              { title: "Senior Leadership", outcome: "Prepare for leadership scenarios and strategic problem-solving", icon: Award },
              { title: "Specialized Roles", outcome: "Domain-specific prep sessions for any industry or function", icon: Target }
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
      <section id="why-screna" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">Why Choose Screna AI?</h2>
          <div className="max-w-5xl mx-auto overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-4 text-left font-bold">Feature</th>
                  <th className="p-4 text-center font-bold text-primary">Screna AI</th>
                  <th className="p-4 text-center text-muted-foreground">Job Boards</th>
                  <th className="p-4 text-center text-muted-foreground">Human Coach</th>
                  <th className="p-4 text-center text-muted-foreground">DIY Prep</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "Cost", vr: "Free/Low", job: "Free", human: "$150+/hr", recruiter: "N/A" },
                  { feature: "Personalized Sessions", vr: "AI-generated", job: "None", human: "Generic", recruiter: "N/A" },
                  { feature: "Progress Tracking", vr: "Real-time scores", job: "None", human: "Manual notes", recruiter: "None" },
                  { feature: "Job Matching", vr: "Daily updates", job: "Search-based", human: "None", recruiter: "Limited" },
                  { feature: "Detailed Reports", vr: "✓ Per session", job: "✗", human: "Maybe", recruiter: "✗" }
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
          <h2 className="text-4xl font-bold text-center mb-12">Trusted by Professionals Worldwide</h2>
          <Carousel className="max-w-5xl mx-auto">
            <CarouselContent>
              {[
                { name: "Sarah Chen", role: "Product Manager", company: "Tech Startup", quote: "I landed my dream PM role in 3 weeks after using the AI prep sessions. The structured approach made all the difference." },
                { name: "Marcus Rodriguez", role: "Marketing Director", company: "Fortune 500", quote: "The personalized feedback gave me confidence. I improved my interview performance by 40% in two weeks." },
                { name: "Emily Park", role: "Financial Analyst", company: "Investment Bank", quote: "Finally, a platform that understands what hiring managers look for. Connected me with my ideal role." },
                { name: "David Kim", role: "Software Engineer", company: "FAANG", quote: "Screna AI helped me prepare for technical interviews. The AI feedback and practice sessions were invaluable." },
                { name: "Lisa Johnson", role: "Sales Manager", company: "SaaS Company", quote: "The daily job matches feature showed me opportunities I never would have found. Game changer!" }
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
                <h2 className="text-3xl font-bold mb-4">Real Progress in 14 Days</h2>
                <p className="mb-6 opacity-90">See how candidates improve their profile scores with structured AI preparation</p>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="font-semibold">Profile Score</span>
                      <span>+25%</span>
                    </div>
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-white rounded-full w-3/4" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="font-semibold">Session Completion</span>
                      <span>+40%</span>
                    </div>
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-white rounded-full w-4/5" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="font-semibold">Interview Readiness</span>
                      <span>+35%</span>
                    </div>
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-white rounded-full w-[85%]" />
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

      {/* Pricing Plans */}
      <section id="pricing" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-4">Choose Your Plan</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Select the plan that best fits your interview preparation needs
          </p>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {/* Free Plan */}
            <Card className="p-8 border-2 hover:shadow-glow transition-all">
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-4">Free</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold">$0</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-muted-foreground">Perfect for getting started</p>
              </div>
              
              <Button size="lg" variant="outline" className="w-full mb-6" asChild>
                <Link to="/auth">Get Started Free</Link>
              </Button>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">60 Credits (≈60 mins) monthly</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">+0 daily bonus credits</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">1 Interview Training Plan</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">$0.12 per extra credit</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">7 days data retention</span>
                </div>
              </div>
            </Card>

            {/* Pro Plan */}
            <Card className="p-8 border-2 border-primary shadow-glow relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-sm px-4 py-1 rounded-full font-semibold">
                Most Popular
              </div>
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-4">Pro Plan</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold">$19.9</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-muted-foreground">For serious candidates</p>
              </div>
              
              <Button size="lg" className="w-full mb-6 gradient-primary" asChild>
                <Link to="/pricing">Get Pro</Link>
              </Button>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">200 Credits (≈200 mins) monthly</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">+2 daily bonus credits</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">3 Interview Training Plans</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">$0.1 per extra credit</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Full report with feedback</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Smart job matching</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">90 days data retention</span>
                </div>
              </div>
            </Card>

            {/* Elite Plan */}
            <Card className="p-8 border-2 hover:shadow-glow transition-all">
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-4">Elite Plan</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold">$39.9</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-muted-foreground">Maximum preparation power</p>
              </div>
              
              <Button size="lg" variant="outline" className="w-full mb-6" asChild>
                <Link to="/pricing">Get Elite</Link>
              </Button>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">500 Credits (≈500 mins) monthly</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">+5 daily bonus credits</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Unlimited Interview Training Plans</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">$0.07 per extra credit</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Video replay with timestamps</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Smart job matching</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Unlimited data retention</span>
                </div>
              </div>
            </Card>
          </div>
          
          <div className="text-center mt-12">
            <Button variant="link" asChild>
              <Link to="/pricing" className="text-primary hover:underline">
                View detailed comparison →
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section id="faq" className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="max-w-3xl mx-auto">
            <AccordionItem value="item-1">
              <AccordionTrigger>How does the AI create my prep sessions?</AccordionTrigger>
              <AccordionContent>
                After you upload your resume and set your target job, our AI analyzes your profile and generates a customized session list. Each session includes targeted questions aligned with your role, experience level, and interview timeline.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>How does the experience library work?</AccordionTrigger>
              <AccordionContent>
                Our experience library contains real interview questions and experiences shared by candidates across all industries. You can browse by company, role, or question type to learn from others and prepare more effectively.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>What roles are supported?</AccordionTrigger>
              <AccordionContent>
                We support all career fields including Technology, Business, Finance, Marketing, Sales, Operations, HR, and more. Each role has customized prep sessions with industry-specific questions and scenarios.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger>How does daily job matching work?</AccordionTrigger>
              <AccordionContent>
                Based on your target job title and profile, our system scans multiple job platforms daily and recommends the latest positions that match your criteria. You'll receive personalized job alerts to keep your applications timely.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-5">
              <AccordionTrigger>What's included in Premium?</AccordionTrigger>
              <AccordionContent>
                Premium includes unlimited prep sessions, full access to the mentor database, daily job recommendations across all platforms, detailed post-session reports, and advanced progress analytics to track your improvement.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-6">
              <AccordionTrigger>How is my profile score calculated?</AccordionTrigger>
              <AccordionContent>
                Your profile score is initially calculated based on your resume, experience, and target role. As you complete prep sessions, the score is dynamically updated based on your performance, improvement trends, and session completion rate.
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
              Join 10,000+ Professionals Preparing Smarter
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Start your personalized prep journey and ace your next interview
            </p>
            <Button size="xl" className="gradient-primary shadow-glow hover:shadow-glow hover:scale-105 transition-all duration-300 mb-4" asChild>
              <Link to="/register">
                Begin Your Preparation Journey
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              Free for 5 prep sessions • Upgrade anytime for unlimited access
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-bold mb-4">Screna AI</h4>
              <p className="text-sm text-muted-foreground">
                Your complete interview preparation platform for any career
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
