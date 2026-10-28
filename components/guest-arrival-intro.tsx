"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const INTRO_KEY = "rvu-guest-arrival-intro-seen";

/** A short first-visit identity moment; subsequent attendance tasks never wait for it. */
export function GuestArrivalIntro() {
  const [isVisible, setIsVisible] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const isFinishing = useRef(false);

  const finish = useCallback(() => {
    if (isFinishing.current) return;

    isFinishing.current = true;
    window.sessionStorage.setItem(INTRO_KEY, "true");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setIsClosing(true);

    window.setTimeout(() => {
      setIsVisible(false);
      document.getElementById("checkin-heading")?.focus();
    }, reducedMotion ? 0 : 280);
  }, []);

  useEffect(() => {
    if (window.sessionStorage.getItem(INTRO_KEY)) {
      setIsVisible(false);
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(finish, reducedMotion ? 180 : 1650);
    return () => window.clearTimeout(timer);
  }, [finish]);

  if (!isVisible) return null;

  return (
    <section className={`guest-arrival-intro ${isClosing ? "is-closing" : ""}`} aria-label="RV University arrival">
      <div className="guest-arrival-intro__mark" aria-hidden="true">
        <img src="/brand/rvu-crest-reveal.jpg" alt="" />
      </div>
      <div className="guest-arrival-intro__footer">
        <p>RV University</p>
        <button type="button" onClick={finish}>Skip introduction</button>
      </div>
    </section>
  );
}
