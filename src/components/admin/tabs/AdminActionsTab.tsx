import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
import type { AdminUser } from '@/data/adminMockData';
import {
  Shield,
  UserX,
  Key,
  CreditCard,
  Tag,
  Plus,
  X,
  User,
  Percent,
  Gift,
  LogIn,
  Loader2,
  ShieldOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { banUser, changeUserPlan, resetUserPassword, deactivateUser } from '@/services/adminService';

interface AdminActionsTabProps {
  user: AdminUser;
  onUserUpdated?: () => void;
}

type PlanType = 'Free' | 'Pro' | 'Elite';

export function AdminActionsTab({ user, onUserUpdated }: AdminActionsTabProps) {
  const [newTag, setNewTag] = useState('');
  const [tags, setTags] = useState(user.tags);
  const [adminNote, setAdminNote] = useState('');

  // Ban/Unban state
  const [isBanning, setIsBanning] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);

  // Plan change state
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType | ''>('');

  const isUserBanned = user.status === 'BANNED';

  // Reset password state
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  // Deactivate state
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
      toast.success('Tag added');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
    toast.success('Tag removed');
  };

  const handleSaveNote = () => {
    if (adminNote.trim()) {
      toast.success('Note saved');
      setAdminNote('');
    }
  };

  const handleAction = (action: string) => {
    toast.success(`${action} action triggered`);
  };

  // Handle ban/unban user
  const handleBanUser = async () => {
    try {
      setIsBanning(true);
      // Pass false to unban if user is already banned, true to ban
      await banUser(user.id, !isUserBanned);
      toast.success(
        isUserBanned
          ? `${user.name}'s account has been unbanned`
          : `${user.name}'s account has been banned`
      );
      setBanDialogOpen(false);
      onUserUpdated?.();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          `Failed to ${isUserBanned ? 'unban' : 'ban'} user`
      );
    } finally {
      setIsBanning(false);
    }
  };

  // Handle plan change
  const handleChangePlan = async () => {
    if (!selectedPlan) {
      toast.error('Please select a plan');
      return;
    }
    try {
      setIsChangingPlan(true);
      await changeUserPlan(user.id, selectedPlan);
      toast.success(`${user.name}'s plan has been changed to ${selectedPlan}`);
      setPlanDialogOpen(false);
      setSelectedPlan('');
      onUserUpdated?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to change plan');
    } finally {
      setIsChangingPlan(false);
    }
  };

  // Handle reset password
  const handleResetPassword = async () => {
    try {
      setIsResettingPassword(true);
      const response = await resetUserPassword(user.id);
      const newTempPassword = response.data?.data?.tempPassword;
      if (newTempPassword) {
        setTempPassword(newTempPassword);
        toast.success('Password has been reset. Temporary password generated.');
      } else {
        toast.success('Password reset successful');
        setResetPasswordDialogOpen(false);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Handle deactivate user
  const handleDeactivateUser = async () => {
    try {
      setIsDeactivating(true);
      await deactivateUser(user.id);
      toast.success(`${user.name}'s account has been deactivated`);
      setDeactivateDialogOpen(false);
      onUserUpdated?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to deactivate user');
    } finally {
      setIsDeactivating(false);
    }
  };

  // Copy temp password to clipboard
  const copyTempPassword = () => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      toast.success('Temporary password copied to clipboard');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* User Management */}
            <div>
              <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">
                User Management
              </h4>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleAction('Impersonate')}
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Impersonate User (Login as)
                </Button>
                {/* Reset Password Dialog */}
                <Dialog
                  open={resetPasswordDialogOpen}
                  onOpenChange={(open) => {
                    setResetPasswordDialogOpen(open);
                    if (!open) setTempPassword(null);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <Key className="w-4 h-4 mr-2" />
                      Reset Password
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Reset Password</DialogTitle>
                      <DialogDescription>
                        Reset {user?.name}'s password. A temporary password will be generated.
                      </DialogDescription>
                    </DialogHeader>
                    {tempPassword ? (
                      <div className="py-4">
                        <p className="text-sm text-muted-foreground mb-2">
                          Temporary password generated:
                        </p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 p-3 bg-muted rounded font-mono text-sm">
                            {tempPassword}
                          </code>
                          <Button variant="outline" size="sm" onClick={copyTempPassword}>
                            Copy
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Please share this password securely with the user.
                        </p>
                      </div>
                    ) : (
                      <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                          This will generate a new temporary password for the user.
                          The user will NOT be forced to change the password on next login.
                        </p>
                      </div>
                    )}
                    <DialogFooter>
                      {tempPassword ? (
                        <Button
                          onClick={() => {
                            setResetPasswordDialogOpen(false);
                            setTempPassword(null);
                          }}
                        >
                          Done
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => setResetPasswordDialogOpen(false)}
                            disabled={isResettingPassword}
                          >
                            Cancel
                          </Button>
                          <Button onClick={handleResetPassword} disabled={isResettingPassword}>
                            {isResettingPassword ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Resetting...
                              </>
                            ) : (
                              'Reset Password'
                            )}
                          </Button>
                        </>
                      )}
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Deactivate Account Dialog */}
                <AlertDialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-amber-600 hover:text-amber-700"
                    >
                      <UserX className="w-4 h-4 mr-2" />
                      Deactivate Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Deactivate Account</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to deactivate {user?.name}'s account? This will:
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>Remove login/profile/subscription data</li>
                          <li>Allow the email to be re-registered</li>
                          <li>Keep financial records</li>
                        </ul>
                        <span className="block mt-2 font-medium text-amber-600">
                          This action cannot be easily reversed.
                        </span>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isDeactivating}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-amber-600 text-white hover:bg-amber-700"
                        onClick={handleDeactivateUser}
                        disabled={isDeactivating}
                      >
                        {isDeactivating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Deactivating...
                          </>
                        ) : (
                          'Deactivate Account'
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <AlertDialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start ${
                        isUserBanned
                          ? 'text-green-600 hover:text-green-700'
                          : 'text-destructive hover:text-destructive'
                      }`}
                    >
                      {isUserBanned ? (
                        <>
                          <ShieldOff className="w-4 h-4 mr-2" />
                          Unban Account
                        </>
                      ) : (
                        <>
                          <Shield className="w-4 h-4 mr-2" />
                          Ban Account
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {isUserBanned ? 'Unban Account' : 'Ban Account'}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {isUserBanned
                          ? `Are you sure you want to unban ${user?.name}'s account? This will restore their access to the platform.`
                          : `Are you sure you want to ban ${user?.name}'s account? This action will immediately revoke access and can be reversed later.`}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isBanning}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className={
                          isUserBanned
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                        }
                        onClick={handleBanUser}
                        disabled={isBanning}
                      >
                        {isBanning ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {isUserBanned ? 'Unbanning...' : 'Banning...'}
                          </>
                        ) : isUserBanned ? (
                          'Unban Account'
                        ) : (
                          'Ban Account'
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {/* Plan & Credits */}
            <div>
              <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">
                Plan & Credits
              </h4>
              <div className="space-y-2">
                <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Manually Upgrade/Downgrade Plan
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Change User Plan</DialogTitle>
                      <DialogDescription>
                        Change {user?.name}'s subscription plan. Current plan:{' '}
                        <Badge variant="outline" className="ml-1">
                          {user?.planName || 'Free'}
                        </Badge>
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Select
                        value={selectedPlan}
                        onValueChange={(value) => setSelectedPlan(value as PlanType)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a plan" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Free">Free</SelectItem>
                          <SelectItem value="Pro">Pro</SelectItem>
                          <SelectItem value="Elite">Elite</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setPlanDialogOpen(false);
                          setSelectedPlan('');
                        }}
                        disabled={isChangingPlan}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleChangePlan}
                        disabled={!selectedPlan || isChangingPlan}
                      >
                        {isChangingPlan ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Changing...
                          </>
                        ) : (
                          'Change Plan'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleAction('Apply promo')}
                >
                  <Percent className="w-4 h-4 mr-2" />
                  Apply Promo / Discount
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleAction('Add credits')}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Credits Manually
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleAction('Extend trial')}
                >
                  <Gift className="w-4 h-4 mr-2" />
                  Extend Trial
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tags */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Tag className="w-5 h-5" />
            User Tags
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {tags?.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="flex items-center gap-1 pr-1"
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            {tags?.length === 0 && (
              <span className="text-sm text-muted-foreground">No tags assigned</span>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add new tag..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              className="max-w-[200px]"
            />
            <Button variant="outline" size="sm" onClick={handleAddTag}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Admin Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Admin Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Add internal notes about this user..."
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            rows={3}
            className="mb-3"
          />
          <Button onClick={handleSaveNote} disabled={!adminNote.trim()}>
            Save Note
          </Button>

          {user?.internalNotes?.length > 0 && (
            <div className="mt-6 space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Previous Notes</h4>
              {user?.internalNotes?.map((note, index) => (
                <div key={index} className="p-3 rounded-lg bg-muted">
                  <div className="flex items-center gap-2 mb-1 text-sm text-muted-foreground">
                    <User className="w-3 h-3" />
                    <span>{note?.author}</span>
                    <span>•</span>
                    <span>{note.date}</span>
                  </div>
                  <p className="text-sm">{note?.note}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
