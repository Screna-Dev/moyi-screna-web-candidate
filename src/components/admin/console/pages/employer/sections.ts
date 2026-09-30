import type { EmployerView } from './types';

// The employer screens are reached from three admin sidebar entries under
// "Hiring". Deeper screens (wizard, board, report, contact) keep their parent
// entry highlighted.
export type EmployerSection = 'employer-dashboard' | 'employer-jobs' | 'employer-candidates';

export const EMPLOYER_SECTIONS: EmployerSection[] = ['employer-dashboard', 'employer-jobs', 'employer-candidates'];

export const SECTION_VIEW: Record<EmployerSection, EmployerView> = {
  'employer-dashboard': { name: 'dashboard' },
  'employer-jobs': { name: 'jobs' },
  'employer-candidates': { name: 'applications' },
};

export function sectionOf(view: EmployerView): EmployerSection {
  switch (view.name) {
    case 'dashboard':
      return 'employer-dashboard';
    case 'jobs':
    case 'wizard':
      return 'employer-jobs';
    default:
      return 'employer-candidates';
  }
}

export function isEmployerSection(page: string): page is EmployerSection {
  return (EMPLOYER_SECTIONS as string[]).includes(page);
}
