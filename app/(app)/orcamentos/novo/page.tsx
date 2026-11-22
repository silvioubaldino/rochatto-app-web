"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useBack } from "@/lib/history";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { api, APIError } from "@/lib/api";
import { formatMoeda } from "@/lib/formatters";
import type { Cliente, Produto, Service } from "@/lib/types";
import { useProdutos } from "@/hooks/useProdutos";
import { useServices } from "@/hooks/useServices";
import { ServicePicker } from "@/components/sales/ServicePicker";
import { ChargesEditor, toQuoteChargesPayload, type ChargeDraft } from "@/components/sales/ChargesEditor";
import { EntityCombobox } from "@/components/entity/EntityCombobox";
import { useUnsavedChangesGuard } from "@/components/patterns/useUnsavedChangesGuard";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Plus, Trash2, ArrowLeft } from "lucide-react";

const itemSchema = z.object({
  kind: z.enum(["PRODUCT", "SERVICE"]),
  product_id: z.string().optional(),
  service_id: z.string().optional(),
  product_name: z.string().min(1, "Produto ou serviço é obrigatório"),
  quantity: z.number().min(0.01, "Quantidade deve ser maior que 0"),
  unit_price: z.number().min(0, "Preço inválido"),
  unit_cost: z.number().min(0, "Custo inválido"),
});

const quoteSchema = z.object({
  customer_id: z.string().min(1, "Cliente é obrigatório"),
  quote_date: z.string().min(1, "Data é obrigatória"),
  referrer_id: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, "Adicione pelo menos um item"),
});

type QuoteFormData = z.infer<typeof quoteSchema>;

function AutocompleteDropdown<T extends { id: string }>({
  items,
  show,
  onSelect,
  renderLabel,
}: {
  items: T[];
  show: boolean;
  onSelect: (item: T) => void;
  renderLabel: (item: T) => string;
}) {
  if (!show || items.length === 0) return null;
  return (
    <div className="absolute top-full left-0 z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md">
      {items.slice(0, 8).map((item) => (
        <button
          key={item.id}
          type="button"
          className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
          onMouseDown={() => onSelect(item)}
        >
          {renderLabel(item)}
        </button>
      ))}
    </div>
  );
}

