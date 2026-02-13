import { useState, useCallback } from 'react';
import {
  ChevronDown,
  LogOut,
  Settings,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UsersList } from '@/components/admin/UsersList';
import { UserDetailPanel } from '@/components/admin/UserDetailPanel';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function Admin() {
  const [selectedUser, setSelectedUser] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const navigate = useNavigate();
  const { logout, user: currentUser } = useAuth();

  const handleSelectUser = useCallback((user) => {
    setSelectedUser((prev) => (prev?.id === user.id ? null : user));
  }, []);

  const handleUserUpdated = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/auth');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navigation */}
      <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">S</span>
            </div>
            <span className="font-semibold text-lg hidden sm:inline">Screna AI</span>
          </div>
          <span className="text-muted-foreground hidden md:inline">·</span>
          <h1 className="text-lg font-medium hidden md:inline">Admin · Users & Training</h1>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {currentUser?.name?.split(' ').map((n) => n[0]).join('') || 'AD'}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline">{currentUser?.name || 'Admin'}</span>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left: Users List */}
        <div className={`w-full ${selectedUser ? 'lg:w-[40%] border-r border-border' : 'lg:w-full'} bg-card transition-all duration-300`}>
          <Card className="h-full rounded-none border-0">
            <UsersList
              selectedUserId={selectedUser?.id ?? null}
              onSelectUser={handleSelectUser}
              refreshTrigger={refreshTrigger}
            />
          </Card>
        </div>

        {/* Right: User Detail Panel */}
        {selectedUser && (
          <div className="flex-1 bg-background">
            <UserDetailPanel user={selectedUser} onUserUpdated={handleUserUpdated} />
          </div>
        )}
      </div>
    </div>
  );
}
