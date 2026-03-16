import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { isAllowedAdminEmail } from "@/lib/adminAccess";
import { featureFlags } from "@/lib/featureFlags";
import { toast } from "sonner";

type CheckResult = {
  label: string;
  ok: boolean;
  detail: string;
};

type SyncHealthSource = {
  source: string;
  total: number;
  upcoming: number;
  with_image: number;
  with_ticket: number;
  next_event_at: string | null;
  coverage_status?: "healthy" | "thin" | "stale" | "missing" | string;
  image_pct?: number;
  ticket_pct?: number;
};

type SyncHealthLatestSourceStat = {
  source: string;
  fetched: number;
  upserted: number;
  inserted: number;
  updated: number;
  status: string;
  error: string | null;
};

type SyncHealthData = {
  job: {
    job_id: number;
    job_name: string;
    schedule: string;
    active: boolean;
  } | null;
  last_run: {
    status: string | null;
    return_message: string | null;
    start_time: string | null;
    end_time: string | null;
  } | null;
  upcoming_total: number;
  move_scored_upcoming: number;
  sources: SyncHealthSource[];
  latest_source_stats: SyncHealthLatestSourceStat[];
};

type EventFreshnessDay = {
  date: string;
  weekday: string;
  approved_events: number;
  quarantined_events: number;
  has_events: boolean;
};

type EventFreshnessWeakEvent = {
  id: string;
  title: string;
  event_date: string | null;
  city: string | null;
  event_source: string | null;
  missing_image: boolean;
  missing_ticket: boolean;
  missing_location: boolean;
};

type EventFreshnessAnchorEvent = {
  id: string;
  title: string;
  event_date: string | null;
  city: string | null;
  event_source: string | null;
  attendee_count: number;
  move_score: number | null;
};

type EventFreshnessData = {
  tonight_total: number;
  upcoming_7d_total: number;
  upcoming_7d_missing_image: number;
  upcoming_7d_missing_ticket: number;
  upcoming_7d_missing_location: number;
  quarantined_upcoming: number;
  day_coverage: EventFreshnessDay[];
  weak_events: EventFreshnessWeakEvent[];
  anchor_events: EventFreshnessAnchorEvent[];
};

function statusChip(ok: boolean) {
  return ok
    ? "inline-flex items-center rounded-full bg-green-500/20 border border-green-500/40 px-2 py-0.5 text-xs text-green-300"
    : "inline-flex items-center rounded-full bg-red-500/20 border border-red-500/40 px-2 py-0.5 text-xs text-red-300";
}

function sourceStatusChip(status: string | null | undefined) {
  switch (status) {
    case "healthy":
      return "inline-flex items-center rounded-full bg-green-500/20 border border-green-500/40 px-2 py-0.5 text-xs text-green-300";
    case "thin":
      return "inline-flex items-center rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-xs text-amber-200";
    case "stale":
    case "missing":
      return "inline-flex items-center rounded-full bg-red-500/20 border border-red-500/40 px-2 py-0.5 text-xs text-red-300";
    default:
      return "inline-flex items-center rounded-full bg-white/10 border border-white/10 px-2 py-0.5 text-xs text-zinc-300";
  }
}

