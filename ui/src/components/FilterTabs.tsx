"use client";
import type { CategoryListItem } from "@/lib/api";

export type Filter = "all" | "in_progress" | "completed" | "untouched";

interface Props {
  value: Filter;
  onChange: (f: Filter) => void;
  categories: CategoryListItem[];
}

const mono = "var(--font-geist-mono, 'Geist Mono', ui-monospace, monospace)";

const TABS: { key: Filter; label: string }[] = [
  { key: "all", label: "all" },
  { key: "in_progress", label: "in progress" },
  { key: "completed", label: "completed" },
  { key: "untouched", label: "untouched" },
];

export default function FilterTabs({ value, onChange, categories }: Props) {
  const counts: Record<Filter, number> = {
    all: categories.length,
    in_progress: categories.filter(
      (c) => c.completed_exercises > 0 && c.completed_exercises < c.total_exercises
    ).length,
    completed: categories.filter(
      (c) => c.total_exercises > 0 && c.completed_exercises === c.total_exercises
    ).length,
    untouched: categories.filter((c) => c.completed_exercises === 0).length,
  };

  return (
    <div className="mb-6">
      {/* "filter by" label with line */}
      <div
        className="flex items-center gap-2 mb-3"
        style={{
          fontFamily: mono,
          fontSize: "9.5px",
          letterSpacing: ".16em",
          textTransform: "uppercase",
          color: "#5d6675",
        }}
      >
        <span>filter by</span>
        <span className="flex-1 h-px" style={{ background: "#1f242c" }} />
      </div>

      {/* Chips */}
      <div className="flex items-center gap-1 flex-wrap">
        {TABS.map((tab) => {
          const active = value === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className="inline-flex items-center gap-1.5 rounded cursor-pointer transition-colors"
              style={{
                fontFamily: mono,
                fontSize: "11px",
                padding: "4px 10px",
                background: active ? "#d977571f" : "#14171c",
                color: active ? "#d97757" : "#5d6675",
                border: `1px solid ${active ? "#d977574d" : "#1f242c"}`,
                borderRadius: "4px",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.color = "#9aa3b0";
                  (e.currentTarget as HTMLElement).style.borderColor = "#2a313b";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.color = "#5d6675";
                  (e.currentTarget as HTMLElement).style.borderColor = "#1f242c";
                }
              }}
            >
              {tab.label}
              {counts[tab.key] > 0 && (
                <span
                  style={{
                    fontSize: "9.5px",
                    opacity: 0.6,
                  }}
                >
                  {counts[tab.key]}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
