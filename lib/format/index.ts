export * from "./money";
export * from "./date";
export * from "./quantity";
export * from "./labels";
export * from "./tones";
export * from "./legacy";

import { formatMoney } from "./money";
import { formatDate, formatDateTime } from "./date";
import { formatQuantityNumber } from "./quantity";

export const formatMoeda = formatMoney;
export const formatData = formatDate;
export const formatDataHora = formatDateTime;
export const formatQuantidade = formatQuantityNumber;
export * from "./items-summary";
export * from "./doc-number";
