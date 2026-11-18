"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useAuthorizationRequest } from "@/hooks/useConnections";
import { api, APIError } from "@/lib/api";
import { loginUrlWithNext } from "@/lib/navigation";
import { formatConnectionScope, formatDataHora } from "@/lib/formatters";
import type { AuthorizationDecision } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Loader2, ShieldCheck } from "lucide-react";

// Fica fora do grupo (app): o layout protegido redirecionaria para /login e perderia a
// query (?request_id). Aqui o login é feito levando a URL completa em `?next=`.

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-teal-50 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
            Rochatto App
          </h1>
          <p className="text-muted-foreground font-medium">Conectar assistente</p>
        </div>
        {children}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function Notice({
  title,
  message,
  children,
}: {
  title: string;
  message: string;
  children?: React.ReactNode;
}) {
  return (
    <Shell>
      <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="space-y-1">
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground">{message}</p>
        </CardHeader>
        {children && <CardFooter>{children}</CardFooter>}
      </Card>
    </Shell>
  );
}

/** O `redirect_to` vem da API (confiável), mas só navegamos para http(s). */
function isNavigable(url: unknown): url is string {
  return typeof url === "string" && /^https?:\/\//i.test(url);
}

function ConnectContent() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get("request_id");
  const { request, isLoading, error } = useAuthorizationRequest(
    user && requestId ? requestId : null,
  );
  const [deciding, setDeciding] = useState<"approve" | "deny" | null>(null);
  const [decided, setDecided] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user && requestId) {
      router.replace(
        loginUrlWithNext(`/conectar?request_id=${encodeURIComponent(requestId)}`),
      );
    }
  }, [loading, user, requestId, router]);

  async function decide(action: "approve" | "deny") {
    if (!requestId) return;
    setDeciding(action);
    setDecisionError(null);
    try {
      const res = await api.post<AuthorizationDecision>(
        `/oauth/authorization-requests/${encodeURIComponent(requestId)}/${action}`,
        {},
      );
      if (!isNavigable(res?.redirect_to)) {
        setDecisionError("Resposta inesperada do servidor. Refaça a conexão pelo Claude.");
        setDeciding(null);
        return;
      }
      setDecided(true);
      window.location.assign(res.redirect_to);
    } catch (err) {
      setDeciding(null);
      if (err instanceof APIError && err.status === 409) {
        setDecisionError("Este pedido já foi decidido. Volte ao Claude.");
      } else if (err instanceof APIError && err.status === 404) {
        setDecisionError("Pedido de conexão expirado. Refaça pelo Claude.");
      } else if (err instanceof APIError && err.status === 403) {
        setDecisionError("Esta conta não tem autorização para conectar o assistente.");
      } else {
        setDecisionError(
          err instanceof APIError ? err.message : "Não foi possível concluir. Tente novamente.",
        );
      }
    }
  }

  if (!requestId) {
    return (
      <Notice
        title="Link de conexão inválido"
        message="Faltam dados no endereço. Refaça a conexão pelo Claude."
      />
    );
  }
  if (loading || !user || isLoading) return <Spinner />;

  if (error) {
    if (error instanceof APIError && error.status === 403) {
      return (
        <Notice
          title="Conta sem autorização"
          message={`A conta ${user.email ?? ""} não está autorizada a conectar o assistente. Entre com a conta do dono.`}
        >
          <Button
            variant="outline"
            onClick={async () => {
              await signOut();
            }}
          >
            Trocar de conta
          </Button>
        </Notice>
      );
    }
    if (error instanceof APIError && error.status === 404) {
      return (
        <Notice
          title="Pedido expirado"
          message="Pedido de conexão expirado; refaça pelo Claude."
        />
      );
    }
    return (
      <Notice
        title="Não foi possível carregar o pedido"
        message="Tente novamente ou refaça a conexão pelo Claude."
      >
        <Button variant="outline" onClick={() => window.location.reload()}>
          Tentar novamente
        </Button>
      </Notice>
    );
  }
  if (!request) return <Spinner />;

  const busy = deciding !== null || decided;

  return (
    <Shell>
      <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="space-y-1">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Conectar {request.client_name} ao Rochatto?
          </h2>
          <p className="text-sm text-muted-foreground">
            Você voltará para <strong>{request.redirect_host}</strong> depois de decidir.
            Confira se é o endereço esperado.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium">Esta conexão poderá:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {request.scopes.map((scope) => (
                <li key={scope}>{formatConnectionScope(scope)}</li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-muted-foreground">
            Conectado como {user.email}. Pedido válido até {formatDataHora(request.expires_at)}.
            Você pode desconectar a qualquer momento em Integrações.
          </p>
          {decisionError && (
            <p role="alert" className="text-sm text-destructive">
              {decisionError}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex gap-3 border-t pt-4">
          <Button className="flex-1" onClick={() => decide("approve")} disabled={busy}>
            {deciding === "approve" && <Loader2 className="h-4 w-4 animate-spin" />}
            Permitir
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => decide("deny")}
            disabled={busy}
          >
            {deciding === "deny" && <Loader2 className="h-4 w-4 animate-spin" />}
            Negar
          </Button>
        </CardFooter>
      </Card>
    </Shell>
  );
}

export default function ConnectPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ConnectContent />
    </Suspense>
  );
}
