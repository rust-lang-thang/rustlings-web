import { loadToken } from "./auth";

// Empty base - all API calls use relative paths so Next.js rewrites
// (next.config.js) can proxy them to the Rust API transparently,
// both in development and production.
const API_BASE = "";

function getToken() {
  return loadToken();
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export interface CategoryListItem {
  id: string;
  slug: string;
  name: string;
  order_index: number;
  total_exercises: number;
  completed_exercises: number;
}

export interface ExerciseWithProgress {
  id: string;
  name: string;
  order_index: number;
  starter_code: string;
  hint: string;
  solution: string;
  requires_test: boolean;
  completed: boolean;
  saved_code: string | null;
}

export interface CategoryDetail {
  id: string;
  slug: string;
  name: string;
  readme: string;
  order_index: number;
  exercises: ExerciseWithProgress[];
}

export interface ProgressStats {
  total_exercises: number;
  completed: number;
  percentage: number;
}

export interface MeResponse {
  user: { id: string; username: string; name: string | null; avatar: string | null };
  rustlings_progress: ProgressStats;
}

export interface RunResponse {
  success: boolean;
  output: string;
  completed: boolean;
}

export interface AuthResponse {
  token: string;
  user: { id: string; username: string; name: string | null; avatar: string | null };
}

export interface ChangePasswordResponse {
  message?: string;
}

export const api = {
  categories: () => apiFetch<CategoryListItem[]>("/rustlings/categories"),
  category: (slug: string) => apiFetch<CategoryDetail>(`/rustlings/categories/${slug}`),
  me: () => apiFetch<MeResponse>("/user/me"),
  run: (exercise_id: string, code: string): Promise<RunResponse> => {
    const encoded = btoa(unescape(encodeURIComponent(code)));
    return apiFetch<RunResponse>("/rustlings/run", {
      method: "POST",
      body: JSON.stringify({ exercise_id, code: encoded }),
    });
  },
  login: (username: string, password: string): Promise<AuthResponse> =>
    apiFetch<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  register: (username: string, password: string): Promise<AuthResponse> =>
    apiFetch<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  changePassword: (current_password: string, new_password: string): Promise<ChangePasswordResponse> =>
    apiFetch<ChangePasswordResponse>("/user/change-password", {
      method: "POST",
      body: JSON.stringify({ current_password, new_password }),
    }),
};
