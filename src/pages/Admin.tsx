import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import {
  Search,
  ChevronDown,
  LogOut,
  Settings,
  Loader2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UserDetailPanel } from '@/components/admin/UserDetailPanel';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { adminService } from '@/services';
import { toast } from 'sonner';

export default function Admin() {
  // State
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageMeta, setPageMeta] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({
    keyword: '',
    status: '',
    roleType: '',
  });

  const debounceRef = useRef(null);
  const navigate = useNavigate();
  const { logout, user: currentUser } = useAuth();

  // Fetch users on mount and when filters/page change
  useEffect(() => {
    fetchUsers();
  }, [currentPage, filters.status, filters.roleType]);

  // Debounced search for keyword
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (currentPage !== 0) {
        setCurrentPage(0);
      } else {
        fetchUsers();
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [filters.keyword]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const params = { page: currentPage };
      if (filters.keyword) params.keyword = filters.keyword;
      if (filters.status) params.status = filters.status;
      if (filters.roleType) params.roleType = filters.roleType;

      const response = await adminService.searchUsers(params);
      const data = response.data.data;

      const mappedUsers = data.content.map((user) => ({
        ...user,
        roles: user.roles || [user.role] || [],
      }));

      setUsers(mappedUsers);
      setPageMeta(data.pageMeta);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchInput(value);
    setFilters((prev) => ({ ...prev, keyword: value }));
  };

  const handleStatusChange = (value) => {
    const statusMap = {
      all: '',
      Active: 'ACTIVE',
      Inactive: 'INACTIVE',
      Banned: 'BANNED',
      Trial: 'TRIAL',
    };
    setFilters((prev) => ({ ...prev, status: statusMap[value] || '' }));
    setCurrentPage(0);
  };

  const handleRoleChange = (value) => {
    const roleMap = {
      all: '',
      Candidate: 'CANDIDATE',
      Admin: 'ADMIN',
    };
    setFilters((prev) => ({ ...prev, roleType: roleMap[value] || '' }));
    setCurrentPage(0);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 0 && newPage < (pageMeta?.totalPages || 1)) {
      setCurrentPage(newPage);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/auth');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Helper functions
  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
      case 'Active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'TRIAL':
      case 'Trial':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'INACTIVE':
      case 'Inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'BANNED':
      case 'Banned':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'CANDIDATE':
      case 'Candidate':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'ADMIN':
      case 'Admin':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  // Pagination helpers
  const totalPages = pageMeta?.totalPages || 1;
  const totalElements = pageMeta?.totalElements || 0;
  const pageSize = pageMeta?.pageSize || 20;
  const isFirstPage = pageMeta?.first ?? currentPage === 0;
  const isLastPage = pageMeta?.last ?? currentPage >= totalPages - 1;
  const startItem = totalElements > 0 ? currentPage * pageSize + 1 : 0;
  const endItem = Math.min((currentPage + 1) * pageSize, totalElements);

  // Get display value for selects
  const getStatusDisplayValue = () => {
    const map = { ACTIVE: 'Active', INACTIVE: 'Inactive', BANNED: 'Banned', TRIAL: 'Trial' };
    return map[filters.status] || 'all';
  };

  const getRoleDisplayValue = () => {
    const map = { CANDIDATE: 'Candidate', ADMIN: 'Admin' };
    return map[filters.roleType] || 'all';
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
        <div className="w-full lg:w-[40%] border-r border-border bg-card">
          <Card className="h-full rounded-none border-0">
            <div className="flex flex-col h-full">
              {/* Filters */}
              <div className="p-4 border-b border-border space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or user ID"
                    value={searchInput}
                    onChange={handleSearchChange}
                    className="pl-9"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Select value={getRoleDisplayValue()} onValueChange={handleRoleChange}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="Candidate">Candidate</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={getStatusDisplayValue()} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                      <SelectItem value="Banned">Banned</SelectItem>
                      <SelectItem value="Trial">Trial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Last Active</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No users found matching your filters
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((user) => (
                          <TableRow
                            key={user.id}
                            className={`cursor-pointer transition-colors ${
                              selectedUser?.id === user.id ? 'bg-muted' : 'hover:bg-muted/50'
                            }`}
                            onClick={() => handleSelectUser(user)}
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="text-xs">
                                    {user.name?.split(' ').map((n) => n[0]).join('') || '?'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="font-medium truncate">{user.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {user.email}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {(user.roles || []).slice(0, 2).map((r) => (
                                  <Badge
                                    key={r}
                                    variant="secondary"
                                    className={`text-xs ${getRoleColor(r)}`}
                                  >
                                    {r}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {formatDate(user.lastActiveAt)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={getStatusColor(user.status)}>
                                {user.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>

              {/* Pagination */}
              <div className="p-4 border-t border-border flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {totalElements > 0 ? (
                    <>Showing {startItem}-{endItem} of {totalElements}</>
                  ) : (
                    'No results'
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage + 1} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={isFirstPage || isLoading}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={isLastPage || isLoading}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
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