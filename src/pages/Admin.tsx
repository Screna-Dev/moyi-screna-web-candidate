import { useState, useCallback } from 'react';
import { Button } from '@/components/newDesign/ui/button';
import { Card } from '@/components/newDesign/ui/card';
import { UsersList } from '@/components/admin/UsersList';
import { UserDetailPanel } from '@/components/admin/UserDetailPanel';
import { DashboardLayout } from '@/components/newDesign/dashboard-layout';

export default function Admin() {
  const [selectedUser, setSelectedUser] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSelectUser = useCallback((user) => {
    setSelectedUser((prev) => (prev?.id === user.id ? null : user));
  }, []);

  const handleUserUpdated = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return (
    <DashboardLayout headerTitle="Users & Training">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left: Users List */}
        <div className={`w-full ${selectedUser ? 'lg:w-[40%]' : 'lg:w-full'} transition-all duration-300`}>
          <Card className="rounded-xl border">
            <UsersList
              selectedUserId={selectedUser?.id ?? null}
              onSelectUser={handleSelectUser}
              refreshTrigger={refreshTrigger}
            />
          </Card>
        </div>

        {/* Right: User Detail Panel */}
        {selectedUser && (
          <div className="flex-1">
            <UserDetailPanel user={selectedUser} onUserUpdated={handleUserUpdated} />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
