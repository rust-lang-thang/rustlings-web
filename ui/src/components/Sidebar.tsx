"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { clearToken } from "@/lib/auth";

const C = {
  bg:       "#0d0f12",
  surface:  "#14171c",
  surface2: "#1a1e24",
  border:   "#1f242c",
  ink:      "#e8ecf1",
  inkFaint: "#5d6675",
  accent:   "#d97757",
  accentLine: "#d977574d",
  mono:     "var(--font-geist-mono, 'Geist Mono', ui-monospace, monospace)",
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    if (!changePasswordOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setChangePasswordOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [changePasswordOpen]);

  const handleLogout = () => {
    clearToken();
    setMenuOpen(false);
    router.replace("/login");
  };

  const handleOpenChangePassword = () => {
    setMenuOpen(false);
    setPasswordError(null);
    setPasswordSuccess(null);
    setChangePasswordOpen(true);
  };

  const handleChangePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Please fill in all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError("New password must be different from current password.");
      return;
    }

    setSavingPassword(true);

    try {
      const result = await api.changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess(result.message ?? "Password updated successfully.");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unable to change password.";

      if (msg.includes("401") || msg.includes("403")) {
        clearToken();
        router.replace("/login");
        return;
      }

      setPasswordError(extractApiMessage(msg));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <>
      <div
        className="fixed left-0 top-0 h-screen z-50 flex flex-col items-center py-2 gap-1"
        style={{ width: "44px", background: C.surface, borderRight: `1px solid ${C.border}` }}
      >
        {/* Logo mark */}
        <Link
          href="/rustlings"
          className="flex items-center justify-center rounded"
          style={{
            width: "26px",
            height: "26px",
            background: C.accent,
            color: "#14110d",
            fontFamily: C.mono,
            fontSize: "13px",
            fontWeight: 700,
            borderRadius: "6px",
            marginBottom: "4px",
            boxShadow: "0 0 12px #d977574d",
            textDecoration: "none",
          }}
        >
          R
        </Link>

        {/* Separator */}
        <div style={{ width: "100%", height: "1px", background: C.border, margin: "4px 0" }} />

        {/* Nav icons */}
        <NavBtn href="/rustlings" active={pathname.startsWith("/rustlings")} label="rustlings">
          {/* book icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 4v16h-12a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h12z"/>
            <path d="M19 16h-12a2 2 0 0 0 -2 2"/><path d="M9 8h6"/>
          </svg>
        </NavBtn>

        <div style={{ flex: 1 }} />

        <div ref={menuRef} style={{ position: "relative", marginBottom: "6px" }}>
          <button
            type="button"
            aria-label="account"
            title="account"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex items-center justify-center rounded transition-colors"
            style={{
              width: "30px",
              height: "30px",
              color: C.inkFaint,
              background: menuOpen ? C.bg : "transparent",
              borderRadius: "999px",
              border: `1px solid ${menuOpen ? C.accentLine : C.border}`,
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              if (!menuOpen) {
                (e.currentTarget as HTMLButtonElement).style.background = C.bg;
                (e.currentTarget as HTMLButtonElement).style.color = C.ink;
              }
            }}
            onMouseLeave={(e) => {
              if (!menuOpen) {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                (e.currentTarget as HTMLButtonElement).style.color = C.inkFaint;
              }
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21a8 8 0 1 0 -16 0" />
              <path d="M12 11a4 4 0 1 0 0 -8a4 4 0 0 0 0 8" />
            </svg>
          </button>

          {menuOpen && (
            <div
              style={{
                position: "absolute",
                left: "38px",
                bottom: "0",
                width: "168px",
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: "8px",
                boxShadow: "0 10px 30px #00000066",
                padding: "6px",
                display: "flex",
                flexDirection: "column",
                gap: "2px",
              }}
            >
              <button
                type="button"
                onClick={handleOpenChangePassword}
                style={menuItemStyle(false)}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = C.bg;
                  (e.currentTarget as HTMLButtonElement).style.color = C.ink;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  (e.currentTarget as HTMLButtonElement).style.color = C.inkFaint;
                }}
              >
                Change password
              </button>

              <button
                type="button"
                onClick={handleLogout}
                style={menuItemStyle(false)}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = C.bg;
                  (e.currentTarget as HTMLButtonElement).style.color = C.ink;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  (e.currentTarget as HTMLButtonElement).style.color = C.inkFaint;
                }}
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>

      {changePasswordOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 80,
            background: "#0d0f12cc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => {
            if (!savingPassword) {
              setChangePasswordOpen(false);
            }
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "380px",
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: "10px",
              boxShadow: "0 20px 40px #00000080",
              padding: "16px",
            }}
          >
            <div
              style={{
                fontFamily: C.mono,
                fontSize: "10px",
                letterSpacing: ".14em",
                textTransform: "uppercase",
                color: C.accent,
                marginBottom: "8px",
              }}
            >
              account security
            </div>
            <h2
              style={{
                margin: "0 0 14px",
                color: C.ink,
                fontSize: "20px",
                fontWeight: 600,
              }}
            >
              Change password
            </h2>

            <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <InputRow
                id="current-password"
                label="Current password"
                value={currentPassword}
                onChange={setCurrentPassword}
                autoComplete="current-password"
                disabled={savingPassword}
              />

              <InputRow
                id="new-password"
                label="New password"
                value={newPassword}
                onChange={setNewPassword}
                autoComplete="new-password"
                disabled={savingPassword}
              />

              <InputRow
                id="confirm-password"
                label="Confirm new password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
                disabled={savingPassword}
              />

              {passwordError && (
                <div
                  style={{
                    color: "#ff9a9a",
                    background: "#351d1d",
                    border: "1px solid #5a2d2d",
                    borderRadius: "6px",
                    fontFamily: C.mono,
                    fontSize: "11px",
                    padding: "7px 8px",
                  }}
                >
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div
                  style={{
                    color: "#8ce3af",
                    background: "#193326",
                    border: "1px solid #2b5440",
                    borderRadius: "6px",
                    fontFamily: C.mono,
                    fontSize: "11px",
                    padding: "7px 8px",
                  }}
                >
                  {passwordSuccess}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}>
                <button
                  type="button"
                  onClick={() => setChangePasswordOpen(false)}
                  disabled={savingPassword}
                  style={{
                    fontFamily: C.mono,
                    fontSize: "11px",
                    color: C.inkFaint,
                    background: "transparent",
                    border: `1px solid ${C.border}`,
                    borderRadius: "6px",
                    padding: "8px 10px",
                    cursor: savingPassword ? "not-allowed" : "pointer",
                    opacity: savingPassword ? 0.7 : 1,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPassword}
                  style={{
                    fontFamily: C.mono,
                    fontSize: "11px",
                    color: "#14110d",
                    background: C.accent,
                    border: "none",
                    borderRadius: "6px",
                    padding: "8px 10px",
                    cursor: savingPassword ? "not-allowed" : "pointer",
                    opacity: savingPassword ? 0.7 : 1,
                    minWidth: "126px",
                  }}
                >
                  {savingPassword ? "Updating..." : "Update password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function extractApiMessage(message: string): string {
  const separator = message.indexOf(":");
  if (separator === -1) return message;

  const extracted = message.slice(separator + 1).trim();
  return extracted.length > 0 ? extracted : message;
}

function InputRow({
  id,
  label,
  value,
  onChange,
  autoComplete,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  disabled: boolean;
}) {
  return (
    <label htmlFor={id} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <span style={{ fontFamily: C.mono, fontSize: "10.5px", color: C.inkFaint }}>{label}</span>
      <input
        id={id}
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        disabled={disabled}
        style={{
          background: C.surface2,
          color: C.ink,
          border: `1px solid ${C.border}`,
          borderRadius: "6px",
          padding: "8px 10px",
          fontSize: "13px",
          outline: "none",
        }}
      />
    </label>
  );
}

function menuItemStyle(disabled: boolean): React.CSSProperties {
  return {
    width: "100%",
    border: "none",
    borderRadius: "6px",
    background: "transparent",
    color: disabled ? "#5d6675" : "#9aa3b0",
    fontFamily: C.mono,
    fontSize: "11px",
    textAlign: "left",
    padding: "7px 8px",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.75 : 1,
  };
}

function NavBtn({
  href, active, label, children,
}: {
  href: string; active: boolean; label: string; children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className="flex items-center justify-center rounded transition-colors"
      style={{
        width: "30px",
        height: "30px",
        color: active ? C.accent : C.inkFaint,
        background: active ? C.bg : "transparent",
        borderRadius: "6px",
        position: "relative",
        textDecoration: "none",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = C.bg;
          (e.currentTarget as HTMLElement).style.color = C.ink;
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = "transparent";
          (e.currentTarget as HTMLElement).style.color = C.inkFaint;
        }
      }}
    >
      {/* Active indicator bar on left edge */}
      {active && (
        <span
          style={{
            content: "",
            background: C.accent,
            borderRadius: "0 1px 1px 0",
            width: "2px",
            position: "absolute",
            top: "6px",
            bottom: "6px",
            left: "-7px",
          }}
        />
      )}
      {children}
    </Link>
  );
}
