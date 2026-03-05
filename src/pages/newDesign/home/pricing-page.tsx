import { Navbar } from '@/components/newDesign/home/navbar';
import { Pricing } from '@/components/newDesign/home/pricing';
import { LandJob } from '@/components/newDesign/home/land-job';
import { PricingFaq } from '@/components/newDesign/home/pricing-faq';
import { Footer } from '@/components/newDesign/home/footer';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#f7f9fb]">
      <Navbar />
      <div className="pt-24">
        <Pricing />
        <LandJob />
        <PricingFaq />
      </div>
      <Footer />
    </div>
  );
}