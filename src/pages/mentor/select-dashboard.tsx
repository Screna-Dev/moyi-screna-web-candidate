import { DashboardChooser } from '@/components/mentor/dashboard-chooser';

/**
 * Route page for `/select-dashboard`. Dual-role (candidate + mentor) users are
 * sent here after login to choose which dashboard to enter.
 */
export function SelectDashboardPage() {
  return <DashboardChooser />;
}
