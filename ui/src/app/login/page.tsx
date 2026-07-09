"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { saveToken } from "@/lib/auth";

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
  mono:        "var(--font-geist-mono, 'Geist Mono', ui-monospace, monospace)",
} as const;

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result =
        mode === "login"
          ? await api.login(username, password)
          : await api.register(username, password);

      saveToken(result.token);
      router.push("/rustlings");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      // Make API error messages friendlier
      if (message.includes("401") || message.includes("Unauthorized")) {
        setError("Invalid username or password.");
      } else if (message.includes("409") || message.includes("Conflict")) {
        setError("Username is already taken.");
      } else if (message.includes("422") || message.includes("Unprocessable")) {
        setError("Please check your input and try again.");
      } else {
        setError("Could not connect to the server. Try again later.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: C.bg }}
    >
      <div
        className="w-full"
        style={{
          maxWidth: "380px",
          margin: "0 auto",
          padding: "0 16px",
        }}
      >
        {/* Icon + heading */}
        <div className="flex flex-col items-center mb-8">
          {/* Rust logo mark */}
          <div
            style={{
              width: "48px",
              height: "48px",
              background: C.accent,
              color: "#14110d",
              fontFamily: C.mono,
              fontSize: "22px",
              fontWeight: 700,
              borderRadius: "12px",
              boxShadow: `0 0 32px ${C.accentLine}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "20px",
            }}
          >
            R
          </div>

          <h1
            style={{
              fontSize: "22px",
              fontWeight: 600,
              letterSpacing: "-.025em",
              color: C.ink,
              margin: "0 0 8px",
              textAlign: "center",
            }}
          >
            Welcome to Rustlings Web
          </h1>
          <p
            style={{
              fontSize: "13px",
              color: C.inkDim,
              margin: 0,
              textAlign: "center",
              lineHeight: 1.6,
            }}
          >
            Sign in to your account or create a new one
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: "10px",
            padding: "24px",
          }}
        >
          {/* Mode toggle */}
          <div
            className="flex mb-6"
            style={{
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: "7px",
              padding: "3px",
            }}
          >
            <ModeTab
              label="Sign in"
              active={mode === "login"}
              onClick={() => { setMode("login"); setError(null); }}
            />
            <ModeTab
              label="Create account"
              active={mode === "register"}
              onClick={() => { setMode("register"); setError(null); }}
            />
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {/* Username field */}
            <Field
              id="username"
              label="Username"
              type="text"
              value={username}
              onChange={setUsername}
              autoComplete="username"
              autoFocus
            />

            {/* Password field */}
            <Field
              id="password"
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />

            {/* Error */}
            {error && (
              <div
                style={{
                  fontSize: "12px",
                  color: "#f87171",
                  background: "#f8717114",
                  border: "1px solid #f8717130",
                  borderRadius: "6px",
                  padding: "8px 12px",
                  marginBottom: "16px",
                  fontFamily: C.mono,
                }}
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <SubmitButton loading={loading} mode={mode} />
          </form>
        </div>

        {/* Footer */}
        <p
          style={{
            textAlign: "center",
            marginTop: "24px",
            fontSize: "12px",
            fontFamily: C.mono,
            color: C.inkFaint,
          }}
        >
          rustlings web — learn rust, one exercise at a time
        </p>
      </div>
    </div>
  );
}

function ModeTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: "6px 0",
        fontSize: "12.5px",
        fontWeight: active ? 500 : 400,
        color: active ? C.ink : C.inkFaint,
        background: active ? C.surface : "transparent",
        border: active ? `1px solid ${C.borderStrong}` : "1px solid transparent",
        borderRadius: "5px",
        cursor: "pointer",
        transition: "all 0.15s",
        fontFamily: "inherit",
      }}
    >
      {label}
    </button>
  );
}

function Field({
  id,
  label,
  type,
  value,
  onChange,
  autoComplete,
  autoFocus,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ marginBottom: "14px" }}>
      <label
        htmlFor={id}
        style={{
          display: "block",
          fontSize: "11.5px",
          fontWeight: 500,
          color: C.inkDim,
          marginBottom: "6px",
          letterSpacing: ".01em",
        }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        required
        style={{
          display: "block",
          width: "100%",
          padding: "8px 11px",
          fontSize: "13.5px",
          color: C.ink,
          background: C.bg,
          border: `1px solid ${focused ? C.accentLine : C.border}`,
          borderRadius: "6px",
          outline: "none",
          fontFamily: "inherit",
          transition: "border-color 0.15s",
          boxShadow: focused ? `0 0 0 3px ${C.accentSoft}` : "none",
        }}
      />
    </div>
  );
}

function SubmitButton({ loading, mode }: { loading: boolean; mode: "login" | "register" }) {
  const label = mode === "login" ? "Sign in" : "Create account";

  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        display: "block",
        width: "100%",
        padding: "9px 0",
        marginTop: "6px",
        fontSize: "13.5px",
        fontWeight: 600,
        color: "#14110d",
        background: loading ? "#a0604a" : C.accent,
        border: "none",
        borderRadius: "6px",
        cursor: loading ? "not-allowed" : "pointer",
        transition: "background 0.15s",
        fontFamily: "inherit",
        letterSpacing: ".01em",
      }}
      onMouseEnter={(e) => {
        if (!loading) (e.currentTarget as HTMLElement).style.background = "#e8875f";
      }}
      onMouseLeave={(e) => {
        if (!loading) (e.currentTarget as HTMLElement).style.background = C.accent;
      }}
    >
      {loading ? "Please wait..." : label}
    </button>
  );
}
