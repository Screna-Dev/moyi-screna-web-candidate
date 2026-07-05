import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Users, ChevronRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  CANDIDATE_DASHBOARD_PATH,
  MENTOR_DASHBOARD_PATH,
  isDualRole,
  hasMentorRole,
  setStoredDashboardMode,
  type DashboardMode,
} from './dashboard-mode';

/**
 * Chooser screen shown to accounts that hold both the CANDIDATE and MENTOR
 * roles. Picking a card remembers the choice and routes into that dashboard.
 * Non dual-role users are redirected straight to the dashboard they belong to.
 */
export function DashboardChooser() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  // Guard the route: only genuine dual-role users belong on the chooser.
  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }
    if (!isDualRole(user)) {
      navigate(hasMentorRole(user) ? MENTOR_DASHBOARD_PATH : CANDIDATE_DASHBOARD_PATH, {
        replace: true,
      });
    }
  }, [isLoading, user, navigate]);

  const choose = (mode: DashboardMode) => {
    setStoredDashboardMode(mode);
    navigate(mode === 'mentor' ? MENTOR_DASHBOARD_PATH : CANDIDATE_DASHBOARD_PATH, {
      replace: true,
    });
  };

  const firstName = user?.name?.trim().split(/\s+/)[0] || 'there';

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-10">
          <h1 className="text-foreground" style={{ fontSize: 'var(--text-2xl)' }}>
            Welcome back, {firstName}
          </h1>
          <p className="text-muted-foreground mt-2" style={{ fontSize: 'var(--text-lg)' }}>
            Where would you like to go today?
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <ChooserCard
            icon={<GraduationCap className="w-6 h-6 text-primary" />}
            title="Candidate Dashboard"
            description="Practice interviews, track applications, and book mentors."
            onClick={() => choose('candidate')}
          />
          <ChooserCard
            icon={<Users className="w-6 h-6 text-primary" />}
            title="Mentor Dashboard"
            description="Manage bookings, availability, reviews, and earnings."
            badge="Verified Mentor"
            onClick={() => choose('mentor')}
          />
        </div>

        <p className="text-center text-muted-foreground mt-8" style={{ fontSize: 'var(--text-sm)' }}>
          You can switch between dashboards anytime from the sidebar.
        </p>
      </div>
    </div>
  );
}

function ChooserCard({
  icon,
  title,
  description,
  badge,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group text-left bg-card border border-border rounded-[var(--radius)] p-6 hover:border-primary hover:shadow-lg transition-all"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 rounded-[var(--radius-sm)] bg-primary/10 flex items-center justify-center">
          {icon}
        </div>
        {badge && (
          <span className="flex items-center gap-1 text-xs text-[hsl(165,60%,30%)] bg-[hsl(165,82%,90%)] px-2.5 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" />
            {badge}
          </span>
        )}
      </div>
      <h3 className="text-foreground mb-1">{title}</h3>
      <p className="text-muted-foreground" style={{ fontSize: 'var(--text-sm)' }}>
        {description}
      </p>
      <div className="flex items-center gap-1 text-primary mt-4 text-sm font-medium">
        Enter
        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </button>
  );
}
