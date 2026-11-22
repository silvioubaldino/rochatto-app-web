// Compatibilidade: o cliente HTTP agora vive em `lib/http.ts` (AYD-011 §9.2).
// Código novo importa `@/lib/http`; este módulo mantém as telas antigas compilando.
import { http, request } from "./http";

export { ApiError, APIError, isApiError } from "./http";
export const apiFetch = request;
export const api = http;
