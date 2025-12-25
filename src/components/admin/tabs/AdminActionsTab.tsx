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
import type { AdminUser } from '@/data/adminMockData';
import {
  Shield,
  UserX,
  Key,
  CreditCard,
  Tag,
  Plus,
  X,
  Clock,
  User,
  ArrowRight,
  Percent,
  Gift,
  LogIn,
} from 'lucide-react';
import { toast } from 'sonner';

interface AdminActionsTabProps {
  user: AdminUser;
}

export function AdminActionsTab({ user }: AdminActionsTabProps) {
  const [newTag, setNewTag] = useState('');
  const [tags, setTags] = useState(user.tags);
  const [adminNote, setAdminNote] = useState('');

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
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleAction('Reset password')}
                >
                  <Key className="w-4 h-4 mr-2" />
                  Reset Password / Send Reset Link
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-amber-600 hover:text-amber-700"
                  onClick={() => handleAction('Deactivate')}
                >
                  <UserX className="w-4 h-4 mr-2" />
                  Deactivate Account
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-destructive hover:text-destructive"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Ban Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Ban Account</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to ban {user.name}'s account? This action will
                        immediately revoke access and can be reversed later.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => handleAction('Ban')}
                      >
                        Ban Account
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
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleAction('Change plan')}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Manually Upgrade/Downgrade Plan
                </Button>
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
            {tags.map((tag) => (
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
            {tags.length === 0 && (
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

          {user.internalNotes.length > 0 && (
            <div className="mt-6 space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Previous Notes</h4>
              {user.internalNotes.map((note, index) => (
                <div key={index} className="p-3 rounded-lg bg-muted">
                  <div className="flex items-center gap-2 mb-1 text-sm text-muted-foreground">
                    <User className="w-3 h-3" />
                    <span>{note.author}</span>
                    <span>•</span>
                    <span>{note.date}</span>
                  </div>
                  <p className="text-sm">{note.note}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Audit Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          {user.auditLog.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>No audit history</p>
            </div>
          ) : (
            <div className="space-y-4">
              {user.auditLog.map((entry, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    {index < user.auditLog.length - 1 && (
                      <div className="w-0.5 h-full bg-border mt-2" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{entry.action}</span>
                      <Badge variant="outline" className="text-xs">
                        {entry.actor}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{entry.description}</p>
                    {entry.previousValue && entry.newValue && (
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-2 py-0.5 rounded">
                          {entry.previousValue}
                        </span>
                        <ArrowRight className="w-3 h-3" />
                        <span className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-0.5 rounded">
                          {entry.newValue}
                        </span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{entry.date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
