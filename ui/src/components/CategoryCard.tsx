"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { CategoryListItem } from "@/lib/api";
import { ASSETS, MASCOT_SIZE } from "@/lib/assets";

// Production palette
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

interface Props {
  category: CategoryListItem;
}

export default function CategoryCard({ category }: Props) {
  const total = category.total_exercises;
  const completed = category.completed_exercises;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isDone = total > 0 && completed === total;
  const num = String(category.order_index).padStart(2, "0");
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={`/rustlings/${category.slug}`}
      className="flex flex-col gap-3 rounded-lg transition-all cursor-pointer"
      style={{
        background: isDone
          ? `linear-gradient(135deg, #d977570d 0%, transparent 50%), ${C.surface}`
          : C.surface,
        border: `1px solid ${isDone ? C.accentLine : C.border}`,
        padding: "16px 16px 14px",
        textDecoration: "none",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        setHovered(true);
        (e.currentTarget as HTMLElement).style.borderColor = isDone ? C.accent + "80" : C.borderStrong;
        (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        setHovered(false);
        (e.currentTarget as HTMLElement).style.borderColor = isDone ? C.accentLine : C.border;
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
      }}
    >
      {/* Disguised mascot on hover */}
      {hovered && (
        <div style={{
          position: "absolute",
          bottom: "8px",
          right: "10px",
          pointerEvents: "none",
          opacity: 0.92,
          transition: "opacity .15s",
        }}>
          <Image src={ASSETS.rustlings.mascots.disguised} alt="disguised rust" width={MASCOT_SIZE} height={MASCOT_SIZE} style={{ width: `${MASCOT_SIZE}px`, height: `${MASCOT_SIZE}px`, objectFit: "contain" }} />
        </div>
      )}

      {/* Top row: id + flag */}
      <div className="flex items-start justify-between gap-2">
        <div
          className="flex items-center gap-2"
          style={{ fontFamily: C.mono, fontSize: "10px", letterSpacing: ".12em", color: C.inkFaint, textTransform: "uppercase" }}
        >
          {/* Number glyph */}
          <span
            style={{
              background: isDone ? C.accentSoft : C.surface2,
              border: `1px solid ${isDone ? C.accentLine : C.border}`,
              color: C.accent,
              width: "32px",
              height: "32px",
              borderRadius: "6px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: C.mono,
              fontSize: "13px",
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {num}
          </span>
          RUSTLINGS / CATEGORY
        </div>

        {/* DONE flag */}
        {isDone && (
          <span
            style={{
              fontFamily: C.mono,
              fontSize: "9px",
              letterSpacing: ".14em",
              textTransform: "uppercase",
              color: C.green,
              background: C.greenSoft,
              borderRadius: "3px",
              padding: "2px 6px",
              flexShrink: 0,
            }}
          >
            DONE
          </span>
        )}
      </div>

      {/* Title */}
      <h2
        style={{
          fontSize: "17px",
          fontWeight: 600,
          letterSpacing: "-.015em",
          color: C.ink,
          margin: 0,
        }}
      >
        {category.name}
      </h2>

      {/* Blurb */}
      <p
        style={{
          fontSize: "12.5px",
          lineHeight: 1.55,
          color: C.inkDim,
          margin: 0,
        }}
      >
        Small exercises in {category.name.toLowerCase()} - fix the code, read the compiler, move to the next.
      </p>

      {/* Meta: exercises count */}
      <div
        style={{
          fontFamily: C.mono,
          fontSize: "10.5px",
          color: C.inkFaint,
        }}
      >
        {total} exercises · {completed} done
      </div>

      {/* Progress */}
      <div>
        <div
          className="flex justify-between"
          style={{ fontFamily: C.mono, fontSize: "10px", color: C.inkFaint, marginBottom: "5px" }}
        >
          <span>progress</span>
          <strong style={{ color: C.inkDim, fontWeight: 500 }}>
            {completed} / {total} · {pct}%
          </strong>
        </div>
        <div style={{ background: C.border, borderRadius: "2px", height: "3px", overflow: "hidden" }}>
          <span
            style={{
              display: "block",
              height: "100%",
              width: `${pct}%`,
              background: pct === 0 ? C.inkFaint : C.accent,
              opacity: pct === 0 ? 0.4 : 1,
              borderRadius: "2px",
            }}
          />
        </div>
      </div>

      {/* CTA */}
      <div
        className="flex items-center justify-between pt-2"
        style={{ borderTop: `1px dashed ${C.border}` }}
      >
        <span
          style={{ fontFamily: C.mono, fontSize: "10.5px", color: C.inkFaint }}
        >
          review category
        </span>
        <span
          style={{
            fontFamily: C.mono,
            fontSize: "10.5px",
            color: C.accent,
            border: `1px solid ${C.accentLine}`,
            background: C.accentSoft,
            borderRadius: "4px",
            padding: "3px 8px",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          review ›
        </span>
      </div>
    </Link>
  );
}
