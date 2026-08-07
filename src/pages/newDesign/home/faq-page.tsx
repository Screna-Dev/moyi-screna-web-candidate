import { Navbar } from '@/components/newDesign/home/navbar';
import { PricingFaq } from '@/components/newDesign/home/pricing-faq';
import { Footer } from '@/components/newDesign/home/footer';
import { useSeo } from '@/hooks/useSeo';
import { SEO_COPY } from '@/constants/seo';
import { faqItems } from '@/constants/faq';

// FAQPage rich result. The answers live in a Radix accordion that unmounts its
// closed panels, so this block is what actually exposes them to crawlers.
const FAQ_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqItems.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: { '@type': 'Answer', text: item.answer },
  })),
};

export default function FaqPage() {
  useSeo({ ...SEO_COPY.faq, path: '/faq', jsonLd: [FAQ_JSON_LD] });

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
