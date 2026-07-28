import { useState, useCallback } from 'react';

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
      <Card className="rounded-xl border">
        <UsersList
          selectedUserId={selectedUser?.id ?? null}
          onSelectUser={handleSelectUser}
          refreshTrigger={refreshTrigger}
        />
      </Card>

      {/* User detail opens as a modal */}
      <UserDetailPanel
        user={selectedUser}
        open={!!selectedUser}
        onOpenChange={(open) => {
          if (!open) setSelectedUser(null);
        }}
        onUserUpdated={handleUserUpdated}
      />
    </DashboardLayout>
  );
}
