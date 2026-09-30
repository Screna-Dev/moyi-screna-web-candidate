import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import { X } from 'lucide-react';

// Shared building blocks for the employer screens, styled after the employer
// Figma file (tv7ju8o58LXo6ZJEsJI6kZ). Tailwind rather than the console's
// inline-style tokens: these are straight design ports and read closer to the
// source this way.

export const T = {
  blue: '#3c77f6',
  blueHover: '#2d6ae0',
  text: '#1e232f',
  sub: '#5a6172',
  border: '#e1e4ea',
};

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('bg-white border border-[#e1e4ea] rounded-2xl', className ?? 'p-6')}>{children}</div>;
}

export function PageTitle({ title, subtitle, serif = true, right }: { title: ReactNode; subtitle?: ReactNode; serif?: boolean; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-1 min-w-0">
        <h1
          className={cx('text-[#1e232f] tracking-tight', serif ? 'text-[30px] font-bold leading-9 font-[family-name:var(--font-serif)]' : 'text-[26px] font-semibold leading-8')}
        >
          {title}
        </h1>
        {subtitle && <p className="text-[#5a6172] text-[14px] leading-5">{subtitle}</p>}
      </div>
      {right && <div className="flex items-center gap-2 shrink-0">{right}</div>}
    </div>
  );
}

type BtnVariant = 'primary' | 'secondary' | 'danger' | 'link' | 'ghost';

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' }) {
  const base = 'inline-flex items-center justify-center gap-1.5 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap';
  const sizes = size === 'sm' ? 'text-[13px] px-3 py-1.5 rounded-lg' : 'text-[14px] px-4 py-2 rounded-xl';
  const variants: Record<BtnVariant, string> = {
    primary: 'bg-[#3c77f6] text-white hover:bg-[#2d6ae0] shadow-[0px_4px_3px_rgba(60,119,246,0.2)]',
    secondary: 'bg-white border border-[#e1e4ea] text-[#1e232f] hover:bg-[#f9fafb]',
    danger: 'bg-white border border-[#ef4444] text-[#dc2626] hover:bg-[#fef2f2]',
    link: 'text-[#3c77f6] hover:underline !px-0 !py-0',
    ghost: 'text-[#5a6172] hover:bg-[#f3f4f7]',
  };
  return (
    <button type="button" className={cx(base, sizes, variants[variant], className)} {...rest}>
      {children}
    </button>
  );
}

type Tone = 'green' | 'blue' | 'amber' | 'gray' | 'red';
const TONES: Record<Tone, string> = {
  green: 'bg-[#e8f7ee] text-[#15a560] border-[#bbf7d0]',
  blue: 'bg-[rgba(60,119,246,0.08)] text-[#3c77f6] border-[rgba(60,119,246,0.2)]',
  amber: 'bg-[#fffbeb] text-[#b45309] border-[#fde68a]',
  gray: 'bg-[#f3f4f7] text-[#5a6172] border-[#e1e4ea]',
  red: 'bg-[#fef2f2] text-[#dc2626] border-[#fecaca]',
};

export function Pill({ tone = 'gray', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold leading-4 whitespace-nowrap', TONES[tone], className)}>
      {children}
    </span>
  );
}

export function StatCard({ label, value, hint, hintTone, icon }: { label: string; value: ReactNode; hint?: ReactNode; hintTone?: 'green' | 'amber'; icon?: ReactNode }) {
  return (
    <Card className="p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[#5a6172] text-[13px]">{label}</span>
        {icon && <span className="w-6 h-6 rounded-md bg-[#eef4ff] text-[#3c77f6] flex items-center justify-center">{icon}</span>}
      </div>
      <span className="text-[#1e232f] text-[26px] font-semibold leading-8">{value}</span>
      {hint && (
        <span className={cx('text-[12px] leading-4', hintTone === 'green' ? 'text-[#15a560]' : hintTone === 'amber' ? 'text-[#d98c00]' : 'text-[#5a6172]')}>{hint}</span>
      )}
    </Card>
  );
}

