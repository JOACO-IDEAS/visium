"use client";

import { useRef, type RefObject } from "react";
import { gsap } from "@/lib/gsap";
import { useIsomorphicLayoutEffect } from "./useIsomorphicLayoutEffect";

/**
 * Scopes GSAP animations to a container ref via gsap.context, with automatic
 * cleanup (reverts all tweens + ScrollTriggers created inside the callback).
 */
export function useGsap<T extends HTMLElement = HTMLDivElement>(
  setup: (ctx: { self: HTMLElement }) => void,
  deps: unknown[] = []
): RefObject<T | null> {
  const scope = useRef<T>(null);

  useIsomorphicLayoutEffect(() => {
    if (!scope.current) return;
    const self = scope.current;
    const ctx = gsap.context(() => setup({ self }), scope);
    return () => ctx.revert();
  }, deps);

  return scope;
}
