import { useState } from 'react';
import { format, addDays } from 'date-fns';
import { Search, Filter, ChevronDown, ChevronUp } from 'lucide-react';
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
import type { AdminUser } from '@/data/adminMockData'

interface UsersListProps {
  users: AdminUser[];
  selectedUserId: string | null;
  onSelectUser: (user: AdminUser) => void;
}

type SortField = 'signupDate' | 'readinessScore' | 'credits' | 'totalRevenue';
type SortDirection = 'asc' | 'desc';

export function UsersList({ users, selectedUserId, onSelectUser }: UsersListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('signupDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasTrainingPlan, setHasTrainingPlan] = useState(false);
  const [hasUpcomingSessions, setHasUpcomingSessions] = useState(false);
  const rowsPerPage = 10;

  const filteredUsers = users?.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'all' || user.roles.includes(roleFilter as any);
    const matchesPlan = planFilter === 'all' || user.plan.name === planFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    const matchesTrainingPlan = !hasTrainingPlan || user.trainingPlan !== undefined;
    const matchesUpcomingSessions = !hasUpcomingSessions || user.mentorSessions.upcoming.length > 0;

    return matchesSearch && matchesRole && matchesPlan && matchesStatus && matchesTrainingPlan && matchesUpcomingSessions;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'signupDate':
        comparison = new Date(a.signupDate).getTime() - new Date(b.signupDate).getTime();
        break;
      case 'readinessScore':
        comparison = a.metrics.readinessScore - b.metrics.readinessScore;
        break;
      case 'credits':
        comparison = a.credits.remaining - b.credits.remaining;
        break;
      case 'totalRevenue':
        comparison = a.totalRevenue - b.totalRevenue;
        break;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const paginatedUsers = sortedUsers.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const totalPages = Math.ceil(sortedUsers.length / rowsPerPage);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4 inline" />
    ) : (
      <ChevronDown className="w-4 h-4 inline" />
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Trial':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'Banned':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'CANDIDATE':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'MENTOR':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      case 'Recruiter':
        return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200';
      case 'ADMIN':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="p-4 border-b border-border space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or user ID"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="Candidate">Candidate</SelectItem>
              <SelectItem value="Mentor">Mentor</SelectItem>
              <SelectItem value="Recruiter">Recruiter</SelectItem>
              <SelectItem value="Admin">Admin</SelectItem>
            </SelectContent>
          </Select>

          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plans</SelectItem>
              <SelectItem value="Free">Free</SelectItem>
              <SelectItem value="Starter">Starter</SelectItem>
              <SelectItem value="Pro">Pro</SelectItem>
              <SelectItem value="Enterprise">Enterprise</SelectItem>
              <SelectItem value="Custom">Custom</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
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

        <div className="flex flex-wrap gap-2">
          <Button
            variant={hasTrainingPlan ? 'default' : 'outline'}
            size="sm"
            onClick={() => setHasTrainingPlan(!hasTrainingPlan)}
          >
            Has training plan
          </Button>
          <Button
            variant={hasUpcomingSessions ? 'default' : 'outline'}
            size="sm"
            onClick={() => setHasUpcomingSessions(!hasUpcomingSessions)}
          >
            Upcoming sessions
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              {/* <TableHead>Plan</TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('credits')}
              >
                Credits <SortIcon field="credits" />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('readinessScore')}
              >
                Score <SortIcon field="readinessScore" />
              </TableHead> */}
              <TableHead>Last Active</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No users found matching your filters
                </TableCell>
              </TableRow>
            ) : (
              paginatedUsers.map((user) => (
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
                          {user.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.slice(0, 2).map((r) => (
                        <Badge key={r} variant="secondary" className={`text-xs ${getRoleColor(r)}`}>
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  {/* <TableCell>
                    <span className="text-sm">{user.plan.name}</span>
                  </TableCell> 
                  <TableCell>
                    <span className="text-sm font-medium">{user.credits.remaining}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">{user.metrics.readinessScore}</span>
                  </TableCell> */}
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{ format(new Date(user.lastActiveAt), 'MMM d, yyyy')}</span>
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
      </div>

      {/* Pagination */}
      <div className="p-4 border-t border-border flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Showing {(currentPage - 1) * rowsPerPage + 1}-
          {Math.min(currentPage * rowsPerPage, sortedUsers.length)} of {sortedUsers.length}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
