import { useState } from 'react';
import { Navbar } from '@/components/newDesign/home/navbar';
import { Footer } from '@/components/newDesign/home/footer';
import { 
  Bell, 
  FileText, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  Search, 
  Filter, 
  MoreHorizontal,
  Trash2,
  Check,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/newDesign/ui/button';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';

type NotificationType = 'report' | 'system' | 'alert' | 'success';

interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  description: string;
  time: string;
  read: boolean;
  link?: string;
  linkText?: string;
}

const initialNotifications: Notification[] = [
  {
    id: 1,
    type: 'report',
    title: 'Interview Report Ready',
    description: 'Your AI mock interview for "Senior Frontend Engineer" has been processed. We have analyzed your responses and generated a detailed feedback report covering technical accuracy, communication style, and areas for improvement.',
    time: '2 hours ago',
    read: false,
    link: '/evaluation',
    linkText: 'View Report'
  },
  {
    id: 2,
    type: 'success',
    title: 'Experience Submitted Successfully',
    description: 'Thank you for contributing to the community! Your interview experience for "Google - System Design" has been published and is now helping other candidates prepare.',
    time: '5 hours ago',
    read: false,
    link: '/question/1', // Placeholder link
    linkText: 'View Contribution'
  },
  {
    id: 3,
    type: 'system',
    title: 'New Feature: AI Resume Review',
    description: 'We just launched a new tool to help you optimize your resume for ATS. Upload your resume now to get instant feedback and improvement suggestions.',
    time: '1 day ago',
    read: true,
    link: '/dashboard',
    linkText: 'Try it out'
  },
  {
    id: 4,
    type: 'alert',
    title: 'Subscription Update',
    description: 'Your free trial is ending in 3 days. Upgrade to Pro to keep access to unlimited AI mock interviews and detailed performance analytics.',
    time: '2 days ago',
    read: true,
    link: '/pricing',
    linkText: 'Upgrade Plan'
  },
  {
    id: 5,
    type: 'system',
    title: 'Welcome to Screna AI',
    description: 'Welcome aboard! We\'re excited to help you ace your next tech interview. Start by browsing our question bank or jumping straight into a mock interview.',
    time: '3 days ago',
    read: true,
    link: '/question-bank',
    linkText: 'Browse Questions'
  }
];

export function MessageCenterPage() {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const unreadCount = notifications.filter(n => !n.read).length;
  
  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    return true;
  });

  const markAsRead = (id: number) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: number) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'report':
        return <FileText className="w-5 h-5 text-blue-600" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'alert':
        return <AlertCircle className="w-5 h-5 text-amber-600" />;
      case 'system':
      default:
        return <Sparkles className="w-5 h-5 text-purple-600" />;
    }
  };

  const getIconBg = (type: NotificationType) => {
    switch (type) {
      case 'report':
        return 'bg-blue-100';
      case 'success':
        return 'bg-green-100';
      case 'alert':
        return 'bg-amber-100';
      case 'system':
      default:
        return 'bg-purple-100';
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] font-sans text-slate-900 flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-12 px-6 max-w-[1000px] mx-auto w-full">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              Inbox
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-white">
                  {unreadCount} new
                </span>
              )}
            </h1>
            <p className="text-slate-500 mt-1">Updates on your interviews, reports, and account activity.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="bg-white border border-slate-200 rounded-lg p-1 flex items-center">
              <button 
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === 'all' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                All
              </button>
              <button 
                onClick={() => setFilter('unread')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === 'unread' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Unread
              </button>
            </div>
            {unreadCount > 0 && (
              <Button 
                variant="outline" 
                onClick={markAllAsRead}
                className="text-slate-600 hover:text-blue-600 border-slate-200"
              >
                <Check className="w-4 h-4 mr-2" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
          {filteredNotifications.length > 0 ? (
            <div className="divide-y divide-slate-100">
              <AnimatePresence initial={false}>
                {filteredNotifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`group relative p-5 transition-colors ${notification.read ? 'bg-white hover:bg-slate-50' : 'bg-blue-50/40 hover:bg-blue-50/60'}`}
                  >
                    <div className="flex gap-4">
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-1 ${getIconBg(notification.type)}`}>
                        {getIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-1">
                          <h3 className={`text-sm font-semibold ${notification.read ? 'text-slate-900' : 'text-slate-900'}`}>
                            {notification.title}
                            {!notification.read && (
                              <span className="ml-2 w-2 h-2 inline-block rounded-full bg-blue-600 align-middle"></span>
                            )}
                          </h3>
                          <span className="text-xs text-slate-400 whitespace-nowrap flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {notification.time}
                          </span>
                        </div>
                        
                        <p className={`text-sm leading-relaxed mb-3 ${notification.read ? 'text-slate-500' : 'text-slate-700'}`}>
                          {notification.description}
                        </p>

                        <div className="flex items-center gap-3">
                          {notification.link && (
                            <Link to={notification.link}>
                              <Button 
                                size="sm" 
                                variant={notification.read ? "outline" : "default"}
                                className={`h-8 text-xs ${!notification.read ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'text-slate-600'}`}
                                onClick={() => markAsRead(notification.id)}
                              >
                                {notification.linkText || 'View Details'}
                                <ChevronRight className="w-3 h-3 ml-1" />
                              </Button>
                            </Link>
                          )}
                          {!notification.read && (
                            <button 
                              onClick={() => markAsRead(notification.id)}
                              className="text-xs text-slate-500 hover:text-blue-600 font-medium px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                            >
                              Mark as read
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col items-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => deleteNotification(notification.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete notification"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {filter === 'unread' ? 'No unread messages' : 'No messages yet'}
              </h3>
              <p className="text-slate-500 max-w-sm">
                {filter === 'unread' 
                  ? 'You\'re all caught up! Check the "All" tab to see past notifications.' 
                  : 'We\'ll notify you here when your reports are ready or when there are updates to your account.'}
              </p>
              {filter === 'unread' && (
                <Button variant="outline" className="mt-6" onClick={() => setFilter('all')}>
                  View all messages
                </Button>
              )}
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
