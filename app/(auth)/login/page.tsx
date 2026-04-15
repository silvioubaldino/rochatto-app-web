"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Lock, Mail } from "lucide-react";

export default function LoginPage() {
  const { user, loading, signIn } = useAuth();
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Por favor, preencha todos os campos.");
      return;
    }

    setSigningIn(true);
    try {
      await signIn(email, password);
      toast.success("Login realizado com sucesso!");
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/invalid-credential") {
        toast.error("E-mail ou senha incorretos.");
      } else if (err.code === "auth/user-not-found") {
        toast.error("Usuário não cadastrado.");
      } else {
        toast.error("Erro ao fazer login. Tente novamente.");
      }
    } finally {
      setSigningIn(false);
    }
  }

  if (loading || user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-teal-50 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 drop-shadow-sm">
            Rochatto App
          </h1>
          <p className="text-muted-foreground font-medium">
            Painel Administrativo
          </p>
        </div>

        <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <h2 className="text-xl font-bold">Entrar</h2>
            <p className="text-sm text-muted-foreground">
              Apenas usuários autorizados podem acessar.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="voce@exemplo.com"
                    className="pl-10 h-11 transition-all focus:ring-2 focus:ring-primary/20"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10 h-11 transition-all focus:ring-2 focus:ring-primary/20"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full h-11 mt-6 text-base font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                disabled={signingIn}
              >
                {signingIn ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar no Sistema"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col border-t pt-4">
            <p className="text-xs text-center text-muted-foreground">
              Esqueceu sua senha? Entre em contato com o administrador.
            </p>
          </CardFooter>
        </Card>

        <p className="text-center text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">
          Rochatto App &copy; 2026 • v0.2.0
        </p>
      </div>
    </div>
  );
}
