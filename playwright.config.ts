import { defineConfig, devices } from "@playwright/test";

/**
 * E2E (TDR-001): as tarefas-ouro rodam em desktop E em celular, com a MESMA contagem de
 * passos (UX-P13). Perfis de celular: iPhone (WebKit) e Pixel (Chromium).
 *
 *   npm run build && npm start        # em outro terminal
 *   npm run e2e                       # usa E2E_BASE_URL (padrão http://localhost:3000)
 *
 * No CI o servidor é subido pelo `webServer` abaixo.
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
// Sem download dos navegadores do Playwright (rede restrita): E2E_CHROME_PATH usa um Chrome do sistema.
const chromePath = process.env.E2E_CHROME_PATH;
const launch = chromePath ? { launchOptions: { executablePath: chromePath, args: ["--no-sandbox"] } } : {};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], ...launch } },
    { name: "iphone", use: { ...devices["iPhone 14"] } },
    { name: "pixel", use: { ...devices["Pixel 7"], ...launch } },
  ],
  webServer: process.env.CI
    ? {
        command: "npm run start",
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120_000,
      }
    : undefined,
});
