import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import axios from 'axios';
import { ArrowLeft, ArrowUpRight, Check, CircleX, ImageIcon, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useEmployerStore } from '@/components/admin/console/pages/employer/store';
import { Button, Card, Field, TextArea, TextInput, cx } from '@/components/admin/console/pages/employer/ui';
import { authErrorCode, authErrorMessage, getEmployerSession } from './employerAuth';
import { CONFLICT, ORGANIZATION_WEBSITE_DOMAIN_MISMATCH, errorData, saveOrganization, uploadOrganizationLogo, type FieldError as ApiFieldError, type Organization, type WorkplaceTag } from './employerApi';
import {
  COMPANY_SIZES,
  DESCRIPTION_MAX,
  FIELD_LABELS,
  HEADLINE_MAX,
  INDUSTRIES,
  MAX_LEN,
  WORKPLACE_TAGS,
  draftErrors,
  draftKeyOf,
  draftFromOrg,
  formFromDraft,
  initialsOf,
  sizeLabel,
  type ProfileDraft,
} from './orgOptions';
import { useOrg } from './orgContext';

// Company Profile (Figma 2020:111 incomplete / 2020:392 complete), backed by
// GET/PUT /employer/organization and POST /employer/organization/logo.
// PUT is a full save of the form and rejects it unless every required field is
// filled, so "Save for later" needs them too. Completion comes back from the
// server and drives the publish gate in the job wizard. Saving and uploading
// a logo at the same time can 409; they're never run together here.

const LOGO_TYPES = ['image/jpeg', 'image/png'];
const LOGO_MAX_BYTES = 5 * 1024 * 1024;

const selectCls =
  'w-full bg-white border border-[#e1e4ea] rounded-lg px-3 py-2 text-[14px] text-[#1e232f] outline-none focus:border-[#3c77f6] focus:ring-2 focus:ring-[rgba(60,119,246,0.15)]';

export function CompanyProfileView({ returnJobId }: { returnJobId?: string }) {
  const { org, status, setOrg, reload } = useOrg();
  const { go } = useEmployerStore();

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-24 text-[#5a6172] gap-2 text-[14px]">
        <Loader2 size={16} className="animate-spin" /> Loading company profile…
      </div>
    );
  }
  if (!org) {
    return (
      <Card className="p-10 flex flex-col items-center text-center gap-3">
        <p className="text-[18px] font-semibold text-[#1e232f]">
          {status === 'missing' ? 'No organization on this account' : 'We couldn’t load your company profile'}
        </p>
        <p className="text-[14px] text-[#5a6172] max-w-md">
          {status === 'missing'
            ? 'This employer account isn’t linked to an organization. Contact operations@screna.ai and we’ll fix it.'
            : 'Check your connection and try again.'}
        </p>
        {status === 'error' && <Button onClick={reload}>Try again</Button>}
      </Card>
    );
  }
  return (
    <ProfileForm
      // A refresh (after a 409) passes through 'loading', which unmounts the
      // form, so it comes back with the latest copy.
      key={org.id}
      org={org}
      onSaved={setOrg}
      onReload={reload}
      onDone={() => go(returnJobId ? { name: 'wizard', jobId: returnJobId } : { name: 'dashboard' })}
      returnToJob={!!returnJobId}
    />
  );
}

