"use client";
import { useState, useMemo } from "react";
import Image from "next/image";
import CodeEditor, { type DiagnosticMarker } from "./CodeEditor";
import { api, type ExerciseWithProgress, type RunResponse } from "@/lib/api";
import { ASSETS } from "@/lib/assets";

// ─── Rustc output parser ───────────────────────────────────────────────────────

function stripAnsi(str: string): string {
  // Remove ANSI escape sequences (colors, bold, etc.)
  return str.replace(/\x1b\[[0-9;]*[mGKHFJABCDsu]/g, "");
}

function parseRustcDiagnostics(output: string): DiagnosticMarker[] {
  const markers: DiagnosticMarker[] = [];
  const lines = stripAnsi(output).split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match:  error[E0308]: message  /  error: message  /  warning: message
    const diagMatch = line.match(/^(error|warning)(?:\[([A-Z]\d+)\])?\s*:\s*(.+)/);
    if (!diagMatch) continue;

    const severity: DiagnosticMarker["severity"] =
      diagMatch[1] === "error" ? "error" : "warning";
    const code = diagMatch[2] ? `[${diagMatch[2]}] ` : "";
    const message = `${diagMatch[1]}${code ? " " + code : ""}: ${diagMatch[3].trim()}`;

    // Scan the next few lines for  --> file:line:col
    for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
      const locMatch = lines[j].match(/^\s*-->\s*[^:]*:(\d+):(\d+)/);
      if (locMatch) {
        const startLine = parseInt(locMatch[1], 10);
        const startCol = parseInt(locMatch[2], 10);

        // Try to detect the span length from the ^^^ underline on the
        // source-context line two lines below the location arrow.
        let endCol = startCol + 100;
        const caretLine = lines[j + 2];
        if (caretLine) {
          const caretMatch = caretLine.match(/\|\s*([\^-]+)/);
          if (caretMatch) endCol = startCol + caretMatch[1].length;
        }

        markers.push({
          startLineNumber: startLine,
          startColumn: startCol,
          endLineNumber: startLine,
          endColumn: endCol,
          message,
          severity,
        });
        break;
      }
    }
  }

  return markers;
}

const C = {
  bg:       "#0d0f12",
  surface:  "#14171c",
  surface2: "#1a1e24",
  border:   "#1f242c",
  borderStrong: "#2a313b",
  ink:      "#e8ecf1",
  inkDim:   "#9aa3b0",
  inkFaint: "#5d6675",
  accent:   "#d97757",
  accentSoft: "#d977571f",
  accentLine: "#d977574d",
  green:    "#7dd3a0",
  greenSoft: "#7dd3a01f",
  codeBg:   "#0a0c0f",
  noteBg:   "#17130f",
  noteBorder: "#7a523640",
  mono:     "var(--font-geist-mono, 'Geist Mono', ui-monospace, monospace)",
} as const;

interface Props {
  exercise: ExerciseWithProgress;
  onCompleted?: () => void;
}