export default function NovoOrcamentoPage() {
  const router = useRouter();
  const back = useBack("/orcamentos");

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      customer_id: "",
      quote_date: format(new Date(), "yyyy-MM-dd"),
      referrer_id: "",
      notes: "",
      items: [
        {
          kind: "PRODUCT",
          product_id: "",
          service_id: "",
          product_name: "",
          quantity: 0,
          unit_price: 0,
          unit_cost: 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const watchItems = watch("items");
  const [charges, setCharges] = useState<ChargeDraft[]>([]);

  // F25: avisa antes de perder o que foi digitado (fechar a aba, clicar no menu, Cancelar).
  const { confirmDiscard } = useUnsavedChangesGuard((isDirty || charges.length > 0) && !isSubmitting);
  async function handleBack() {
    if (await confirmDiscard()) back();
  }

  const [produtoSearches, setProdutoSearches] = useState<Record<number, string>>({});
  const [showProdutoDropdown, setShowProdutoDropdown] = useState<Record<number, boolean>>({});

  const { produtos } = useProdutos();
  const { services } = useServices();

  const filteredProdutos = useCallback(
    (index: number) => {
      const search = (produtoSearches[index] || "").toLowerCase();
      if (!search) return [];
      return produtos.filter((p) => p.nome.toLowerCase().includes(search));
    },
    [produtos, produtoSearches],
  );

  const itemsTotal = useMemo(() => {
    return (watchItems || []).reduce(
      (acc, item) => acc + (item.quantity || 0) * (item.unit_price || 0),
      0,
    );
  }, [watchItems]);
  const chargesTotal = charges.reduce((acc, c) => acc + (c.amount || 0), 0);
  const totalQuote = itemsTotal + chargesTotal;

  function handleSelectCliente(id: string, cliente: Cliente | null) {
    setValue("customer_id", id, { shouldDirty: true, shouldValidate: !!id });
    // Customer que veio por um Partner: sugere a mesma indicação (editável).
    if (cliente?.lead_source === "PARTNER" && cliente.referrer_id && !getValues("referrer_id")) {
      setValue("referrer_id", cliente.referrer_id, { shouldDirty: true });
    }
  }

  function handleSelectProduto(index: number, produto: Produto) {
    setValue(`items.${index}.product_id`, produto.id);
    setValue(`items.${index}.product_name`, produto.nome);
    if (produto.preco_referencia) setValue(`items.${index}.unit_price`, produto.preco_referencia);
    if (produto.custo_referencia) setValue(`items.${index}.unit_cost`, produto.custo_referencia);
    setProdutoSearches((prev) => ({ ...prev, [index]: "" }));
    setShowProdutoDropdown((prev) => ({ ...prev, [index]: false }));
  }

  function handleSelectService(index: number, service: Service) {
    setValue(`items.${index}.service_id`, service.id);
    setValue(`items.${index}.product_name`, service.name);
    if (service.reference_price) setValue(`items.${index}.unit_price`, service.reference_price);
    if (service.reference_cost) setValue(`items.${index}.unit_cost`, service.reference_cost);
  }

  function addItem(kind: "PRODUCT" | "SERVICE" = "PRODUCT") {
    append({
      kind,
      product_id: "",
      service_id: "",
      product_name: "",
      quantity: 0,
      unit_price: 0,
      unit_cost: 0,
    });
  }

  function buildPayload(data: QuoteFormData) {
    return {
      ...data,
      referrer_id: data.referrer_id || null,
      notes: data.notes || null,
      charges: toQuoteChargesPayload(charges),
      // A api espera UUID ou null — string vazia é rejeitada (400).
      // AYD-010: Item de serviço não leva product_id; service_id é opcional (texto livre).
      items: data.items.map((item) =>
        item.kind === "SERVICE"
          ? { ...item, product_id: null, service_id: item.service_id || null }
          : { ...item, product_id: item.product_id || null, service_id: null },
      ),
    };
  }

  // Venda rápida (AYD-001): cria o Quote e converte em Sale num passo só.
  async function onQuickSale(data: QuoteFormData) {
    try {
      const result = await api.post<{ sale_id: string; quote_id: string }>(
        "/quotes/quick-sale",
        buildPayload(data),
      );
      toast.success("Venda criada com sucesso!");
      router.push(`/vendas/${result.sale_id}`);
    } catch (err) {
      const message = err instanceof APIError ? err.message : "Erro ao criar venda.";
      toast.error(message);
    }
  }

  async function onSubmit(data: QuoteFormData) {
    try {
      const created = await api.post<{ id: string }>("/quotes", buildPayload(data));
      toast.success("Orçamento criado com sucesso!");
      router.push(`/orcamentos/${created.id}`);
    } catch (err) {
      const message = err instanceof APIError ? err.message : "Erro ao criar orçamento.";
      toast.error(message);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Novo Orçamento</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* DADOS GERAIS */}
        <Card className="p-4 space-y-4">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">
            Dados Gerais
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Cliente: busca e "＋ Criar" que já seleciona o criado (UX-P03) */}
            <div className="space-y-2">
              <Label htmlFor="customer_id">Cliente *</Label>
              <Controller
                control={control}
                name="customer_id"
                render={({ field }) => (
                  <EntityCombobox
                    kind="customer"
                    id="customer_id"
                    value={field.value}
                    invalid={!!errors.customer_id}
                    onChange={(id, option) => handleSelectCliente(id, option?.raw ?? null)}
                  />
                )}
              />
              {errors.customer_id && (
                <p className="text-xs text-destructive">{errors.customer_id.message}</p>
              )}
            </div>

            {/* Data */}
            <div className="space-y-2">
              <Label htmlFor="quote_date">Data *</Label>
              <Input id="quote_date" type="date" {...register("quote_date")} />
              {errors.quote_date && (
                <p className="text-xs text-destructive">{errors.quote_date.message}</p>
              )}
            </div>

            {/* Partner / lead source */}
            <div className="space-y-2">
              <Label htmlFor="referrer_id">Indicação (Parceiro)</Label>
              <Controller
                control={control}
                name="referrer_id"
                render={({ field }) => (
                  <EntityCombobox
                    kind="partner"
                    id="referrer_id"
                    value={field.value ?? ""}
                    placeholder="Nenhuma"
                    onChange={(id) => field.onChange(id)}
                  />
                )}
              />
            </div>
          </div>
        </Card>

        {/* ITENS */}
        <Card className="p-4 space-y-4">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">
            Itens do Orçamento
          </h2>

          <div className="hidden sm:grid sm:grid-cols-[1fr_80px_110px_110px_32px] gap-2 text-xs font-medium text-muted-foreground px-1">
            <span>Produto / serviço</span>
            <span>Qtd</span>
            <span>Preço Venda</span>
            <span>Custo estimado</span>
            <span />
          </div>

          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid grid-cols-1 sm:grid-cols-[1fr_80px_110px_110px_32px] gap-2 items-start rounded-md border p-2 sm:border-0 sm:p-0"
            >
              {/* Produto ou serviço */}
              <div className="relative">
                <label className="text-xs text-muted-foreground sm:hidden">
                  {watchItems?.[index]?.kind === "SERVICE" ? "Serviço" : "Produto"}
                </label>
                {watchItems?.[index]?.kind === "SERVICE" ? (
                  <ServicePicker
                    services={services}
                    value={watchItems?.[index]?.product_name || ""}
                    onTextChange={(text) => {
                      setValue(`items.${index}.product_name`, text);
                      setValue(`items.${index}.service_id`, "");
                    }}
                    onSelect={(sv) => handleSelectService(index, sv)}
                    className="h-8 text-sm"
                  />
                ) : (
                <>
                <Input
                  placeholder="Buscar produto..."
                  value={
                    produtoSearches[index] !== undefined
                      ? produtoSearches[index]
                      : watchItems?.[index]?.product_name || ""
                  }
                  onChange={(e) => {
                    setProdutoSearches((prev) => ({ ...prev, [index]: e.target.value }));
                    setValue(`items.${index}.product_name`, e.target.value);
                    setValue(`items.${index}.product_id`, "");
                    setShowProdutoDropdown((prev) => ({ ...prev, [index]: true }));
                  }}
                  onFocus={() => {
                    if (produtoSearches[index]) {
                      setShowProdutoDropdown((prev) => ({ ...prev, [index]: true }));
                    }
                  }}
                  onBlur={() =>
                    setTimeout(
                      () => setShowProdutoDropdown((prev) => ({ ...prev, [index]: false })),
                      200,
                    )
                  }
                  className="h-8 text-sm"
                />
                <AutocompleteDropdown
                  items={filteredProdutos(index)}
                  show={showProdutoDropdown[index] || false}
                  onSelect={(p) => handleSelectProduto(index, p)}
                  renderLabel={(p) => p.nome}
                />
                </>
                )}
                {errors.items?.[index]?.product_name && (
                  <p className="text-xs text-destructive">
                    {errors.items[index].product_name?.message}
                  </p>
                )}
              </div>

              {/* Quantidade */}
              <div>
                <label className="text-xs text-muted-foreground sm:hidden">Qtd</label>
                <Controller
                  control={control}
                  name={`items.${index}.quantity`}
                  render={({ field: f }) => (
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      value={f.value || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^[0-9]*[,.]?[0-9]*$/.test(val)) {
                          f.onChange(parseFloat(val.replace(",", ".")) || 0);
                        }
                      }}
                      className="h-8 text-sm"
                    />
                  )}
                />
                {errors.items?.[index]?.quantity && (
                  <p className="text-xs text-destructive">
                    {errors.items[index].quantity?.message}
                  </p>
                )}
              </div>

              {/* Preço Venda */}
              <div>
                <label className="text-xs text-muted-foreground sm:hidden">Preço Venda</label>
                <Controller
                  control={control}
                  name={`items.${index}.unit_price`}
                  render={({ field: f }) => (
                    <MoneyInput value={f.value} onChange={f.onChange} className="h-8 text-sm" />
                  )}
                />
              </div>

              {/* Custo */}
              <div>
                <label className="text-xs text-muted-foreground sm:hidden">Custo</label>
                <Controller
                  control={control}
                  name={`items.${index}.unit_cost`}
                  render={({ field: f }) => (
                    <MoneyInput value={f.value} onChange={f.onChange} className="h-8 text-sm" />
                  )}
                />
              </div>

              {/* Remove */}
              <div className="flex items-end sm:items-center justify-end sm:justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => remove(index)}
                  disabled={fields.length <= 1}
                  title="Remover item"
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ))}

          {errors.items?.root && (
            <p className="text-xs text-destructive">{errors.items.root.message}</p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => addItem("PRODUCT")}>
              <Plus className="h-3.5 w-3.5" />
              Adicionar Produto
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => addItem("SERVICE")}>
              <Plus className="h-3.5 w-3.5" />
              Adicionar Serviço
            </Button>
          </div>
        </Card>

        {/* COBRANÇAS AO CLIENTE (AYD-009) */}
        <Card className="p-4 space-y-4">
          <div>
            <h2 className="text-sm font-semibold uppercase text-muted-foreground">
              Frete cobrado e outras cobranças
            </h2>
            <p className="text-xs text-muted-foreground">
              Somam ao preço ao cliente e viram parte da conta a receber.
            </p>
          </div>
          <ChargesEditor value={charges} onChange={setCharges} />
        </Card>

        {/* NOTAS */}
        <Card className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Notas sobre o orçamento..."
              {...register("notes")}
            />
          </div>
        </Card>

        {/* RESUMO */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-3">
            Resumo
          </h2>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Itens {formatMoeda(itemsTotal)} + cobranças {formatMoeda(chargesTotal)}
            </p>
            <p className="text-muted-foreground text-sm">Total do Orçamento</p>
            <p className="text-lg font-semibold">{formatMoeda(totalQuote)}</p>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isSubmitting}
            onClick={handleSubmit(onQuickSale)}
          >
            Venda rápida
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar Orçamento
          </Button>
        </div>
      </form>
    </div>
  );
}
