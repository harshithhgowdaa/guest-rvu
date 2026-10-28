"use client";

import { useCallback, useEffect, useState } from "react";
import type { DashboardEntry } from "@/lib/types";

type Dashboard = {
  totals: { registered: number; present: number; pending: number };
  entries: DashboardEntry[];
};

const formatTime = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value))
    : "—";

export function StaffDashboard() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    const response = await fetch(`/api/staff/attendance?${params}`, { cache: "no-store" });
    if (response.status === 401) {
      window.location.assign("/staff/login");
      return;
    }
    if (!response.ok) throw new Error("Attendance could not be refreshed.");
    setDashboard((await response.json()) as Dashboard);
    setError("");
  }, [query]);

  useEffect(() => {
    void load().catch((issue: Error) => setError(issue.message));
    const timer = window.setInterval(() => void load().catch((issue: Error) => setError(issue.message)), 5000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function logout() {
    await fetch("/api/staff/logout", { method: "POST" });
    window.location.assign("/staff/login");
  }

  if (!dashboard && !error) {
    return <main className="dashboard-loading">Opening the attendance register…</main>;
  }

  return (
    <main className="staff-registry">
      <header className="site-masthead staff-masthead">
        <a className="brand-lockup" href="/" aria-label="RV University guest attendance">
          <img src="/brand/rvu-lockup-gold.png" alt="RV University" />
        </a>
        <p className="masthead-title">Staff workspace <span>Attendance register</span></p>
        <div className="masthead-actions">
          <span>Auto-refreshes</span>
          <button onClick={() => void logout()}>Sign out</button>
        </div>
      </header>
      {dashboard && (
        <div className="staff-layout">
          <aside className="staff-sidebar">
            <p className="section-tag">Register index</p>
            <a className="active" href="#attendance-register">Attendance</a>
            <a href="/">Guest check-in</a>
          </aside>
          <section className="staff-content" id="attendance-register">
            <div className="staff-heading">
              <div>
                <p className="section-tag">Staff workspace / attendance</p>
                <h1>Attendance register</h1>
              </div>
              <p>Updates refresh every few seconds.</p>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <section className="ledger-totals" aria-label="Attendance totals">
              <div>
                <strong>{dashboard.totals.registered}</strong>
                <span>Registered guests</span>
              </div>
              <div>
                <strong>{dashboard.totals.present}</strong>
                <span>Checked in</span>
              </div>
              <div>
                <strong>{dashboard.totals.pending}</strong>
                <span>Awaiting arrival</span>
              </div>
            </section>
            <section className="attendance-list" aria-labelledby="list-heading">
              <div className="list-heading">
                <h2 id="list-heading">Guest register</h2>
                <span>{dashboard.entries.length} shown</span>
              </div>
              <div className="filters">
                <label>
                  Search guest
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by name"
                  />
                </label>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Name</th>
                      <th>Status</th>
                      <th>Checked-in time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.entries.map((guest, index) => (
                      <tr key={guest.id}>
                        <td className="row-number">{index + 1}</td>
                        <td>{guest.name}</td>
                        <td>
                          <span className={`status ${guest.status}`}>
                            {guest.status === "present" ? "Present" : "Pending"}
                          </span>
                        </td>
                        <td>{formatTime(guest.checkedInAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        </div>
      )}
    </main>
  );
}
