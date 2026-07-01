import { useState } from "react";

type SortOption = "Hot" | "New" | "Top";

interface FilterOptions {
  role: string[];
  company: string[];
  round: string[];
  level: string[];
}

interface InterviewNotesFilterBarProps {
  sort: SortOption;
  onSortChange: (s: SortOption) => void;
  role: string;
  onRoleChange: (r: string) => void;
  company: string;
  onCompanyChange: (c: string) => void;
  round: string;
  onRoundChange: (r: string) => void;
  level: string;
  onLevelChange: (l: string) => void;
  time: string;
  onTimeChange: (t: string) => void;
  options: FilterOptions;
}

const TIME_OPTIONS = ["Past week", "Past month", "Past 3 months", "Past year"];
const SORT_OPTIONS: SortOption[] = ["Hot", "New", "Top"];

function ChevronDownIcon() {
  return (
    <svg className="size-[12px] shrink-0 opacity-50" fill="none" viewBox="0 0 12 12">
      <path d="M3 4.5L6 7.5L9 4.5" stroke="#656D81" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg className="size-[16px] shrink-0" fill="none" viewBox="0 0 16 16">
      <path d="M2 4H14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
      <path d="M4.66667 8H11.3333" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
      <path d="M6.66667 12H9.33333" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
    </svg>
  );
}

/**
 * A pill that opens a dropdown of options. `label` doubles as the "unset"
 * sentinel value — selecting "All" resets `value` back to it.
 */
function FilterDropdown({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: string;
  options: string[];
  onSelect: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const isActive = value !== label;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex h-[32px] items-center gap-[6px] rounded-full border bg-white px-[12.667px] py-[0.667px] font-sans text-[12px] font-medium leading-[16px] transition-colors hover:bg-secondary ${
          isActive ? "border-primary/40 text-primary" : "border-border text-muted-foreground"
        }`}
      >
        {isActive ? value : label}
        <ChevronDownIcon />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-[38px] z-50 flex max-h-[280px] min-w-[180px] flex-col overflow-auto rounded-[12px] border border-border bg-white p-1 shadow-lg">
            <button
              type="button"
              onClick={() => { onSelect(label); setOpen(false); }}
              className={`w-full rounded-md px-3 py-2 text-left font-sans text-[13px] transition-colors ${
                !isActive ? "bg-primary/10 text-primary" : "text-foreground hover:bg-secondary"
              }`}
            >
              All
            </button>
            {options.length === 0 ? (
              <div className="px-3 py-2 font-sans text-[12px] text-muted-foreground">No options</div>
            ) : (
              options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { onSelect(opt); setOpen(false); }}
                  className={`w-full rounded-md px-3 py-2 text-left font-sans text-[13px] transition-colors ${
                    opt === value ? "bg-primary/10 text-primary" : "text-foreground hover:bg-secondary"
                  }`}
                >
                  {opt}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function InterviewNotesFilterBar({
  sort,
  onSortChange,
  role,
  onRoleChange,
  company,
  onCompanyChange,
  round,
  onRoundChange,
  level,
  onLevelChange,
  time,
  onTimeChange,
  options,
}: InterviewNotesFilterBarProps) {
  const [sortOpen, setSortOpen] = useState(false);

  return (
    <div className="flex w-full items-center gap-[16px]">
      {/* Filter pills row */}
      <div className="flex flex-1 flex-wrap items-center gap-[8px]">
        <FilterDropdown label="Role" value={role} options={options.role} onSelect={onRoleChange} />
        <FilterDropdown label="Company" value={company} options={options.company} onSelect={onCompanyChange} />
        <FilterDropdown label="Round" value={round} options={options.round} onSelect={onRoundChange} />
        <FilterDropdown label="Level" value={level} options={options.level} onSelect={onLevelChange} />
        <FilterDropdown label="Time" value={time} options={TIME_OPTIONS} onSelect={onTimeChange} />
      </div>

      {/* Sort dropdown */}
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setSortOpen((o) => !o)}
          className="flex items-center gap-[6px] font-sans text-[14px] font-medium leading-[20px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <FilterIcon />
          Sort: {sort}
          <ChevronDownIcon />
        </button>
        {sortOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setSortOpen(false)} />
            <div className="absolute right-0 top-[28px] z-50 flex min-w-[140px] flex-col rounded-[12px] border border-border bg-white p-1 shadow-lg">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { onSortChange(opt); setSortOpen(false); }}
                  className={`w-full rounded-md px-3 py-2 text-left font-sans text-[13px] transition-colors ${
                    opt === sort ? "bg-primary/10 text-primary" : "text-foreground hover:bg-secondary"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