export default function ExerciseCard({ exercise, onCompleted }: Props) {
  const [code, setCode] = useState(exercise.saved_code ?? exercise.starter_code);
  const [output, setOutput] = useState<RunResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [completed, setCompleted] = useState(exercise.completed);
  const num = String(exercise.order_index).padStart(2, "0");

  // Parse compiler output into editor diagnostic markers
  const diagnosticMarkers = useMemo<DiagnosticMarker[]>(() => {
    if (!output || output.success) return [];
    return parseRustcDiagnostics(output.output);
  }, [output]);

  const handleRun = async () => {
    setRunning(true);
    setOutput(null);
    try {
      const result = await api.run(exercise.id, code);
      setOutput(result);
      if (result.completed && !completed) {
        setCompleted(true);
        onCompleted?.();
      }
    } catch (err) {
      setOutput({ success: false, output: String(err), completed: false });
    } finally {
      setRunning(false);
    }
  };

  const handleReset = () => {
    setCode(exercise.starter_code);
    setOutput(null);
    setShowHint(false);
    setShowSolution(false);
  };
  return (
    <div
      id={exercise.id}
      style={{ borderBottom: `1px solid ${C.border}` }}
    >
      {/* Tab bar */}
      <div
        style={{
          background: C.surface2,
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "stretch",
          justifyContent: "space-between",
          height: "36px",
          paddingRight: "8px",
        }}
      >
        {/* File tab */}
        <div style={{ display: "flex", height: "100%" }}>
          <div
            style={{
              fontFamily: C.mono,
              fontSize: "11.5px",
              color: C.ink,
              borderRight: `1px solid ${C.border}`,
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              padding: "0 14px",
              position: "relative",
              background: C.bg,
            }}
          >
            {/* Active indicator at top */}
            <span style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1.5px", background: C.accent }} />
            <span style={{ color: C.inkFaint, fontSize: "10.5px", fontFamily: C.mono }}>{num}</span>
            {completed && (
              <span style={{
                width: "5px", height: "5px", borderRadius: "50%",
                background: C.accent, display: "inline-block",
              }} />
            )}
            <span>{exercise.name}.rs</span>
            {completed && (
              <span style={{
                fontFamily: C.mono, fontSize: "9px", letterSpacing: ".14em", textTransform: "uppercase",
                color: C.green, background: C.greenSoft, borderRadius: "3px", padding: "2px 6px",
              }}>
                DONE
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <ActionMini onClick={() => setShowHint((v) => !v)} active={showHint}>hint</ActionMini>
          <ActionMini onClick={() => setShowSolution((v) => !v)} active={showSolution}>solution</ActionMini>
          <ActionMini onClick={handleReset}>reset</ActionMini>

          {/* Divider */}
          <div style={{ background: C.border, width: "1px", height: "14px", margin: "0 4px" }} />

          {/* Run button */}
          <button
            onClick={handleRun}
            disabled={running}
            style={{
              fontFamily: C.mono, fontSize: "11px", fontWeight: 500,
              color: C.green, border: `1px solid #7dd3a040`,
              background: "transparent", borderRadius: "5px",
              padding: "5px 10px", cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: "6px",
              opacity: running ? 0.5 : 1,
              transition: "background .12s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#7dd3a014"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            ▶ {running ? "running..." : "run"}
          </button>
        </div>
      </div>

      {/* Code editor */}
      <CodeEditor value={code} onChange={setCode} markers={diagnosticMarkers} />

      {/* Status bar (mimics vb-statusbar) */}
      <div style={{
        borderTop: `1px solid ${C.border}`,
        height: "22px",
        fontFamily: C.mono,
        color: C.inkFaint,
        background: C.surface2,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 12px",
        fontSize: "10px",
      }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ color: completed ? C.green : C.inkFaint }}>
            {completed ? "● done" : "○ in progress"}
          </span>
          {diagnosticMarkers.filter((m) => m.severity === "error").length > 0 && (
            <span style={{ color: "#e05c5c", display: "inline-flex", alignItems: "center", gap: "3px" }}>
              <span style={{ fontSize: "9px" }}>✕</span>
              {diagnosticMarkers.filter((m) => m.severity === "error").length}
            </span>
          )}
          {diagnosticMarkers.filter((m) => m.severity === "warning").length > 0 && (
            <span style={{ color: "#E5B66E", display: "inline-flex", alignItems: "center", gap: "3px" }}>
              <span style={{ fontSize: "9px" }}>⚠</span>
              {diagnosticMarkers.filter((m) => m.severity === "warning").length}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span>{exercise.name}.rs</span>
        </div>
      </div>

      {/* Hint panel */}
      {showHint && exercise.hint && (
        <div style={{ borderTop: `1px solid ${C.noteBorder}`, background: C.noteBg }}>
          <div style={{ padding: "10px 14px 4px", fontFamily: C.mono, fontSize: "9.5px", letterSpacing: ".16em", textTransform: "uppercase", color: C.accent }}>
            hint
          </div>
          <pre style={{ padding: "0 14px 12px", fontSize: "12px", color: C.inkDim, fontFamily: C.mono, whiteSpace: "pre-wrap", margin: 0, userSelect: "text" }}>
            {exercise.hint}
          </pre>
        </div>
      )}

      {/* Solution panel */}
      {showSolution && (
        <div style={{ borderTop: `1px solid ${C.noteBorder}`, background: C.noteBg }}>
          <div style={{ padding: "10px 14px 4px", fontFamily: C.mono, fontSize: "9.5px", letterSpacing: ".16em", textTransform: "uppercase", color: C.accent }}>
            solution
          </div>
          {exercise.solution ? (
            <pre style={{
              margin: 0,
              padding: "0 14px 14px",
              maxHeight: "320px",
              overflow: "auto",
              fontFamily: C.mono,
              fontSize: "12px",
              lineHeight: 1.7,
              color: C.inkDim,
              whiteSpace: "pre",
              userSelect: "text",
            }}>
              {exercise.solution}
            </pre>
          ) : (
            <div style={{ padding: "0 14px 12px", fontFamily: C.mono, fontSize: "11px", color: C.inkFaint }}>
              No solution available for this exercise.
            </div>
          )}
        </div>
      )}

      {/* Output terminal */}
      {output && (
        <div style={{ borderTop: `1px solid ${C.border}`, background: C.codeBg }}>
          <div style={{ borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: "8px", padding: "6px 14px" }}>
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: output.success ? C.green : "#e88080", flexShrink: 0 }} />
            <span style={{ fontFamily: C.mono, fontSize: "9.5px", letterSpacing: ".12em", textTransform: "uppercase", color: C.inkFaint }}>
              {output.success ? "run success" : "run failed"}
            </span>
            {/* Pleading mascot on failure */}
            {!output.success && (
              <div style={{ marginLeft: "auto", flexShrink: 0 }}>
                <Image src={ASSETS.rustlings.mascots.pleading} alt="pleading rust" width={36} height={36} />
              </div>
            )}
          </div>
          <pre style={{
            padding: "12px 14px",
            fontSize: "11.5px",
            color: output.success ? C.inkDim : "#e88080",
            fontFamily: C.mono,
            whiteSpace: "pre-wrap",
            margin: 0,
            maxHeight: "192px",
            overflowY: "auto",
            lineHeight: 1.7,
          }}>
            {output.output || "(no output)"}
          </pre>
        </div>
      )}

      {/* Party mascot on completion */}
      {completed && (
        <div style={{
          borderTop: `1px solid ${C.border}`,
          background: C.surface2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          padding: "10px 14px",
        }}>
          <Image src={ASSETS.rustlings.mascots.party} alt="party rust" width={48} height={48} />
          <span style={{ fontFamily: C.mono, fontSize: "11px", color: C.green, letterSpacing: ".08em" }}>
            exercise completed!
          </span>
          <Image src={ASSETS.rustlings.mascots.party} alt="party rust" width={48} height={48} style={{ transform: "scaleX(-1)" }} />
        </div>
      )}
    </div>
  );
}

function ActionMini({
  onClick, active = false, children,
}: {
  onClick: () => void; active?: boolean; children: React.ReactNode;
}) {
  const C_inkFaint = "#5d6675";
  const C_ink = "#e8ecf1";
  const C_bg = "#0d0f12";
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: "var(--font-geist-mono, monospace)", fontSize: "10.5px",
        color: active ? C_ink : C_inkFaint, borderRadius: "4px",
        padding: "4px 8px", cursor: "pointer",
        background: active ? C_bg : "transparent",
        border: "none",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C_ink; }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = C_inkFaint; }}
    >
      {children}
    </button>
  );
}
