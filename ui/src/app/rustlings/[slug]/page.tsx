"use client";
import { useState, useEffect, use } from "react";
import Link from "next/link";
import Image from "next/image";
import { api, type CategoryDetail, type CategoryListItem } from "@/lib/api";
import { ASSETS } from "@/lib/assets";
import Sidebar from "@/components/Sidebar";
import ExerciseCard from "@/components/ExerciseCard";

const C = {
  bg:          "#0d0f12",
  surface:     "#14171c",
  surface2:    "#1a1e24",
  border:      "#1f242c",
  borderStrong:"#2a313b",
  ink:         "#e8ecf1",
  inkDim:      "#9aa3b0",
  inkFaint:    "#5d6675",
  accent:      "#d97757",
  accentSoft:  "#d977571f",
  accentLine:  "#d977574d",
  green:       "#7dd3a0",
  greenSoft:   "#7dd3a01f",
  mono:        "var(--font-geist-mono, 'Geist Mono', ui-monospace, monospace)",
} as const;

export default function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [category, setCategory] = useState<CategoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allCategories, setAllCategories] = useState<CategoryListItem[]>([]);

  const load = (showLoader = true) => {
    if (showLoader) setLoading(true);
    api
      .category(slug)
      .then((data) => { setCategory(data); setError(null); })
      .catch((e: Error) => setError(e.message))
      .finally(() => { if (showLoader) setLoading(false); });
  };

  useEffect(() => { load(true); }, [slug]);

  useEffect(() => {
    api.categories().then(setAllCategories).catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen" style={{ background: C.bg }}>
        <Sidebar />
        <main className="flex-1" style={{ marginLeft: "44px" }}>
          <div className="p-8 space-y-4">
            {[40, 72, 72, 72].map((h, i) => (
              <div key={i} className="animate-pulse rounded-lg" style={{ height: `${h * 4}px`, background: C.surface }} />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: C.bg }}>
        <div className="text-center">
          <div className="text-sm mb-2" style={{ color: "#e88080" }}>{error ?? "Category not found"}</div>
          <Link href="/rustlings" className="text-xs" style={{ color: C.inkFaint }}>← back to all categories</Link>
        </div>
      </div>
    );
  }

  const total = category.exercises.length;
  const completed = category.exercises.filter((e) => e.completed).length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const toGo = total - completed;
  const num = String(category.order_index).padStart(2, "0");
  const nextExercise = category.exercises.find((e) => !e.completed);
  const nextCategory = allCategories.find(
    (c) => c.order_index === category.order_index + 1
  ) ?? null;

  return (
    <div className="flex min-h-screen" style={{ background: C.bg }}>
      <Sidebar />

      {/* Page: 2-column grid (content | right panel) */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ marginLeft: "44px", display: "grid", gridTemplateColumns: "1fr 280px", minHeight: "100vh" }}
      >
        {/* ── Left column ── */}
        <div style={{ borderRight: `1px solid ${C.border}`, minWidth: 0 }}>

          {/* Hero */}
          <div
            style={{
              background: `linear-gradient(#d977570a, transparent), ${C.surface}`,
              borderBottom: `1px dashed ${C.border}`,
              padding: "26px 32px 22px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Decorative grid overlay */}
            <div
              aria-hidden
              style={{
                position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.15,
                backgroundImage: `linear-gradient(${C.border} 1px, transparent 1px), linear-gradient(90deg, ${C.border} 1px, transparent 1px)`,
                backgroundSize: "24px 24px",
                WebkitMaskImage: "radial-gradient(60% 80% at 100% 0, #000, transparent 70%)",
                maskImage: "radial-gradient(60% 80% at 100% 0, #000, transparent 70%)",
              }}
            />

            {/* Breadcrumb */}
            <div
              className="flex items-center gap-2 mb-4"
              style={{ fontFamily: C.mono, fontSize: "10.5px", color: C.inkFaint, position: "relative" }}
            >
              <Link href="/rustlings" style={{ color: C.inkFaint, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.ink; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.inkFaint; }}
              >
                ‹ all categories
              </Link>
              <span style={{ opacity: 0.5 }}>/</span>
              <Link href="/rustlings" style={{ color: C.inkFaint, textDecoration: "none" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.ink; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.inkFaint; }}
              >
                rustlings
              </Link>
              <span style={{ opacity: 0.5 }}>·</span>
              <span style={{ color: C.ink }}>{category.slug}</span>
            </div>

            {/* Hero row: title area + progress card */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "end", gap: "28px", position: "relative" }}>
              <div>
                {/* Category eyebrow */}
                <div style={{ fontFamily: C.mono, fontSize: "10px", letterSpacing: ".16em", textTransform: "uppercase", color: C.accent, marginBottom: "8px" }}>
                  {num} · rustlings / category
                </div>
                {/* Title */}
                <h1 style={{ fontSize: "36px", fontWeight: 600, letterSpacing: "-.03em", color: C.ink, margin: "0 0 12px", lineHeight: 1.05 }}>
                  {category.name}
                </h1>
                {/* Subtitle */}
                <p style={{ color: C.inkDim, fontSize: "14px", lineHeight: 1.55, margin: "0 0 18px", maxWidth: "560px" }}>
                  {category.readme || `Small exercises in ${category.name.toLowerCase()}. Fix the intentional errors, read the compiler, and turn each one green.`}
                </p>
                {/* CTA */}
                {nextExercise && (
                  <a
                    href={`#${nextExercise.id}`}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "8px",
                      background: C.accent, color: "#14110d",
                      fontFamily: C.mono, fontSize: "11.5px", fontWeight: 600,
                      borderRadius: "5px", padding: "8px 14px",
                      textDecoration: "none",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#e58468"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = C.accent; }}
                  >
                    ▶ continue · {nextExercise.name}
                  </a>
                )}
              </div>

              {/* Progress card */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "8px", width: "240px", padding: "14px", flexShrink: 0 }}>
                <div style={{ fontFamily: C.mono, fontSize: "9.5px", letterSpacing: ".16em", textTransform: "uppercase", color: C.inkFaint, marginBottom: "10px" }}>
                  your progress
                </div>
                <div style={{ fontFamily: C.mono, fontSize: "32px", fontWeight: 600, color: C.ink, display: "flex", alignItems: "baseline", gap: "6px" }}>
                  {completed}
                  <small style={{ color: C.inkFaint, fontSize: "14px", fontWeight: 400 }}>/ {total}</small>
                </div>
                <div style={{ fontFamily: C.mono, color: C.inkFaint, fontSize: "10px", letterSpacing: ".06em", marginBottom: "12px" }}>
                  {pct}% complete · {toGo} to go
                </div>
                <div style={{ background: C.border, borderRadius: "2px", height: "4px", marginBottom: "12px", overflow: "hidden" }}>
                  <span style={{ display: "block", height: "100%", width: `${pct}%`, background: C.accent, borderRadius: "2px", transition: "width .3s" }} />
                </div>
                <div style={{ borderTop: `1px dashed ${C.border}`, fontFamily: C.mono, color: C.inkFaint, fontSize: "10px", display: "flex", justifyContent: "space-between", paddingTop: "10px" }}>
                  <span>exercises</span>
                  <strong style={{ color: C.inkDim, fontWeight: 500 }}>{total} total</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Module: All exercises */}
          <div style={{ padding: "22px 32px 40px" }}>
            <div style={{ border: `1px solid ${C.border}`, background: C.surface, borderRadius: "8px", overflow: "hidden" }}>
              {/* Module header */}
              <div style={{ borderBottom: `1px solid ${C.border}`, background: C.surface2, display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px" }}>
                <span style={{ fontFamily: C.mono, color: C.accent, fontSize: "10px", fontWeight: 600, letterSpacing: ".12em", flexShrink: 0 }}>
                  m{num}
                </span>
                <span style={{ color: C.ink, fontSize: "14px", fontWeight: 600, flex: 1 }}>
                  All exercises
                </span>
                <span style={{ fontFamily: C.mono, color: C.inkFaint, fontSize: "10.5px" }}>
                  {total} exercises · {completed} done
                </span>
              </div>

              {/* Exercise list */}
              {category.exercises.map((ex) => (
                <ExerciseCard key={ex.id} exercise={ex} onCompleted={() => load(false)} />
              ))}

              {!nextExercise && completed > 0 && (
                <div style={{ background: C.surface2, borderTop: `1px solid ${C.border}`, padding: "16px" }}>
                  {nextCategory ? (
                    <Link
                      href={`/rustlings/${nextCategory.slug}`}
                      style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "10px",
                        width: "100%",
                        background: C.greenSoft,
                        border: `1px solid ${C.green}4d`,
                        color: C.green,
                        fontFamily: C.mono, fontSize: "11.5px", fontWeight: 600,
                        borderRadius: "5px", padding: "10px 14px",
                        textDecoration: "none",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${C.green}33`; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = C.greenSoft; }}
                    >
                      <Image src={ASSETS.rustlings.mascots.party} width={20} height={20} alt="" unoptimized />
                      next · {nextCategory.name}
                      <span style={{ opacity: 0.7 }}>→</span>
                    </Link>
                  ) : (
                    <div style={{ fontFamily: C.mono, fontSize: "11px", color: C.green, textAlign: "center" }}>
                      ✓ all exercises complete
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right column ── */}
        <div
          style={{
            background: C.surface,
            display: "flex", flexDirection: "column", gap: "22px",
            padding: "22px 16px",
            overflowY: "auto",
            position: "sticky", top: 0, maxHeight: "100vh",
          }}
        >
          {/* AT A GLANCE */}
          <div>
            <div style={{ fontFamily: C.mono, fontSize: "9.5px", letterSpacing: ".16em", textTransform: "uppercase", color: C.inkFaint, marginBottom: "8px" }}>
              at a glance
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: C.border, border: `1px solid ${C.border}`, borderRadius: "6px", overflow: "hidden" }}>
              <GlanceStat value={total} label="exercises" />
              <GlanceStat value={completed} label="completed" />
              <GlanceStat value={`${pct}%`} label="progress" />
              <GlanceStat value={toGo} label="remaining" />
            </div>
          </div>

          {/* JUMP TO */}
          <div>
            <div style={{ fontFamily: C.mono, fontSize: "9.5px", letterSpacing: ".16em", textTransform: "uppercase", color: C.inkFaint, marginBottom: "6px" }}>
              jump to
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
              {category.exercises.map((ex) => (
                <a
                  key={ex.id}
                  href={`#${ex.id}`}
                  style={{ fontFamily: C.mono, color: C.inkDim, fontSize: "11px", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 7px", borderRadius: "4px", textDecoration: "none" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = C.bg; (e.currentTarget as HTMLElement).style.color = C.ink; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = C.inkDim; }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ color: C.inkFaint, fontSize: "10.5px" }}>
                      {String(ex.order_index).padStart(2, "0")}
                    </span>
                    <span>{ex.name}</span>
                  </span>
                  {ex.completed && (
                    <span style={{ color: C.green, fontSize: "12px" }}>✓</span>
                  )}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GlanceStat({ value, label }: { value: number | string; label: string }) {
  return (
    <div style={{ background: "#14171c", padding: "10px 12px" }}>
      <div style={{ fontFamily: "var(--font-geist-mono, monospace)", fontSize: "16px", fontWeight: 600, color: "#e8ecf1" }}>
        {value}
      </div>
      <div style={{ fontFamily: "var(--font-geist-mono, monospace)", fontSize: "9.5px", letterSpacing: ".06em", textTransform: "lowercase", color: "#5d6675", marginTop: "2px" }}>
        {label}
      </div>
    </div>
  );
}
