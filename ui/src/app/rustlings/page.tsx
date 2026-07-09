"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { api, type CategoryListItem, type MeResponse } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { ASSETS } from "@/lib/assets";
import Sidebar from "@/components/Sidebar";
import CategoryCard from "@/components/CategoryCard";
import FilterTabs, { type Filter } from "@/components/FilterTabs";

// Production palette
const C = {
  bg:           "#0d0f12",
  surface:      "#14171c",
  surface2:     "#1a1e24",
  border:       "#1f242c",
  borderStrong: "#2a313b",
  ink:          "#e8ecf1",
  inkDim:       "#9aa3b0",
  inkFaint:     "#5d6675",
  accent:       "#d97757",
  accentSoft:   "#d977571f",
  accentLine:   "#d977574d",
  green:        "#7dd3a0",
  mono:         "var(--font-geist-mono, 'Geist Mono', ui-monospace, monospace)",
} as const;

export default function RustlingsPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryListItem[]>([]);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }

    Promise.all([api.categories(), api.me()])
      .then(([cats, meData]) => {
        setCategories(cats);
        setMe(meData);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("401") || msg.includes("403")) {
          router.replace("/login");
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  const filtered = categories.filter((cat) => {
    if (filter === "all") return true;
    if (filter === "completed")
      return cat.total_exercises > 0 && cat.completed_exercises === cat.total_exercises;
    if (filter === "in_progress")
      return cat.completed_exercises > 0 && cat.completed_exercises < cat.total_exercises;
    if (filter === "untouched") return cat.completed_exercises === 0;
    return true;
  });

  const totalExercises = me?.rustlings_progress.total_exercises ?? 0;
  const pct = me?.rustlings_progress.percentage ?? 0;

  return (
    <div className="flex min-h-screen" style={{ background: C.bg }}>
      <Sidebar />

      {/* Main content */}
      <main
        className="flex-1 overflow-y-auto"
        style={{ marginLeft: "44px", marginRight: "260px" }}
      >
        <div className="px-8 py-7">
          {/* Page head */}
          <div
            className="flex items-end justify-between gap-6 mb-5 pb-4"
            style={{ borderBottom: `1px dashed ${C.border}` }}
          >
            <div className="flex-1 min-w-0">
              {/* Eyebrow */}
              <div
                className="mb-2"
                style={{
                  fontFamily: C.mono,
                  fontSize: "10px",
                  letterSpacing: ".18em",
                  textTransform: "uppercase",
                  color: C.accent,
                }}
              >
                interactive exercises
              </div>
              {/* Title */}
              <h1
                className="mb-2"
                style={{
                  fontSize: "30px",
                  fontWeight: 600,
                  letterSpacing: "-.025em",
                  color: C.ink,
                  margin: "0 0 8px",
                }}
              >
                Rustlings - Web mode
              </h1>
              {/* Subtitle */}
              <p
                style={{
                  fontSize: "13px",
                  lineHeight: 1.6,
                  color: C.inkDim,
                  maxWidth: "520px",
                  margin: 0,
                }}
              >
                Small exercises to get you used to reading and writing Rust. Fix intentional
                errors, read the compiler, and watch your code turn green. Adapted from{" "}
                <a
                  href="https://github.com/rust-lang/rustlings"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: C.mono,
                    background: "#0a0c0f",
                    border: `1px solid ${C.border}`,
                    color: "#e89a7d",
                    borderRadius: "4px",
                    padding: "1px 6px",
                    fontSize: ".86em",
                    textDecoration: "none",
                  }}
                >
                  rust-lang/rustlings
                </a>
                .
              </p>
            </div>

            {/* Stats */}
            <div
              className="flex items-stretch shrink-0"
            >
              <StatBadge value={categories.length} label="categories" />
              <StatBadge value={totalExercises} label="exercises" divider />
              <StatBadge value={`${pct}%`} label="complete" divider />
            </div>
          </div>

          {/* Filter By */}
          <FilterTabs value={filter} onChange={setFilter} categories={categories} />

          {/* All Categories label */}
          <div
            className="flex items-center gap-2 mb-3"
            style={{
              fontFamily: C.mono,
              fontSize: "9.5px",
              letterSpacing: ".16em",
              textTransform: "uppercase",
              color: C.inkFaint,
            }}
          >
            <span>all categories</span>
            <span className="flex-1 h-px" style={{ background: C.border }} />
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-52 rounded-lg animate-pulse"
                  style={{ background: C.surface }}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filtered.map((cat) => (
                <CategoryCard key={cat.id} category={cat} />
              ))}
              {filtered.length === 0 && (
                <div
                  className="py-8"
                  style={{ color: C.inkFaint, gridColumn: "1 / -1" }}
                >
                  <div
                    style={{
                      border: `1px dashed ${C.borderStrong}`,
                      borderRadius: "10px",
                      background: C.surface,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "16px",
                      padding: "18px 16px",
                    }}
                  >
                    <Image
                      src={ASSETS.rustlings.mascots.confuse}
                      alt="confused rust mascot"
                      width={68}
                      height={68}
                    />
                    <div>
                      <div style={{ fontFamily: C.mono, fontSize: "11px", color: C.inkFaint }}>
                        no matches for current filter
                      </div>
                      <div style={{ fontSize: "12px", color: C.inkDim, marginTop: "4px" }}>
                        Try another filter to see categories again.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Right sidebar */}
      <div
        className="fixed right-0 top-0 h-screen overflow-y-auto flex flex-col gap-5 p-4"
        style={{
          width: "260px",
          background: C.surface,
          borderLeft: `1px solid ${C.border}`,
        }}
      >
        {/* Streak */}
        <div
          className="rounded-md p-3"
          style={{ background: C.bg, border: `1px solid ${C.border}` }}
        >
          <div
            className="mb-3"
            style={{
              fontFamily: C.mono,
              fontSize: "9.5px",
              letterSpacing: ".16em",
              textTransform: "uppercase",
              color: C.inkFaint,
            }}
          >
            your streak
          </div>
          <div
            className="flex items-baseline gap-1"
            style={{ fontFamily: C.mono, fontSize: "28px", fontWeight: 600, color: C.ink }}
          >
            0
            <small style={{ fontSize: "11px", fontWeight: 400, letterSpacing: ".08em", color: C.inkFaint }}>
              days
            </small>
          </div>
          {/* Streak grid - 28 cells, 2 rows × 14 cols */}
          <div
            className="mt-3"
            style={{ display: "grid", gridTemplateColumns: "repeat(14, 1fr)", gap: "2px" }}
          >
            {Array.from({ length: 27 }).map((_, i) => (
              <span
                key={i}
                style={{ background: C.border, borderRadius: "1.5px", height: "10px", display: "block" }}
              />
            ))}
            {/* Today */}
            <span
              style={{
                background: C.accent,
                borderRadius: "1.5px",
                height: "10px",
                display: "block",
                boxShadow: `0 0 0 1px ${C.accentLine}`,
              }}
            />
          </div>
        </div>

        {/* Continue where left off */}
        <div>
          <div
            className="mb-2"
            style={{
              fontFamily: C.mono,
              fontSize: "9.5px",
              letterSpacing: ".16em",
              textTransform: "uppercase",
              color: C.inkFaint,
            }}
          >
            continue where you left off
          </div>
          {categories.filter((c) => c.completed_exercises > 0 && c.completed_exercises < c.total_exercises).length === 0 ? (
            <div style={{ fontFamily: C.mono, fontSize: "11px", color: C.inkFaint }}>
              Complete your first exercise to start tracking.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
              {categories
                .filter((c) => c.completed_exercises > 0 && c.completed_exercises < c.total_exercises)
                .slice(0, 5)
                .map((c) => (
                  <a
                    key={c.id}
                    href={`/rustlings/${c.slug}`}
                    className="flex items-center justify-between rounded transition-colors"
                    style={{
                      fontFamily: C.mono,
                      fontSize: "11px",
                      color: C.inkDim,
                      padding: "6px 7px",
                      textDecoration: "none",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = C.bg;
                      (e.currentTarget as HTMLElement).style.color = C.ink;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                      (e.currentTarget as HTMLElement).style.color = C.inkDim;
                    }}
                  >
                    <span>{c.name}</span>
                    <span style={{ color: C.inkFaint, fontSize: "10px" }}>→</span>
                  </a>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatBadge({
  value,
  label,
  divider,
}: {
  value: number | string;
  label: string;
  divider?: boolean;
}) {
  const mono = "var(--font-geist-mono, 'Geist Mono', ui-monospace, monospace)";
  return (
    <div
      style={{
        borderLeft: divider ? `1px solid #1f242c` : undefined,
        paddingLeft: divider ? "18px" : undefined,
        paddingRight: "18px",
        textAlign: "left",
      }}
    >
      <div style={{ fontFamily: mono, fontSize: "22px", fontWeight: 600, color: "#e8ecf1", lineHeight: 1 }}>
        {value}
      </div>
      <div
        style={{
          fontFamily: mono,
          fontSize: "9.5px",
          letterSpacing: ".12em",
          textTransform: "uppercase",
          color: "#5d6675",
          marginTop: "6px",
        }}
      >
        {label}
      </div>
    </div>
  );
}
