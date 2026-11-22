"use client";

import { Suspense, useCallback, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { ArrowLeft, ExternalLink, XIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/patterns/states";
import { PageSkeleton } from "@/components/patterns/skeletons";
import {
  entityHref,
  formatPeek,
  PEEK_PARAM,
  parsePeek,
  peekQuery,
  type EntityType,
  type PeekRef,
} from "./entity-model";

export interface PreviewData<T> {
  data: T | undefined;
  isLoading: boolean;
  error?: unknown;
  retry?: () => void;
}

export interface PreviewDefinition<T> {
  title: (data: T) => string;
  useData: (id: string) => PreviewData<T>;
  Body: ComponentType<{ data: T }>;
  Actions?: ComponentType<{ data: T }>;
}

const previews = new Map<EntityType, PreviewDefinition<never>>();

export function registerPreview<T>(type: EntityType, definition: PreviewDefinition<T>): void {
  previews.set(type, definition as unknown as PreviewDefinition<never>);
}

export function hasPreview(type: EntityType): boolean {
  return previews.has(type);
}

export function clearPreviewRegistry(): void {
  previews.clear();
}

// A abertura empilha UMA entrada de histórico; fechar volta nela (back) se foi o app que a abriu.
let pushedByApp = false;

export function usePeek() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const peek = parsePeek(params.get(PEEK_PARAM));

  const open = useCallback(
    (type: EntityType, id: string) => {
      const query = peekQuery(params, { type, id });
      const url = `${pathname}?${query}`;
      if (peek) {
        router.replace(url, { scroll: false });
      } else {
        pushedByApp = true;
        router.push(url, { scroll: false });
      }
    },
    [params, pathname, peek, router],
  );

  const close = useCallback(() => {
    if (pushedByApp) {
      pushedByApp = false;
      router.back();
      return;
    }
    const query = peekQuery(params, null);
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [params, pathname, router]);

  return { peek, open, close };
}

export function isPlainClick(e: { button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }) {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

function PreviewContent({ type, id, onClose }: { type: EntityType; id: string; onClose: () => void }) {
  const def = previews.get(type) as PreviewDefinition<unknown> | undefined;
  if (!def) return null;
  return <PreviewLoaded def={def} type={type} id={id} onClose={onClose} />;
}

function PreviewLoaded({
  def,
  type,
  id,
  onClose,
}: {
  def: PreviewDefinition<unknown>;
  type: EntityType;
  id: string;
  onClose: () => void;
}) {
  const { data, isLoading, error, retry } = def.useData(id);
  const title = data !== undefined ? def.title(data) : "Carregando…";
  return (
    <SheetFrame title={title} href={entityHref(type, id)} onClose={onClose} actions={data !== undefined && def.Actions ? <def.Actions data={data} /> : null}>
      {isLoading && data === undefined && <PageSkeleton />}
      {!!error && data === undefined && <ErrorState onRetry={retry} />}
      {data !== undefined && <def.Body data={data} />}
    </SheetFrame>
  );
}

function SheetFrame({
  title,
  href,
  onClose,
  actions,
  children,
}: {
  title: string;
  href: string;
  onClose: () => void;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <DialogPrimitive.Popup
      data-slot="entity-sheet"
      className="fixed inset-0 z-50 flex h-dvh w-full flex-col bg-popover text-sm text-popover-foreground outline-none transition duration-200 data-ending-style:translate-y-8 data-ending-style:opacity-0 data-starting-style:translate-y-8 data-starting-style:opacity-0 md:inset-y-0 md:right-0 md:left-auto md:max-w-md md:border-l md:shadow-lg md:data-ending-style:translate-x-8 md:data-ending-style:translate-y-0 md:data-starting-style:translate-x-8 md:data-starting-style:translate-y-0"
    >
      <header className="flex shrink-0 items-center gap-2 border-b px-2 pt-safe md:px-4">
        <DialogPrimitive.Close render={<Button variant="ghost" size="icon" aria-label="Fechar prévia" className="md:hidden" />}>
          <ArrowLeft aria-hidden />
        </DialogPrimitive.Close>
        <DialogPrimitive.Title className="min-w-0 flex-1 truncate py-3 text-base font-medium">{title}</DialogPrimitive.Title>
        <DialogPrimitive.Close render={<Button variant="ghost" size="icon-sm" aria-label="Fechar prévia" className="max-md:hidden" />}>
          <XIcon aria-hidden />
        </DialogPrimitive.Close>
      </header>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">{children}</div>
      <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t px-4 py-3 pb-safe">
        {actions}
        <Link href={href} onClick={onClose} className={buttonVariants({ variant: "outline" })}>
          <ExternalLink aria-hidden />
          Abrir página
        </Link>
      </footer>
    </DialogPrimitive.Popup>
  );
}

function SheetInner() {
  const { peek, close } = usePeek();
  const registered: PeekRef | null = peek && previews.has(peek.type) ? peek : null;
  return (
    <DialogPrimitive.Root
      open={registered !== null}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/30 max-md:hidden supports-backdrop-filter:backdrop-blur-xs" />
        {registered && <PreviewContent key={formatPeek(registered)} type={registered.type} id={registered.id} onClose={() => {
            // "Abrir página" navega: o peek sai da URL sozinho; esquece a entrada empilhada.
            pushedByApp = false;
          }} />}
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function EntitySheetHost() {
  return (
    <Suspense fallback={null}>
      <SheetInner />
    </Suspense>
  );
}