function ProfileForm({
  org,
  onSaved,
  onReload,
  onDone,
  returnToJob,
}: {
  org: Organization;
  onSaved: (o: Organization) => void;
  onReload: () => void;
  onDone: () => void;
  returnToJob: boolean;
}) {
  // New accounts have no hiring contact or website yet; start from the sign-in
  // details (still unsaved until they press Save). The website must be on the
  // sign-up email's domain anyway.
  const initial = useMemo(() => {
    const d = draftFromOrg(org);
    const s = getEmployerSession();
    if (s && !d.contact.name && !d.contact.email) d.contact = { ...d.contact, name: s.name, email: s.email };
    if (s?.domain && !d.website) d.website = `https://${s.domain}`;
    return d;
  }, [org]);
  const [draft, setDraft] = useState<ProfileDraft>(initial);
  const [saved, setSaved] = useState(() => JSON.stringify(draftFromOrg(org)));
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState<'later' | 'continue' | null>(null);
  const [uploading, setUploading] = useState(false);
  const [logoName, setLogoName] = useState('');
  // Errors the server reported, by draft key, until that field is edited.
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [conflict, setConflict] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const errors = draftErrors(draft);
  const dirty = JSON.stringify(draft) !== saved;
  const { percent, profileComplete, missingFields } = org.completion;

  // Leaving with unsaved edits: the browser's own prompt on reload/close.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const clearServerError = (key: string) =>
    setServerErrors((e) => {
      if (!(key in e)) return e;
      const rest = { ...e };
      delete rest[key];
      return rest;
    });
  const set = <K extends keyof ProfileDraft>(k: K, v: ProfileDraft[K]) => {
    clearServerError(k);
    setDraft((d) => ({ ...d, [k]: v }));
  };
  const setContact = (k: keyof ProfileDraft['contact'], v: string) => {
    clearServerError(draftKeyOf(`contact.${k}`));
    setDraft((d) => ({ ...d, contact: { ...d.contact, [k]: v } }));
  };
  const toggleTag = (t: WorkplaceTag) =>
    set('workplaceTags', draft.workplaceTags.includes(t) ? draft.workplaceTags.filter((x) => x !== t) : [...draft.workplaceTags, t].slice(0, 6));

  const save = async (mode: 'later' | 'continue') => {
    setShowErrors(true);
    if (Object.keys(errors).length) {
      toast.error('Fix the highlighted fields first');
      return;
    }
    setSaving(mode);
    try {
      const next = await saveOrganization(formFromDraft(draft));
      setSaved(JSON.stringify(draftFromOrg(next)));
      onSaved(next);
      if (mode === 'later') {
        toast.success('Company profile saved');
      } else if (next.completion.profileComplete) {
        toast.success('Company profile complete');
        onDone();
      } else {
        toast.message('Saved. Still needed: ' + next.completion.missingFields.map((f) => FIELD_LABELS[f]).join(', '));
      }
    } catch (err) {
      const code = authErrorCode(err);
      const fields = errorData<ApiFieldError[]>(err);
      if (code === CONFLICT) {
        setConflict(true);
      } else if (code === ORGANIZATION_WEBSITE_DOMAIN_MISMATCH) {
        // The message names the expected domain; show it under the field.
        setServerErrors((e) => ({ ...e, website: authErrorMessage(err) || 'Use a website on your sign-up email’s domain.' }));
        toast.error('Fix the highlighted fields first');
      } else if (Array.isArray(fields) && fields.length) {
        setServerErrors((e) => ({ ...e, ...Object.fromEntries(fields.map((f) => [draftKeyOf(f.property), f.message])) }));
        toast.error('Fix the highlighted fields first');
      } else {
        toast.error(authErrorMessage(err) || 'Couldn’t save your company profile. Please try again.');
      }
    } finally {
      setSaving(null);
    }
  };

  const onLogo = async (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) {
      toast.error('Logo must be a JPG or PNG');
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      toast.error('Logo must be 5 MB or smaller');
      return;
    }
    setUploading(true);
    try {
      // The logo saves on its own; the rest of the form stays as edited.
      onSaved(await uploadOrganizationLogo(file));
      setLogoName(file.name);
      toast.success('Logo updated');
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      if (authErrorCode(err) === CONFLICT) setConflict(true);
      else if (status === 413) toast.error('That file is too large. Use a logo under 5 MB.');
      else toast.error((axios.isAxiosError(err) && authErrorMessage(err)) || 'Couldn’t upload the logo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const err = (k: string) => serverErrors[k] ?? (showErrors ? errors[k] : undefined);
  const red = (k: string) => (err(k) ? '!border-[#ef4444]' : undefined);
  const missing = new Set(missingFields);

  return (
    <div className="flex flex-col gap-6 pb-4">
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[30px] leading-9 font-semibold text-[#1e232f] tracking-tight">{profileComplete ? 'Company profile' : 'Complete your company profile'}</h1>
          <span className="px-2.5 py-1 rounded-md bg-[#f3f4f7] text-[12px] font-medium text-[#5a6172]">Required before publishing</span>
        </div>
        <p className="text-[14px] text-[#5a6172]">Help candidates understand who they are applying to. Your company profile must be complete before you can publish a job.</p>
      </div>

      {conflict && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#f5c451] bg-[#fffbeb] px-4 py-3 text-[14px] text-[#b45309]">
          <span className="flex-1 min-w-[240px]">
            <span className="font-semibold">Your company profile was changed somewhere else</span> (another tab, or a logo upload). Refresh to load the latest version, then make your changes again.
          </span>
          <Button onClick={onReload}>Refresh profile</Button>
        </div>
      )}

      <Card className="p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between text-[14px]">
          <span className="font-medium text-[#1e232f]">Profile completion</span>
          <span className={cx('font-semibold', profileComplete ? 'text-[#15a560]' : 'text-[#5a6172]')}>{percent}% complete</span>
        </div>
        <div className="h-1.5 rounded-full bg-[#eef0f4] overflow-hidden">
          <div className={cx('h-full rounded-full transition-all', profileComplete ? 'bg-[#15a560]' : 'bg-[#3c77f6]')} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
        </div>
        <p className="text-[13px] text-[#5a6172]">
          {profileComplete
            ? 'Your profile is fully configured. You are ready to publish jobs!'
            : `Complete all required fields to publish your first job. Still needed: ${missingFields.map((f) => FIELD_LABELS[f]).join(', ')}.`}
        </p>
      </Card>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 min-w-0 w-full flex flex-col gap-6">
          <Section title="Company identity" subtitle="This information will appear on your job posts.">
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-[#1e232f]">
                Company logo<span className="text-[#ef4444] ml-0.5">*</span>
              </span>
              <div className="flex items-center gap-4">
                <div
                  className={cx(
                    'w-[76px] h-[76px] rounded-xl border flex items-center justify-center overflow-hidden shrink-0',
                    org.logoUrl ? 'border-[#e1e4ea] bg-white' : 'border-[#e1e4ea] bg-[#f3f4f7]',
                    missing.has('logo') && showErrors && 'border-[#ef4444]',
                  )}
                >
                  {org.logoUrl ? <img src={org.logoUrl} alt={`${org.name} logo`} className="w-full h-full object-contain" /> : <ImageIcon size={22} className="text-[#5a6172]" />}
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      disabled={uploading || !!saving}
                      onClick={() => fileRef.current?.click()}
                      className="px-3 py-1.5 rounded-md bg-[#f3f4f7] hover:bg-[#e9ebf0] text-[13px] font-medium text-[#1e232f] disabled:opacity-60 inline-flex items-center gap-1.5"
                    >
                      {uploading && <Loader2 size={13} className="animate-spin" />}
                      {org.logoUrl ? 'Replace logo' : 'Choose File'}
                    </button>
                    <span className="text-[13px] text-[#5a6172] truncate max-w-[200px]">{logoName || (org.logoUrl ? 'Logo uploaded' : 'No file chosen')}</span>
                  </div>
                  <span className="text-[12px] text-[#5a6172]">JPG or PNG, maximum 5 MB</span>
                </div>
                <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => onLogo(e.target.files?.[0])} />
              </div>
            </div>
            <Field label="Company name" required>
              <TextInput maxLength={MAX_LEN.name} value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="Enter your company name" aria-invalid={!!err('name')} className={cx(err('name') && '!border-[#ef4444]')} />
              <FieldError msg={err('name')} />
            </Field>
            <Field label="Company website" required hint={err('website') ? undefined : 'Used to verify your company and help candidates learn more.'}>
              <TextInput maxLength={MAX_LEN.url} value={draft.website} onChange={(e) => set('website', e.target.value)} placeholder="https://company.com" className={cx(err('website') && '!border-[#ef4444]')} />
              <FieldError msg={err('website')} />
            </Field>
            <Field label="Company LinkedIn">
              <TextInput maxLength={MAX_LEN.url} value={draft.linkedinUrl} onChange={(e) => set('linkedinUrl', e.target.value)} placeholder="https://linkedin.com/company/..." className={cx(err('linkedinUrl') && '!border-[#ef4444]')} />
              <FieldError msg={err('linkedinUrl')} />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Industry" required>
                <select value={draft.industry} onChange={(e) => set('industry', e.target.value)} className={cx(selectCls, !draft.industry && 'text-[#9ba1b0]', red('industry'))}>
                  <option value="">Select an industry</option>
                  {draft.industry && !INDUSTRIES.includes(draft.industry) && <option value={draft.industry}>{draft.industry}</option>}
                  {INDUSTRIES.map((i) => (
                    <option key={i} value={i} className="text-[#1e232f]">
                      {i}
                    </option>
                  ))}
                </select>
                <FieldError msg={err('industry')} />
              </Field>
              <Field label="Company size" required>
                <select value={draft.companySize} onChange={(e) => set('companySize', e.target.value as ProfileDraft['companySize'])} className={cx(selectCls, !draft.companySize && 'text-[#9ba1b0]', red('companySize'))}>
                  <option value="">Select company size</option>
                  {COMPANY_SIZES.map((s) => (
                    <option key={s.value} value={s.value} className="text-[#1e232f]">
                      {s.label}
                    </option>
                  ))}
                </select>
                <FieldError msg={err('companySize')} />
              </Field>
            </div>
            <Field label="Year founded">
              <TextInput inputMode="numeric" maxLength={4} value={draft.yearFounded} onChange={(e) => set('yearFounded', e.target.value.replace(/\D/g, ''))} placeholder="e.g. 2012" className={cx(err('yearFounded') && '!border-[#ef4444]')} />
              <FieldError msg={err('yearFounded')} />
            </Field>
          </Section>

          <Section title="About the company" subtitle="Describe your company culture, mission and location details.">
            <Field label="Headquarters" required>
              <TextInput maxLength={MAX_LEN.headquarters} value={draft.headquarters} onChange={(e) => set('headquarters', e.target.value)} placeholder="City, State or Country" className={red('headquarters')} />
              <FieldError msg={err('headquarters')} />
            </Field>
            <Field label="Company headline" hint={<span className="block text-right">{draft.headline.length} / {HEADLINE_MAX}</span>}>
              <TextInput maxLength={HEADLINE_MAX} value={draft.headline} onChange={(e) => set('headline', e.target.value)} placeholder="A short description of what your company does" />
            </Field>
            <Field label="Company description" required hint={<span className="block text-right">{draft.description.length} / {DESCRIPTION_MAX}</span>}>
              <TextArea rows={4} maxLength={DESCRIPTION_MAX} value={draft.description} onChange={(e) => set('description', e.target.value)} placeholder="Tell candidates about your company, product, mission, and working environment." className={red('description')} />
              <FieldError msg={err('description')} />
            </Field>
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-medium text-[#1e232f]">Workplace environment</span>
              <div className="flex flex-wrap gap-2">
                {WORKPLACE_TAGS.map((t) => {
                  const on = draft.workplaceTags.includes(t.value);
                  return (
                    <button
                      key={t.value}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleTag(t.value)}
                      className={cx(
                        'px-3 py-1 rounded-full border text-[13px] transition-colors',
                        on ? 'bg-[#eef4ff] border-[#3c77f6] text-[#3c77f6] font-medium' : 'bg-[#f3f4f7] border-[#e1e4ea] text-[#1e232f] hover:bg-[#e9ebf0]',
                      )}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </Section>

          <Section title="Hiring contact" subtitle="This information is used for account and hiring communication. It will not be shown publicly to candidates.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Contact name" required>
                <TextInput maxLength={MAX_LEN.contact} value={draft.contact.name} onChange={(e) => setContact('name', e.target.value)} placeholder="Alex Johnson" className={red('contactName')} />
                <FieldError msg={err('contactName')} />
              </Field>
              <Field label="Job title">
                <TextInput maxLength={MAX_LEN.contact} value={draft.contact.title} onChange={(e) => setContact('title', e.target.value)} placeholder="Hiring Manager" />
              </Field>
            </div>
            <Field
              label={
                <span className="inline-flex items-center gap-2">
                  <span>
                    Work email<span className="text-[#ef4444] ml-0.5">*</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-normal text-[#5a6172]">
                    <Lock size={11} /> Private
                  </span>
                </span>
              }
            >
              <TextInput type="email" maxLength={MAX_LEN.contact} value={draft.contact.email} onChange={(e) => setContact('email', e.target.value)} placeholder="you@company.com" className={cx(err('contactEmail') && '!border-[#ef4444]')} />
              <FieldError msg={err('contactEmail')} />
            </Field>
            <Field label="Phone number">
              <TextInput type="tel" maxLength={MAX_LEN.phone} value={draft.contact.phone} onChange={(e) => setContact('phone', e.target.value)} placeholder="Optional phone number" />
            </Field>
            <label className="flex items-start gap-2.5 text-[13px] leading-5 text-[#1e232f] cursor-pointer">
              <input type="checkbox" checked={draft.authorizedConfirmed} onChange={(e) => set('authorizedConfirmed', e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#3c77f6]" />
              I confirm that I am authorized to represent this company and publish jobs on its behalf.
            </label>
          </Section>
        </div>

        <aside className="w-full lg:w-[380px] shrink-0 flex flex-col gap-6 lg:sticky lg:top-4">
          <CandidatePreview draft={draft} logoUrl={org.logoUrl} />
          <VisibilityCard />
        </aside>
      </div>

      <div className="sticky bottom-0 z-[20] bg-white border border-[#e1e4ea] rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 text-[13px]">
          <button type="button" onClick={onDone} className="inline-flex items-center gap-1.5 text-[#3c77f6] font-medium hover:underline">
            <ArrowLeft size={14} /> {returnToJob ? 'Back to job' : 'Back to dashboard'}
          </button>
          <span className="w-px h-4 bg-[#e1e4ea]" />
          <span className="text-[#5a6172]">No credits are used when completing your profile.</span>
        </div>
        <div className="sm:ml-auto flex items-center gap-2">
          <Button disabled={!!saving || uploading || !dirty} onClick={() => save('later')} className="!bg-[#f3f4f7] !border-transparent">
            {saving === 'later' && <Loader2 size={14} className="animate-spin" />}
            Save for later
          </Button>
          <Button variant="primary" disabled={!!saving || uploading} onClick={() => save('continue')}>
            {saving === 'continue' && <Loader2 size={14} className="animate-spin" />}
            Save and continue
          </Button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <Card className="p-6 flex flex-col gap-5">
      <div>
        <h2 className="text-[16px] font-semibold text-[#1e232f] leading-6">{title}</h2>
        <p className="text-[13px] text-[#5a6172] leading-5">{subtitle}</p>
      </div>
      {children}
    </Card>
  );
}

function FieldError({ msg }: { msg?: string }) {
  return msg ? <span className="text-[12px] text-[#dc2626]">{msg}</span> : null;
}

function CandidatePreview({ draft, logoUrl }: { draft: ProfileDraft; logoUrl: string | null }) {
  const empty = !draft.name.trim() && !draft.description.trim() && !draft.headquarters.trim();
  const size = sizeLabel(draft.companySize || null);
  return (
    <Card className="p-6 flex flex-col gap-4">
      <div>
        <h2 className="text-[16px] font-semibold text-[#1e232f] leading-6">Candidate preview</h2>
        <p className="text-[13px] text-[#5a6172] leading-5">This is how your company will appear on Screna job posts.</p>
      </div>
      <div className="rounded-xl border border-[#dbe5fb] bg-[#f7f9fe] p-5 flex flex-col gap-3">
        {empty ? (
          <div className="flex flex-col items-center gap-3 py-2">
            <span className="w-12 h-12 rounded-lg bg-[#e3e7ee]" />
            <span className="h-2.5 w-36 rounded bg-[#e3e7ee]" />
            <span className="h-2 w-20 rounded bg-[#e3e7ee]" />
            <div className="w-full flex flex-col gap-2 pt-4">
              <span className="h-2 w-full rounded bg-[#e3e7ee]" />
              <span className="h-2 w-full rounded bg-[#e3e7ee]" />
              <span className="h-2 w-2/3 rounded bg-[#e3e7ee]" />
            </div>
            <p className="text-[13px] text-[#5a6172] pt-2">Complete the fields to preview your company profile.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="w-11 h-11 rounded-lg object-contain bg-white border border-[#e1e4ea]" />
              ) : (
                <span className="w-11 h-11 rounded-lg bg-[#3c77f6] text-white font-semibold flex items-center justify-center">{initialsOf(draft.name)}</span>
              )}
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-[#1e232f] truncate">{draft.name || 'Your company'}</p>
                {draft.headquarters && <p className="text-[12px] text-[#5a6172] truncate">{draft.headquarters}</p>}
              </div>
            </div>
            {(draft.industry || size) && (
              <div className="flex flex-wrap gap-1.5">
                {draft.industry && <span className="px-2 py-0.5 rounded bg-[#eceff4] text-[11px] text-[#1e232f]">{draft.industry}</span>}
                {size && <span className="px-2 py-0.5 rounded bg-[#eceff4] text-[11px] text-[#1e232f]">{size}</span>}
              </div>
            )}
            {draft.headline && <p className="text-[13px] font-semibold text-[#1e232f]">&ldquo;{draft.headline}&rdquo;</p>}
            {draft.description && <p className="text-[12px] leading-[18px] text-[#5a6172] line-clamp-5">{draft.description}</p>}
            {/^https?:\/\//i.test(draft.website.trim()) && (
              <>
                <div className="h-px bg-[#e1e4ea]" />
                <a href={draft.website.trim()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] font-medium text-[#3c77f6] hover:underline w-fit">
                  Visit website <ArrowUpRight size={13} />
                </a>
              </>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

function VisibilityCard() {
  return (
    <Card className="p-5 flex flex-col gap-3 text-[13px]">
      <h2 className="text-[14px] font-semibold text-[#1e232f]">What candidates can see</h2>
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold text-[#15a560]">Candidates CAN see:</span>
        {['Company logo and name', 'Website, Industry, and Size', 'HQ Location & Company description'].map((t) => (
          <span key={t} className="flex items-center gap-2 text-[#1e232f]">
            <Check size={14} className="text-[#15a560]" /> {t}
          </span>
        ))}
      </div>
      <div className="h-px bg-[#e1e4ea]" />
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold text-[#ef4444]">Candidates CANNOT see:</span>
        {['Hiring contact email and phone', 'Billing and credit balances'].map((t) => (
          <span key={t} className="flex items-center gap-2 text-[#1e232f]">
            <CircleX size={14} className="text-[#ef4444]" /> {t}
          </span>
        ))}
      </div>
    </Card>
  );
}
