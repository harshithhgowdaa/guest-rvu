"use client";

import { FormEvent, useState } from "react";
import { usePageTopReset } from "@/components/use-page-top-reset";

export default function StaffLoginPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  usePageTopReset(error ? "staff-login-error" : "staff-login");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/staff/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code })
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setError(payload.error ?? "We couldn’t open staff access.");
        return;
      }
      window.location.assign("/staff");
    } catch {
      setError("Your connection dropped. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="guest-arrival-page staff-login-page">
      <header className="guest-masthead">
        <a className="guest-masthead__wordmark" href="/" aria-label="RV University guest attendance">
          <img src="/brand/rvu-primary-lockup.png" alt="RV University — Go, change the world" />
        </a>
        <a className="guest-masthead__staff" href="/">Guest check-in</a>
      </header>
      <div className="guest-arrival-shell">
        <section className="guest-arrival-panel staff-login-panel" aria-labelledby="staff-login-heading">
          <div className="guest-arrival-orbit" aria-hidden="true">
            <img src="/brand/rvu-crest-clean.png" alt="" />
          </div>
          <h1 id="staff-login-heading">Staff access</h1>
          <p className="guest-instructions">Enter the shared event code to view the attendance register.</p>
          <form className="staff-access-form" onSubmit={submit}>
            <label htmlFor="code">Shared event code</label>
            <input
              id="code"
              type="password"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="current-password"
              required
            />
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? "Opening dashboard…" : "Open dashboard"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
