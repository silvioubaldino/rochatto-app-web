// Formatação e rótulos — fonte única (AYD-011 §9.2). `lib/formatters.ts` re-exporta daqui.
export * from "./money";
export * from "./date";
export * from "./quantity";
export * from "./labels";
export * from "./tones";
export * from "./legacy";

import { formatMoney } from "./money";
import { formatDate, formatDateTime } from "./date";
import { formatQuantityNumber } from "./quantity";

// Nomes antigos (PT) — telas legadas. Código novo usa formatMoney/formatDate/formatQuantity.
export const formatMoeda = formatMoney;
export const formatData = formatDate;
export const formatDataHora = formatDateTime;
export const formatQuantidade = formatQuantityNumber;
export * from "./items-summary";
