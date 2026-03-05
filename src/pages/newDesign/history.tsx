import { motion } from 'motion/react';
import { Calendar, Clock, BarChart2, Star, CheckCircle, XCircle, MoreVertical } from 'lucide-react';
import { Button } from '@/components/newDesign/ui/button';
import { DashboardLayout } from '@/components/newDesign/dashboard-layout';

const history = [
  {
    id: 1,
    title: 'System Design Interview',
    company: 'FAANG',
    score: 82,
    duration: '28 min',
    date: 'Feb 20, 2024',
    type: 'Technical',
    status: 'Completed',
    feedback: 'Strong problem decomposition, improve on scalability tradeoffs.',
  },
  {
    id: 2,
    title: 'Behavioral — Leadership',
    company: 'Mid-size Tech',
    score: 91,
    duration: '15 min',
    date: 'Feb 19, 2024',
    type: 'Behavioral',
    status: 'Completed',
    feedback: 'Excellent STAR method application. Very clear examples.',
  },
  {
    id: 3,
    title: 'Product Sense',
    company: 'Startup',
    score: 74,
    duration: '22 min',
    date: 'Feb 15, 2024',
    type: 'PM',
    status: 'Completed',
    feedback: 'Good user empathy, but solution lacked business viability analysis.',
  },
  {
    id: 4,
    title: 'Coding: Arrays & Strings',
    company: 'Generic Corp',
    score: 65,
    duration: '45 min',
    date: 'Feb 10, 2024',
    type: 'Coding',
    status: 'Incomplete',
    feedback: 'Ran out of time on edge cases. Algorithm was suboptimal (O(n^2)).',
  },
];

export function HistoryPage() {
  return (
    <DashboardLayout headerTitle="Interview History">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-[hsl(222,22%,15%)]">Recent Sessions</h2>
            <div className="flex items-center gap-2 text-sm text-[hsl(222,12%,50%)]">
              <span className="bg-white px-3 py-1 rounded-full border border-[hsl(220,16%,90%)] shadow-sm cursor-pointer hover:border-[hsl(221,91%,60%)] transition-colors">All</span>
              <span className="px-3 py-1 rounded-full cursor-pointer hover:bg-[hsl(220,18%,96%)] transition-colors">Technical</span>
              <span className="px-3 py-1 rounded-full cursor-pointer hover:bg-[hsl(220,18%,96%)] transition-colors">Behavioral</span>
            </div>
          </div>
          <Button variant="outline" className="gap-2">
            <Calendar className="w-4 h-4" />
            Filter by Date
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {history.map((session, i) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="bg-white rounded-xl border border-[hsl(220,16%,90%)] p-6 hover:shadow-md transition-all group"
            >
              <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-[hsl(222,22%,15%)]">{session.title}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      session.type === 'Technical' ? 'bg-blue-100 text-blue-700' :
                      session.type === 'Behavioral' ? 'bg-green-100 text-green-700' :
                      'bg-cyan-100 text-cyan-700'
                    }`}>
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
                      {session.date}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {session.duration}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <BarChart2 className="w-4 h-4" />
                      Score: <span className={session.score >= 80 ? 'text-green-600 font-semibold' : session.score >= 60 ? 'text-yellow-600 font-semibold' : 'text-red-600 font-semibold'}>{session.score}</span>
                    </span>
                  </div>
                  <p className="text-sm text-[hsl(222,12%,40%)] italic bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 inline-block max-w-2xl">
                    "{session.feedback}"
                  </p>
                </div>
                
                <div className="flex items-center gap-3 self-end md:self-center">
                  <Button variant="ghost" size="sm" className="text-[hsl(221,91%,60%)] hover:bg-[hsl(221,91%,60%)]/10">
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
      </div>
    </DashboardLayout>
  );
}
