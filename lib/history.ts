"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

let inAppNavigations = 0;

export function noteInAppNavigation(): void {
  inAppNavigations += 1;
}

export function resetInAppNavigations(): void {
  inAppNavigations = 0;
}

export function canGoBackInApp(count: number = inAppNavigations): boolean {
  return count > 0;
}

export function useBack(fallbackHref: string): () => void {
  const router = useRouter();
  return useCallback(() => {
    if (canGoBackInApp()) router.back();
    else router.push(fallbackHref);
  }, [router, fallbackHref]);
}
