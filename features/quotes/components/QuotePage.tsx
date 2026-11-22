"use client";

import { PageSkeleton } from "@/components/patterns/skeletons";
import { ErrorState } from "@/components/patterns/states";
import { useQuote } from "@/hooks/useQuote";
import { QuoteEditor } from "./QuoteEditor";
import { QuoteReadOnlyView } from "./QuoteReadOnlyView";

/** Orçamento por id: aberto = editor; ganho/perdido = visualização (T03/T04). */
export function QuotePage({ id }: { id: string }) {
  const { quote, isLoading, error, refresh } = useQuote(id);
  if (error) return <ErrorState message="Orçamento não encontrado." />;
  if (isLoading || !quote) return <PageSkeleton className="max-w-5xl" />;
  if (quote.status !== "OPEN") return <QuoteReadOnlyView quote={quote} />;
  return <QuoteEditor key={quote.id} quote={quote} refresh={() => refresh() as Promise<typeof quote | undefined>} />;
}
