"use client";

import { useState } from "react";
import type { Produto } from "@/lib/types";
import { Input } from "@/components/ui/input";

interface ProductPickerProps {
  produtos: Produto[];
  /** Nome exibido (pode ser texto livre, sem Product do catálogo). */
  value: string;
  onTextChange: (text: string) => void;
  onSelect: (produto: Produto) => void;
  placeholder?: string;
  className?: string;
}

/** Busca de Product do catálogo com fallback para texto livre (padrão das telas de Sale). */
export function ProductPicker({
  produtos,
  value,
  onTextChange,
  onSelect,
  placeholder = "Produto...",
  className,
}: ProductPickerProps) {
  const [open, setOpen] = useState(false);
  const term = value.toLowerCase();
  const matches = produtos.filter((p) => p.nome.toLowerCase().includes(term)).slice(0, 8);

  return (
    <div className="relative">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onTextChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        className={className}
      />
      {open && matches.length > 0 && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full min-w-48 max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md">
          {matches.map((p) => (
            <button
              key={p.id}
              type="button"
              className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
              onMouseDown={() => {
                onSelect(p);
                setOpen(false);
              }}
            >
              {p.nome}
              {p.unidade && <span className="text-muted-foreground"> · {p.unidade}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
