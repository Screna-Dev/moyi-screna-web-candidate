import { Navbar } from '@/components/newDesign/home/navbar';
import { PricingFaq } from '@/components/newDesign/home/pricing-faq';
import { Footer } from '@/components/newDesign/home/footer';

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-[hsl(220,20%,97%)]">
      <Navbar />
      <div className="pt-24">
        <PricingFaq />
      </div>
      <Footer />
    </div>
  );
}
