"use client";

import { useEffect } from "react";

/** Return to the top when a new page or result state replaces the current view. */
export function usePageTopReset(viewKey: string) {
  useEffect(() => {
    const reset = () => window.scrollTo(0, 0);
    const frame = window.requestAnimationFrame(reset);
    // Mobile Safari can restore its keyboard-adjusted offset after the first frame.
    const timer = window.setTimeout(reset, 350);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [viewKey]);
}
