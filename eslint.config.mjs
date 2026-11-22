import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Regras de código do AYD-011 §9.4 (regra 4 e regra 2). Severidade:
//   · ERRO em código novo: `features/`, `components/patterns/`, `components/entity/`;
//   · AVISO nas telas legadas (`app/`, `components/`, `hooks/`) — somem conforme migram
//     (migração incremental, §9.6); o build passa com avisos.

const COLOR_NAMES =
  "red|green|yellow|blue|gray|grey|slate|zinc|neutral|stone|orange|amber|lime|emerald|teal|cyan|sky|indigo|violet|purple|fuchsia|pink|rose";
const COLOR_UTILS =
  "text|bg|border|ring|fill|stroke|from|to|via|divide|outline|accent|decoration|shadow|caret|placeholder";
const RAW_COLOR = `(^|[\\s:!])(${COLOR_UTILS})-(${COLOR_NAMES})-[0-9]{2,3}\\b`;

const NO_NATIVE_SELECT = {
  selector: "JSXOpeningElement[name.name='select']",
  message: "Use <Select> de components/patterns (UX-5): <select> nativo é barrado.",
};
const NO_RAW_TABLE = {
  selector: "JSXOpeningElement[name.name='table']",
  message: "Use <DataTable> de components/patterns (UX-P06): <table> à mão só em DataTable/ItemsGrid.",
};
const NO_RAW_COLOR_LITERAL = {
  selector: `Literal[value=/${RAW_COLOR}/]`,
  message: "Cor crua do Tailwind é barrada (UX-P12): use os tokens semânticos (text-success, bg-warning-subtle…).",
};
const NO_RAW_COLOR_TEMPLATE = {
  selector: `TemplateElement[value.raw=/${RAW_COLOR}/]`,
  message: "Cor crua do Tailwind é barrada (UX-P12): use os tokens semânticos (text-success, bg-warning-subtle…).",
};

const syntaxRules = (level, { table = true } = {}) => ({
  "no-restricted-syntax": [
    level,
    NO_NATIVE_SELECT,
    ...(table ? [NO_RAW_TABLE] : []),
    NO_RAW_COLOR_LITERAL,
    NO_RAW_COLOR_TEMPLATE,
  ],
});

// Regra 2: nada de http/fetch em componente — leitura em queries, escrita em mutations.
const httpImports = (level) => ({
  "no-restricted-imports": [
    level,
    {
      patterns: [
        {
          group: ["@/lib/http", "@/lib/api"],
          message: "Componente não chama a api: leitura em queries.ts/hooks, escrita em mutations.ts (useApiMutation).",
        },
      ],
    },
  ],
});

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Legado: aviso.
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "hooks/**/*.{ts,tsx}"],
    ignores: ["components/ui/**"],
    rules: syntaxRules("warn"),
  },
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    ignores: ["components/ui/**"],
    rules: httpImports("warn"),
  },
  // Código novo: erro.
  {
    files: ["features/**/*.{ts,tsx}", "components/patterns/**/*.{ts,tsx}", "components/entity/**/*.{ts,tsx}"],
    rules: { ...syntaxRules("error"), ...httpImports("error") },
  },
  // Exceções documentadas: a tabela mora no DataTable; leitura de entidades mora em *-queries.
  {
    files: ["components/patterns/DataTable.tsx"],
    rules: syntaxRules("error", { table: false }),
  },
  {
    files: ["**/queries.ts", "**/mutations.ts", "**/*-queries.ts"],
    rules: { "no-restricted-imports": "off" },
  },
  // Testes simulam a api e a rede.
  {
    files: ["**/*.test.{ts,tsx}", "tests/**/*.{ts,tsx}", "e2e/**/*.ts"],
    rules: { "no-restricted-syntax": "off", "no-restricted-imports": "off" },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "playwright-report/**", "test-results/**"]),
]);

export default eslintConfig;
