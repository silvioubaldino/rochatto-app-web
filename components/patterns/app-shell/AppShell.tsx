"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  FileText,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Plug,
  Plus,
  Search,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
  ChartColumn,
  BookOpen,
  Handshake,
  HandCoins,
  Hammer,
  Store,
  type LucideIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { noteInAppNavigation } from "@/lib/history";
import { ConfirmProvider } from "@/components/patterns/ConfirmDialog";
import { ResponsiveDialog } from "@/components/patterns/ResponsiveDialog";
import { PageSkeleton } from "@/components/patterns/skeletons";
import { EntitySheetHost } from "@/components/entity/EntitySheet";
import { QuickCreateProvider, hasQuickCreate, useQuickCreate } from "@/components/entity/quick-create";
import { SettleFlowProvider } from "@/components/entity/settle-flow";
import {
  BOTTOM_BAR_IDS,
  NAV_GROUPS,
  NEW_MENU,
  USER_MENU_ITEMS,
  findNavItem,
  isMoreActive,
  isNavActive,
  type NavIconName,
  type NavItem,
} from "./nav";

const ICONS: Record<NavIconName, LucideIcon> = {
  home: LayoutDashboard,
  indicators: ChartColumn,
  quotes: FileText,
  sales: ShoppingCart,
  customers: Users,
  partners: Handshake,
  purchases: Truck,
  stock: Package,
  suppliers: Store,
  receivables: Landmark,
  payables: HandCoins,
  movements: ArrowLeftRight,
  results: Wallet,
  products: BookOpen,
  services: Hammer,
  integrations: Plug,
};

export interface AppShellUser {
  displayName: string | null;
  photoURL: string | null;
  email: string | null;
}

export interface AppShellProps {
  /** `null` enquanto a sessão não resolveu: o shell já aparece e o conteúdo vira esqueleto. */
  user: AppShellUser | null;
  /** Contadores por id do item de navegação (`today`: vencidos…). */
  badges?: Partial<Record<string, number>>;
  onSignOut: () => void;
  /** Abre a busca global (U2). Sem isto o botão de busca não aparece. */
  onSearch?: () => void;
  children: ReactNode;
}

function Badge({ count }: { count?: number }) {
  if (!count) return null;
  return (
    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-danger px-1.5 py-0.5 text-xs leading-none text-danger-foreground">
      {count}
    </span>
  );
}

/**
 * Casca do app (UX-P13): barra do topo, lateral no desktop, barra inferior no celular
 * (Hoje · Orçamentos · ＋ · Vendas · Mais), áreas seguras, `dvh`. APARECE ANTES da
 * autenticação resolver — sem spinner de página inteira (F27): o conteúdo é esqueleto.
 * Também hospeda os serviços globais: ConfirmProvider, QuickCreateProvider, SettleFlowProvider, EntitySheet.
 */
export function AppShell(props: AppShellProps) {
  return (
    <ConfirmProvider>
      <QuickCreateProvider>
        <SettleFlowProvider>
          <ShellLayout {...props} />
        </SettleFlowProvider>
      </QuickCreateProvider>
    </ConfirmProvider>
  );
}

