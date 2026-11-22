"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/patterns/app-shell/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useOverdueCount } from "@/features/home/queries";
import { CommandPalette, useCommandPaletteShortcut } from "@/features/search/components/CommandPalette";
import "@/features/register";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const openSearch = useCallback(() => setSearchOpen(true), []);
  useCommandPaletteShortcut(openSearch);
  const overdue = useOverdueCount(!!user);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  return (
    <AppShell
      user={user ? { displayName: user.displayName, photoURL: user.photoURL, email: user.email } : null}
      badges={{ today: overdue }}
      onSignOut={handleSignOut}
      onSearch={openSearch}
    >
      {children}
      {user && <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />}
    </AppShell>
  );
}
