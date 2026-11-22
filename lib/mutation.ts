"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "./errors";
import { useEmit, type DomainEvent } from "./events";

export interface ApiMutationOptions<TArgs extends unknown[], TResult> {
  /** A escrita (use `http.post/put/patch/delete`). */
  run: (...args: TArgs) => Promise<TResult>;
  /** Eventos de domínio emitidos quando a escrita dá certo. */
  emits: DomainEvent | readonly DomainEvent[];
  /** Toast de sucesso (texto fixo ou derivado do resultado). Omitido = sem toast. */
  successMessage?: string | ((result: TResult) => string);
  /** Mensagem quando a api não devolve `error` legível. */
  errorFallback?: string;
  /** Erro vira toast (padrão). `false` = só relança, para a tela mostrar no contexto (UX-P09). */
  toastOnError?: boolean;
}

/**
 * Padrão de escrita do app: executa, emite os eventos de domínio, avisa o dono.
 * `mutate(...args)` devolve o resultado, ou `undefined` se falhou (o erro já foi tratado).
 * `error` guarda o último `ApiError` para exibir no próprio diálogo/linha (409).
 */
export function useApiMutation<TArgs extends unknown[], TResult>(options: ApiMutationOptions<TArgs, TResult>) {
  const emit = useEmit();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const { run, emits, successMessage, errorFallback, toastOnError = true } = options;

  const mutate = useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      setPending(true);
      setError(null);
      try {
        const result = await run(...args);
        await emit(emits);
        if (successMessage) {
          toast.success(typeof successMessage === "function" ? successMessage(result) : successMessage);
        }
        return result;
      } catch (err) {
        setError(err);
        if (toastOnError) toast.error(errorMessage(err, errorFallback));
        return undefined;
      } finally {
        setPending(false);
      }
    },
    [run, emit, emits, successMessage, errorFallback, toastOnError],
  );

  /** Como `mutate`, mas RELANÇA o erro (para o `ConfirmDialog` mostrá-lo no próprio diálogo — UX-P09). */
  const mutateAsync = useCallback(
    async (...args: TArgs): Promise<TResult> => {
      setPending(true);
      setError(null);
      try {
        const result = await run(...args);
        await emit(emits);
        if (successMessage) toast.success(typeof successMessage === "function" ? successMessage(result) : successMessage);
        return result;
      } catch (err) {
        setError(err);
        throw err;
      } finally {
        setPending(false);
      }
    },
    [run, emit, emits, successMessage],
  );

  return { mutate, mutateAsync, pending, error, reset: () => setError(null) };
}
