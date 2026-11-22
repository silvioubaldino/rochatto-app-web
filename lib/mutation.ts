"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "./errors";
import { useEmit, type DomainEvent } from "./events";

export interface ApiMutationOptions<TArgs extends unknown[], TResult> {
  run: (...args: TArgs) => Promise<TResult>;
  emits: DomainEvent | readonly DomainEvent[];
  successMessage?: string | ((result: TResult) => string);
  errorFallback?: string;
  toastOnError?: boolean;
}

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
