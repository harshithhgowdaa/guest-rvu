"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CircleAlert } from "lucide-react";
import type { Guest } from "@/lib/types";
import { BeamSearch } from "@/components/ui/beam-search";
import { GuestArrivalIntro } from "@/components/guest-arrival-intro";
import { usePageTopReset } from "@/components/use-page-top-reset";

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
  const [showGuestEntry, setShowGuestEntry] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualBatch, setManualBatch] = useState("");
  const [manualError, setManualError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const confirmationRef = useRef<HTMLHeadingElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const pageView = notice
    ? `notice:${notice.type}`
    : selected
      ? `selected:${selected.id}`
      : showGuestEntry
        ? "manual-guest-entry"
      : "guest-check-in";

  usePageTopReset(pageView);

  useEffect(() => {
    if (notice) window.requestAnimationFrame(() => confirmationRef.current?.focus({ preventScroll: true }));
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
    setShowGuestEntry(false);
    setManualName("");
    setManualBatch("");
    setManualError("");
    setNotice(null);
  }

  function clearSearch() {
    setQuery("");
    setMatches([]);
    setSelected(null);
    setShowGuestEntry(false);
    setManualError("");
    setSearchError("");
    searchRef.current?.focus();
  }

  async function submit() {
    if (showGuestEntry && (!manualName.trim() || !/^[1-9]\d{0,3}-(?:\d{2}|\d{4})$/.test(manualBatch.trim()))) {
      setManualError("Enter your name and batch in number-year format, such as 2-2024.");
      return;
    }
    if (!showGuestEntry && !selected) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/check-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(showGuestEntry
          ? { name: manualName.trim(), batch: manualBatch.trim() }
          : { guestId: selected!.id })
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
      } else if (showGuestEntry) {
        setManualError(payload.error ?? "We couldn’t add your details. Please check them and try again.");
      } else {
        setNotice({ type: "error", message: payload.error ?? "We could not complete your check-in." });
      }
    } catch {
      if (showGuestEntry) {
        setManualError("Your connection dropped. Please try again.");
      } else {
        setNotice({ type: "error", message: "Your connection dropped. Please try again." });
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (notice) {
    const OutcomeIcon = notice.type === "error" ? CircleAlert : Check;

    return (
      <main className="guest-arrival-page">
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
              {notice.type === "success" && `Dear ${notice.name}, have a wonderful evening!`}
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
          <h1 id="checkin-heading" tabIndex={-1}>
            Welcome to XLRI Alumni (Bengaluru)<br />Get Together
          </h1>
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
                ariaExpanded={query.trim().length > 0 && !showGuestEntry}
                onChange={(value) => {
                  setQuery(value);
                  setSelected(null);
                  setShowGuestEntry(false);
                  setManualError("");
                }}
                onClear={clearSearch}
                onEscape={clearSearch}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
              <div className="results" id="guest-search-results" role="region" aria-label="Guest search results" aria-live="polite">
                {!selected && !showGuestEntry && loading && <p className="quiet">Searching the register…</p>}
                {!selected && !showGuestEntry && searchError && <p className="form-error" role="alert">{searchError}</p>}
                {!selected && !showGuestEntry && !loading && !searchError && query.trim().length > 0 && matches.length === 0 && (
                  <div className="guest-no-match">
                    <p>Can’t find your name?</p>
                    <button
                      type="button"
                      onClick={() => {
                        setManualName(query.trim());
                        setManualBatch("");
                        setManualError("");
                        setShowGuestEntry(true);
                        searchRef.current?.blur();
                      }}
                    >
                      Enter your name and batch
                    </button>
                  </div>
                )}
                {!selected && !showGuestEntry && query.trim().length > 0 && matches.slice(0, 3).map((guest) => (
                  <button
                    className="guest-result"
                    type="button"
                    key={guest.id}
                    onClick={() => {
                      setQuery(guest.name);
                      setSelected(guest);
                      setMatches([]);
                      searchRef.current?.blur();
                    }}
                    aria-pressed={false}
                    role="option"
                    aria-selected={false}
                  >
                    <span className="guest-result__identity">
                      {guest.name}
                      {guest.batch && <small>Batch {guest.batch}</small>}
                    </span>
                    <span className="guest-result-status">Select</span>
                  </button>
                ))}
              </div>
            </fieldset>
            {showGuestEntry ? (
              <div className="guest-manual-entry">
                <p>Enter your details and we’ll add you to the register.</p>
                <label>
                  <span>Your name</span>
                  <input
                    type="text"
                    value={manualName}
                    onChange={(event) => setManualName(event.target.value)}
                    autoComplete="name"
                    maxLength={100}
                    required
                  />
                </label>
                <label>
                  <span>Batch <small>(number-year)</small></span>
                  <input
                    type="text"
                    value={manualBatch}
                    onChange={(event) => setManualBatch(event.target.value)}
                    placeholder="e.g. 2-2024"
                    pattern="[1-9][0-9]{0,3}-([0-9]{2}|[0-9]{4})"
                    title="Use number-year format, such as 2-2024."
                    autoComplete="off"
                    required
                  />
                </label>
                {manualError && <p className="form-error" role="alert">{manualError}</p>}
                <button className="primary-button" type="submit" disabled={submitting}>
                  {submitting ? "Adding you…" : "Add and check in"}
                </button>
                <button className="guest-manual-entry__back" type="button" onClick={() => setShowGuestEntry(false)}>
                  Back to name search
                </button>
              </div>
            ) : (
              <button className="primary-button" type="submit" disabled={!selected || submitting}>
                {submitting ? "Checking you in…" : selected ? "Confirm check-in" : "Select your name"}
              </button>
            )}
          </form>
        </section>
      </div>
    </main>
  );
}

function Masthead() {
  return (
    <header className="guest-masthead">
      <a className="guest-masthead__wordmark" href="/staff/login" aria-label="Staff access">
        <img src="/brand/rvu-primary-lockup.png" alt="RV University — Go, change the world" />
      </a>
    </header>
  );
}
