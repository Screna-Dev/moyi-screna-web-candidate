// Home page / `/faq` question set.
//
// Lives outside pricing-faq.tsx so faq-page.tsx can build the FAQPage JSON-LD
// from the same source of truth without exporting non-components from a
// component module.

export const faqItems = [
  {
    id: 'training-plan',
    question: 'How does the AI create my Training Plan?',
    answer:
      'After you upload your resume and set your target job, our AI analyzes your profile and generates a customized Training Plan. Each session includes targeted questions aligned with your role, experience level, and readiness metrics.',
  },
  {
    id: 'experience-library',
    question: 'How does the experience library work?',
    answer:
      'Our experience library contains real interview questions and experiences shared by candidates across all industries. You can browse by company, role, or question type to learn from others and boost your readiness.',
  },
  {
    id: 'roles-supported',
    question: 'What roles are supported?',
    answer:
      'We support all tech career fields including Frontend, Backend, Full Stack, DevOps, Data Science, ML Engineering, and more. Each role has customized Training Plans with industry-specific readiness metrics.',
  },
  {
    id: 'job-matching',
    question: 'How does daily job matching work?',
    answer:
      'Based on your target job title and profile, our system scans multiple job platforms daily and recommends the latest positions that match your criteria. You\'ll receive personalized job alerts to keep your applications timely.',
  },
  {
    id: 'readiness-metrics',
    question: 'How are Readiness Metrics calculated?',
    answer:
      'Your Readiness Score is initially calculated based on your resume, experience, and target role. As you complete Training Plan sessions, the score is dynamically updated based on your performance, improvement trends, and completion rate.',
  },
];
