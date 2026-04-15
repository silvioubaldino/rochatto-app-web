"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useNotificacoes } from "@/hooks/useDashboard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  LogOut,
  Menu,
  Loader2,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const mainNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Vendas", href: "/vendas", icon: <ShoppingCart className="h-4 w-4" /> },
  { label: "Clientes", href: "/clientes", icon: <Users className="h-4 w-4" /> },
  { label: "Catálogos", href: "/catalogos", icon: <BookOpen className="h-4 w-4" /> },
  { label: "Estoque", href: "/estoque", icon: <Package className="h-4 w-4" /> },
];

function SidebarContent({
  pathname,
  user,
  onSignOut,
  notifCount,
}: {
  pathname: string;
  user: { displayName: string | null; photoURL: string | null; email: string | null };
  onSignOut: () => void;
  notifCount: number;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-5">
        <h2 className="text-lg font-bold tracking-tight">Gestão de Vendas</h2>
      </div>

      <nav className="flex-1 space-y-1 px-2">
        {mainNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname === item.href || pathname.startsWith(item.href + "/")
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.icon}
            <span className="flex-1">{item.label}</span>
            {item.href === "/dashboard" && notifCount > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-red-500 text-white text-xs px-1.5 py-0.5 leading-none min-w-[1.25rem]">
                {notifCount}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <Separator />

      <div className="p-4 flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={user.photoURL ?? undefined} alt={user.displayName ?? ""} />
          <AvatarFallback>
            {user.displayName?.charAt(0)?.toUpperCase() ?? "U"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {user.displayName ?? user.email}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onSignOut} title="Sair">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { notificacoes } = useNotificacoes();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const sidebarUser = {
    displayName: user.displayName,
    photoURL: user.photoURL,
    email: user.email,
  };

  const notifCount = notificacoes.length;

  return (
    <div className="flex h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-r bg-background">
        <SidebarContent
          pathname={pathname}
          user={sidebarUser}
          onSignOut={handleSignOut}
          notifCount={notifCount}
        />
      </aside>

      {/* Mobile header + sheet */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex md:hidden items-center gap-2 border-b px-4 py-3">
          <Sheet>
            <SheetTrigger
              render={<Button variant="ghost" size="icon" />}
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-60 p-0">
              <SidebarContent
                pathname={pathname}
                user={sidebarUser}
                onSignOut={handleSignOut}
                notifCount={notifCount}
              />
            </SheetContent>
          </Sheet>
          <h1 className="text-sm font-semibold">Gestão de Vendas</h1>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
