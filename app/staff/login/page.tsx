"use client";

import { FormEvent, useState } from "react";

export default function StaffLoginPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
    <main className="staff-gate">
      <header className="site-masthead"><a className="brand-lockup" href="/" aria-label="RV University guest attendance"><img src="/brand/rvu-lockup-gold.png" alt="RV University" /></a><p className="masthead-title">Guest attendance <span>Staff workspace</span></p><div className="masthead-actions"><a href="/">Guest check-in</a></div></header>
      <div className="staff-gate-content">
        <section className="staff-gate-brief"><p className="section-tag">Restricted access</p><h1>Attendance register</h1><p>Use the shared event code to view live arrival records.</p></section>
        <form className="staff-login" onSubmit={submit}>
        <p className="section-tag">Staff authentication</p>
        <h2>Enter shared code</h2>
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
        <a href="/">Return to guest check-in</a></form>
      </div>
    </main>
  );
}
