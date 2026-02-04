import { useState, useEffect, useCallback } from 'react';
import { Clock, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { getAuditLogs } from '@/services/adminService';

interface AuditLogEntry {
  id: string;
  adminId: string;
  action: string;
  targetUserId: string;
  requestPath: string;
  httpMethod: string;
  statusCode: number;
  payload: string;
  createdAt: string;
}

interface PageMeta {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [pageMeta, setPageMeta] = useState<PageMeta | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch audit logs from API
  const fetchLogs = useCallback(async (page = 0) => {
    setIsLoading(true);
    try {
      const response = await getAuditLogs({ page, size: 20 });
      const data = response.data?.data || response.data;

      if (data?.content) {
        setLogs(data.content);
        setPageMeta(data.pageMeta);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchLogs(0);
  }, [fetchLogs]);

  // Format audit log action for display
  const formatAuditAction = (entry: AuditLogEntry) => {
    const path = entry.requestPath || '';

    if (path.includes('/ban')) {
      return 'User Ban/Unban';
    } else if (path.includes('/billing/plan')) {
      return 'Plan Changed';
    } else if (path.includes('/reset-password')) {
      return 'Password Reset';
    } else if (path.includes('/deactivate')) {
      return 'User Deactivated';
    } else if (path.includes('/overview')) {
      return 'View User';
    } else if (path.includes('/redeem-codes')) {
      return 'Redeem Code Action';
    }
    return path.split('/').pop() || 'Action';
  };

  // Get status color for audit log
  const getStatusColor = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) {
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    } else if (statusCode >= 400) {
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    }
    return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  };

  // Get method color
  const getMethodColor = (method: string) => {
    switch (method?.toUpperCase()) {
      case 'GET':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'POST':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'PUT':
      case 'PATCH':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      case 'DELETE':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm:ss');
    } catch {
      return dateString;
    }
  };

  // Calculate stats
  const totalLogs = pageMeta?.totalElements || logs.length;
  const successLogs = logs.filter((l) => l.statusCode >= 200 && l.statusCode < 300).length;
  const errorLogs = logs.filter((l) => l.statusCode >= 400).length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main Content */}
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Clock className="w-6 h-6 text-primary" />
              Audit Logs
            </h2>
            <p className="text-muted-foreground mt-1">
              View all admin actions and system events
            </p>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchLogs(currentPage)}
            disabled={isLoading}
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalLogs}</p>
                  <p className="text-sm text-muted-foreground">Total Logs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                  <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{successLogs}</p>
                  <p className="text-sm text-muted-foreground">Successful (this page)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900">
                  <Clock className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{errorLogs}</p>
                  <p className="text-sm text-muted-foreground">Errors (this page)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Audit Logs</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Clock className="w-12 h-12 mb-4 opacity-50" />
                <p>No audit logs found</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Path</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Admin ID</TableHead>
                      <TableHead>Target User</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">
                          {formatAuditAction(log)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={getMethodColor(log.httpMethod)}>
                            {log.httpMethod}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground max-w-[200px] truncate">
                          {log.requestPath}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={getStatusColor(log.statusCode)}>
                            {log.statusCode}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {log.adminId?.slice(0, 8)}...
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {log.targetUserId ? `${log.targetUserId.slice(0, 8)}...` : '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(log.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {pageMeta && pageMeta.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Showing {logs.length} of {pageMeta.totalElements} logs
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchLogs(currentPage - 1)}
                        disabled={pageMeta.first || isLoading}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {currentPage + 1} of {pageMeta.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchLogs(currentPage + 1)}
                        disabled={pageMeta.last || isLoading}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
