"use client";

import { useState } from "react";
import type { Service } from "@/lib/types";
import { Input } from "@/components/ui/input";

interface ServicePickerProps {
  services: Service[];
  /** Nome exibido (pode ser texto livre, sem Service do catálogo). */
  value: string;
  onTextChange: (text: string) => void;
  onSelect: (service: Service) => void;
  placeholder?: string;
  className?: string;
}

/** Busca de Service do catálogo com fallback para texto livre (AYD-010 §2). */
export function ServicePicker({
  services,
  value,
  onTextChange,
  onSelect,
  placeholder = "Serviço (catálogo ou texto livre)...",
  className,
}: ServicePickerProps) {
  const [open, setOpen] = useState(false);
  const term = value.toLowerCase();
  const matches = services.filter((s) => s.name.toLowerCase().includes(term)).slice(0, 8);

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
          {matches.map((s) => (
            <button
              key={s.id}
              type="button"
              className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
              onMouseDown={() => {
                onSelect(s);
                setOpen(false);
              }}
            >
              {s.name}
              {s.unit && <span className="text-muted-foreground"> · {s.unit}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
