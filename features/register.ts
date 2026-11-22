// Composição raiz dos registros de entidade: importado UMA vez por `app/(app)/layout.tsx`.
// Cada feature registra seus formulários de criação rápida (QuickCreate) e prévias (EntitySheet,
// pelos `previews.tsx` — importados por efeito colateral);
// `components/entity` não conhece as features (dependências só descem — AYD-011 §9.2).
import { registerQuickCreate } from "@/components/entity/quick-create";
import { registerSettleFlow } from "@/components/entity/settle-flow";
import { SettleFlow } from "./finance/components/SettleFlow";
import { CustomerForm } from "./customers/components/CustomerForm";
import { PartnerForm } from "./partners/components/PartnerForm";
import { SupplierForm } from "./suppliers/components/SupplierForm";
import { ProductForm } from "./catalog/components/ProductForm";
import { ServiceForm } from "./catalog/components/ServiceForm";
import "./customers/previews";
import "./sales/previews";
import "./quotes/previews";
import "./purchasing/previews";
import "./suppliers/previews";
import "./partners/previews";
import "./catalog/previews";
import "./finance/previews";

registerQuickCreate("customer", { title: "Novo cliente", Form: CustomerForm });
registerQuickCreate("product", { title: "Novo produto", Form: ProductForm });
registerQuickCreate("service", { title: "Novo serviço", Form: ServiceForm });
registerQuickCreate("supplier", { title: "Novo fornecedor ou prestador", Form: SupplierForm });
registerQuickCreate("partner", { title: "Novo parceiro", Form: PartnerForm });
registerSettleFlow(SettleFlow);
