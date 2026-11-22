import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { server } from "./msw/server";

// Firebase é fronteira externa: o cliente HTTP só precisa de um usuário com ID token.
vi.mock("@/lib/firebase", () => ({
  getFirebaseAuth: () => ({
    authStateReady: () => Promise.resolve(),
    currentUser: { getIdToken: () => Promise.resolve("test-token") },
  }),
  googleProvider: {},
}));

// jsdom não implementa matchMedia nem scrollIntoView.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
