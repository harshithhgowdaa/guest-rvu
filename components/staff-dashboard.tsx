"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import type { BatchProgress, DashboardEntry } from "@/lib/types";
import { usePageTopReset } from "@/components/use-page-top-reset";

type Dashboard = {
  totals: { registered: number; present: number; pending: number };
  unassigned: number;
  batchProgress: BatchProgress[];
  entries: DashboardEntry[];
};

const formatTime = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value))
    : "—";

const formatUpdatedTime = (value: Date) =>
  new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(value);

export function StaffDashboard() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [query, setQuery] = useState("");
  const [batchFilter, setBatchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const requestInFlight = useRef(false);
  const feedbackTimer = useRef<number | null>(null);

  usePageTopReset("staff-dashboard");

  const refresh = useCallback(async (manual = false) => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setIsRefreshing(true);

    try {
      const response = await fetch("/api/staff/attendance", { cache: "no-store" });
      if (response.status === 401) {
        window.location.assign("/staff/login");
        return;
      }
      if (!response.ok) throw new Error("Attendance could not be refreshed.");

      const nextDashboard = (await response.json()) as Dashboard;
      setDashboard(nextDashboard);
      setLastUpdated(new Date());
      setError("");

      if (manual) {
        setJustUpdated(true);
        if (feedbackTimer.current !== null) window.clearTimeout(feedbackTimer.current);
        feedbackTimer.current = window.setTimeout(() => {
          setJustUpdated(false);
          feedbackTimer.current = null;
        }, 3000);
      }
    } catch {
      setError("We couldn’t update the register. Check your connection and try again.");
    } finally {
      requestInFlight.current = false;
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15_000);
    return () => {
      window.clearInterval(timer);
      if (feedbackTimer.current !== null) window.clearTimeout(feedbackTimer.current);
    };
  }, [refresh]);

  async function signOut() {
    try {
      await fetch("/api/staff/logout", { method: "POST" });
    } catch {
      // Return to the login screen even if the logout request cannot complete.
    } finally {
      window.location.assign("/staff/login");
    }
  }

  async function downloadAnalytics() {
    if (isDownloading) return;
    setIsDownloading(true);
    setError("");

    try {
      const response = await fetch("/api/staff/analytics", { cache: "no-store" });
      if (response.status === 401) {
        window.location.assign("/staff/login");
        return;
      }
      if (!response.ok) throw new Error("The report could not be generated.");

      const blob = await response.blob();
      const filename = response.headers.get("content-disposition")?.match(/filename="?([^";]+)"?/i)?.[1]
        ?? "xlri-alumni-bengaluru-get-together-attendance.xlsx";
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      setError("The analytics report couldn’t be downloaded. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  }

  async function clearCheckIns() {
    if (requestInFlight.current || isClearing) return;
    const confirmed = window.confirm("Clear all check-ins? Every guest will be marked as not checked in.");
    if (!confirmed) return;

    requestInFlight.current = true;
    setIsClearing(true);
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/staff/attendance", { method: "DELETE" });
      if (response.status === 401) {
        window.location.assign("/staff/login");
        return;
      }
      if (!response.ok) throw new Error("Check-ins could not be cleared.");

      setDashboard((await response.json()) as Dashboard);
      setLastUpdated(new Date());
      setError("");
      setJustUpdated(true);
      if (feedbackTimer.current !== null) window.clearTimeout(feedbackTimer.current);
      feedbackTimer.current = window.setTimeout(() => {
        setJustUpdated(false);
        feedbackTimer.current = null;
      }, 3000);
    } catch {
      setError("Check-ins couldn’t be cleared. Please try again.");
    } finally {
      requestInFlight.current = false;
      setIsClearing(false);
      setIsRefreshing(false);
    }
  }

  const visibleEntries = useMemo(() => {
    if (!dashboard) return [];
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return dashboard.entries
      .filter((guest) => !normalizedQuery || guest.name.toLocaleLowerCase().includes(normalizedQuery))
      .filter((guest) => {
        if (batchFilter === "__unassigned__") return !guest.batch;
        return batchFilter === "all" || guest.batch === batchFilter;
      })
      .filter((guest) => statusFilter === "all" || guest.status === statusFilter)
      .sort((a, b) => {
        if (a.checkedInAt && b.checkedInAt) return b.checkedInAt.localeCompare(a.checkedInAt);
        if (a.checkedInAt) return -1;
        if (b.checkedInAt) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [batchFilter, dashboard, query, statusFilter]);

  const hasBatchData = Boolean(dashboard?.batchProgress.length);

  return (
    <main className="guest-arrival-page staff-console">
      <header className="guest-masthead staff-console__masthead">
        <a className="guest-masthead__wordmark" href="/" aria-label="RV University guest attendance">
          <img src="/brand/rvu-primary-lockup.png" alt="RV University — Go, change the world" />
        </a>
        <h1>Attendance dashboard</h1>
        <button className="guest-masthead__staff" type="button" onClick={() => void signOut()}>
          Sign out
        </button>
      </header>

      <div className="staff-console__main">
        <div className="staff-console__refresh-row">
          <p className="staff-console__refresh-status" role="status" aria-live="polite">
            {justUpdated
              ? "Updated just now"
              : lastUpdated
                ? `Last updated ${formatUpdatedTime(lastUpdated)}`
                : "Refreshing attendance…"}
            <span>Auto-refreshes every 15 seconds</span>
          </p>
          <div className="staff-console__refresh-actions">
            <button
              className="staff-console__download-button"
              type="button"
              onClick={() => void downloadAnalytics()}
              disabled={isDownloading || isLoading || !dashboard}
            >
              <Download aria-hidden="true" size={17} />
              {isDownloading ? "Preparing report…" : "Download analytics"}
            </button>
            <button
              className="staff-console__clear-button"
              type="button"
              onClick={() => void clearCheckIns()}
              disabled={isRefreshing || !dashboard?.totals.present}
              aria-label="Clear all guest check-ins"
            >
              {isClearing ? "Clearing…" : "Clear"}
            </button>
            <button
              className="staff-console__refresh-button"
              type="button"
              onClick={() => void refresh(true)}
              disabled={isRefreshing}
            >
              <RefreshCw aria-hidden="true" className={isRefreshing ? "is-spinning" : undefined} size={17} />
              {isRefreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        {error && dashboard && (
          <div className="staff-console__alert" role="alert">
            <p>{error}</p>
            <button type="button" onClick={() => void refresh(true)} disabled={isRefreshing}>
              Try again
            </button>
          </div>
        )}

        {isLoading && !dashboard ? (
          <div className="staff-console__state" role="status">Loading the attendance register…</div>
        ) : !dashboard ? (
          <div className="staff-console__state staff-console__state--error">
            <h2>The register couldn’t be loaded</h2>
            <p>Check your connection, then try again.</p>
            <button className="staff-console__refresh-button" type="button" onClick={() => void refresh(true)} disabled={isRefreshing}>
              Try again
            </button>
          </div>
        ) : (
          <>
            <section className="staff-console__totals" aria-label="Attendance totals">
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
                <span>Still expected</span>
              </div>
            </section>

            <section className="staff-console__batches" aria-labelledby="batch-heading">
              <div className="staff-console__section-heading">
                <h2 id="batch-heading">Batch progress</h2>
                {hasBatchData && <span>{dashboard.batchProgress.length} batches</span>}
              </div>
              {hasBatchData ? (
                <div className="staff-console__batch-grid">
                  {dashboard.batchProgress.map((batch) => (
                    <div className="staff-console__batch" key={batch.batch}>
                      <div className="staff-console__batch-label">
                        <strong>{batch.batch}</strong>
                        <span>{batch.present} of {batch.registered} checked in</span>
                      </div>
                      <div
                        className="staff-console__progress-track"
                        role="progressbar"
                        aria-label={`${batch.batch} attendance`}
                        aria-valuemin={0}
                        aria-valuemax={batch.registered}
                        aria-valuenow={batch.present}
                        aria-valuetext={`${batch.present} of ${batch.registered} checked in`}
                      >
                        <span
                          style={{ transform: `scaleX(${batch.percentage / 100})` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="staff-console__batch-note">
                  Batch assignments aren’t in the guest roster yet. Progress and batch filtering will appear when they’re added.
                </p>
              )}
              {hasBatchData && dashboard.unassigned > 0 && (
                <p className="staff-console__batch-note">
                  {dashboard.unassigned} {dashboard.unassigned === 1 ? "guest has" : "guests have"} no batch assigned yet.
                </p>
              )}
            </section>

            <section className="staff-console__register" aria-labelledby="register-heading">
              <div className="staff-console__section-heading staff-console__section-heading--register">
                <div>
                  <h2 id="register-heading">Guest register</h2>
                  <p>Newest arrivals first</p>
                </div>
                <span>{visibleEntries.length} of {dashboard.entries.length} guests</span>
              </div>

              <div className="staff-console__filters">
                <label className="staff-console__search">
                  <span>Search by name</span>
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Find a guest"
                    autoComplete="off"
                  />
                </label>
                <label>
                  <span>Batch</span>
                  <select value={batchFilter} onChange={(event) => setBatchFilter(event.target.value)} disabled={!hasBatchData}>
                    <option value="all">All batches</option>
                    {dashboard.batchProgress.map((batch) => (
                      <option key={batch.batch} value={batch.batch}>{batch.batch}</option>
                    ))}
                    {dashboard.unassigned > 0 && <option value="__unassigned__">No batch assigned</option>}
                  </select>
                </label>
                <label>
                  <span>Attendance</span>
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                    <option value="all">Everyone</option>
                    <option value="present">Present</option>
                    <option value="pending">Not checked in</option>
                  </select>
                </label>
              </div>

              {dashboard.entries.length === 0 ? (
                <p className="staff-console__empty">The guest roster is empty.</p>
              ) : visibleEntries.length === 0 ? (
                <p className="staff-console__empty">No guests match your search and filters.</p>
              ) : (
                <div className="staff-console__table-wrap">
                  <table className="staff-console__table">
                    <thead>
                      <tr>
                        <th scope="col">Guest</th>
                        <th scope="col">Batch</th>
                        <th scope="col">Attendance</th>
                        <th scope="col">Checked in</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleEntries.map((guest) => (
                        <tr key={guest.id}>
                          <td className="staff-console__guest-name" data-label="Guest">{guest.name}</td>
                          <td data-label="Batch">{guest.batch || "Not assigned"}</td>
                          <td data-label="Attendance">
                            <span className={`staff-console__status staff-console__status--${guest.status}`}>
                              {guest.status === "present" ? "Present" : "Not checked in"}
                            </span>
                          </td>
                          <td data-label="Checked in">
                            {guest.checkedInAt ? (
                              <time dateTime={guest.checkedInAt}>{formatTime(guest.checkedInAt)}</time>
                            ) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
