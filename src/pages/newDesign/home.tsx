import { Navbar } from '@/components/newDesign/home/navbar';
import { Hero } from '@/components/newDesign/home/hero';
import { Features } from '@/components/newDesign/home/features';
import { HowItWorks } from '@/components/newDesign/home/how-it-works';
import { Testimonials } from '@/components/newDesign/home/testimonials';
import { CTA } from '@/components/newDesign/home/cta';
import { Footer } from '@/components/newDesign/home/footer';

export function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar transparent />
      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <Testimonials />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}