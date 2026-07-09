const TOKEN_KEY = "rustlings_token";

export function saveToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function loadToken(): string {
  if (typeof window === "undefined") {
    // Server-side: fall back to env var (build-time safety only)
    return process.env.NEXT_PUBLIC_API_TOKEN ?? "";
  }
  return localStorage.getItem(TOKEN_KEY) ?? "";
}

export function clearToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function isAuthenticated(): boolean {
  return loadToken().length > 0;
}