export function SectionTitle({ title, subtitle, right }: { title: ReactNode; subtitle?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-[#1e232f] text-[16px] font-semibold leading-6">{title}</h2>
        {subtitle && <p className="text-[#5a6172] text-[13px] leading-5 mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function Field({ label, required, hint, right, children, className }: { label: ReactNode; required?: boolean; hint?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx('flex flex-col gap-1.5', className)}>
      <span className="flex items-center justify-between text-[13px] font-medium text-[#1e232f]">
        <span>
          {label}
          {required && <span className="text-[#ef4444] ml-0.5">*</span>}
        </span>
        {right && <span className="text-[12px] font-normal text-[#5a6172]">{right}</span>}
      </span>
      {children}
      {hint && <span className="text-[12px] text-[#5a6172]">{hint}</span>}
    </label>
  );
}

const inputCls = 'w-full bg-white border border-[#e1e4ea] rounded-lg px-3 py-2 text-[14px] text-[#1e232f] placeholder:text-[#9ba1b0] outline-none focus:border-[#3c77f6] focus:ring-2 focus:ring-[rgba(60,119,246,0.15)]';

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputCls, props.className)} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(inputCls, 'resize-y leading-5', props.className)} />;
}

export function Select({ value, onChange, options, className }: { value: string; onChange: (v: string) => void; options: string[]; className?: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={cx(inputCls, 'appearance-auto', className)}>
      {!options.includes(value) && <option value={value}>{value || 'Select…'}</option>}
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

// Pill-style segmented control ("On-site | Hybrid | Remote").
export function Segmented<V extends string | number>({ value, onChange, options, className }: { value: V; onChange: (v: V) => void; options: { value: V; label: string }[]; className?: string }) {
  return (
    <div className={cx('flex bg-[#f3f4f7] rounded-lg p-1 gap-1', className)}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx(
            'flex-1 text-[13px] px-3 py-1.5 rounded-md transition-colors',
            o.value === value ? 'bg-white text-[#1e232f] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.06)]' : 'text-[#5a6172] hover:text-[#1e232f]',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Tabs<V extends string>({ value, onChange, options }: { value: V; onChange: (v: V) => void; options: { value: V; label: string }[] }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx(
            'px-3 py-1.5 rounded-lg text-[13px] border transition-colors',
            o.value === value ? 'bg-[#eef4ff] text-[#3c77f6] border-[#bfd2f6] font-semibold' : 'bg-white text-[#5a6172] border-[#e1e4ea] hover:bg-[#f3f4f7]',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cx('h-px w-full bg-[#e1e4ea]', className)} />;
}

export function KV({ k, v, strong }: { k: ReactNode; v: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[13px]">
      <span className="text-[#5a6172]">{k}</span>
      <span className={cx('text-right text-[#1e232f]', strong ? 'font-semibold' : 'font-medium')}>{v}</span>
    </div>
  );
}

export function BackLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="text-[#3c77f6] text-[14px] font-medium w-fit hover:underline">
      ← {children}
    </button>
  );
}

// Centered dialog used by the wizard overlays, unlock and decision confirms.
export function Dialog({
  open,
  onClose,
  title,
  icon,
  children,
  actions,
  width = 520,
  serifTitle,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  width?: number;
  serifTitle?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-[rgba(30,35,47,0.35)]" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-[0px_24px_48px_rgba(0,0,0,0.12)] w-full max-h-[90vh] overflow-y-auto"
        style={{ maxWidth: width }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-7 flex flex-col gap-4">
          <div className="flex items-start gap-3">
            {icon}
            <h3 className={cx('flex-1 text-[#1e232f]', serifTitle ? 'text-[24px] font-bold font-[family-name:var(--font-serif)] leading-8' : 'text-[17px] font-semibold leading-6')}>{title}</h3>
            <button type="button" onClick={onClose} className="text-[#9ba1b0] hover:text-[#5a6172] p-1 -m-1" aria-label="Close">
              <X size={16} />
            </button>
          </div>
          {children}
          {actions && <div className="flex justify-end gap-2 pt-1">{actions}</div>}
        </div>
      </div>
    </div>
  );
}

export function EmptyBox({ icon, title, body, actions }: { icon?: ReactNode; title: string; body?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-14 px-6">
      {icon && <div className="w-12 h-12 rounded-full bg-[#f3f4f7] text-[#5a6172] flex items-center justify-center">{icon}</div>}
      <p className="text-[#1e232f] text-[18px] font-semibold">{title}</p>
      {body && <div className="text-[#5a6172] text-[14px] max-w-md">{body}</div>}
      {actions && <div className="flex items-center gap-3 mt-1">{actions}</div>}
    </div>
  );
}

export function statusTone(status: string): Tone {
  switch (status) {
    case 'Open':
      return 'green';
    case 'Scheduled':
      return 'blue';
    case 'Closed':
      return 'gray';
    default:
      return 'gray';
  }
}
