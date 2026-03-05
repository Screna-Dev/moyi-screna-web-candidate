import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { X, ChevronDown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

export type EditProfileData = {
  firstName: string;
  lastName: string;
  currentRole: string;
  currentLevel: string;
  targetRoles: string[];
  targetCompanyType: string[];
  jobStatus: string;
};

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<EditProfileData>;
  onSave: (data: EditProfileData) => void;
}

const LEVEL_OPTIONS = ['Junior', 'Intermediate', 'Senior', 'Staff'];
const COMPANY_TYPE_OPTIONS = ['Startup', 'Big Tech', 'Agency', 'Mid-size', 'Enterprise', 'Consultancy'];
const JOB_STATUS_OPTIONS = ['Student', 'Not actively looking', 'Actively job hunting', 'Open to opportunities'];
const ROLE_SUGGESTIONS = [
  'Frontend Engineer',
  'Backend Engineer',
  'Full Stack',
  'DevOps Engineer',
  'Data Scientist',
  'Machine Learning Engineer',
  'Product Manager',
  'iOS Developer',
  'Android Developer',
  'QA Engineer',
];

export function EditProfileModal({ open, onOpenChange, initialData, onSave }: EditProfileModalProps) {
  const [formData, setFormData] = useState<EditProfileData>({
    firstName: '',
    lastName: '',
    currentRole: '',
    currentLevel: 'Intermediate',
    targetRoles: [],
    targetCompanyType: [],
    jobStatus: 'Actively job hunting',
  });

  const [roleInput, setRoleInput] = useState('');
  const [showRoleSuggestions, setShowRoleSuggestions] = useState(false);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const roleInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const companyDropdownRef = useRef<HTMLDivElement>(null);
  const companyTriggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && initialData) {
      setFormData({
        firstName: initialData.firstName || '',
        lastName: initialData.lastName || '',
        currentRole: initialData.currentRole || '',
        currentLevel: initialData.currentLevel || 'Intermediate',
        targetRoles: initialData.targetRoles || [],
        targetCompanyType: initialData.targetCompanyType || [],
        jobStatus: initialData.jobStatus || 'Actively job hunting',
      });
    }
  }, [open, initialData]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        roleInputRef.current &&
        !roleInputRef.current.contains(e.target as Node)
      ) {
        setShowRoleSuggestions(false);
      }
      if (
        companyDropdownRef.current &&
        !companyDropdownRef.current.contains(e.target as Node) &&
        companyTriggerRef.current &&
        !companyTriggerRef.current.contains(e.target as Node)
      ) {
        setShowCompanyDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSuggestions = ROLE_SUGGESTIONS.filter(
    (r) =>
      !formData.targetRoles.includes(r) &&
      r.toLowerCase().includes(roleInput.toLowerCase())
  );

  const addRole = (role: string) => {
    if (!formData.targetRoles.includes(role)) {
      setFormData((prev) => ({ ...prev, targetRoles: [...prev.targetRoles, role] }));
    }
    setRoleInput('');
    setShowRoleSuggestions(false);
    roleInputRef.current?.focus();
  };

  const removeRole = (role: string) => {
    setFormData((prev) => ({
      ...prev,
      targetRoles: prev.targetRoles.filter((r) => r !== role),
    }));
  };

  const handleRoleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && roleInput.trim()) {
      e.preventDefault();
      addRole(roleInput.trim());
    }
    if (e.key === 'Backspace' && !roleInput && formData.targetRoles.length > 0) {
      removeRole(formData.targetRoles[formData.targetRoles.length - 1]);
    }
  };

  const handleSubmit = () => {
    onSave(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 rounded-xl overflow-hidden border-0 shadow-[0_25px_60px_-12px_rgba(0,0,0,0.15)] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 shrink-0">
          <DialogHeader className="space-y-1.5">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg text-[hsl(222,22%,15%)]">
                Edit profile
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm text-[hsl(222,12%,50%)]">
              Make changes to your profile here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="px-6 pb-2 flex-1 overflow-y-auto min-h-0">
          <div className="grid gap-4">
            {/* Row 1: First name + Last name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ep-firstName" className="text-sm text-[hsl(222,12%,45%)]">
                  First name
                </Label>
                <Input
                  id="ep-firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData((p) => ({ ...p, firstName: e.target.value }))}
                  className="h-10 rounded-lg border-[hsl(220,16%,88%)] bg-white focus:border-[hsl(221,91%,60%)] focus:ring-1 focus:ring-[hsl(221,91%,60%)]/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ep-lastName" className="text-sm text-[hsl(222,12%,45%)]">
                  Last name
                </Label>
                <Input
                  id="ep-lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData((p) => ({ ...p, lastName: e.target.value }))}
                  className="h-10 rounded-lg border-[hsl(220,16%,88%)] bg-white focus:border-[hsl(221,91%,60%)] focus:ring-1 focus:ring-[hsl(221,91%,60%)]/20"
                />
              </div>
            </div>

            {/* Row 2: Current Role + Current Level */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-[hsl(222,12%,45%)]">Current Role</Label>
                <Input
                  value={formData.currentRole}
                  onChange={(e) => setFormData((p) => ({ ...p, currentRole: e.target.value }))}
                  className="h-10 rounded-lg border-[hsl(220,16%,88%)] bg-white focus:border-[hsl(221,91%,60%)] focus:ring-1 focus:ring-[hsl(221,91%,60%)]/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-[hsl(222,12%,45%)]">Current Level</Label>
                <Select
                  value={formData.currentLevel}
                  onValueChange={(v) => setFormData((p) => ({ ...p, currentLevel: v }))}
                >
                  <SelectTrigger className="h-10 rounded-lg border-[hsl(220,16%,88%)] bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVEL_OPTIONS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 3: Target Roles (Multi-select with chips) */}
            <div className="space-y-2">
              <Label className="text-sm text-[hsl(222,12%,45%)]">
                Target Roles (Multi-select)
              </Label>
              <div className="relative">
                <div
                  className="flex flex-wrap items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-lg border border-[hsl(220,16%,88%)] bg-white focus-within:border-[hsl(221,91%,60%)] focus-within:ring-1 focus-within:ring-[hsl(221,91%,60%)]/20 transition-all cursor-text"
                  onClick={() => roleInputRef.current?.focus()}
                >
                  {formData.targetRoles.map((role) => (
                    <span
                      key={role}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,55%)] text-sm"
                    >
                      {role}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeRole(role);
                        }}
                        className="ml-0.5 hover:text-[hsl(221,91%,45%)] transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    ref={roleInputRef}
                    type="text"
                    value={roleInput}
                    onChange={(e) => {
                      setRoleInput(e.target.value);
                      setShowRoleSuggestions(true);
                    }}
                    onFocus={() => setShowRoleSuggestions(true)}
                    onKeyDown={handleRoleKeyDown}
                    placeholder={formData.targetRoles.length === 0 ? 'Type to add roles...' : ''}
                    className="flex-1 min-w-[80px] bg-transparent outline-none text-sm text-[hsl(222,22%,15%)] placeholder:text-[hsl(222,12%,65%)]"
                  />
                </div>

                {/* Suggestions dropdown */}
                {showRoleSuggestions && filteredSuggestions.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    className="absolute z-50 mt-1 w-full bg-white rounded-lg border border-[hsl(220,16%,90%)] shadow-lg max-h-[160px] overflow-y-auto"
                  >
                    {filteredSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => addRole(suggestion)}
                        className="w-full text-left px-3 py-2 text-sm text-[hsl(222,22%,15%)] hover:bg-[hsl(220,20%,97%)] transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Row 4: Target Company Type */}
            <div className="space-y-2">
              <Label className="text-sm text-[hsl(222,12%,45%)]">Target Company Type (Multi-select)</Label>
              <div className="relative">
                <div
                  ref={companyTriggerRef}
                  onClick={() => setShowCompanyDropdown((v) => !v)}
                  className={`flex flex-wrap items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-lg border bg-white cursor-pointer transition-all ${
                    showCompanyDropdown
                      ? 'border-[hsl(221,91%,60%)] ring-1 ring-[hsl(221,91%,60%)]/20'
                      : 'border-[hsl(220,16%,88%)]'
                  }`}
                >
                  {formData.targetCompanyType.length > 0 ? (
                    formData.targetCompanyType.map((type) => (
                      <span
                        key={type}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,55%)] text-sm"
                      >
                        {type}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormData((p) => ({
                              ...p,
                              targetCompanyType: p.targetCompanyType.filter((t) => t !== type),
                            }));
                          }}
                          className="ml-0.5 hover:text-[hsl(221,91%,45%)] transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-[hsl(222,12%,65%)]">
                      Select company types (e.g., Startup, Big Tech, Agency)
                    </span>
                  )}
                  <ChevronDown className={`w-4 h-4 ml-auto text-[hsl(222,12%,55%)] shrink-0 transition-transform ${showCompanyDropdown ? 'rotate-180' : ''}`} />
                </div>

                {showCompanyDropdown && (
                  <div
                    ref={companyDropdownRef}
                    className="absolute z-50 mt-1 w-full bg-white rounded-lg border border-[hsl(220,16%,90%)] shadow-lg max-h-[160px] overflow-y-auto"
                  >
                    {COMPANY_TYPE_OPTIONS.map((type) => {
                      const isSelected = formData.targetCompanyType.includes(type);
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            setFormData((p) => ({
                              ...p,
                              targetCompanyType: isSelected
                                ? p.targetCompanyType.filter((t) => t !== type)
                                : [...p.targetCompanyType, type],
                            }));
                          }}
                          className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-[hsl(221,91%,60%)]/5 text-[hsl(221,91%,55%)]'
                              : 'text-[hsl(222,22%,15%)] hover:bg-[hsl(220,20%,97%)]'
                          }`}
                        >
                          {type}
                          {isSelected && (
                            <svg className="w-4 h-4 text-[hsl(221,91%,60%)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Row 5: Job Status */}
            <div className="space-y-2">
              <Label className="text-sm text-[hsl(222,12%,45%)]">Job Status</Label>
              <Select
                value={formData.jobStatus}
                onValueChange={(v) => setFormData((p) => ({ ...p, jobStatus: v }))}
              >
                <SelectTrigger className="h-10 rounded-lg border-[hsl(220,16%,88%)] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JOB_STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 mt-2 shrink-0 border-t border-[hsl(220,16%,92%)]">
          <Button
            onClick={handleSubmit}
            className="bg-[hsl(221,91%,60%)] hover:bg-[hsl(221,91%,55%)] text-white px-6 h-10 rounded-lg shadow-sm"
          >
            Save changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}