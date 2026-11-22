"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/patterns/app-shell/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useNotificacoes } from "@/hooks/useDashboard";
import "@/features/register";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  // As notificações só carregam com sessão (o cliente HTTP espera o Firebase resolver).
  const { notificacoes } = useNotificacoes(!!user);

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
      badges={{ today: notificacoes.length }}
      onSignOut={handleSignOut}
    >
      {children}
    </AppShell>
  );
}
