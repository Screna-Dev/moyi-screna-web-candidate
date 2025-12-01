import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Zap, Crown, Star } from "lucide-react";


const Pricing = () => {
  const features = {
    free: [
      "30 Credits (≈30 mins) monthly included",
      "+2 daily bonus credits (≈60/month)",
      "1 basic AI interview (lite report)",
      "Basic metrics (strengths/weaknesses)",
      "Basic job matching (3 jobs/day)",
      "1 job title only",
      "7 days data retention",
      "Email support only",
    ],
    pro: [
      "200 Credits (≈200 mins) monthly included",
      "+5 daily bonus credits (≈150/month)",
      "Unlimited AI interviews (credit-based)",
      "Auto-generated AI training plan",
      "Full report with per-question feedback",
      "Smart job matching (10 jobs/day)",
      "Up to 3 job titles",
      "Progress tracking & reminders",
      "90 days data retention",
      "Priority email support",
    ],
    elite: [
      "500 Credits (≈500 mins) monthly included",
      "+10 daily bonus credits (≈300/month)",
      "Unlimited interviews + priority queue",
      "Advanced adaptive plan (multi-position)",
      "Advanced report (tone, emotion, behavior)",
      "Video replay with timestamps",
      "Advanced matching (20 jobs/day + priority)",
      "Unlimited job titles & roles",
      "Personalized alerts & reminders",
      "Unlimited data retention",
      "Dedicated priority support channel",
    ],
  };

  const testimonials = [
    {
      name: "David Kim",
      role: "Software Engineer",
      quote: "Upgraded to premium and landed a $150/hr contract within 2 weeks. Best investment ever!",
      rating: 5,
    },
    {
      name: "Rachel Martinez",
      role: "DevOps Specialist",
      quote: "The unlimited interviews helped me master my pitch. Totally worth the Pro plan!",
      rating: 5,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 pt-24 pb-20">
        {/* Header */}
        <div className="text-center mb-16">
          <Badge className="mb-4 gradient-primary border-0">Pricing</Badge>
          <h1 className="text-5xl font-bold mb-6">
            Unlock Your Full Potential with Premium Access
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your career goals
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto mb-16">
          {/* Free Plan */}
          <Card className="p-8 border-2">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-6 h-6 text-muted-foreground" />
                <h3 className="text-2xl font-bold">Free Plan</h3>
              </div>
              <div className="mb-4">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-muted-foreground">Perfect for getting started</p>
            </div>

            <Button size="lg" variant="outline" className="w-full mb-6" asChild>
              <Link to="/register">Get Started Free</Link>
            </Button>

            <div className="space-y-3">
              {features.free.map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Pro Plan */}
          <Card className="p-8 border-2 border-primary relative overflow-hidden shadow-glow">
            <div className="absolute top-0 right-0 bg-gradient-primary text-primary-foreground px-4 py-1 rounded-bl-lg text-sm font-semibold">
              Most Popular
            </div>
            
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-6 h-6 text-primary" />
                <h3 className="text-2xl font-bold">Pro Plan</h3>
              </div>
              <div className="mb-4">
                <span className="text-4xl font-bold">$19.9</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-muted-foreground">Everything you need to excel</p>
            </div>

            <Button size="lg" className="w-full mb-6 gradient-primary" asChild>
              <Link to="/register">
                <Zap className="mr-2 w-4 h-4" />
                Upgrade to Pro
              </Link>
            </Button>

            <div className="space-y-3">
              {features.pro.map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{feature}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Elite Plan */}
          <Card className="p-8 border-2 border-secondary relative overflow-hidden">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Crown className="w-6 h-6 text-secondary" />
                <h3 className="text-2xl font-bold">Elite Plan</h3>
              </div>
              <div className="mb-4">
                <span className="text-4xl font-bold">$39.9</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-muted-foreground">Maximum power & priority</p>
            </div>

            <Button size="lg" variant="secondary" className="w-full mb-6" asChild>
              <Link to="/register">
                <Crown className="mr-2 w-4 h-4" />
                Upgrade to Elite
              </Link>
            </Button>

            <div className="space-y-3">
              {features.elite.map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-secondary" />
                  </div>
                  <span className="text-sm font-medium">{feature}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Comparison Table */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Feature Comparison</h2>
          <Card className="overflow-hidden max-w-4xl mx-auto">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Feature</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Free</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold bg-primary/5">Pro</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Elite</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    { name: "Monthly Included Credits", free: "30 (≈30 mins)", pro: "200 (≈200 mins)", elite: "500 (≈500 mins)" },
                    { name: "Daily Bonus Credits", free: "+2/day (≈60/mo)", pro: "+5/day (≈150/mo)", elite: "+10/day (≈300/mo)" },
                    { name: "Extra Credit Price", free: "$0.12/min", pro: "$0.09/min", elite: "$0.07/min" },
                    { name: "AI Interview Sessions", free: "1 basic (lite)", pro: "Unlimited", elite: "Unlimited + priority" },
                    { name: "AI Training Plan", free: "—", pro: "Auto-generated", elite: "Advanced adaptive" },
                    { name: "Metrics Report", free: "Basic", pro: "Full detailed", elite: "Advanced + emotion" },
                    { name: "Job Matching Engine", free: "3 jobs/day", pro: "10 jobs/day", elite: "20 jobs/day + priority" },
                    { name: "Job Title Library", free: "1 title only", pro: "Up to 3 titles", elite: "Unlimited" },
                    { name: "Progress Tracking", free: "—", pro: "✓", elite: "✓ Personalized" },
                    { name: "Data Retention", free: "7 days", pro: "90 days", elite: "Unlimited" },
                    { name: "Customer Support", free: "Email only", pro: "Priority email", elite: "Dedicated channel" },
                  ].map((row, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 font-medium">{row.name}</td>
                      <td className="px-6 py-4 text-center text-muted-foreground text-sm">{row.free}</td>
                      <td className="px-6 py-4 text-center font-semibold bg-primary/5 text-sm">{row.pro}</td>
                      <td className="px-6 py-4 text-center font-semibold text-sm">{row.elite}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Testimonials */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">What Our Users Say</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-foreground mb-4 italic">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gradient-primary" />
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              {
                q: "Can I cancel anytime?",
                a: "Yes! Cancel anytime from your account settings. No questions asked.",
              },
              {
                q: "Do you offer refunds?",
                a: "We offer a 7-day money-back guarantee if you're not satisfied with your plan.",
              },
              {
                q: "How do I upgrade?",
                a: "Click the upgrade button on your chosen plan and enter your payment details. Your access starts immediately.",
              },
              {
                q: "Is my payment secure?",
                a: "Yes, we use Stripe for secure payment processing. We never store your card details.",
              },
            ].map((faq, index) => (
              <Card key={index} className="p-6">
                <h3 className="font-semibold mb-2">{faq.q}</h3>
                <p className="text-muted-foreground">{faq.a}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center mt-16">
          <Card className="p-12 bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Ready to level up your interview game?</h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands of professionals who upgraded their career game
            </p>
            <Button size="xl" className="gradient-primary" asChild>
              <Link to="/register">
                Start Your Free Trial
                <Zap className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              7-day money-back guarantee • Cancel anytime
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Pricing;