"use client";

import * as React from "react";

export type SurfaceTheme = "auto" | "light" | "dark";

function resolveDocumentTheme(): "light" | "dark" {
  const root = document.documentElement;
  if (root.classList.contains("dark")) return "dark";
  if (root.classList.contains("light")) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useSurfaceTheme(theme: SurfaceTheme): "light" | "dark" {
  const [resolved, setResolved] = React.useState<"light" | "dark">("light");

  React.useEffect(() => {
    if (theme !== "auto") {
      setResolved(theme);
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const root = document.documentElement;
    const update = () => setResolved(resolveDocumentTheme());
    const observer = new MutationObserver(update);

    update();
    media.addEventListener("change", update);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });

    return () => {
      media.removeEventListener("change", update);
      observer.disconnect();
    };
  }, [theme]);

  return theme === "auto" ? resolved : theme;
}
