/**
 * Erros da api. Vivem fora de `lib/http.ts` para que componentes possam tratar/mostrar um
 * erro sem importar o cliente de rede (regra 2 do AYD-011 §9.4).
 *
 * Erros viram `ApiError { status, message, field }` — o único tipo de erro que as telas
 * precisam tratar (AYD-011 §9.4 regra 6). `field` vem do corpo `{ error, field }` quando a
 * api aponta o campo inválido (ex.: closing com seção errada).
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** 409: regra de estado (Item travado, Sale cancelada, Σ parcelas > valor…). */
  get isConflict(): boolean {
    return this.status === 409;
  }
}

/** Alias legado (`APIError`) — telas antigas continuam compilando. */
export { ApiError as APIError };

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

/** Mensagem legível de qualquer erro, com `fallback` para o que não for ApiError. */
export function errorMessage(err: unknown, fallback = "Algo deu errado. Tente de novo."): string {
  return isApiError(err) ? err.message : fallback;
}

