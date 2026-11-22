import { formatPaymentMethod } from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";

export function MovementPaymentLabel({ method }: { method: PaymentMethod | null }) {
  return <span className="text-muted-foreground">{formatPaymentMethod(method)}</span>;
}
