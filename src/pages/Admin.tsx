import { useState } from 'react';
import { Search, ChevronDown, LogOut, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card } from '@/components/ui/card';
import { UsersList } from '@/components/admin/UsersList';
import { UserDetailPanel } from '@/components/admin/UserDetailPanel';
import { mockAdminUsers, AdminUser } from '@/data/adminMockData';
import { useNavigate } from 'react-router-dom';

export default function Admin() {
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const navigate = useNavigate();

  const filteredUsers = globalSearch
    ? mockAdminUsers.filter(
        (user) =>
          user.name.toLowerCase().includes(globalSearch.toLowerCase()) ||
          user.email.toLowerCase().includes(globalSearch.toLowerCase()) ||
          user.id.toLowerCase().includes(globalSearch.toLowerCase())
      )
    : mockAdminUsers;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navigation */}
      <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between sticky top-0 z-50">
        {/* Left: Logo & Title */}
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

        {/* Center: Global Search */}
        <div className="flex-1 max-w-md mx-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, user ID..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Right: Admin Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>AD</AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline">Admin</span>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left: Users List */}
        <div className="w-full lg:w-[40%] border-r border-border bg-card">
          <Card className="h-full rounded-none border-0">
            <UsersList
              users={filteredUsers}
              selectedUserId={selectedUser?.id || null}
              onSelectUser={setSelectedUser}
            />
          </Card>
        </div>

        {/* Right: User Detail Panel */}
        <div className="flex-1 bg-background">
          <UserDetailPanel user={selectedUser} />
        </div>
      </div>
    </div>
  );
}
