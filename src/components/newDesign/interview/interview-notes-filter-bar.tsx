type SortOption = "Hot" | "New" | "Top";

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
}

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

function FilterPill({
  label,
  value,
  onClick,
}: {
  label: string;
  value?: string;
  onClick?: () => void;
}) {
  const isActive = !!value && value !== label;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-[32px] items-center gap-[6px] rounded-full border bg-white px-[12.667px] py-[0.667px] font-sans text-[12px] font-medium leading-[16px] transition-colors hover:bg-secondary ${
        isActive ? "border-primary/40 text-primary" : "border-border text-muted-foreground"
      }`}
    >
      {isActive ? value : label}
      <ChevronDownIcon />
    </button>
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
}: InterviewNotesFilterBarProps) {
  const sortCycle: SortOption[] = ["Hot", "New", "Top"];

  function cycleSort() {
    const idx = sortCycle.indexOf(sort);
    onSortChange(sortCycle[(idx + 1) % sortCycle.length]);
  }

  return (
    <div className="flex w-full items-center gap-[16px]">
      {/* Filter pills row */}
      <div className="flex flex-1 flex-wrap items-center gap-[8px]">
        <FilterPill label="Role" value={role !== "Role" ? role : undefined} onClick={() => onRoleChange("Role")} />
        <FilterPill label="Company" value={company !== "Company" ? company : undefined} onClick={() => onCompanyChange("Company")} />
        <FilterPill label="Round" value={round !== "Round" ? round : undefined} onClick={() => onRoundChange("Round")} />
        <FilterPill label="Level" value={level !== "Level" ? level : undefined} onClick={() => onLevelChange("Level")} />
        <FilterPill label="Time" value={time !== "Time" ? time : undefined} onClick={() => onTimeChange("Time")} />
      </div>

      {/* Sort button */}
      <button
        type="button"
        onClick={cycleSort}
        className="flex shrink-0 items-center gap-[6px] font-sans text-[14px] font-medium leading-[20px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <FilterIcon />
        Sort: {sort}
      </button>
    </div>
  );
}
