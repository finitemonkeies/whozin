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

function statusChip(ok: boolean) {
  return ok
    ? "inline-flex items-center rounded-full bg-green-500/20 border border-green-500/40 px-2 py-0.5 text-xs text-green-300"
    : "inline-flex items-center rounded-full bg-red-500/20 border border-red-500/40 px-2 py-0.5 text-xs text-red-300";
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
        await runChecks();
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
