import { Navbar } from '@/components/newDesign/home/navbar';
import { FeaturedQuestionLibrary } from '@/components/newDesign/home/featured-question-library';
import { HowItWorks } from '@/components/newDesign/home/how-it-works';
import { CTA } from '@/components/newDesign/home/cta';
import { Footer } from '@/components/newDesign/home/footer';

export default function QuestionBankPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-20">
        <FeaturedQuestionLibrary />
        <HowItWorks />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
