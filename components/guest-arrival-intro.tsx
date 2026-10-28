"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { GlassIconReveal } from "@/components/ui/liquid-glass-logo-reveal";

/* Background colour — identical to page body (--paper) and CSS overlay */
const BG = "#EFEFEE";

/**
 * Full-screen liquid glass logo reveal that plays on every page load/refresh.
 * After the crest resolves, the university's message fades in before check-in.
 */
export function GuestArrivalIntro() {
  const [phase, setPhase] = useState<"showing" | "fading" | "done">("showing");
  const isFinishing = useRef(false);

  const finish = useCallback(() => {
    if (isFinishing.current) return;
    isFinishing.current = true;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setPhase("fading");
    window.setTimeout(
      () => {
        setPhase("done");
        window.scrollTo(0, 0);
        document.getElementById("checkin-heading")?.focus({ preventScroll: true });
      },
      reducedMotion ? 0 : 600
    );
  }, []);

  useLayoutEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const delay = reducedMotion ? 300 : 6100;
    const t = window.setTimeout(finish, delay);
    return () => window.clearTimeout(t);
  }, [finish]);

  if (phase === "done") return null;

  return (
    <div
      className={`guest-arrival-intro-glass${phase === "fading" ? " is-fading" : ""}`}
      aria-label="RV University — Go, change the world"
      role="region"
      aria-live="polite"
    >
      <div className="guest-arrival-intro-content">
        <GlassIconReveal
          logo="/brand/rvu-crest-clean.png"
          look="light"
          background={BG}
          logoColor="#233039"
          loop={false}
          hold={0.4}
          tileSize={360}
          logoScale={0.88}
          finalScale={0.92}
          label="RV University crest"
          className="glass-reveal-tile"
          tuning={{
            startZoom: 2.2,
            present: 2.4,
            glide: 2.2,
            dispersion: 1.6,
            colorBleed: 1.25,
            sheen: 0.9,
            bevelWidth: 0.14,
            corner: 4.8,
            opticalDepth: 1.0,
            swell: 0.3,
          }}
        />
        <img
          className="guest-arrival-motto"
          src="/brand/rvu-go-change-the-world.png"
          alt="Go, change the world"
        />
      </div>
    </div>
  );
}
