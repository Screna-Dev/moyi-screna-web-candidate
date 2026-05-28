import { useState, useRef, useCallback } from "react";
import { Search, ChevronDown, X, SlidersHorizontal, Columns3 } from "lucide-react";
import { C, filterChip, searchInput } from "./styles";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterDef {
  key: string;
  label: string;
  options: FilterOption[];
}

interface FilterBarProps {
  filters: FilterDef[];
  activeFilters: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  columns?: string[];
  hiddenColumns?: string[];
  onToggleColumn?: (col: string) => void;
  rightChildren?: React.ReactNode;
}

export function FilterBar({
  filters,
  activeFilters,
  onFilterChange,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  columns,
  hiddenColumns,
  onToggleColumn,
  rightChildren,
}: FilterBarProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showColumns, setShowColumns] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [columnsPos, setColumnsPos]   = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const chipRefs  = useRef<Record<string, HTMLButtonElement | null>>({});
  const colBtnRef = useRef<HTMLButtonElement | null>(null);

  const openFilter = useCallback((key: string) => {
    const el = chipRefs.current[key];
    if (el) {
      const r = el.getBoundingClientRect();
      setDropdownPos({ top: r.bottom + 6, left: r.left });
    }
    setOpenDropdown(openDropdown === key ? null : key);
  }, [openDropdown]);

  const openColumns = useCallback(() => {
    const el = colBtnRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      setColumnsPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    }
    setShowColumns((v) => !v);
  }, []);

  const hasActive = Object.values(activeFilters).some((v) => v !== "all" && v !== "");

  const clearAll = () => {
    filters.forEach((f) => onFilterChange(f.key, "all"));
    onSearchChange?.("");
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 16px",
        background: C.bgWhite,
        borderBottom: `1px solid ${C.border}`,
        flexWrap: "nowrap",
        overflowX: "auto",
        minHeight: 46,
      }}
    >
      {/* Search */}
      {onSearchChange && (
        <div style={{ position: "relative", flexShrink: 0 }}>
          <Search
            size={12}
            style={{
              position: "absolute",
              left: 9,
              top: "50%",
              transform: "translateY(-50%)",
              color: C.textSub,
              pointerEvents: "none",
            }}
          />
          <input
            value={searchValue ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            style={{ ...searchInput, width: 200 }}
          />
        </div>
      )}

      <div style={{ width: 1, height: 18, background: C.border, flexShrink: 0, marginLeft: 2, marginRight: 2 }} />

      {/* Filter chips */}
      {filters.map((f) => {
        const active = activeFilters[f.key];
        const isActive = active && active !== "all";
        const activeOption = f.options.find((o) => o.value === active);

        return (
          <div key={f.key} style={{ position: "relative", flexShrink: 0 }}>
            <button
              ref={(el) => { chipRefs.current[f.key] = el; }}
              onClick={() => openFilter(f.key)}
              style={filterChip(!!isActive)}
            >
              {f.label}
              {isActive && activeOption && (
                <span style={{ color: C.blue, fontWeight: 700 }}>: {activeOption.label}</span>
              )}
              <ChevronDown
                size={11}
                style={{
                  transition: "transform 150ms ease",
                  transform: openDropdown === f.key ? "rotate(180deg)" : "none",
                }}
              />
            </button>

            {openDropdown === f.key && (
              <>
                <div
                  style={{ position: "fixed", inset: 0, zIndex: 499 }}
                  onClick={() => setOpenDropdown(null)}
                />
                <div
                  style={{
                    position: "fixed",
                    top: dropdownPos.top,
                    left: dropdownPos.left,
                    background: C.bgWhite,
                    border: `1px solid ${C.border}`,
                    borderRadius: 9,
                    boxShadow: "0 4px 16px hsla(222, 22%, 15%, 0.1)",
                    minWidth: 160,
                    zIndex: 500,
                    padding: 4,
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {f.options.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { onFilterChange(f.key, opt.value); setOpenDropdown(null); }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                        padding: "6px 10px",
                        background: active === opt.value ? C.blueBg : "transparent",
                        color: active === opt.value ? C.blue : C.text,
                        fontWeight: active === opt.value ? 600 : 400,
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: 12,
                        fontFamily: "'Inter', sans-serif",
                        textAlign: "left",
                      }}
                    >
                      {opt.label}
                      {active === opt.value && <span style={{ fontSize: 10 }}>✓</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        );
      })}

      {/* Clear all */}
      {hasActive && (
        <button
          onClick={clearAll}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            height: 24,
            padding: "0 7px",
            background: "transparent",
            border: "none",
            borderRadius: 5,
            fontSize: 11,
            color: C.textMuted,
            cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
            flexShrink: 0,
          }}
        >
          <X size={10} />
          Clear
        </button>
      )}

      <div style={{ flex: 1 }} />

      {rightChildren}

      {/* Columns toggle */}
      {columns && onToggleColumn && (
        <div style={{ position: "relative", flexShrink: 0 }}>
          
          {showColumns && (
            <>
              <div
                style={{ position: "fixed", inset: 0, zIndex: 499 }}
                onClick={() => setShowColumns(false)}
              />
              <div
                style={{
                  position: "fixed",
                  top: columnsPos.top,
                  right: columnsPos.right,
                  background: C.bgWhite,
                  border: `1px solid ${C.border}`,
                  borderRadius: 9,
                  boxShadow: "0 4px 16px hsla(222, 22%, 15%, 0.1)",
                  minWidth: 180,
                  zIndex: 500,
                  padding: 4,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {columns.map((col) => {
                  const hidden = hiddenColumns?.includes(col);
                  return (
                    <button
                      key={col}
                      onClick={() => onToggleColumn(col)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        width: "100%",
                        padding: "6px 10px",
                        background: "transparent",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: 12,
                        color: C.text,
                        fontFamily: "'Inter', sans-serif",
                        textAlign: "left",
                      }}
                    >
                      <div
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 4,
                          border: `1.5px solid ${hidden ? C.border : C.blue}`,
                          background: hidden ? "transparent" : C.blueBg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {!hidden && <span style={{ fontSize: 9, color: C.blue, fontWeight: 700 }}>✓</span>}
                      </div>
                      {col}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