function ShellLayout({ user, badges = {}, onSignOut, onSearch, children }: AppShellProps) {
  const pathname = usePathname();
  // Cada menu guarda a rota em que foi aberto: navegar o fecha sem efeito (derivado no render).
  const [newAt, setNewAt] = useState<string | null>(null);
  const [moreAt, setMoreAt] = useState<string | null>(null);
  const newOpen = newAt === pathname;
  const moreOpen = moreAt === pathname;
  const setNewOpen = (open: boolean) => setNewAt(open ? pathname : null);
  const setMoreOpen = (open: boolean) => setMoreAt(open ? pathname : null);

  // "Voltar" precisa saber se há tela anterior do app (a primeira carga não conta).
  const first = useRef(true);
  useEffect(() => {
    if (first.current) first.current = false;
    else noteInAppNavigation();
  }, [pathname]);

  return (
    <div className="flex h-dvh flex-col bg-background">
      <TopBar user={user} onSearch={onSearch} />

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar md:flex" aria-label="Menu principal">
          <div className="px-4 py-5">
            <p className="text-lg font-bold tracking-tight">Gestão de Vendas</p>
          </div>
          <div className="space-y-2 px-3 pb-2">
            {onSearch && (
              <Button variant="outline" className="w-full justify-start text-muted-foreground" onClick={onSearch}>
                <Search aria-hidden />
                <span className="flex-1 text-left">Buscar</span>
                <kbd className="rounded border px-1.5 text-xs">Ctrl K</kbd>
              </Button>
            )}
            <Button className="w-full" onClick={() => setNewOpen(true)}>
              <Plus aria-hidden />
              Novo
            </Button>
          </div>
          <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-2">
            {NAV_GROUPS.map((group) => (
              <div key={group.id}>
                <p className="px-3 pb-1 text-xs font-medium text-muted-foreground">{group.label}</p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => (
                    <SidebarLink key={item.id} item={item} pathname={pathname} count={badges[item.id]} />
                  ))}
                </ul>
              </div>
            ))}
          </nav>
          <UserFooter user={user} onSignOut={onSignOut} />
        </aside>

        <main id="main" className="min-w-0 flex-1 overflow-y-auto px-4 py-4 md:p-6">
          {user ? children : <PageSkeleton className="max-w-4xl" />}
        </main>
      </div>

      <BottomBar
        pathname={pathname}
        badges={badges}
        onNew={() => setNewOpen(true)}
        onMore={() => setMoreOpen(true)}
      />

      <NewMenuDialog open={newOpen} onOpenChange={setNewOpen} />
      <MoreMenuDialog
        open={moreOpen}
        onOpenChange={setMoreOpen}
        pathname={pathname}
        badges={badges}
        user={user}
        onSignOut={onSignOut}
      />
      <EntitySheetHost />
    </div>
  );
}

function TopBar({ user, onSearch }: { user: AppShellUser | null; onSearch?: () => void }) {
  return (
    <header className="flex shrink-0 items-center gap-2 border-b px-4 pt-safe md:hidden">
      <p className="flex-1 py-3 text-base font-semibold">Gestão de Vendas</p>
      {onSearch && (
        <Button variant="ghost" size="icon" aria-label="Buscar" onClick={onSearch}>
          <Search aria-hidden />
        </Button>
      )}
      {user ? (
        <Avatar className="size-8">
          <AvatarImage src={user.photoURL ?? undefined} alt="" />
          <AvatarFallback>{user.displayName?.charAt(0)?.toUpperCase() ?? "U"}</AvatarFallback>
        </Avatar>
      ) : (
        <Skeleton className="size-8 rounded-full" />
      )}
    </header>
  );
}

function SidebarLink({ item, pathname, count }: { item: NavItem; pathname: string; count?: number }) {
  const Icon = ICONS[item.icon];
  const active = isNavActive(item, pathname);
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-9 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Icon className="size-4" aria-hidden />
        <span className="flex-1">{item.label}</span>
        <Badge count={count} />
      </Link>
    </li>
  );
}

function UserFooter({ user, onSignOut }: { user: AppShellUser | null; onSignOut: () => void }) {
  return (
    <div className="space-y-1 border-t p-3">
      {USER_MENU_ITEMS.map((item) => {
        const Icon = ICONS[item.icon];
        return (
          <Link
            key={item.id}
            href={item.href}
            className="flex min-h-9 items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Icon className="size-4" aria-hidden />
            {item.label}
          </Link>
        );
      })}
      <div className="flex items-center gap-3 px-3 pt-2">
        {user ? (
          <>
            <Avatar className="size-8">
              <AvatarImage src={user.photoURL ?? undefined} alt="" />
              <AvatarFallback>{user.displayName?.charAt(0)?.toUpperCase() ?? "U"}</AvatarFallback>
            </Avatar>
            <p className="min-w-0 flex-1 truncate text-sm font-medium">{user.displayName ?? user.email}</p>
          </>
        ) : (
          <Skeleton className="h-8 flex-1" />
        )}
        <Button variant="ghost" size="icon" onClick={onSignOut} title="Sair" aria-label="Sair">
          <LogOut aria-hidden />
        </Button>
      </div>
    </div>
  );
}

