import { Plus, Trash2 } from 'lucide-react';
import { TextInput } from '../../ui';

export function ErrorHint({ show, children = 'Required' }: { show: boolean; children?: string }) {
  if (!show) return null;
  return <span className="text-[12px] text-[#dc2626]">{children}</span>;
}

export function CardTitle({ children, subtitle }: { children: string; subtitle?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <h3 className="text-[#1e232f] text-[15px] font-semibold leading-6">{children}</h3>
      {subtitle && <p className="text-[#5a6172] text-[13px] leading-5">{subtitle}</p>}
    </div>
  );
}

// Editable bullet list with a trash icon per row and an "Add another …" link.
export function BulletListEditor({
  label,
  required,
  items,
  onChange,
  addLabel,
  error,
  placeholder,
}: {
  label: string;
  required?: boolean;
  items: string[];
  onChange: (items: string[]) => void;
  addLabel: string;
  error?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-medium text-[#1e232f]">
        {label}
        {required && <span className="text-[#ef4444] ml-0.5">*</span>}
      </span>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-[#5a6172] text-[14px] w-3 shrink-0">•</span>
          <div className="relative flex-1">
            <TextInput
              value={item}
              placeholder={placeholder}
              onChange={(e) => onChange(items.map((v, k) => (k === i ? e.target.value : v)))}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, k) => k !== i))}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5a6172] hover:text-[#dc2626] p-1"
              aria-label="Remove"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
      <ErrorHint show={!!error}>Add at least one item</ErrorHint>
      <button type="button" onClick={() => onChange([...items, ''])} className="flex items-center gap-1.5 text-[13px] font-medium text-[#3c77f6] hover:underline w-fit ml-5">
        <Plus size={14} /> {addLabel}
      </button>
    </div>
  );
}
