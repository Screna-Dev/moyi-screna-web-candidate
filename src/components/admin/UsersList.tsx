import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Search, ChevronDown, ChevronUp, ArrowUpDown, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { adminService } from '@/services';
import { toast } from 'sonner';

interface UsersListProps {
  selectedUserId: string | null;
  onSelectUser: (user: any) => void;
  refreshTrigger?: number;
}

export function UsersList({ selectedUserId, onSelectUser, refreshTrigger }: UsersListProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageMeta, setPageMeta] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({
    keyword: '',
    status: '',
    roleType: '',
  });
  const [sortBy, setSortBy] = useState('lastActiveAt');
  const [sortOrder, setSortOrder] = useState('desc');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch users on mount and when filters/page/sort change
  useEffect(() => {
    fetchUsers();
  }, [currentPage, filters.status, filters.roleType, sortBy, sortOrder, refreshTrigger]);

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
      const params: any = { page: currentPage, sortBy, sortOrder };
      if (filters.keyword) params.keyword = filters.keyword;
      if (filters.status) params.status = filters.status;
      if (filters.roleType) params.roleType = filters.roleType;

      const response = await adminService.searchUsers(params);
      const data = response.data.data;

      const mappedUsers = data.content.map((user: any) => ({
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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    setFilters((prev) => ({ ...prev, keyword: value }));
  };

  const handleStatusChange = (value: string) => {
    const statusMap: Record<string, string> = {
      all: '',
      Active: 'ACTIVE',
      Inactive: 'INACTIVE',
      Banned: 'BANNED',
      Trial: 'TRIAL',
    };
    setFilters((prev) => ({ ...prev, status: statusMap[value] || '' }));
    setCurrentPage(0);
  };

  const handleRoleChange = (value: string) => {
    const roleMap: Record<string, string> = {
      all: '',
      Candidate: 'CANDIDATE',
      Admin: 'ADMIN',
    };
    setFilters((prev) => ({ ...prev, roleType: roleMap[value] || '' }));
    setCurrentPage(0);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < (pageMeta?.totalPages || 1)) {
      setCurrentPage(newPage);
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(0);
  };

  const renderSortIcon = (field: string) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />;
    }
    return sortOrder === 'asc' ? (
      <ChevronUp className="w-3 h-3 ml-1" />
    ) : (
      <ChevronDown className="w-3 h-3 ml-1" />
    );
  };

  // Helper functions
  const getStatusColor = (status: string) => {
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

  const getRoleColor = (role: string) => {
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

  const formatDate = (dateString: string) => {
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
    const map: Record<string, string> = { ACTIVE: 'Active', INACTIVE: 'Inactive', BANNED: 'Banned', TRIAL: 'Trial' };
    return map[filters.status] || 'all';
  };

  const getRoleDisplayValue = () => {
    const map: Record<string, string> = { CANDIDATE: 'Candidate', ADMIN: 'Admin' };
    return map[filters.roleType] || 'all';
  };

  return (
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
                <TableHead
                  className="cursor-pointer select-none hover:text-foreground"
                  onClick={() => handleSort('planName')}
                >
                  <div className="flex items-center">
                    Plan
                    {renderSortIcon('planName')}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:text-foreground"
                  onClick={() => handleSort('creditBalance')}
                >
                  <div className="flex items-center">
                    Credits
                    {renderSortIcon('creditBalance')}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:text-foreground"
                  onClick={() => handleSort('lastActiveAt')}
                >
                  <div className="flex items-center">
                    Last Active
                    {renderSortIcon('lastActiveAt')}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:text-foreground"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center">
                    Created
                    {renderSortIcon('createdAt')}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No users found matching your filters
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow
                    key={user.id}
                    className={`cursor-pointer transition-colors ${
                      selectedUserId === user.id ? 'bg-muted' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => onSelectUser(user)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {user.name?.split(' ').map((n: string) => n[0]).join('') || '?'}
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
                        {(user.roles || []).slice(0, 2).map((r: string) => (
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
                      <span className="text-sm">
                        {user.planName || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-medium">{(user.creditBalance ?? 0) + (user.recurringCreditBalance ?? 0)}</span>
                        <div className="text-xs text-muted-foreground">
                          <div>{user.creditBalance ?? 0} perm</div>
                          <div>{user.recurringCreditBalance ?? 0} rec</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(user.lastActiveAt)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </span>
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
  );
}