function BottomBar({
  pathname,
  badges,
  onNew,
  onMore,
}: {
  pathname: string;
  badges: Partial<Record<string, number>>;
  onNew: () => void;
  onMore: () => void;
}) {
  const cell =
    "flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs outline-none focus-visible:bg-muted";
  return (
    <nav
      aria-label="Navegação principal"
      className="grid shrink-0 grid-cols-5 border-t bg-background pb-safe px-safe md:hidden"
    >
      {BOTTOM_BAR_IDS.map((id) => {
        if (id === "new") {
          return (
            <button key={id} type="button" onClick={onNew} className={cell} aria-label="Novo">
              <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Plus className="size-5" aria-hidden />
              </span>
            </button>
          );
        }
        if (id === "more") {
          const active = isMoreActive(pathname);
          return (
            <button
              key={id}
              type="button"
              onClick={onMore}
              className={cn(cell, active ? "text-foreground" : "text-muted-foreground")}
            >
              <Menu className="size-5" aria-hidden />
              Mais
            </button>
          );
        }
        const item = findNavItem(id);
        if (!item) return null;
        const Icon = ICONS[item.icon];
        const active = isNavActive(item, pathname);
        return (
          <Link
            key={id}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(cell, "relative", active ? "font-medium text-foreground" : "text-muted-foreground")}
          >
            <Icon className="size-5" aria-hidden />
            {item.label}
            {badges[id] ? (
              <span className="absolute top-1.5 right-1/4">
                <Badge count={badges[id]} />
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

function NewMenuDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const quickCreate = useQuickCreate();
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="Novo" size="sm">
      <ul className="space-y-1">
        {NEW_MENU.map((entry) => {
          if (entry.quickCreate && !hasQuickCreate(entry.quickCreate)) return null;
          const base =
            "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-base hover:bg-muted md:text-sm";
          return (
            <li key={entry.id}>
              {entry.href ? (
                <Link href={entry.href} className={base}>
                  <Plus className="size-4" aria-hidden />
                  {entry.label}
                </Link>
              ) : (
                <button
                  type="button"
                  className={base}
                  onClick={() => {
                    onOpenChange(false);
                    if (entry.quickCreate) quickCreate.open(entry.quickCreate);
                  }}
                >
                  <Plus className="size-4" aria-hidden />
                  {entry.label}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </ResponsiveDialog>
  );
}

function MoreMenuDialog({
  open,
  onOpenChange,
  pathname,
  badges,
  user,
  onSignOut,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pathname: string;
  badges: Partial<Record<string, number>>;
  user: AppShellUser | null;
  onSignOut: () => void;
}) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="Menu" size="sm">
      <div className="space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.id}>
            <p className="px-1 pb-1 text-xs font-medium text-muted-foreground">{group.label}</p>
            <ul>
              {group.items.map((item) => {
                const Icon = ICONS[item.icon];
                const active = isNavActive(item, pathname);
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-11 items-center gap-3 rounded-lg px-3 text-base md:text-sm",
                        active ? "bg-muted font-medium" : "hover:bg-muted",
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                      <span className="flex-1">{item.label}</span>
                      <Badge count={badges[item.id]} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        <div className="border-t pt-3">
          {USER_MENU_ITEMS.map((item) => {
            const Icon = ICONS[item.icon];
            return (
              <Link key={item.id} href={item.href} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-base hover:bg-muted md:text-sm">
                <Icon className="size-4" aria-hidden />
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={onSignOut}
            className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-base hover:bg-muted md:text-sm"
          >
            <LogOut className="size-4" aria-hidden />
            Sair{user?.email ? ` (${user.email})` : ""}
          </button>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
