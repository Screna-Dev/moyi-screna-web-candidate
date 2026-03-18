import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar, Clock, BarChart2, CheckCircle, XCircle, MoreVertical, Loader2 } from 'lucide-react';
import { Button } from '@/components/newDesign/ui/button';
import { DashboardLayout } from '@/components/newDesign/dashboard-layout';
import { useNavigate } from 'react-router-dom';
import { getTrainingPlans } from '@/services/InterviewServices';

type SessionStatus = 'Completed' | 'Incomplete';

interface SessionRecord {
  interviewId: string;
  title: string;
  company: string;
  score: number;
  duration: string;
  date: string;
  type: string;
  status: SessionStatus;
}

function formatDate(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

function mapScore(raw: number): number {
  if (!raw) return 0;
  if (raw <= 1)  return Math.round(raw * 100);
  if (raw <= 10) return Math.round(raw * 10);
  return Math.round(raw);
}

function mapPlansToSessions(plans: any[]): SessionRecord[] {
  if (!Array.isArray(plans)) return [];
  return plans
    .flatMap((plan: any) => {
      const modules: any[] = Array.isArray(plan.modules) ? plan.modules : [];
      return modules
        .filter((m: any) => m.status === 'completed')
        .map((m: any): SessionRecord => ({
          interviewId: String(m.report_id ?? ''),
          title: m.title ?? plan.target_job_title ?? 'Mock Interview',
          company: plan.target_company ?? 'Practice Session',
          score: mapScore(m.score ?? 0),
          duration: m.duration_minutes ? `${m.duration_minutes} min` : '--',
          date: plan.updated_at ?? plan.created_at ?? '',
          type: m.category ?? 'General',
          status: 'Completed',
        }));
    })
    .filter((s) => s.interviewId)
    .sort(
      (a, b) =>
        (b.date ? new Date(b.date).getTime() : 0) -
        (a.date ? new Date(a.date).getTime() : 0),
    );
}

const TYPE_FILTERS = ['All', 'Technical', 'Behavioral', 'PM', 'General'];

export function HistoryPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await getTrainingPlans();
        const plans = res.data?.data ?? res.data ?? [];
        setSessions(mapPlansToSessions(Array.isArray(plans) ? plans : []));
      } catch {
        /* show empty state */
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  const filteredSessions =
    activeFilter === 'All'
      ? sessions
      : sessions.filter((s) =>
          s.type.toLowerCase().includes(activeFilter.toLowerCase()),
        );

  return (
    <DashboardLayout headerTitle="Interview History">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-wrap">
            <h2 className="text-lg font-semibold text-[hsl(222,22%,15%)]">Recent Sessions</h2>
            <div className="flex items-center gap-2 text-sm text-[hsl(222,12%,50%)]">
              {TYPE_FILTERS.map((f) => (
                <span
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-3 py-1 rounded-full cursor-pointer transition-colors ${
                    activeFilter === f
                      ? 'bg-white border border-[hsl(220,16%,90%)] shadow-sm text-[hsl(221,91%,60%)]'
                      : 'hover:bg-[hsl(220,18%,96%)]'
                  }`}
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
          <Button variant="outline" className="gap-2">
            <Calendar className="w-4 h-4" />
            Filter by Date
          </Button>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-[hsl(220,16%,90%)] p-6 animate-pulse"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-5 w-48 bg-gray-100 rounded" />
                  <div className="h-5 w-20 bg-gray-100 rounded-full" />
                </div>
                <div className="flex gap-4">
                  <div className="h-4 w-32 bg-gray-100 rounded" />
                  <div className="h-4 w-24 bg-gray-100 rounded" />
                  <div className="h-4 w-20 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredSessions.length === 0 && (
          <div className="text-center py-20 bg-white rounded-xl border border-[hsl(220,16%,90%)]">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart2 className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-base font-semibold text-[hsl(222,22%,15%)] mb-2">
              {activeFilter === 'All' ? 'No sessions yet' : `No ${activeFilter} sessions`}
            </h3>
            <p className="text-sm text-[hsl(222,12%,50%)] mb-6">
              {activeFilter === 'All'
                ? 'Complete a mock interview to see your history here.'
                : 'Try a different filter or start a new session.'}
            </p>
            <Button
              onClick={() => navigate('/dashboard/mock-interview')}
              className="bg-[hsl(221,91%,60%)] hover:bg-[hsl(221,91%,50%)] text-white"
            >
              Start Mock Interview
            </Button>
          </div>
        )}

        {/* Session list */}
        {!loading && filteredSessions.length > 0 && (
          <div className="grid grid-cols-1 gap-4">
            {filteredSessions.map((session, i) => (
              <motion.div
                key={session.interviewId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                className="bg-white rounded-xl border border-[hsl(220,16%,90%)] p-6 hover:shadow-md transition-all group"
              >
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-[hsl(222,22%,15%)]">
                        {session.title}
                      </h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          session.type === 'Technical'
                            ? 'bg-blue-100 text-blue-700'
                            : session.type === 'Behavioral'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-cyan-100 text-cyan-700'
                        }`}
                      >
                        {session.type}
                      </span>
                      {session.status === 'Completed' ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-[hsl(222,12%,50%)] mb-3">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        {session.date ? formatDate(session.date) : '--'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        {session.duration}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <BarChart2 className="w-4 h-4" />
                        Score:{' '}
                        <span
                          className={
                            session.score >= 80
                              ? 'text-green-600 font-semibold'
                              : session.score >= 60
                              ? 'text-yellow-600 font-semibold'
                              : 'text-red-600 font-semibold'
                          }
                        >
                          {session.score}
                        </span>
                      </span>
                    </div>
                    <p className="text-sm text-[hsl(222,12%,50%)]">{session.company}</p>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-center">
                    <Button
                      onClick={() =>
                        navigate(`/evaluation?interviewId=${session.interviewId}`)
                      }
                      variant="ghost"
                      size="sm"
                      className="text-[hsl(221,91%,60%)] hover:bg-[hsl(221,91%,60%)]/10"
                    >
                      View Report
                    </Button>
                    <Button variant="ghost" size="icon" className="text-gray-400">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
