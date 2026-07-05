import { useState, useRef, useEffect, ReactNode } from 'react';
import { Search } from 'lucide-react';

// ─── Companies-tab filter popovers ──────────────────────────────────────────────
// Visual/UX-only filters for the Companies directory tab. The Feed tab uses the
// separate, backend-wired filter dropdowns defined inline in the page.

type FilterDropdownProps = {
  label: string;
  activeCount: number;
  topContent?: ReactNode;
  searchPlaceholder: string;
  searchValue: string;
  onSearchChange: (val: string) => void;
  onReset: () => void;
  onApply: () => void;
  children: ReactNode;
  isOpen: boolean;
  onOpenChange: (val: boolean) => void;
};

function FilterDropdown({
  label,
  activeCount,
  topContent,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  onReset,
  onApply,
  children,
  isOpen,
  onOpenChange,
}: FilterDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', onClickOutside);
    }
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [isOpen, onOpenChange]);

  const handleApply = () => {
    onApply();
    onOpenChange(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => onOpenChange(!isOpen)}
        className="relative flex h-[32px] items-center gap-[6px] whitespace-nowrap rounded-full border border-[#e1e4ea] bg-white px-[12.667px] py-[0.667px] transition-colors hover:border-primary/50 hover:bg-secondary"
      >
        <span className="font-['Inter',sans-serif] text-[12px] font-medium leading-[16px] text-[#656d81]">
          {activeCount > 0 ? `${label} (${activeCount})` : label}
        </span>
        <svg className="size-[12px] shrink-0 opacity-50" fill="none" viewBox="0 0 12 12">
          <path d="M3 4.5L6 7.5L9 4.5" stroke="#656D81" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 min-w-[280px] bg-card rounded-xl shadow-xl border border-border overflow-hidden flex flex-col max-h-[420px]">
          {topContent && (
            <div className="px-3 pt-3 pb-2 border-b border-border/50">
              {topContent}
            </div>
          )}

          <div className="p-3 border-b border-border/50 bg-background sticky top-0 z-10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
          </div>

          <div className="overflow-y-auto p-3 flex-1 flex flex-col min-h-0">
            {children}
          </div>

          <div className="p-3 bg-secondary/50 border-t border-border flex justify-between items-center sticky bottom-0 z-10 mt-auto">
            <button
              onClick={onReset}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium px-2 py-1"
            >
              Reset
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared Checkbox Row ───────────────────────────────────────────────────────
function CheckboxRow({
  option,
  checked,
  onChange,
}: {
  option: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-secondary cursor-pointer group/item transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="size-4 rounded border-border text-primary focus:ring-primary cursor-pointer accent-primary"
      />
      <span className="text-sm text-foreground group-hover/item:text-primary transition-colors">
        {option}
      </span>
    </label>
  );
}

// ─── Role filter ──────────────────────────────────────────────────────────────
// Default (fallback) grouping when no live groups are supplied — mirrors the
// GET /community/posts/options `roles` shape.
const ROLE_GROUPS_FALLBACK = [
  { category: 'Product', options: ['Product Manager', 'Associate Product Manager', 'Growth Product Manager', 'Technical Product Manager'] },
  { category: 'Engineering', options: ['Software Engineer', 'Frontend Engineer', 'Backend Engineer', 'Full Stack Engineer', 'Mobile Engineer', 'DevOps Engineer', 'QA / Test Engineer'] },
  { category: 'Data & AI', options: ['Data Scientist', 'Data Analyst', 'Machine Learning Engineer', 'AI Engineer'] },
  { category: 'Design & Research', options: ['Product Designer', 'UX Designer', 'UX Researcher'] },
  { category: 'Business / Consulting', options: ['Business Analyst', 'Consultant'] },
];

export function RoleFilter({ groups, onApply, singleSelect }: { groups?: { category: string; options: string[] }[]; onApply?: (selected: string[]) => void; singleSelect?: boolean } = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tempSelected, setTempSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const roleGroups = groups && groups.length ? groups : ROLE_GROUPS_FALLBACK;

  useEffect(() => {
    if (isOpen) {
      setTempSelected(new Set(selected));
      setSearch('');
      setActiveCategory(null);
    }
  }, [isOpen, selected]);

  const toggle = (option: string) => {
    setTempSelected((prev) => {
      if (singleSelect) return prev.has(option) ? new Set() : new Set([option]);
      const next = new Set(prev);
      if (next.has(option)) next.delete(option);
      else next.add(option);
      return next;
    });
  };

  const handleApply = () => { setSelected(new Set(tempSelected)); onApply?.(Array.from(tempSelected)); };
  const handleReset = () => setTempSelected(new Set());

  const q = search.toLowerCase();
  // Only the active category (if any), each with its search-filtered roles.
  const visibleGroups = (activeCategory ? roleGroups.filter((g) => g.category === activeCategory) : roleGroups)
    .map((g) => ({ category: g.category, options: g.options.filter((o) => o.toLowerCase().includes(q)) }))
    .filter((g) => g.options.length > 0);

  const topContent = (
    <div className="flex flex-wrap gap-1.5">
      {roleGroups.map((g) => (
        <button
          key={g.category}
          type="button"
          onClick={() => setActiveCategory(activeCategory === g.category ? null : g.category)}
          className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
            activeCategory === g.category
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/70'
          }`}
        >
          {g.category}
        </button>
      ))}
    </div>
  );

  return (
    <FilterDropdown
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      label="Role"
      activeCount={selected.size}
      searchPlaceholder="Search role..."
      searchValue={search}
      onSearchChange={setSearch}
      onReset={handleReset}
      onApply={handleApply}
      topContent={topContent}
    >
      {visibleGroups.length === 0 ? (
        <div className="py-4 text-center text-sm text-muted-foreground">No roles found</div>
      ) : (
        visibleGroups.map((g) => (
          <div key={g.category} className="mb-2">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
              {g.category}
            </div>
            <div className="space-y-0.5">
              {g.options.map((option) => (
                <CheckboxRow
                  key={option}
                  option={option}
                  checked={tempSelected.has(option)}
                  onChange={() => toggle(option)}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </FilterDropdown>
  );
}

// ─── Company filter ────────────────────────────────────────────────────────────
const COMPANY_CATEGORIES = ['FAANG / Big Tech', 'Large Enterprises', 'Mid-sized', 'Small'];
const COMPANY_OPTIONS = [
  'OpenAI',
  'Google',
  'Meta',
  'Amazon',
  'Apple',
  'Microsoft',
  'Stripe',
  'Anthropic',
  'NVIDIA',
  'Databricks',
  'Uber',
  'ByteDance',
];

export function CompanyFilter() {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tempSelected, setTempSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTempSelected(new Set(selected));
      setSearch('');
    }
  }, [isOpen, selected]);

  const toggle = (option: string) => {
    setTempSelected((prev) => {
      const next = new Set(prev);
      if (next.has(option)) next.delete(option);
      else next.add(option);
      return next;
    });
  };

  const handleApply = () => setSelected(new Set(tempSelected));
  const handleReset = () => setTempSelected(new Set());

  const filteredOptions = COMPANY_OPTIONS.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase())
  );

  const topContent = (
    <div className="flex flex-wrap gap-1.5">
      {COMPANY_CATEGORIES.map((c) => (
        <span
          key={c}
          className="inline-flex items-center rounded-lg bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground"
        >
          {c}
        </span>
      ))}
    </div>
  );

  return (
    <FilterDropdown
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      label="Company"
      activeCount={selected.size}
      searchPlaceholder="Search company..."
      searchValue={search}
      onSearchChange={setSearch}
      onReset={handleReset}
      onApply={handleApply}
      topContent={topContent}
    >
      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
        TOP COMPANIES
      </div>
      <div className="space-y-0.5">
        {filteredOptions.map((option) => (
          <CheckboxRow
            key={option}
            option={option}
            checked={tempSelected.has(option)}
            onChange={() => toggle(option)}
          />
        ))}
        {filteredOptions.length === 0 && (
          <div className="py-4 text-center text-sm text-muted-foreground">No companies found</div>
        )}
      </div>
    </FilterDropdown>
  );
}

// ─── Round filter ──────────────────────────────────────────────────────────────
// Fallback grouping when no live groups are supplied — mirrors the
// GET /community/posts/options `rounds` shape.
const ROUND_GROUPS_FALLBACK = [
  { category: 'Initial Screening', options: ['Recruiter / HR Screen', 'Online Assessment (OA)'] },
  { category: 'Mid-Level Evaluation', options: ['Technical Phone Screen', 'Hiring Manager Screen', 'Take-home Assignment'] },
  { category: 'Onsite / Virtual Loop', options: ['Onsite - Coding / Algorithms', 'Onsite - System Design / Architecture', 'Onsite - Portfolio / Case Presentation', 'Onsite - Product Sense / Strategy', 'Onsite - Behavioral / Leadership', 'Onsite - Cross-functional / Panel', 'Onsite - Multi Round'] },
  { category: 'Final Stages', options: ['Executive / Final Round', 'Team Matching'] },
];

export function RoundFilter({ groups, onApply, singleSelect }: { groups?: { category: string; options: string[] }[]; onApply?: (selected: string[]) => void; singleSelect?: boolean } = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tempSelected, setTempSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const roundGroups = groups && groups.length ? groups : ROUND_GROUPS_FALLBACK;

  useEffect(() => {
    if (isOpen) {
      setTempSelected(new Set(selected));
      setSearch('');
      setActiveCategory(null);
    }
  }, [isOpen, selected]);

  const toggle = (option: string) => {
    setTempSelected((prev) => {
      if (singleSelect) return prev.has(option) ? new Set() : new Set([option]);
      const next = new Set(prev);
      if (next.has(option)) next.delete(option);
      else next.add(option);
      return next;
    });
  };

  const handleApply = () => { setSelected(new Set(tempSelected)); onApply?.(Array.from(tempSelected)); };
  const handleReset = () => setTempSelected(new Set());

  const q = search.toLowerCase();
  const visibleGroups = (activeCategory ? roundGroups.filter((g) => g.category === activeCategory) : roundGroups)
    .map((g) => ({ category: g.category, options: g.options.filter((o) => o.toLowerCase().includes(q)) }))
    .filter((g) => g.options.length > 0);

  const topContent = (
    <div className="flex flex-wrap gap-1.5">
      {roundGroups.map((g) => (
        <button
          key={g.category}
          type="button"
          onClick={() => setActiveCategory(activeCategory === g.category ? null : g.category)}
          className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
            activeCategory === g.category
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/70'
          }`}
        >
          {g.category}
        </button>
      ))}
    </div>
  );

  return (
    <FilterDropdown
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      label="Round"
      activeCount={selected.size}
      searchPlaceholder="Search round..."
      searchValue={search}
      onSearchChange={setSearch}
      onReset={handleReset}
      onApply={handleApply}
      topContent={topContent}
    >
      {visibleGroups.length === 0 ? (
        <div className="py-4 text-center text-sm text-muted-foreground">No rounds found</div>
      ) : (
        visibleGroups.map((g) => (
          <div key={g.category} className="mb-3">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
              {g.category}
            </div>
            <div className="flex flex-wrap gap-2">
              {g.options.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggle(r)}
                  className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors
                    ${
                      tempSelected.has(r)
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border bg-background text-foreground hover:bg-secondary hover:border-primary/50'
                    }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        ))
      )}
    </FilterDropdown>
  );
}

