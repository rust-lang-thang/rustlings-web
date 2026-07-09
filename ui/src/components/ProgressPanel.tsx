import type { CategoryDetail } from "@/lib/api";

interface Props {
  category: CategoryDetail;
}

export default function ProgressPanel({ category }: Props) {
  const total = category.exercises.length;
  const completed = category.exercises.filter((e) => e.completed).length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const toGo = total - completed;

  return (
    <div
      className="rounded-lg p-4 mb-4"
      style={{ background: "#111111", border: "1px solid #262626" }}
    >
      <div
        className="text-[10px] uppercase tracking-widest mb-3"
        style={{ color: "#737373" }}
      >
        Your Progress
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Stat value={total} label="Exercises" />
        <Stat value={completed} label="Completed" />
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1.5" style={{ color: "#737373" }}>
          <span>{pct}%</span>
          <span>progress</span>
        </div>
        <div className="h-px rounded" style={{ background: "#262626" }}>
          <div
            className="h-px rounded transition-all"
            style={{ width: `${pct}%`, background: "#f97316" }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat value={toGo} label="To Go" />
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="text-lg font-bold" style={{ color: "#f5f5f5" }}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider" style={{ color: "#737373" }}>
        {label}
      </div>
    </div>
  );
}
