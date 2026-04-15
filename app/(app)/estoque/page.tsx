"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { EstoqueModal } from "@/components/forms/EstoqueModal";
import { useEstoque, useResumoEstoque } from "@/hooks/useEstoque";
import { useProdutos } from "@/hooks/useProdutos";
import { api } from "@/lib/api";
import { formatMoeda, formatData } from "@/lib/formatters";
import type { EstoqueEntrada } from "@/lib/types";

export default function EstoquePage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<EstoqueEntrada | undefined>(
    undefined,
  );
  const [deletando, setDeletando] = useState<EstoqueEntrada | undefined>(
    undefined,
  );

  // Filtros da aba Histórico
  const [filtroProdutoId, setFiltroProdutoId] = useState("");
  const [filtroInicio, setFiltroInicio] = useState("");
  const [filtroFim, setFiltroFim] = useState("");
  const [filtroAtivo, setFiltroAtivo] = useState<{
    produto_id?: string;
    data_inicio?: string;
    data_fim?: string;
  }>({});

  const { resumo, isLoading: resumoLoading, refresh: refreshResumo } =
    useResumoEstoque();
  const {
    entradas,
    isLoading: entradasLoading,
    refresh: refreshEntradas,
  } = useEstoque(filtroAtivo);
  const { produtos } = useProdutos();

  const valorTotalEstoque = resumo.reduce((s, r) => s + r.valor_total_estoque, 0);

  function abrirNovo() {
    setEditando(undefined);
    setModalOpen(true);
  }

  function abrirEditar(entrada: EstoqueEntrada) {
    setEditando(entrada);
    setModalOpen(true);
  }

  function handleSuccess() {
    refreshResumo();
    refreshEntradas();
  }

  function aplicarFiltros() {
    setFiltroAtivo({
      produto_id: filtroProdutoId || undefined,
      data_inicio: filtroInicio || undefined,
      data_fim: filtroFim || undefined,
    });
  }

  function limparFiltros() {
    setFiltroProdutoId("");
    setFiltroInicio("");
    setFiltroFim("");
    setFiltroAtivo({});
  }

  async function confirmarDelete() {
    if (!deletando) return;
    try {
      await api.delete(`/estoque/${deletando.id}`);
      toast.success("Entrada excluída com sucesso.");
      refreshResumo();
      refreshEntradas();
    } catch {
      toast.error("Erro ao excluir entrada.");
    } finally {
      setDeletando(undefined);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Estoque</h1>
        <Button onClick={abrirNovo}>
          <Plus className="h-4 w-4 mr-1" />
          Nova Entrada
        </Button>
      </div>

      <Tabs defaultValue="resumo">
        <TabsList>
          <TabsTrigger value="resumo">Resumo Atual</TabsTrigger>
          <TabsTrigger value="historico">Histórico de Entradas</TabsTrigger>
        </TabsList>

        {/* Aba Resumo */}
        <TabsContent value="resumo" className="mt-4">
          {resumoLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : resumo.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nenhum produto em estoque. Registre a primeira entrada.
            </p>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="py-3 px-4 text-left font-medium">Produto</th>
                    <th className="py-3 px-4 text-right font-medium">
                      Qtd Total
                    </th>
                    <th className="py-3 px-4 text-right font-medium">
                      Custo Médio
                    </th>
                    <th className="py-3 px-4 text-right font-medium">
                      Valor Total
                    </th>
                    <th className="py-3 px-4 text-right font-medium">
                      Última Entrada
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {resumo.map((r) => (
                    <tr
                      key={r.produto_id}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="py-3 px-4">{r.produto_nome}</td>
                      <td className="py-3 px-4 text-right">
                        {r.quantidade_total}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {formatMoeda(r.custo_medio)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {formatMoeda(r.valor_total_estoque)}
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground">
                        {formatData(r.ultima_entrada)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/50">
                    <td
                      colSpan={3}
                      className="py-3 px-4 text-right font-semibold"
                    >
                      Valor total em estoque:
                    </td>
                    <td className="py-3 px-4 text-right font-bold">
                      {formatMoeda(valorTotalEstoque)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Aba Histórico */}
        <TabsContent value="historico" className="mt-4 space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Produto</Label>
              <select
                value={filtroProdutoId}
                onChange={(e) => setFiltroProdutoId(e.target.value)}
                className="h-9 rounded-md border bg-background px-3 text-sm min-w-[180px]"
              >
                <option value="">Todos</option>
                {produtos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">De</Label>
              <Input
                type="date"
                value={filtroInicio}
                onChange={(e) => setFiltroInicio(e.target.value)}
                className="h-9 w-36"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Até</Label>
              <Input
                type="date"
                value={filtroFim}
                onChange={(e) => setFiltroFim(e.target.value)}
                className="h-9 w-36"
              />
            </div>
            <Button size="sm" onClick={aplicarFiltros}>
              Aplicar
            </Button>
            {(filtroAtivo.produto_id ||
              filtroAtivo.data_inicio ||
              filtroAtivo.data_fim) && (
              <Button size="sm" variant="outline" onClick={limparFiltros}>
                Limpar
              </Button>
            )}
          </div>

          {/* Tabela histórico */}
          {entradasLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : entradas.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nenhuma entrada registrada.
            </p>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="py-3 px-4 text-left font-medium">Data</th>
                    <th className="py-3 px-4 text-left font-medium">Produto</th>
                    <th className="py-3 px-4 text-left font-medium">
                      Fornecedor
                    </th>
                    <th className="py-3 px-4 text-right font-medium">Qtd</th>
                    <th className="py-3 px-4 text-right font-medium">
                      Custo Unit.
                    </th>
                    <th className="py-3 px-4 text-right font-medium">Total</th>
                    <th className="py-3 px-4 text-center font-medium">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entradas.map((e) => (
                    <tr
                      key={e.id}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        {formatData(e.data_entrada)}
                      </td>
                      <td className="py-3 px-4">{e.produto_nome}</td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {e.fornecedor_nome ?? "—"}
                      </td>
                      <td className="py-3 px-4 text-right">{e.quantidade_entrada}</td>
                      <td className="py-3 px-4 text-right">
                        {formatMoeda(e.custo_unit)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {formatMoeda(e.quantidade_entrada * e.custo_unit)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => abrirEditar(e)}
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeletando(e)}
                            title="Excluir"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal de entrada */}
      <EstoqueModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        entrada={editando}
        onSuccess={handleSuccess}
      />

      {/* Delete confirm */}
      <DeleteConfirmDialog
        open={!!deletando}
        onClose={() => setDeletando(undefined)}
        onConfirm={confirmarDelete}
        title="Excluir Entrada de Estoque"
        description="Tem certeza que deseja excluir esta entrada de estoque? Esta ação não pode ser desfeita."
      />
    </div>
  );
}