// ─── Category filter ────────────────────────────────────────────────────────────
// Fallback grouping when no live groups are supplied — mirrors the
// GET /community/posts/options `categories` shape.
const CATEGORY_GROUPS_FALLBACK = [
  { category: 'Core Interview Types', options: ['Behavioral', 'Technical', 'Situational / Judgment'] },
  { category: 'Product / Business', options: ['Product Sense', 'Execution', 'Strategy', 'Analytical / Metrics', 'Case Study'] },
  { category: 'Engineering', options: ['Coding', 'System Design', 'Debugging / Troubleshooting'] },
  { category: 'Leadership & Communication', options: ['Leadership', 'Communication', 'Stakeholder Management', 'Collaboration / Conflict'] },
  { category: 'Career / Background', options: ['Resume / Background', 'Experience Deep Dive', 'Career Motivation', 'Company-specific Questions'] },
];

export function CategoryFilter({ groups, onApply, singleSelect }: { groups?: { category: string; options: string[] }[]; onApply?: (selected: string[]) => void; singleSelect?: boolean } = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tempSelected, setTempSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categoryGroups = groups && groups.length ? groups : CATEGORY_GROUPS_FALLBACK;

  useEffect(() => {
    if (isOpen) {
      setTempSelected(new Set(selected));
      setSearch('');
      setActiveCategory(null);
    }
  }, [isOpen, selected]);

  const toggle = (option: string) => {
    setTempSelected((prev) => {
      if (singleSelect) return prev.has(option) ? new Set() : new Set([option]);
      const next = new Set(prev);
      if (next.has(option)) next.delete(option);
      else next.add(option);
      return next;
    });
  };

  const handleApply = () => { setSelected(new Set(tempSelected)); onApply?.(Array.from(tempSelected)); };
  const handleReset = () => setTempSelected(new Set());

  const q = search.toLowerCase();
  const visibleGroups = (activeCategory ? categoryGroups.filter((g) => g.category === activeCategory) : categoryGroups)
    .map((g) => ({ category: g.category, options: g.options.filter((o) => o.toLowerCase().includes(q)) }))
    .filter((g) => g.options.length > 0);

  const topContent = (
    <div className="flex flex-wrap gap-1.5">
      {categoryGroups.map((g) => (
        <button
          key={g.category}
          type="button"
          onClick={() => setActiveCategory(activeCategory === g.category ? null : g.category)}
          className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
            activeCategory === g.category
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/70'
          }`}
        >
          {g.category}
        </button>
      ))}
    </div>
  );

  return (
    <FilterDropdown
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      label="Category"
      activeCount={selected.size}
      searchPlaceholder="Search category..."
      searchValue={search}
      onSearchChange={setSearch}
      onReset={handleReset}
      onApply={handleApply}
      topContent={topContent}
    >
      {visibleGroups.length === 0 ? (
        <div className="py-4 text-center text-sm text-muted-foreground">No categories found</div>
      ) : (
        visibleGroups.map((g) => (
          <div key={g.category} className="mb-2">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
              {g.category}
            </div>
            <div className="space-y-0.5">
              {g.options.map((option) => (
                <CheckboxRow
                  key={option}
                  option={option}
                  checked={tempSelected.has(option)}
                  onChange={() => toggle(option)}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </FilterDropdown>
  );
}

// ─── Level filter ──────────────────────────────────────────────────────────────
const LEVEL_OPTIONS = ['Junior', 'Intermediate', 'Senior', 'Staff'];

export function LevelFilter({ onApply, singleSelect }: { onApply?: (selected: string[]) => void; singleSelect?: boolean } = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tempSelected, setTempSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTempSelected(new Set(selected));
      setSearch('');
    }
  }, [isOpen, selected]);

  const toggle = (option: string) => {
    setTempSelected((prev) => {
      if (singleSelect) return prev.has(option) ? new Set() : new Set([option]);
      const next = new Set(prev);
      if (next.has(option)) next.delete(option);
      else next.add(option);
      return next;
    });
  };

  const handleApply = () => { setSelected(new Set(tempSelected)); onApply?.(Array.from(tempSelected)); };
  const handleReset = () => setTempSelected(new Set());

  const filteredOptions = LEVEL_OPTIONS.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <FilterDropdown
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      label="Level"
      activeCount={selected.size}
      searchPlaceholder="Search level..."
      searchValue={search}
      onSearchChange={setSearch}
      onReset={handleReset}
      onApply={handleApply}
    >
      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
        LEVEL
      </div>
      <div className="space-y-0.5">
        {filteredOptions.map((option) => (
          <CheckboxRow
            key={option}
            option={option}
            checked={tempSelected.has(option)}
            onChange={() => toggle(option)}
          />
        ))}
        {filteredOptions.length === 0 && (
          <div className="py-4 text-center text-sm text-muted-foreground">No levels found</div>
        )}
      </div>
    </FilterDropdown>
  );
}

// ─── Time filter ──────────────────────────────────────────────────────────────
const TIME_OPTIONS = ['Past week', 'Past month', 'Past 3 months', 'Past year'];

export function TimeFilter({ onApply, singleSelect }: { onApply?: (selected: string[]) => void; singleSelect?: boolean } = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tempSelected, setTempSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTempSelected(new Set(selected));
      setSearch('');
    }
  }, [isOpen, selected]);

  const toggle = (option: string) => {
    setTempSelected((prev) => {
      if (singleSelect) return prev.has(option) ? new Set() : new Set([option]);
      const next = new Set(prev);
      if (next.has(option)) next.delete(option);
      else next.add(option);
      return next;
    });
  };

  const handleApply = () => { setSelected(new Set(tempSelected)); onApply?.(Array.from(tempSelected)); };
  const handleReset = () => setTempSelected(new Set());

  const filteredOptions = TIME_OPTIONS.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <FilterDropdown
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      label="Time"
      activeCount={selected.size}
      searchPlaceholder="Search time..."
      searchValue={search}
      onSearchChange={setSearch}
      onReset={handleReset}
      onApply={handleApply}
    >
      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
        TIME
      </div>
      <div className="space-y-0.5">
        {filteredOptions.map((option) => (
          <CheckboxRow
            key={option}
            option={option}
            checked={tempSelected.has(option)}
            onChange={() => toggle(option)}
          />
        ))}
        {filteredOptions.length === 0 && (
          <div className="py-4 text-center text-sm text-muted-foreground">No times found</div>
        )}
      </div>
    </FilterDropdown>
  );
}
