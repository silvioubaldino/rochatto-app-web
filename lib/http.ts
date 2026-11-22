import { getFirebaseAuth } from "./firebase";

import { ApiError } from "./errors";

export { ApiError, APIError, isApiError, errorMessage } from "./errors";

function apiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "";
}

async function getToken(): Promise<string> {
  const auth = getFirebaseAuth();
  // O shell abre antes do Firebase resolver a sessão: espera em vez de falhar com 401.
  if (typeof auth.authStateReady === "function") await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) throw new ApiError(401, "Não autenticado");
  return user.getIdToken();
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${apiBaseUrl()}/api/v1${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; field?: string };
    throw new ApiError(res.status, body.error ?? "Erro na requisição", body.field);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const http = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (path: string) => request<void>(path, { method: "DELETE" }),
};
