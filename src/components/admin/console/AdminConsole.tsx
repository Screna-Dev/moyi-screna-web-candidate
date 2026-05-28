import { useState, useCallback } from 'react';
import { Toaster } from 'sonner';
import { Sidebar, type Page } from './Sidebar';
import { Header } from './Header';
import { CommandCenter } from './pages/CommandCenter';
import { ResumeApplications } from './pages/ResumeApplications';
import { MentorshipManagement } from './pages/MentorshipManagement';
import { FinanceLedger } from './pages/FinanceLedger';
import { RolesPermissions } from './pages/RolesPermissions';
import { SystemLogs } from './pages/SystemLogs';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { OpsManager } from './pages/OpsManager';
import { PGS } from './pages/PGS';
import { Card } from '@/components/newDesign/ui/card';
import { UsersList } from '@/components/admin/UsersList';
import { UserDetailPanel } from '@/components/admin/UserDetailPanel';
import { RedeemCodesPanel } from '@/pages/AdminRedeemCodes';
import { AuditLogsPanel } from '@/pages/AdminAuditLogs';

// Real "Users & Training" admin tab — preserves the existing API-backed functionality.
function UsersAdminTab() {
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSelectUser = useCallback((user: any) => {
    setSelectedUser((prev: any) => (prev?.id === user.id ? null : user));
  }, []);

  const handleUserUpdated = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return (
    <div className="p-6">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className={`w-full ${selectedUser ? 'lg:w-[40%]' : 'lg:w-full'} transition-all duration-300`}>
          <Card className="rounded-xl border">
            <UsersList
              selectedUserId={selectedUser?.id ?? null}
              onSelectUser={handleSelectUser}
              refreshTrigger={refreshTrigger}
            />
          </Card>
        </div>
        {selectedUser && (
          <div className="flex-1">
            <UserDetailPanel user={selectedUser} onUserUpdated={handleUserUpdated} />
          </div>
        )}
      </div>
    </div>
  );
}

function PageContent({ page }: { page: Page }) {
  switch (page) {
    case 'command-center':      return <CommandCenter />;
    case 'resume-applications': return <ResumeApplications />;
    case 'mentorship':          return <MentorshipManagement />;
    case 'finance':             return <FinanceLedger />;
    case 'roles-permissions':   return <RolesPermissions />;
    case 'system-logs':         return <SystemLogs />;
    case 'ops-manager':         return <OpsManager />;
    case 'pgs':                 return <PGS />;
    case 'users':               return <UsersAdminTab />;
    case 'redeem-codes':        return <div className="p-6"><RedeemCodesPanel /></div>;
    case 'audit-logs':          return <div className="p-6"><AuditLogsPanel /></div>;
    case 'settings':            return <PlaceholderPage title="Settings" description="Platform settings — coming soon." />;
    default:                    return <CommandCenter />;
  }
}

export default function AdminConsole() {
  const [page, setPage] = useState<Page>('command-center');

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        background: 'hsl(220, 20%, 98%)',
      }}
    >
      <Toaster position="bottom-right" />
      <Sidebar currentPage={page} onPageChange={setPage} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <Header currentPage={page} />

        <main
          style={{
            flex: 1,
            overflow:
              page === 'resume-applications' || page === 'mentorship' || page === 'pgs'
                ? 'hidden'
                : 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <PageContent page={page} />
        </main>
      </div>
    </div>
  );
}
