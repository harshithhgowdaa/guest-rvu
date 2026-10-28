"use client";

import { useEffect, useRef, useState } from "react";
import type { Guest } from "@/lib/types";
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
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const confirmationRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (notice) window.requestAnimationFrame(() => confirmationRef.current?.focus());
  }, [notice]);

  useEffect(() => {
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
    return (
      <main className="registry-page">
        <Masthead />
        <section className="confirmation-sheet" aria-live="polite" aria-atomic="true">
          <div className="check-seal" aria-hidden="true">✓</div>
          <p className="section-tag">Attendance record</p>
          <h1 ref={confirmationRef} tabIndex={-1}>
            {notice.type === "success" ? "Attendance recorded" : notice.type === "already" ? "Already recorded" : "Check-in unavailable"}
          </h1>
          <p>
            {notice.type === "success" && `${notice.name}, your attendance is now marked present.`}
            {notice.type === "already" && `${notice.name} has already been marked present.`}
            {notice.type === "error" && notice.message}
          </p>
          <button className="outline-button" onClick={reset}>Check in another guest</button>
        </section>
      </main>
    );
  }

  return (
    <main className="registry-page">
      <GuestArrivalIntro />
      <Masthead />
      <div className="guest-workbench">
        <section className="checkin-station" aria-labelledby="checkin-heading">
          <h1 id="checkin-heading" tabIndex={-1}>Welcome to RV University</h1>
          <p className="guest-instructions">Find your name to check in.</p>
          <form className="check-in-form" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
            <fieldset>
              <label className="name-label" htmlFor="guest-name">Your name</label>
              <input
                id="guest-name"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSelected(null);
                }}
                placeholder="Start typing your name"
                autoComplete="name"
              />
            </fieldset>
            <div className="results" aria-live="polite">
              {loading && <p className="quiet">Searching the register…</p>}
              {searchError && <p className="form-error" role="alert">{searchError}</p>}
              {!loading && !searchError && query.trim().length > 0 && matches.length === 0 && (
                <p className="quiet">No matching record. Please speak with the event desk.</p>
              )}
              {matches.map((guest) => (
                <button
                  className={`guest-result ${selected?.id === guest.id ? "selected" : ""}`}
                  type="button"
                  key={guest.id}
                  onClick={() => setSelected(guest)}
                  aria-pressed={selected?.id === guest.id}
                >
                  <span>{guest.name}</span>
                  <span>{selected?.id === guest.id ? "Selected" : "Select"}</span>
                </button>
              ))}
            </div>
            <button className="primary-button" type="submit" disabled={!selected || submitting}>
              {submitting ? "Checking you in…" : selected ? "Check in" : "Select your name"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

function Masthead() {
  return (
    <header className="site-masthead">
      <a className="brand-lockup" href="/" aria-label="RV University guest attendance">
        <img src="/brand/rvu-lockup-gold.png" alt="RV University" />
      </a>
      <p className="masthead-title">Guest attendance <span>Academic registry</span></p>
      <div className="masthead-actions">
        <a href="/staff/login">Staff access</a>
      </div>
    </header>
  );
}