async function fetchWithTimeout(
  url: string,
  ms: number,
  init?: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export default function AdminHealth() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [results, setResults] = useState<CheckResult[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportDebug, setExportDebug] = useState<string>("");
  const [syncHealth, setSyncHealth] = useState<SyncHealthData | null>(null);
  const [loadingSyncHealth, setLoadingSyncHealth] = useState(false);
  const [eventFreshness, setEventFreshness] = useState<EventFreshnessData | null>(null);
  const [loadingEventFreshness, setLoadingEventFreshness] = useState(false);

  const deriveProjectRef = (url?: string): string => {
    if (!url) return "unknown";
    try {
      const host = new URL(url).hostname;
      return host.split(".")[0] || "unknown";
    } catch {
      return "unknown";
    }
  };

  const envSummary = useMemo(
    () => ({
      killSwitchRsvpWrites: featureFlags.killSwitchRsvpWrites,
      killSwitchInvites: featureFlags.killSwitchInvites,
      killSwitchFriendAdds: featureFlags.killSwitchFriendAdds,
      surfaceIngestedSources:
        (import.meta.env.VITE_SURFACE_INGESTED_SOURCES as string | undefined) === "true",
      supabaseUrlSet: !!(import.meta.env.VITE_SUPABASE_URL as string | undefined),
      siteUrlSet: !!(import.meta.env.VITE_SITE_URL as string | undefined),
    }),
    []
  );

  const formatDateTime = (value?: string | null) => {
    if (!value) return "N/A";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "N/A";
    return parsed.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const loadSyncHealth = async () => {
    setLoadingSyncHealth(true);
    try {
      const { data, error } = await supabase.rpc("get_admin_sync_health");
      if (error) throw error;
      setSyncHealth((data ?? null) as SyncHealthData | null);
    } catch (e: any) {
      console.error("Failed loading sync health:", e);
      toast.error(e?.message ?? "Failed to load sync health");
      setSyncHealth(null);
    } finally {
      setLoadingSyncHealth(false);
    }
  };

  const loadEventFreshness = async () => {
    setLoadingEventFreshness(true);
    try {
      const { data, error } = await supabase.rpc("get_admin_event_freshness", {
        p_tz: "America/Chicago",
      });
      if (error) throw error;
      setEventFreshness((data ?? null) as EventFreshnessData | null);
    } catch (e: any) {
      console.error("Failed loading event freshness:", e);
      toast.error(e?.message ?? "Failed to load event freshness");
      setEventFreshness(null);
    } finally {
      setLoadingEventFreshness(false);
    }
  };

  const runChecks = async () => {
    setRefreshing(true);
    const checks: CheckResult[] = [];

    const {
      data: { session },
      error: sessionErr,
    } = await supabase.auth.getSession();
    checks.push({
      label: "Auth session",
      ok: !sessionErr && !!session?.user?.id,
      detail: sessionErr?.message ?? (session?.user?.email ? `signed in as ${session.user.email}` : "no session"),
    });

    const { count: eventCount, error: eventsErr } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true });
    checks.push({
      label: "DB read (events)",
      ok: !eventsErr,
      detail: eventsErr?.message ?? `count=${eventCount ?? 0}`,
    });

    if (session?.user?.id) {
      const { data: probeInsert, error: insertErr } = await supabase
        .from("product_events")
        .insert({
          user_id: session.user.id,
          event_name: "admin_health_probe",
          source: "admin_health",
          metadata: { ts: new Date().toISOString() },
        })
        .select("id")
        .maybeSingle();
      checks.push({
        label: "DB write (product_events)",
        ok: !insertErr,
        detail: insertErr?.message ?? `inserted id=${probeInsert?.id ?? "unknown"}`,
      });
    } else {
      checks.push({
        label: "DB write (product_events)",
        ok: false,
        detail: "No active user session for write probe",
      });
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const healthUrls = supabaseUrl
      ? [
          `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/make-server-3b9fa398/health`,
          `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/make-server-3b9fa398/make-server-3b9fa398/health`,
        ]
      : [];
    if (healthUrls.length) {
      try {
        let lastStatus: number | null = null;
        let reached = false;
        for (const url of healthUrls) {
          const res = await fetchWithTimeout(url, 10000);
          lastStatus = res.status;
          if (res.status !== 404) {
            reached = true;
            break;
          }
        }

        const ok = reached;
        checks.push({
          label: "Edge health endpoint",
          ok,
          detail: `status=${lastStatus ?? "unknown"}`,
        });
      } catch (e: any) {
        checks.push({
          label: "Edge health endpoint",
          ok: false,
          detail: e?.message ?? "request failed",
        });
      }
    } else {
      checks.push({
        label: "Edge health endpoint",
        ok: false,
        detail: "VITE_SUPABASE_URL missing",
      });
    }

    setResults(checks);
    setRefreshing(false);
  };

  const exportKpiCsv = async () => {
    setExporting(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
      if (!supabaseUrl || !anonKey) {
        throw new Error("Missing Supabase environment for export");
      }

      const exportUrl = `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/kpi-export`;
      const requestExport = async (accessToken: string): Promise<Response> =>
        fetchWithTimeout(exportUrl, 60000, {
          method: "GET",
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${accessToken}`,
          },
        });

      const {
        data: { session },
        error: sessionErr,
      } = await supabase.auth.getSession();
      if (sessionErr || !session?.access_token) {
        throw new Error(sessionErr?.message ?? "No active session for export");
      }
      setExportDebug(
        `email=${session.user?.email ?? "unknown"} | project_ref=${deriveProjectRef(supabaseUrl)} | token=present`
      );

      let res = await requestExport(session.access_token);
      if (res.status === 401) {
        const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
        if (refreshErr || !refreshed.session?.access_token) {
          throw new Error(refreshErr?.message ?? "Export auth expired. Please sign in again.");
        }
        setExportDebug(
          `email=${refreshed.session.user?.email ?? "unknown"} | project_ref=${deriveProjectRef(
            supabaseUrl
          )} | token=refreshed`
        );
        res = await requestExport(refreshed.session.access_token);
      }
      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        setExportDebug(
          `email=${session.user?.email ?? "unknown"} | project_ref=${deriveProjectRef(
            supabaseUrl
          )} | status=${res.status} | body=${errorText || "empty"}`
        );
        throw new Error(errorText || `Export failed with status ${res.status}`);
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get("content-disposition") ?? "";
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
      const filename = filenameMatch?.[1] ?? `whozin_kpi_export_${new Date().toISOString().slice(0, 10)}.csv`;

      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(href);
      toast.success("KPI CSV exported");
      setExportDebug(
        `email=${session.user?.email ?? "unknown"} | project_ref=${deriveProjectRef(
          supabaseUrl
        )} | status=200`
      );
    } catch (e: any) {
      setExportDebug((prev) => `${prev}${prev ? " | " : ""}error=${e?.message ?? "unknown"}`);
      toast.error(e?.message ?? "KPI export failed");
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const email = session?.user?.email ?? "";
      const ok = isAllowedAdminEmail(email);
      setAllowed(ok);
      setLoading(false);
      if (ok) {
        await Promise.all([runChecks(), loadSyncHealth(), loadEventFreshness()]);
      }
    };
    void init();
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-black text-white px-6 py-8">Loading...</div>;
  }

  if (!allowed) {
    return (
      <div className="min-h-screen bg-black text-white px-6 py-8">
        <h1 className="text-2xl font-bold mb-2">Admin Health</h1>
        <p className="text-zinc-400">You do not have access to this page.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white px-6 py-8 pb-28">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Health</h1>
          <p className="text-zinc-400">Live diagnostics before traffic pushes.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin"
            className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15"
          >
            Back to Admin
          </Link>
          <button
            onClick={() => void loadSyncHealth()}
            disabled={loadingSyncHealth}
            className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15 disabled:opacity-60"
          >
            {loadingSyncHealth ? "Loading sync..." : "Reload sync"}
          </button>
          <button
            onClick={() => void loadEventFreshness()}
            disabled={loadingEventFreshness}
            className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15 disabled:opacity-60"
          >
            {loadingEventFreshness ? "Loading freshness..." : "Reload freshness"}
          </button>
          <button
            onClick={() => void exportKpiCsv()}
            disabled={exporting}
            className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-60"
          >
            {exporting ? "Exporting..." : "Export KPI CSV"}
          </button>
          <button
            onClick={() => void runChecks().catch((e) => toast.error(e?.message ?? "Health check failed"))}
            disabled={refreshing}
            className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15 disabled:opacity-60"
          >
            {refreshing ? "Checking..." : "Re-run checks"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 mb-8">
        {results.map((r) => (
          <div key={r.label} className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="font-semibold">{r.label}</div>
              <span className={statusChip(r.ok)}>{r.ok ? "PASS" : "FAIL"}</span>
            </div>
            <div className="text-xs text-zinc-400 mt-2">{r.detail}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 mb-8">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <div className="text-sm font-semibold">Event Freshness</div>
            <div className="text-xs text-zinc-500">
              Next 7 days of coverage, weak metadata, and strongest anchor events.
            </div>
          </div>
          {eventFreshness ? (
            <span className={statusChip((eventFreshness.tonight_total ?? 0) > 0 && (eventFreshness.upcoming_7d_total ?? 0) > 0)}>
              {(eventFreshness.tonight_total ?? 0) > 0 ? "LIVE" : "TONIGHT THIN"}
            </span>
          ) : (
            <span className={statusChip(false)}>UNKNOWN</span>
          )}
        </div>

        {eventFreshness ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-zinc-400">Tonight</div>
                <div className="text-lg font-semibold">{eventFreshness.tonight_total}</div>
                <div className="text-xs text-zinc-500 mt-1">Approved events tonight</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-zinc-400">Next 7 days</div>
                <div className="text-lg font-semibold">{eventFreshness.upcoming_7d_total}</div>
                <div className="text-xs text-zinc-500 mt-1">{eventFreshness.quarantined_upcoming} quarantined upcoming</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-zinc-400">Missing image</div>
                <div className="text-lg font-semibold">{eventFreshness.upcoming_7d_missing_image}</div>
                <div className="text-xs text-zinc-500 mt-1">{eventFreshness.upcoming_7d_missing_location} missing location</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-zinc-400">Missing ticket</div>
                <div className="text-lg font-semibold">{eventFreshness.upcoming_7d_missing_ticket}</div>
                <div className="text-xs text-zinc-500 mt-1">Use to catch weak cards early</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-zinc-400 mb-2">Day Coverage</div>
                <div className="space-y-2">
                  {eventFreshness.day_coverage.map((row) => (
                    <div key={row.date} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-sm">
                      <div>
                        <div className="text-zinc-200">{row.weekday} <span className="text-zinc-500">{row.date}</span></div>
                        <div className="text-xs text-zinc-500">{row.quarantined_events} quarantined</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-zinc-100">{row.approved_events}</div>
                        <div className={row.has_events ? "text-[11px] text-emerald-300" : "text-[11px] text-amber-300"}>
                          {row.has_events ? "covered" : "blank"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-zinc-400 mb-2">Anchor Events</div>
                {eventFreshness.anchor_events.length > 0 ? (
                  <div className="space-y-2">
                    {eventFreshness.anchor_events.map((row) => (
                      <div key={row.id} className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2">
                        <div className="text-sm font-medium text-zinc-100">{row.title}</div>
                        <div className="text-xs text-zinc-400 mt-1">
                          {formatDateTime(row.event_date)}{row.city ? ` - ${row.city}` : ""}{row.event_source ? ` - ${row.event_source}` : ""}
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">
                          {row.attendee_count} RSVPs{typeof row.move_score === "number" ? ` - move ${row.move_score.toFixed(1)}` : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-zinc-500">No anchor events found in the next 7 days.</div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-3 mt-4">
              <div className="text-xs text-zinc-400 mb-2">Weak Upcoming Events</div>
              {eventFreshness.weak_events.length > 0 ? (
                <div className="space-y-2">
                  {eventFreshness.weak_events.map((row) => (
                    <Link
                      key={row.id}
                      to={`/admin/events?eventId=${encodeURIComponent(row.id)}`}
                      className="flex items-start justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 transition-colors hover:bg-white/[0.06]"
                    >
                      <div>
                        <div className="text-sm font-medium text-zinc-100">{row.title}</div>
                        <div className="text-xs text-zinc-400 mt-1">
                          {formatDateTime(row.event_date)}{row.city ? ` - ${row.city}` : ""}{row.event_source ? ` - ${row.event_source}` : ""}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[11px]">
                        {row.missing_image ? (
                          <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-0.5 text-amber-200">missing image</span>
                        ) : null}
                        {row.missing_ticket ? (
                          <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-0.5 text-amber-200">missing ticket</span>
                        ) : null}
                        {row.missing_location ? (
                          <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-0.5 text-amber-200">missing location</span>
                        ) : null}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-zinc-500">No weak upcoming events flagged right now.</div>
              )}
            </div>
          </>
        ) : (
          <div className="text-xs text-zinc-500">
            {loadingEventFreshness ? "Loading event freshness..." : "No event freshness data available yet. Run the SQL migration first."}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 mb-8">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <div className="text-sm font-semibold">Bay Area Sync Health</div>
            <div className="text-xs text-zinc-500">
              Scheduler state, latest cron run, and imported-source coverage.
            </div>
          </div>
          {syncHealth?.job ? (
            <span className={statusChip(!!syncHealth.job.active)}>
              {syncHealth.job.active ? "SCHEDULED" : "PAUSED"}
            </span>
          ) : (
            <span className={statusChip(false)}>MISSING</span>
          )}
        </div>

        {syncHealth ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-zinc-400">Cron</div>
                <div className="text-lg font-semibold">{syncHealth.job?.schedule ?? "Not set"}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-zinc-400">Last run</div>
                <div className="text-lg font-semibold">{formatDateTime(syncHealth.last_run?.start_time)}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-zinc-400">Last status</div>
                <div className="text-lg font-semibold">{syncHealth.last_run?.status ?? "No runs yet"}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-zinc-400">Move-scored upcoming</div>
                <div className="text-lg font-semibold">
                  {syncHealth.move_scored_upcoming}/{syncHealth.upcoming_total}
                </div>
              </div>
            </div>

            {syncHealth.last_run?.return_message ? (
              <div className="rounded-xl border border-white/10 bg-black/20 p-3 mb-4">
                <div className="text-xs text-zinc-400 mb-1">Last run detail</div>
                <div className="text-sm text-zinc-300 break-words">{syncHealth.last_run.return_message}</div>
              </div>
            ) : null}

            <div className="rounded-xl border border-white/10 bg-black/20 p-3 overflow-x-auto">
              <div className="text-xs text-zinc-400 mb-2">Source Coverage</div>
              {syncHealth.sources.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="text-zinc-500">
                    <tr>
                      <th className="text-left pb-2 pr-3">Source</th>
                      <th className="text-left pb-2 pr-3">Health</th>
                      <th className="text-right pb-2 pr-3">Upcoming</th>
                      <th className="text-right pb-2 pr-3">Total</th>
                      <th className="text-right pb-2 pr-3">Images</th>
                      <th className="text-right pb-2 pr-3">Tickets</th>
                      <th className="text-right pb-2">Next event</th>
                    </tr>
                  </thead>
                  <tbody>
                    {syncHealth.sources.map((row) => (
                      <tr key={row.source} className="border-t border-white/5">
                        <td className="py-2 pr-3 text-zinc-300">{row.source}</td>
                        <td className="py-2 pr-3">
                          <span className={sourceStatusChip(row.coverage_status)}>
                            {(row.coverage_status ?? "unknown").toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-right">{row.upcoming}</td>
                        <td className="py-2 pr-3 text-right">{row.total}</td>
                        <td className="py-2 pr-3 text-right">
                          {typeof row.image_pct === "number"
                            ? `${Math.round(row.image_pct)}%`
                            : row.total > 0
                              ? `${Math.round((row.with_image / row.total) * 100)}%`
                              : "0%"}
                        </td>
                        <td className="py-2 pr-3 text-right">
                          {typeof row.ticket_pct === "number"
                            ? `${Math.round(row.ticket_pct)}%`
                            : row.total > 0
                              ? `${Math.round((row.with_ticket / row.total) * 100)}%`
                              : "0%"}
                        </td>
                        <td className="py-2 text-right">{formatDateTime(row.next_event_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-xs text-zinc-500">No source data yet.</div>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-3 overflow-x-auto mt-4">
              <div className="text-xs text-zinc-400 mb-2">Latest Run Contribution</div>
              {syncHealth.latest_source_stats?.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="text-zinc-500">
                    <tr>
                      <th className="text-left pb-2 pr-3">Source</th>
                      <th className="text-left pb-2 pr-3">Status</th>
                      <th className="text-right pb-2 pr-3">Fetched</th>
                      <th className="text-right pb-2 pr-3">Kept</th>
                      <th className="text-right pb-2 pr-3">Inserted</th>
                      <th className="text-right pb-2 pr-3">Updated</th>
                      <th className="text-left pb-2">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {syncHealth.latest_source_stats.map((row) => (
                      <tr key={row.source} className="border-t border-white/5">
                        <td className="py-2 pr-3 text-zinc-300">{row.source}</td>
                        <td className="py-2 pr-3">
                          <span className={sourceStatusChip(row.status === "succeeded" ? "healthy" : "missing")}>
                            {row.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-right">{row.fetched}</td>
                        <td className="py-2 pr-3 text-right">{row.upserted}</td>
                        <td className="py-2 pr-3 text-right">{row.inserted}</td>
                        <td className="py-2 pr-3 text-right">{row.updated}</td>
                        <td className="py-2 text-zinc-500">{row.error ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-xs text-zinc-500">No latest-run contribution data yet.</div>
              )}
            </div>
          </>
        ) : (
          <div className="text-xs text-zinc-500">
            {loadingSyncHealth ? "Loading sync health..." : "No sync health data available yet."}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4">
        <div className="text-sm font-semibold mb-3">Runtime Flags</div>
        <pre className="text-xs text-zinc-400 whitespace-pre-wrap break-words">
          {JSON.stringify(envSummary, null, 2)}
        </pre>
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 mt-4">
        <div className="text-sm font-semibold mb-3">Export Debug</div>
        <pre className="text-xs text-zinc-400 whitespace-pre-wrap break-words">
          {exportDebug || "No export attempt yet"}
        </pre>
      </div>
    </div>
  );
}
