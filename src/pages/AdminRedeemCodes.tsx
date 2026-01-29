import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, LogOut, Settings, Users, Gift, Plus, Calendar, Coins, Loader2, RefreshCw } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useNavigate, NavLink } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import adminService from '@/services/AdminService';

interface RedeemCode {
  id: string;
  code: string;
  type: string;
  creditAmount: number;
  expiresAt: string;
  isActive: boolean;
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

export default function AdminRedeemCodes() {
  const navigate = useNavigate();
  const [codes, setCodes] = useState<RedeemCode[]>([]);
  const [pageMeta, setPageMeta] = useState<PageMeta | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newCode, setNewCode] = useState({
    code: '',
    type: '',
    customType: '',
    creditAmount: 1,
    expiresAt: '',
  });
  const [useCustomType, setUseCustomType] = useState(false);

  // Fetch redeem codes from API
  const fetchCodes = useCallback(async (page = 0) => {
    setIsLoading(true);
    try {
      const response = await adminService.getRedeemCodes(page);
      const data = response.data?.data || response.data;
      
      if (data?.content) {
        setCodes(data.content);
        setPageMeta(data.pageMeta);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Failed to fetch redeem codes:', error);
      toast.error('Failed to load redeem codes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchCodes(0);
  }, [fetchCodes]);

  const handleCreateCode = async () => {
    const finalType = useCustomType ? newCode.customType.trim() : newCode.type;
    
    // Validate code: NotBlank, min 6, max 16 characters
    if (!newCode.code || newCode.code.trim().length < 6) {
      toast.error('Code must be at least 6 characters');
      return;
    }
    if (newCode.code.trim().length > 16) {
      toast.error('Code must be at most 16 characters');
      return;
    }

    // Validate type: NotBlank, max 36 characters
    if (!finalType) {
      toast.error('Please select or enter a type');
      return;
    }
    if (finalType.length > 36) {
      toast.error('Type must be at most 36 characters');
      return;
    }

    // Validate creditAmount: Min 1, Max 100
    if (newCode.creditAmount < 1 || newCode.creditAmount > 100) {
      toast.error('Credit amount must be between 1 and 100');
      return;
    }
    if (!Number.isInteger(newCode.creditAmount)) {
      toast.error('Credit amount must be a whole number');
      return;
    }

    // Validate expiresAt: NotNull, Future
    if (!newCode.expiresAt) {
      toast.error('Please select an expiration date');
      return;
    }
    const expiresAtDate = new Date(newCode.expiresAt);
    if (expiresAtDate <= new Date()) {
      toast.error('Expiration date must be in the future');
      return;
    }

    setIsCreating(true);
    try {
      const payload = {
        code: newCode.code.toUpperCase(),
        type: finalType,
        creditAmount: newCode.creditAmount,
        expiresAt: new Date(newCode.expiresAt).toISOString(),
      };

      const response = await adminService.createRedeemCode(payload);
      
      if (response.data) {
        toast.success('Redeem code created successfully');
        setNewCode({ code: '', type: '', customType: '', creditAmount: 1, expiresAt: '' });
        setUseCustomType(false);
        setDialogOpen(false);
        // Refresh the list
        await fetchCodes(0);
      }
    } catch (error) {
      console.error('Failed to create redeem code:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create redeem code';
      toast.error(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const toggleCodeStatus = async (id: string, currentStatus: boolean) => {
    setIsUpdating(id);
    try {
      await adminService.updateRedeemCodeStatus(id, !currentStatus);
      
      // Update local state
      setCodes(
        codes.map((code) =>
          code.id === id ? { ...code, isActive: !currentStatus } : code
        )
      );
      toast.success('Code status updated');
    } catch (error) {
      console.error('Failed to update code status:', error);
      toast.error('Failed to update code status');
    } finally {
      setIsUpdating(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    } catch {
      return dateString;
    }
  };

  // Calculate stats
  const totalCodes = pageMeta?.totalElements || codes.length;
  const activeCodes = codes.filter((c) => c.isActive).length;
  const notExpiredCodes = codes.filter((c) => new Date(c.expiresAt) > new Date()).length;

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Main Content */}
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Gift className="w-6 h-6 text-primary" />
              Redeem Codes
            </h2>
            <p className="text-muted-foreground mt-1">
              Manage promotion codes and credit redemptions
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => fetchCodes(currentPage)}
              disabled={isLoading}
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            </Button>
            
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setNewCode({ code: '', type: '', customType: '', creditAmount: 1, expiresAt: '' });
                setUseCustomType(false);
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Code
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create New Redeem Code</DialogTitle>
                  <DialogDescription>
                    Create a new promotion code for users to redeem credits.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="code">Code (6-16 characters)</Label>
                    <Input
                      id="code"
                      placeholder="e.g., PROMO2024"
                      value={newCode.code}
                      onChange={(e) =>
                        setNewCode({ ...newCode, code: e.target.value.toUpperCase() })
                      }
                      maxLength={16}
                      disabled={isCreating}
                    />
                    <p className="text-xs text-muted-foreground">
                      {newCode.code.length}/16 characters (min 6)
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="type">Type (max 36 characters)</Label>
                    <Select
                      value={useCustomType ? 'custom' : newCode.type}
                      onValueChange={(value) => {
                        if (value === 'custom') {
                          setUseCustomType(true);
                          setNewCode({ ...newCode, type: '' });
                        } else {
                          setUseCustomType(false);
                          setNewCode({ ...newCode, type: value, customType: '' });
                        }
                      }}
                      disabled={isCreating}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="signup">Signup</SelectItem>
                        <SelectItem value="promotion">Promotion</SelectItem>
                        <SelectItem value="beta">Beta</SelectItem>
                        <SelectItem value="vip">VIP</SelectItem>
                        <SelectItem value="referral">Referral</SelectItem>
                        <SelectItem value="custom">Custom...</SelectItem>
                      </SelectContent>
                    </Select>
                    {useCustomType && (
                      <div className="mt-2">
                        <Input
                          placeholder="Enter custom type"
                          value={newCode.customType}
                          onChange={(e) =>
                            setNewCode({ ...newCode, customType: e.target.value })
                          }
                          maxLength={36}
                          disabled={isCreating}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {newCode.customType.length}/36 characters
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="creditAmount">Credit Amount (1-100)</Label>
                    <Input
                      id="creditAmount"
                      type="text"
                      inputMode="numeric"
                      placeholder="Enter amount (1-100)"
                      value={newCode.creditAmount === 0 ? '' : newCode.creditAmount.toString()}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow empty input for clearing
                        if (value === '') {
                          setNewCode({ ...newCode, creditAmount: 0 });
                          return;
                        }
                        // Only allow integers
                        if (!/^\d+$/.test(value)) return;
                        const numValue = parseInt(value, 10);
                        // Limit to 1-100 range
                        if (numValue >= 0 && numValue <= 100) {
                          setNewCode({ ...newCode, creditAmount: numValue });
                        }
                      }}
                      onBlur={() => {
                        // Ensure minimum value of 1 on blur
                        if (newCode.creditAmount < 1) {
                          setNewCode({ ...newCode, creditAmount: 1 });
                        }
                      }}
                      disabled={isCreating}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter an integer between 1 and 100
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="expiresAt">Expires At</Label>
                    <Input
                      id="expiresAt"
                      type="datetime-local"
                      value={newCode.expiresAt}
                      onChange={(e) =>
                        setNewCode({ ...newCode, expiresAt: e.target.value })
                      }
                      min={new Date().toISOString().slice(0, 16)}
                      disabled={isCreating}
                    />
                    <p className="text-xs text-muted-foreground">
                      Must be a future date
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setDialogOpen(false);
                      setNewCode({ code: '', type: '', customType: '', creditAmount: 1, expiresAt: '' });
                      setUseCustomType(false);
                    }}
                    disabled={isCreating}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateCode} disabled={isCreating}>
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Code'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Gift className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalCodes}</p>
                  <p className="text-sm text-muted-foreground">Total Codes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent">
                  <Coins className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeCodes}</p>
                  <p className="text-sm text-muted-foreground">Active Codes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary">
                  <Calendar className="w-5 h-5 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{notExpiredCodes}</p>
                  <p className="text-sm text-muted-foreground">Not Expired</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Codes Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Redeem Codes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : codes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Gift className="w-12 h-12 mb-4 opacity-50" />
                <p>No redeem codes found</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setDialogOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create your first code
                </Button>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expires At</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {codes.map((code) => (
                      <TableRow key={code.id}>
                        <TableCell className="font-mono font-medium">
                          {code.code}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {code.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-primary">
                            +{code.creditAmount}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={code.isActive ? 'default' : 'secondary'}>
                            {code.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(code.expiresAt)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(code.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleCodeStatus(code.id, code.isActive)}
                            disabled={isUpdating === code.id}
                          >
                            {isUpdating === code.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : code.isActive ? (
                              'Deactivate'
                            ) : (
                              'Activate'
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {pageMeta && pageMeta.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Showing {codes.length} of {pageMeta.totalElements} codes
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchCodes(currentPage - 1)}
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
                        onClick={() => fetchCodes(currentPage + 1)}
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