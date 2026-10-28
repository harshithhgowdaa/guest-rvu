"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CircleAlert, Pause, Play } from "lucide-react";
import type { Guest } from "@/lib/types";
import { BeamSearch } from "@/components/ui/beam-search";
import { GuestArrivalIntro } from "@/components/guest-arrival-intro";

type Notice = {
  type: "success" | "already" | "error";
  name?: string;
  message?: string;
};

export function GuestCheckIn() {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Guest[]>([]);
  const [selected, setSelected] = useState<Guest | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const confirmationRef = useRef<HTMLHeadingElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (notice) window.requestAnimationFrame(() => confirmationRef.current?.focus());
  }, [notice]);

  useEffect(() => {
    if (!query.trim()) {
      setMatches([]);
      setLoading(false);
      setSearchError("");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setSearchError("");
      try {
        const response = await fetch(
          `/api/guest-search?query=${encodeURIComponent(query.trim())}`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          throw new Error("Guest search failed.");
        }
        const payload = (await response.json()) as { guests?: Guest[] };
        setMatches(payload.guests ?? []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setMatches([]);
          setSearchError("We can’t reach the guest list right now. Please try again in a moment.");
        }
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  function reset() {
    setQuery("");
    setSelected(null);
    setNotice(null);
  }

  function clearSearch() {
    setQuery("");
    setMatches([]);
    setSelected(null);
    setSearchError("");
    searchRef.current?.focus();
  }

  async function submit() {
    if (!selected) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/check-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ guestId: selected.id })
      });
      const payload = (await response.json()) as {
        status?: string;
        guest?: Guest;
        error?: string;
      };
      if (payload.status === "checked_in") {
        setNotice({ type: "success", name: payload.guest?.name });
      } else if (payload.status === "already_checked_in") {
        setNotice({ type: "already", name: payload.guest?.name });
      } else {
        setNotice({ type: "error", message: payload.error ?? "We could not complete your check-in." });
      }
    } catch {
      setNotice({ type: "error", message: "Your connection dropped. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  if (notice) {
    const OutcomeIcon = notice.type === "error" ? CircleAlert : Check;

    return (
      <main className="guest-arrival-page">
        <GuestArrivalIntro />
        <Masthead />
        <div className="guest-arrival-shell guest-arrival-shell--confirmation">
          <section className="guest-arrival-panel guest-arrival-panel--confirmation" aria-live="polite" aria-atomic="true">
            <div className={`guest-confirmation-mark guest-confirmation-mark--${notice.type}`} aria-hidden="true">
              {notice.type === "success" ? (
                <span className="guest-confirmation-crest" />
              ) : (
                <OutcomeIcon strokeWidth={1.8} />
              )}
            </div>
            <h1 ref={confirmationRef} tabIndex={-1}>
              {notice.type === "success" ? "We’re delighted to have you with us." : notice.type === "already" ? "You’re already on the list" : "We couldn’t check you in"}
            </h1>
            <p>
              {notice.type === "success" && `${notice.name}, have a wonderful day!`}
              {notice.type === "already" && `${notice.name} has already been marked present.`}
              {notice.type === "error" && notice.message}
            </p>
            <button className="guest-secondary-action" onClick={reset}>Check in another guest</button>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="guest-arrival-page">
      <GuestArrivalIntro />
      <Masthead />
      <div className="guest-arrival-shell">
        <section
          className={`guest-arrival-panel ${searchFocused ? "is-searching" : ""} ${selected ? "has-selection" : ""}`}
          aria-labelledby="checkin-heading"
        >
          <h1 id="checkin-heading" tabIndex={-1}>Welcome to RV University</h1>
          <CampusMomentsCarousel />
          <form className="check-in-form" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
            <p className="guest-instructions">Find your name below to check in.</p>
            <fieldset className="guest-search-control">
              <legend className="sr-only">Search for your name</legend>
              <BeamSearch
                id="guest-name"
                inputRef={searchRef}
                value={query}
                placeholder="Start typing your name"
                ariaControls="guest-search-results"
                ariaExpanded={query.trim().length > 0 && matches.length > 0}
                onChange={(value) => { setQuery(value); setSelected(null); }}
                onClear={clearSearch}
                onEscape={clearSearch}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
              <div className="results" id="guest-search-results" role="listbox" aria-label="Matching guests" aria-live="polite">
                {!selected && loading && <p className="quiet">Searching the register…</p>}
                {!selected && searchError && <p className="form-error" role="alert">{searchError}</p>}
                {!selected && !loading && !searchError && query.trim().length > 0 && matches.length === 0 && (
                  <p className="quiet">No matching record. Please speak with the event desk.</p>
                )}
                {!selected && query.trim().length > 0 && matches.slice(0, 3).map((guest) => (
                  <button
                    className="guest-result"
                    type="button"
                    key={guest.id}
                    onClick={() => {
                      setQuery(guest.name);
                      setSelected(guest);
                      setMatches([]);
                    }}
                    aria-pressed={false}
                    role="option"
                    aria-selected={false}
                  >
                    <span>{guest.name}</span>
                    <span className="guest-result-status">Select</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <button className="primary-button" type="submit" disabled={!selected || submitting}>
              {submitting ? "Checking you in…" : selected ? "Confirm check-in" : "Select your name"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

function CampusMomentsCarousel() {
  const [isPaused, setIsPaused] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;

    const updateCycleWidth = () => {
      track.style.setProperty("--carousel-cycle-width", `${viewport.getBoundingClientRect().height * (1700 / 262)}px`);
    };

    updateCycleWidth();
    const observer = new ResizeObserver(updateCycleWidth);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      className={`campus-moments${isPaused ? " is-paused" : ""}`}
      aria-label="A moving gallery of student life at RV University"
    >
      <div className="campus-moments__viewport" ref={viewportRef}>
        <div className="campus-moments__track" ref={trackRef} aria-hidden="true" />
        <button
          className="campus-moments__pause"
          type="button"
          aria-label={isPaused ? "Resume moving images" : "Pause moving images"}
          aria-pressed={isPaused}
          onClick={() => setIsPaused((paused) => !paused)}
        >
          {isPaused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
        </button>
      </div>
    </section>
  );
}

function Masthead() {
  return (
    <header className="guest-masthead">
      <a className="guest-masthead__wordmark" href="/" aria-label="RV University guest attendance">
        <img src="/brand/rvu-primary-lockup.png" alt="RV University — Go, change the world" />
      </a>
      <a className="guest-masthead__staff" href="/staff/login">Staff access</a>
    </header>
  );
}
