import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  User,
  Shield,
  Bell,
  CreditCard,
  Globe,
  LogOut,
  Mail,
  Lock,
  Trash2,
  Check
} from 'lucide-react';
import { DashboardLayout } from '../../components/newDesign/dashboard-layout';
import { Button } from '../../components/newDesign/ui/button';
import { Input } from '../../components/newDesign/ui/input';
import { Label } from '../../components/newDesign/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { getPersonalInfo, savePersonalInfo } from '@/services/ProfileServices';
import { BillingTab } from './billing';
import { PageHead } from '@/components/newDesign/page-head';
import { T, primaryButtonStyle, cardStyle, panelTitleStyle } from '@/lib/design-tokens';

// Settings Tabs
const SETTINGS_TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'preferences', label: 'Preferences', icon: Globe },
];

const VALID_TAB_IDS = new Set(SETTINGS_TABS.map(t => t.id));

export function SettingsPage({ defaultTab }: { defaultTab?: string } = {}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  // Initial tab — prefer explicit prop, then URL (?tab=), then 'profile'.
  const urlTab = searchParams.get('tab');
  const initialTab =
    (defaultTab && VALID_TAB_IDS.has(defaultTab) ? defaultTab : null) ??
    (urlTab && VALID_TAB_IDS.has(urlTab) ? urlTab : null) ??
    'profile';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isLoading, setIsLoading] = useState(false);

  // Keep URL ?tab= in sync with active tab.
  useEffect(() => {
    if (searchParams.get('tab') !== activeTab) {
      setSearchParams({ tab: activeTab }, { replace: true });
    }
  }, [activeTab, searchParams, setSearchParams]);

  // Profile Form State
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    timezone: 'Pacific Time (US & Canada)',
    avatarUrl: '',
    country: '',
  });

  useEffect(() => {
    getPersonalInfo()
      .then((res) => {
        const info = res.data?.data ?? res.data;
        if (!info) return;
        const [first, ...rest] = (info.name || '').trim().split(' ');
        setProfileData((prev) => ({
          ...prev,
          firstName: first || '',
          lastName: rest.join(' ') || '',
          email: info.email || '',
          timezone: info.timezone || prev.timezone,
          avatarUrl: info.avatarUrl || '',
          country: info.country || prev.country,
        }));
      })
      .catch(() => {
        // fall back to auth token values
        if (user) {
          const parts = (user.name || '').trim().split(' ');
          setProfileData((prev) => ({
            ...prev,
            firstName: parts[0] || '',
            lastName: parts.slice(1).join(' ') || '',
            email: user.email || '',
            avatarUrl: user.avatar || '',
          }));
        }
      });
  }, []);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const name = [profileData.firstName, profileData.lastName].filter(Boolean).join(' ');
      await savePersonalInfo({ name, timezone: profileData.timezone, country: profileData.country });
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout headerTitle="Settings">
      <PageHead
        title="Settings & Payment"
        subtitle="Manage your profile, security, notifications, billing, and regional preferences."
      />
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">

        {/* Sidebar Navigation */}
        <aside className="lg:col-span-1 space-y-1">
          {SETTINGS_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors w-full text-left ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4.5 h-4.5 ${activeTab === tab.id ? 'text-blue-600' : ''}`} />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Content Area */}
        <main className="lg:col-span-3 space-y-6">

          {/* Profile Settings */}
          {activeTab === 'profile' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div style={cardStyle}>
                <div className="mb-6">
                  <h2 style={{ ...panelTitleStyle, marginBottom: 4 }}>Profile Information</h2>
                  <p className="text-sm" style={{ color: T.textSecondary }}>Update your account's profile information and email address.</p>
                </div>

                {/* Profile header — avatar + name + email */}
                <div
                  className="flex items-center gap-4 p-4 mb-6"
                  style={{
                    background: T.bgSecondary,
                    borderRadius: 12,
                    border: `1px solid ${T.border}`,
                  }}
                >
                  {profileData.avatarUrl ? (
                    <img
                      src={profileData.avatarUrl}
                      alt={[profileData.firstName, profileData.lastName].filter(Boolean).join(' ')}
                      className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600 border-2 border-white shadow-sm shrink-0">
                      {(profileData.firstName[0] || profileData.email[0] || '?').toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-base font-semibold truncate" style={{ color: T.textPrimary }}>
                      {[profileData.firstName, profileData.lastName].filter(Boolean).join(' ') || 'No name set'}
                    </p>
                    <p className="text-sm truncate" style={{ color: T.textSecondary }}>{profileData.email || '—'}</p>
                  </div>
                </div>

                <form onSubmit={handleProfileSave} className="space-y-4 max-w-xl">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First name</Label>
                      <Input
                        id="firstName"
                        value={profileData.firstName}
                        onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last name</Label>
                      <Input
                        id="lastName"
                        value={profileData.lastName}
                        onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        className="pl-9"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={profileData.country}
                      onChange={(e) => setProfileData({ ...profileData, country: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <select
                      id="timezone"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      value={profileData.timezone}
                      onChange={(e) => setProfileData({ ...profileData, timezone: e.target.value })}
                    >
                      <option>Pacific Time (US & Canada)</option>
                      <option>Eastern Time (US & Canada)</option>
                      <option>Greenwich Mean Time (UTC)</option>
                      <option>Central European Time (CET)</option>
                    </select>
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isLoading}
                      style={{ ...primaryButtonStyle, opacity: isLoading ? 0.6 : 1 }}
                      onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.background = T.blue600; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = T.blue500; }}
                    >
                      {isLoading ? 'Saving...' : 'Save changes'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div style={cardStyle}>
                <h2 style={{ ...panelTitleStyle, marginBottom: 4 }}>Password</h2>
                <p className="text-sm mb-6" style={{ color: T.textSecondary }}>Ensure your account is using a long, random password to stay secure.</p>

                <div className="space-y-4 max-w-xl">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current password</Label>
                    <Input id="current-password" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New password</Label>
                    <Input id="new-password" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm new password</Label>
                    <Input id="confirm-password" type="password" />
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      style={primaryButtonStyle}
                      onMouseEnter={(e) => (e.currentTarget.style.background = T.blue600)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = T.blue500)}
                    >
                      Update password
                    </button>
                  </div>
                </div>
              </div>

              <div
                style={{
                  ...cardStyle,
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                }}
              >
                <h2 style={{ ...panelTitleStyle, color: '#B91C1C', marginBottom: 4 }}>Delete Account</h2>
                <p className="text-sm mb-6" style={{ color: '#DC2626' }}>Permanently delete your account and all of your content.</p>
                <div className="flex items-center justify-between">
                   <p className="text-sm italic" style={{ color: '#DC2626' }}>
                      Once you delete your account, there is no going back. Please be certain.
                   </p>
                   <Button variant="destructive" className="bg-red-600 hover:bg-red-700 text-white">
                      Delete account
                   </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Notifications Settings */}
           {activeTab === 'notifications' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
               <div style={cardStyle}>
                 <h2 style={{ ...panelTitleStyle, marginBottom: 16 }}>Email Notifications</h2>
                 <div className="space-y-4">
                    {[
                       { title: 'Communication emails', desc: 'Receive emails about your account activity.' },
                       { title: 'Marketing emails', desc: 'Receive emails about new products, features, and more.' },
                       { title: 'Social emails', desc: 'Receive emails when you get a new follower.' },
                       { title: 'Security emails', desc: 'Receive emails about your account security.' }
                    ].map((item, i) => (
                       <div key={i} className="flex items-start justify-between py-3 border-b border-slate-100 last:border-0">
                          <div>
                             <p className="text-sm font-medium" style={{ color: T.textPrimary }}>{item.title}</p>
                             <p className="text-xs" style={{ color: T.textSecondary }}>{item.desc}</p>
                          </div>
                          <div className="relative inline-flex h-6 w-11 items-center rounded-full cursor-pointer transition-colors" style={{ background: T.blue500 }}>
                             <span className="translate-x-6 inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out" />
                          </div>
                       </div>
                    ))}
                 </div>
               </div>
            </motion.div>
           )}

           {/* Billing */}
           {activeTab === 'billing' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <BillingTab />
            </motion.div>
           )}

           {/* Preferences Settings */}
           {activeTab === 'preferences' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
               <div style={cardStyle}>
                 <h2 style={{ ...panelTitleStyle, marginBottom: 16 }}>Language & Region</h2>
                 <div className="space-y-4 max-w-xl">
                    <div className="space-y-2">
                       <Label>Language</Label>
                       <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                          <option>English (United States)</option>
                          <option>Spanish</option>
                          <option>French</option>
                          <option>German</option>
                          <option>Chinese</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <Label>Date format</Label>
                       <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                          <option>MM/DD/YYYY</option>
                          <option>DD/MM/YYYY</option>
                          <option>YYYY-MM-DD</option>
                       </select>
                    </div>
                    <div className="pt-4">
                       <button
                         type="button"
                         style={primaryButtonStyle}
                         onMouseEnter={(e) => (e.currentTarget.style.background = T.blue600)}
                         onMouseLeave={(e) => (e.currentTarget.style.background = T.blue500)}
                       >
                         Save preferences
                       </button>
                    </div>
                 </div>
               </div>
            </motion.div>
           )}

        </main>
      </div>
    </DashboardLayout>
  );
}
