import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { formatEventDateTimeRange, isEventPast } from "@/lib/eventDates";
import { isAllowedAdminEmail } from "@/lib/adminAccess";
import { createReferralInviteLink } from "@/lib/referrals";
import { ChevronDown, ChevronRight } from "lucide-react";
import { sourceLabel } from "@/lib/eventVisibility";

type EventRow = {
  id: string;
  title: string;
  location: string | null;
  event_date: string | null;
  event_end_date: string | null;
  image_url: string | null;
  description: string | null;
  event_source?: string | null;
  moderation_status?: string | null;
  moderation_note?: string | null;
  ticket_url?: string | null;
  external_url?: string | null;
};

type FormState = {
  id: string | null; // null = create mode, string = edit mode
  title: string;
  location: string;
  event_date: string; // datetime-local value
  event_end_date: string; // datetime-local value
  image_url: string;
  description: string;
  moderation_status: "approved" | "quarantined";
  moderation_note: string;
};

type GrowthStats = {
  invitesCreated7d: number;
  inviteOpened7d: number;
  inviteSignup7d: number;
  inviteRsvp7d: number;
  inviteOpenRate: number;
  signupRate: number;
  rsvpRate: number;
};

type SourceStat = {
  source: string;
  invites: number;
};

type TopInviter = {
  userId: string;
  handle: string;
  invites: number;
};

type DailyKpiRow = {
  metric_date: string;
  new_users: number;
  active_users: number;
  wau_7d?: number;
  rsvps: number;
  friend_adds: number;
  events_happening: number;
  activated_new_users: number;
  activation_rate_pct: number;
  new_users_with_friend_24h?: number;
  friend_24h_rate_pct?: number;
  new_users_with_rsvp_24h?: number;
  rsvp_24h_rate_pct?: number;
  new_users_with_invite_72h?: number;
  invite_72h_rate_pct?: number;
  d1_retained_users: number;
  d1_eligible_users: number;
  d1_retention_pct: number;
  d7_retained_users?: number;
  d7_eligible_users?: number;
  d7_retention_pct?: number;
  d30_retained_users?: number;
  d30_eligible_users?: number;
  d30_retention_pct?: number;
  event_detail_views: number;
  invite_sent: number;
  invite_opened: number;
  invite_signup_completed: number;
  invite_rsvp_completed: number;
};

type DailyRsvpSourceRow = {
  metric_date: string;
  source: string;
  rsvp_count: number;
  pct_of_day: number;
};

type EmailEventRow = {
  id: string;
  trigger_key: string | null;
  status: string | null;
  sent_at: string | null;
  delivered_at?: string | null;
  opened_at?: string | null;
  clicked_at?: string | null;
  bounced_at?: string | null;
  complained_at?: string | null;
};

type RetentionEmailSummary = {
  triggerKey: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
  failed: number;
  openRate: number;
  clickRate: number;
  latestSentAt: string | null;
};

type SafetyReportRow = {
  id: number;
  target_type: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  reporter_user_id: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  target_user_id?: string | null;
  target_event_id?: string | null;
};

function toDatetimeLocal(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  // Convert to local datetime-local format: YYYY-MM-DDTHH:mm
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function chicagoDay(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export default function Admin() {
  const imageFileRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  const [events, setEvents] = useState<EventRow[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  const [working, setWorking] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loadingGrowth, setLoadingGrowth] = useState(false);
  const [growthStats, setGrowthStats] = useState<GrowthStats | null>(null);
  const [growthBySource, setGrowthBySource] = useState<SourceStat[]>([]);
  const [topInviters, setTopInviters] = useState<TopInviter[]>([]);
  const [loadingDailyKpis, setLoadingDailyKpis] = useState(false);
  const [refreshingDailyKpis, setRefreshingDailyKpis] = useState(false);
  const [dailyKpis, setDailyKpis] = useState<DailyKpiRow[]>([]);
  const [latestRsvpSources, setLatestRsvpSources] = useState<DailyRsvpSourceRow[]>([]);
  const [loadingRetentionEmails, setLoadingRetentionEmails] = useState(false);
  const [retentionEmailSummary, setRetentionEmailSummary] = useState<RetentionEmailSummary[]>([]);
  const [loadingSafetyReports, setLoadingSafetyReports] = useState(false);
  const [safetyReports, setSafetyReports] = useState<SafetyReportRow[]>([]);
  const [safetyUserNames, setSafetyUserNames] = useState<Record<string, string>>({});
  const [safetyEventTitles, setSafetyEventTitles] = useState<Record<string, string>>({});
  const [updatingSafetyReportId, setUpdatingSafetyReportId] = useState<number | null>(null);
  const [safetyStatusFilter, setSafetyStatusFilter] = useState<"all" | "open" | "reviewed" | "resolved" | "dismissed">("all");
  const [showUpcomingEvents, setShowUpcomingEvents] = useState(false);
  const [showPastEvents, setShowPastEvents] = useState(false);

  const [form, setForm] = useState<FormState>({
    id: null,
    title: "",
    location: "",
    event_date: "",
    event_end_date: "",
    image_url: "",
    description: "",
    moderation_status: "approved",
    moderation_note: "",
  });

  const allowedEmails = useMemo(() => {
    return new Set(["hello@whozin.app", "jvincenthallahan@gmail.com"]);
  }, []);

  const upcomingEvents = useMemo(() => {
    const nowTs = Date.now();
    return events.filter((e) => !isEventPast(e, nowTs));
  }, [events]);

  const pastEvents = useMemo(() => {
    const nowTs = Date.now();
    return events.filter((e) => isEventPast(e, nowTs));
  }, [events]);

  const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
  const latestDailyKpi = dailyKpis[0] ?? null;
  const totalRetentionEmailSent = retentionEmailSummary.reduce((sum, row) => sum + row.sent, 0);
  const totalRetentionEmailOpened = retentionEmailSummary.reduce((sum, row) => sum + row.opened, 0);
  const totalRetentionEmailClicked = retentionEmailSummary.reduce((sum, row) => sum + row.clicked, 0);
  const latestInviteOpenRate = latestDailyKpi?.invite_sent
    ? (Number(latestDailyKpi.invite_opened ?? 0) / Number(latestDailyKpi.invite_sent ?? 0)) * 100
    : 0;
  const latestSignupRate = latestDailyKpi?.invite_opened
    ? (Number(latestDailyKpi.invite_signup_completed ?? 0) / Number(latestDailyKpi.invite_opened ?? 0)) * 100
    : 0;
  const latestInviteRsvpRate = latestDailyKpi?.invite_signup_completed
    ? (Number(latestDailyKpi.invite_rsvp_completed ?? 0) / Number(latestDailyKpi.invite_signup_completed ?? 0)) * 100
    : 0;
  const safetySummary = useMemo(() => {
    const last7dThreshold = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const open = safetyReports.filter((row) => row.status === "open").length;
    const reviewed = safetyReports.filter((row) => row.status === "reviewed").length;
    const resolved = safetyReports.filter((row) => row.status === "resolved").length;
    const dismissed = safetyReports.filter((row) => row.status === "dismissed").length;
    const userReports = safetyReports.filter((row) => row.target_type === "user").length;
    const eventReports = safetyReports.filter((row) => row.target_type === "event").length;
    const last7d = safetyReports.filter((row) => new Date(row.created_at).getTime() >= last7dThreshold).length;
    const topReasons = [...safetyReports.reduce((map, row) => {
      const key = row.reason.trim() || "unspecified";
      map.set(key, (map.get(key) ?? 0) + 1);
      return map;
    }, new Map<string, number>()).entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return { open, reviewed, resolved, dismissed, userReports, eventReports, last7d, topReasons };
  }, [safetyReports]);
  const filteredSafetyReports = useMemo(() => {
    if (safetyStatusFilter === "all") return safetyReports;
    return safetyReports.filter((row) => row.status === safetyStatusFilter);
  }, [safetyReports, safetyStatusFilter]);

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

  const resetForm = () => {
    setForm({
      id: null,
      title: "",
      location: "",
      event_date: "",
      event_end_date: "",
      image_url: "",
      description: "",
      moderation_status: "approved",
      moderation_note: "",
    });
  };

  const handleChange = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };
  const randomId = () => Math.random().toString(16).slice(2) + Date.now().toString(16);

  const uploadEventImage = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image too large", { description: "Max size is 10MB." });
      return;
    }

    setUploadingImage(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `events/${randomId()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("event-images")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type,
        });

      if (uploadErr) {
        console.error("[event-images.upload]", uploadErr);
        toast.error("Image upload failed", { description: uploadErr.message });
        return;
      }

      const { data } = supabase.storage.from("event-images").getPublicUrl(path);
      const publicUrl = data?.publicUrl;
      if (!publicUrl) {
        toast.error("Upload succeeded but URL was not returned");
        return;
      }

      setForm((prev) => ({ ...prev, image_url: publicUrl }));
      toast.success("Image uploaded");
    } finally {
      setUploadingImage(false);
    }
  };

  const loadEvents = async () => {
    setLoadingEvents(true);

    const { data, error } = await supabase
      .from("events")
      .select("id,title,location,event_date,event_end_date,image_url,description,event_source,moderation_status,moderation_note,ticket_url,external_url")
      .order("event_date", { ascending: true });

    if (error) {
      console.error("Failed to load events:", error);
      toast.error(error.message ?? "Failed to load events");
      setEvents([]);
    } else {
      setEvents((data ?? []) as EventRow[]);
    }

    setLoadingEvents(false);
  };

  const loadGrowthMetrics = async () => {
    setLoadingGrowth(true);
    try {
      const startIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [{ data: referrals, error: referralsErr }, { data: productEvents, error: productEventsErr }] =
        await Promise.all([
          supabase
            .from("referrals")
            .select("inviter_user_id,source,created_at")
            .gte("created_at", startIso),
          supabase
            .from("product_events")
            .select("event_name,source,created_at")
            .gte("created_at", startIso),
        ]);

      if (referralsErr) throw referralsErr;
      if (productEventsErr) throw productEventsErr;

      const referralRows = (referrals ?? []) as Array<{
        inviter_user_id: string;
        source: string | null;
      }>;
      const eventRows = (productEvents ?? []) as Array<{
        event_name: string;
        source: string | null;
      }>;

      const invitesCreated7d = referralRows.length;
      const inviteOpened7d = eventRows.filter((row) => row.event_name === "invite_link_opened").length;
      const inviteSignup7d = eventRows.filter((row) => row.event_name === "invite_signup_completed").length;
      const inviteRsvp7d = eventRows.filter((row) => row.event_name === "invite_rsvp_completed").length;

      const inviteOpenRate = invitesCreated7d > 0 ? inviteOpened7d / invitesCreated7d : 0;
      const signupRate = inviteOpened7d > 0 ? inviteSignup7d / inviteOpened7d : 0;
      const rsvpRate = inviteSignup7d > 0 ? inviteRsvp7d / inviteSignup7d : 0;
      setGrowthStats({
        invitesCreated7d,
        inviteOpened7d,
        inviteSignup7d,
        inviteRsvp7d,
        inviteOpenRate,
        signupRate,
        rsvpRate,
      });

      const bySourceMap = new Map<string, number>();
      for (const row of referralRows) {
        const source = (row.source ?? "unknown").trim() || "unknown";
        bySourceMap.set(source, (bySourceMap.get(source) ?? 0) + 1);
      }
      setGrowthBySource(
        [...bySourceMap.entries()]
          .map(([source, invites]) => ({ source, invites }))
          .sort((a, b) => b.invites - a.invites)
          .slice(0, 8)
      );

      const byInviterMap = new Map<string, number>();
      for (const row of referralRows) {
        if (!row.inviter_user_id) continue;
        byInviterMap.set(row.inviter_user_id, (byInviterMap.get(row.inviter_user_id) ?? 0) + 1);
      }
      const top = [...byInviterMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);
      const ids = top.map(([userId]) => userId);

      const { data: profiles, error: profilesErr } = ids.length
        ? await supabase.from("profiles").select("id,username,display_name").in("id", ids)
        : { data: [], error: null };
      if (profilesErr) throw profilesErr;

      const nameById = new Map<string, string>();
      for (const row of (profiles ?? []) as Array<{ id: string; username: string | null; display_name: string | null }>) {
        const handle = row.username?.trim() || row.display_name?.trim() || row.id.slice(0, 8);
        nameById.set(row.id, handle);
      }
      setTopInviters(
        top.map(([userId, invites]) => ({
          userId,
          invites,
          handle: nameById.get(userId) ?? userId.slice(0, 8),
        }))
      );
    } catch (err: any) {
      console.error("Failed loading growth metrics:", err);
      toast.error(err?.message ?? "Failed to load growth metrics");
      setGrowthStats(null);
      setGrowthBySource([]);
      setTopInviters([]);
    } finally {
      setLoadingGrowth(false);
    }
  };

  const loadDailyKpis = async () => {
    setLoadingDailyKpis(true);
    try {
      const [{ data: metrics, error: metricsErr }, { data: sources, error: sourcesErr }] = await Promise.all([
        supabase
          .from("daily_kpi_metrics")
          .select(
            "metric_date,new_users,active_users,wau_7d,rsvps,friend_adds,events_happening,activated_new_users,activation_rate_pct,new_users_with_friend_24h,friend_24h_rate_pct,new_users_with_rsvp_24h,rsvp_24h_rate_pct,new_users_with_invite_72h,invite_72h_rate_pct,d1_retained_users,d1_eligible_users,d1_retention_pct,d7_retained_users,d7_eligible_users,d7_retention_pct,d30_retained_users,d30_eligible_users,d30_retention_pct,event_detail_views,invite_sent,invite_opened,invite_signup_completed,invite_rsvp_completed"
          )
          .order("metric_date", { ascending: false })
          .limit(14),
        supabase
          .from("daily_kpi_rsvp_sources")
          .select("metric_date,source,rsvp_count,pct_of_day")
          .order("metric_date", { ascending: false })
          .limit(32),
      ]);

      if (metricsErr) throw metricsErr;
      if (sourcesErr) throw sourcesErr;

      const metricRows = ((metrics ?? []) as DailyKpiRow[]).sort((a, b) => b.metric_date.localeCompare(a.metric_date));
      setDailyKpis(metricRows);

      const latestMetricDate = metricRows[0]?.metric_date ?? null;
      const sourceRows = (sources ?? []) as DailyRsvpSourceRow[];
      setLatestRsvpSources(
        latestMetricDate
          ? sourceRows
              .filter((row) => row.metric_date === latestMetricDate)
              .sort((a, b) => b.rsvp_count - a.rsvp_count)
          : []
      );
    } catch (err: any) {
      console.error("Failed loading daily KPI metrics:", err);
      toast.error(err?.message ?? "Failed to load daily KPI metrics");
      setDailyKpis([]);
      setLatestRsvpSources([]);
    } finally {
      setLoadingDailyKpis(false);
    }
  };

  const loadRetentionEmailMetrics = async () => {
    setLoadingRetentionEmails(true);
    try {
      const sinceIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("email_events")
        .select("id,trigger_key,status,sent_at,delivered_at,opened_at,clicked_at,bounced_at,complained_at")
        .in("trigger_key", ["signup_no_friend", "signup_no_rsvp", "rsvp_no_invite"])
        .or(`sent_at.gte.${sinceIso},and(sent_at.is.null,status.eq.failed)`)
        .limit(500);

      if (error) throw error;

      const rows = (data ?? []) as EmailEventRow[];
      const triggerKeys = ["signup_no_friend", "signup_no_rsvp", "rsvp_no_invite"];
      const summary = triggerKeys.map((triggerKey) => {
        const matches = rows.filter((row) => row.trigger_key === triggerKey);
        const sent = matches.filter(
          (row) =>
            !!row.sent_at ||
            !!row.delivered_at ||
            !!row.opened_at ||
            !!row.clicked_at ||
            !!row.bounced_at ||
            !!row.complained_at
        ).length;
        const delivered = matches.filter((row) => !!row.delivered_at).length;
        const opened = matches.filter((row) => !!row.opened_at).length;
        const clicked = matches.filter((row) => !!row.clicked_at).length;
        const bounced = matches.filter((row) => !!row.bounced_at).length;
        const complained = matches.filter((row) => !!row.complained_at).length;
        const failed = matches.filter((row) => row.status === "failed").length;
        const latestSentAt = matches
          .map((row) => row.sent_at)
          .filter((value): value is string => !!value)
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;

        return {
          triggerKey,
          sent,
          delivered,
          opened,
          clicked,
          bounced,
          complained,
          failed,
          openRate: sent > 0 ? opened / sent : 0,
          clickRate: sent > 0 ? clicked / sent : 0,
          latestSentAt,
        };
      });

      setRetentionEmailSummary(summary);
    } catch (err: any) {
      console.error("Failed loading retention email metrics:", err);
      toast.error(err?.message ?? "Failed to load retention email metrics");
      setRetentionEmailSummary([]);
    } finally {
      setLoadingRetentionEmails(false);
    }
  };

  const loadSafetyReports = async () => {
    setLoadingSafetyReports(true);
    try {
      const { data, error } = await supabase
        .from("safety_reports")
        .select("id,target_type,reason,details,status,created_at,reporter_user_id,reviewed_at,reviewed_by,target_user_id,target_event_id")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      const rows = (data ?? []) as SafetyReportRow[];
      setSafetyReports(rows);

      const userIds = [...new Set(
        rows
          .flatMap((row) => [row.reporter_user_id, row.reviewed_by ?? null, row.target_user_id ?? null])
          .filter((value): value is string => !!value)
      )];
      const eventIds = [...new Set(rows.map((row) => row.target_event_id).filter((value): value is string => !!value))];

      if (userIds.length > 0) {
        const { data: userRows, error: userError } = await supabase
          .from("profiles")
          .select("id,username,display_name")
          .in("id", userIds);
        if (userError) throw userError;

        const nextUserNames: Record<string, string> = {};
        for (const row of (userRows ?? []) as Array<{ id: string; username: string | null; display_name: string | null }>) {
          nextUserNames[row.id] = row.username?.trim() || row.display_name?.trim() || row.id.slice(0, 8);
        }
        setSafetyUserNames(nextUserNames);
      } else {
        setSafetyUserNames({});
      }

      if (eventIds.length > 0) {
        const { data: eventRows, error: eventError } = await supabase
          .from("events")
          .select("id,title")
          .in("id", eventIds);
        if (eventError) throw eventError;

        const nextEventTitles: Record<string, string> = {};
        for (const row of (eventRows ?? []) as Array<{ id: string; title: string | null }>) {
          nextEventTitles[row.id] = row.title?.trim() || row.id.slice(0, 8);
        }
        setSafetyEventTitles(nextEventTitles);
      } else {
        setSafetyEventTitles({});
      }
    } catch (err: any) {
      console.error("Failed loading safety reports:", err);
      toast.error(err?.message ?? "Failed to load safety reports");
      setSafetyReports([]);
      setSafetyUserNames({});
      setSafetyEventTitles({});
    } finally {
      setLoadingSafetyReports(false);
    }
  };

  const updateSafetyReportStatus = async (
    reportId: number,
    nextStatus: "reviewed" | "resolved" | "dismissed" | "open"
  ) => {
    setUpdatingSafetyReportId(reportId);
    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user?.id) {
        throw new Error(userErr?.message ?? "Please sign in again.");
      }

      const patch =
        nextStatus === "open"
          ? { status: nextStatus, reviewed_at: null, reviewed_by: null }
          : { status: nextStatus, reviewed_at: new Date().toISOString(), reviewed_by: user.id };

      const { error } = await supabase.from("safety_reports").update(patch).eq("id", reportId);
      if (error) throw error;

      setSafetyReports((prev) =>
        prev.map((row) =>
          row.id === reportId
            ? {
                ...row,
                status: nextStatus,
                reviewed_at: nextStatus === "open" ? null : patch.reviewed_at,
                reviewed_by: nextStatus === "open" ? null : user.id,
              }
            : row
        )
      );
      toast.success(`Safety report marked ${nextStatus}`);
    } catch (err: any) {
      console.error("Failed updating safety report status:", err);
      toast.error(err?.message ?? "Failed to update safety report");
    } finally {
      setUpdatingSafetyReportId(null);
    }
  };

  const refreshDailyKpis = async () => {
    setRefreshingDailyKpis(true);
    try {
      const startDate = chicagoDay(new Date(Date.now() - 35 * 24 * 60 * 60 * 1000));
      const endDate = chicagoDay(new Date(Date.now() - 24 * 60 * 60 * 1000));
      const {
        data: { session },
        error: sessionErr,
      } = await supabase.auth.getSession();
      if (sessionErr || !session?.access_token) {
        throw new Error(sessionErr?.message ?? "No active session for KPI refresh");
      }

      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kpi-refresh`;
      const res = await fetch(functionUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate,
          tz: "America/Chicago",
        }),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(payload?.message ?? payload?.error ?? `KPI refresh failed (${res.status})`);
      }

      await loadDailyKpis();
      toast.success("Daily KPI metrics refreshed");
    } catch (err: any) {
      console.error("Failed refreshing daily KPI metrics:", err);
      toast.error(err?.message ?? "Failed to refresh daily KPI metrics");
    } finally {
      setRefreshingDailyKpis(false);
    }
  };

  const copyTrackedInviteLink = async () => {
    if (!form.id) {
      toast.error("Select an event first");
      return;
    }
    try {
      const { url } = await createReferralInviteLink({
        eventId: form.id,
        source: "event_detail_share",
      });
      await navigator.clipboard.writeText(url);
      toast.success("Tracked invite link copied");
    } catch (err: any) {
      toast.error(err?.message ?? "Could not create invite link");
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("getSession error:", error);
        toast.error("Failed to load session");
        setIsAllowed(false);
        setLoading(false);
        return;
      }

      const email = session?.user?.email ?? "";
      const ok = isAllowedAdminEmail(email);

      setIsAllowed(ok);
      setLoading(false);

      if (ok) {
        await Promise.all([
          loadEvents(),
          loadGrowthMetrics(),
          loadDailyKpis(),
          loadRetentionEmailMetrics(),
          loadSafetyReports(),
        ]);
      }
    };

    init();
  }, []);

  const selectEventForEdit = (e: EventRow) => {
    setForm({
      id: e.id,
      title: e.title ?? "",
      location: e.location ?? "",
      event_date: toDatetimeLocal(e.event_date),
      event_end_date: toDatetimeLocal(e.event_end_date),
      image_url: e.image_url ?? "",
      description: e.description ?? "",
      moderation_status: e.moderation_status === "quarantined" ? "quarantined" : "approved",
      moderation_note: e.moderation_note ?? "",
    });
  };

  const upsertEvent = async () => {
    if (!isAllowed) return;

    const title = form.title.trim();
    if (!title) {
      toast.error("Title is required");
      return;
    }

    setWorking(true);

    const eventDateIso = form.event_date
      ? new Date(form.event_date).toISOString()
      : null;
    const eventEndDateIso = form.event_end_date
      ? new Date(form.event_end_date).toISOString()
      : null;

    if (eventDateIso && eventEndDateIso) {
      const startTs = new Date(eventDateIso).getTime();
      const endTs = new Date(eventEndDateIso).getTime();
      if (endTs < startTs) {
        toast.error("End date must be after start date");
        setWorking(false);
        return;
      }
    }

    const payload: any = {
      title,
      location: form.location.trim() || null,
      event_date: eventDateIso,
      event_end_date: eventEndDateIso,
      image_url: form.image_url.trim() || null,
      description: form.description.trim() || null,
      moderation_status: form.moderation_status,
      moderation_note: form.moderation_note.trim() || null,
    };

    try {
      if (form.id) {
        // UPDATE
        const { error } = await supabase
          .from("events")
          .update(payload)
          .eq("id", form.id);

        if (error) throw error;

        toast.success("Event updated");
      } else {
        // INSERT
        const { error } = await supabase.from("events").insert(payload);
        if (error) throw error;

        toast.success("Event created");
      }

      resetForm();
      await loadEvents();
    } catch (err: any) {
      console.error("Upsert failed:", err);
      toast.error(err?.message ?? "Failed to save event");
    } finally {
      setWorking(false);
    }
  };

  const deleteEvent = async () => {
    if (!isAllowed) return;
    if (!form.id) return;

    const ok = window.confirm("Delete this event? This cannot be undone.");
    if (!ok) return;

    setWorking(true);
    try {
      // Optional: delete attendees first if you have FK constraints without cascade
      // If your attendees table has ON DELETE CASCADE for event_id, this is not needed.
      await supabase.from("attendees").delete().eq("event_id", form.id);

      const { error } = await supabase.from("events").delete().eq("id", form.id);
      if (error) throw error;

      toast.success("Event deleted");
      resetForm();
      await loadEvents();
    } catch (err: any) {
      console.error("Delete failed:", err);
      toast.error(err?.message ?? "Failed to delete event");
    } finally {
      setWorking(false);
    }
  };

  const setModerationState = async (
    eventId: string,
    status: "approved" | "quarantined",
    note?: string | null
  ) => {
    if (!isAllowed) return;
    setWorking(true);
    try {
      const { error } = await supabase
        .from("events")
        .update({
          moderation_status: status,
          moderation_note: note?.trim() || null,
        })
        .eq("id", eventId);
      if (error) throw error;

      if (form.id === eventId) {
        setForm((prev) => ({
          ...prev,
          moderation_status: status,
          moderation_note: note?.trim() || "",
        }));
      }

      await loadEvents();
      toast.success(status === "quarantined" ? "Event quarantined" : "Event restored");
    } catch (err: any) {
      console.error("Moderation update failed:", err);
      toast.error(err?.message ?? "Failed to update moderation state");
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white px-6 py-8">
        <div className="text-zinc-400">Loading…</div>
      </div>
    );
  }

  if (!isAllowed) {
    return (
      <div className="min-h-screen bg-black text-white px-6 py-8">
        <h1 className="text-2xl font-bold mb-2">Admin</h1>
        <p className="text-zinc-400">You don’t have access to this page.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white px-6 py-8 pb-28">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Admin</h1>
          <p className="text-zinc-400">Growth, ops, and retention tools for the current market.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/events"
            className="px-4 py-2 rounded-xl bg-pink-500/15 border border-pink-400/30 text-pink-100 hover:bg-pink-500/20"
          >
            Manage Events
          </Link>
          <Link
            to="/admin/health"
            className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15"
          >
            Health
          </Link>
          <button
            onClick={() => void loadGrowthMetrics()}
            disabled={loadingGrowth}
            className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15 disabled:opacity-60"
          >
            {loadingGrowth ? "Refreshing..." : "Refresh Growth"}
          </button>
          <button
            onClick={() => void refreshDailyKpis()}
            disabled={refreshingDailyKpis}
            className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-60"
          >
            {refreshingDailyKpis ? "Refreshing KPIs..." : "Refresh Daily KPIs"}
          </button>
        </div>
      </div>

      <div className="mb-8 rounded-2xl border border-white/10 bg-zinc-900/40 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold">Event Operations</div>
            <div className="text-xs text-zinc-500">
              Manual creation, editing, and moderation have moved into a dedicated events workspace. Multi-source sync and freshness checks live in Admin Health.
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin/events"
              className="px-4 py-2 rounded-xl bg-white text-black font-medium hover:bg-zinc-200"
            >
              Open Event Manager
            </Link>
            <div className="px-4 py-2 rounded-xl border border-white/10 bg-black/20 text-sm text-zinc-300">
              {loadingEvents ? "Loading event counts..." : `${upcomingEvents.length} upcoming, ${pastEvents.length} past`}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8 rounded-2xl border border-white/10 bg-zinc-900/40 p-4">
        <div className="text-sm font-semibold mb-3">Growth Funnel (Last 7 Days)</div>
        {growthStats ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-zinc-400">Invites created</div>
                <div className="text-xl font-semibold">{growthStats.invitesCreated7d}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-zinc-400">Invites opened</div>
                <div className="text-xl font-semibold">
                  {growthStats.inviteOpened7d} <span className="text-xs text-zinc-400">({pct(growthStats.inviteOpenRate)})</span>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-zinc-400">Invite signups</div>
                <div className="text-xl font-semibold">
                  {growthStats.inviteSignup7d} <span className="text-xs text-zinc-400">({pct(growthStats.signupRate)})</span>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-zinc-400">Invite RSVPs</div>
                <div className="text-xl font-semibold">
                  {growthStats.inviteRsvp7d} <span className="text-xs text-zinc-400">({pct(growthStats.rsvpRate)})</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-zinc-400 mb-2">Invite Source Mix</div>
                {growthBySource.length === 0 ? (
                  <div className="text-xs text-zinc-500">No source data yet.</div>
                ) : (
                  <div className="space-y-1">
                    {growthBySource.map((row) => (
                      <div key={row.source} className="flex items-center justify-between text-sm">
                        <span className="text-zinc-300">{row.source}</span>
                        <span className="text-zinc-100 font-medium">{row.invites}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-zinc-400 mb-2">Top Inviters</div>
                {topInviters.length === 0 ? (
                  <div className="text-xs text-zinc-500">No inviters yet.</div>
                ) : (
                  <div className="space-y-1">
                    {topInviters.map((row) => (
                      <div key={row.userId} className="flex items-center justify-between text-sm">
                        <span className="text-zinc-300">@{row.handle}</span>
                        <span className="text-zinc-100 font-medium">{row.invites}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-xs text-zinc-500">
            {loadingGrowth ? "Loading growth metrics..." : "No growth data yet."}
          </div>
        )}
      </div>

      <div className="mb-8 rounded-2xl border border-white/10 bg-zinc-900/40 p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <div className="text-sm font-semibold">Daily KPI Trends</div>
            <div className="text-xs text-zinc-500">Persisted SQL aggregates from `daily_kpi_metrics`.</div>
          </div>
          <button
            onClick={() => void loadDailyKpis()}
            disabled={loadingDailyKpis}
            className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15 disabled:opacity-60 text-sm"
          >
            {loadingDailyKpis ? "Loading..." : "Reload"}
          </button>
        </div>

        {latestDailyKpi ? (
          <>
            <div className="mb-4 rounded-xl border border-fuchsia-400/20 bg-fuchsia-500/10 p-4">
              <div className="text-sm font-semibold text-white mb-3">MVP Scorecard</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="text-xs text-zinc-400">Friend in 24h</div>
                  <div className="text-xl font-semibold">
                    {Number(latestDailyKpi.friend_24h_rate_pct ?? 0).toFixed(1)}%
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {latestDailyKpi.new_users_with_friend_24h ?? 0} of {latestDailyKpi.new_users}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="text-xs text-zinc-400">RSVP in 24h</div>
                  <div className="text-xl font-semibold">
                    {Number(latestDailyKpi.rsvp_24h_rate_pct ?? 0).toFixed(1)}%
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {latestDailyKpi.new_users_with_rsvp_24h ?? 0} of {latestDailyKpi.new_users}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="text-xs text-zinc-400">Invite in 72h</div>
                  <div className="text-xl font-semibold">
                    {Number(latestDailyKpi.invite_72h_rate_pct ?? 0).toFixed(1)}%
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {latestDailyKpi.new_users_with_invite_72h ?? 0} of {latestDailyKpi.new_users}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="text-xs text-zinc-400">WAU (7d)</div>
                  <div className="text-xl font-semibold">{latestDailyKpi.wau_7d ?? 0}</div>
                  <div className="text-xs text-zinc-500 mt-1">Trailing 7 full days</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="text-xs text-zinc-400">D1 retention</div>
                  <div className="text-xl font-semibold">{Number(latestDailyKpi.d1_retention_pct ?? 0).toFixed(1)}%</div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {latestDailyKpi.d1_retained_users} of {latestDailyKpi.d1_eligible_users}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="text-xs text-zinc-400">D7 retention</div>
                  <div className="text-xl font-semibold">{Number(latestDailyKpi.d7_retention_pct ?? 0).toFixed(1)}%</div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {latestDailyKpi.d7_retained_users ?? 0} of {latestDailyKpi.d7_eligible_users ?? 0}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="text-xs text-zinc-400">D30 retention</div>
                  <div className="text-xl font-semibold">{Number(latestDailyKpi.d30_retention_pct ?? 0).toFixed(1)}%</div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {latestDailyKpi.d30_retained_users ?? 0} of {latestDailyKpi.d30_eligible_users ?? 0}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="text-xs text-zinc-400">Invite funnel</div>
                  <div className="text-xl font-semibold">{latestInviteOpenRate.toFixed(1)}%</div>
                  <div className="text-xs text-zinc-500 mt-1">
                    open {latestSignupRate.toFixed(1)}% signup, {latestInviteRsvpRate.toFixed(1)}% RSVP
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-zinc-400">Latest day</div>
                <div className="text-xl font-semibold">{latestDailyKpi.metric_date}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-zinc-400">Active users</div>
                <div className="text-xl font-semibold">{latestDailyKpi.active_users}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-zinc-400">RSVPs</div>
                <div className="text-xl font-semibold">{latestDailyKpi.rsvps}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-zinc-400">Activation rate</div>
                <div className="text-xl font-semibold">{Number(latestDailyKpi.activation_rate_pct ?? 0).toFixed(1)}%</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3 overflow-x-auto">
                <div className="text-xs text-zinc-400 mb-2">Last 14 Full Days</div>
                <table className="w-full text-sm">
                  <thead className="text-zinc-500">
                    <tr>
                      <th className="text-left pb-2 pr-3">Day</th>
                      <th className="text-right pb-2 pr-3">WAU</th>
                      <th className="text-right pb-2 pr-3">Friend 24h</th>
                      <th className="text-right pb-2 pr-3">RSVP 24h</th>
                      <th className="text-right pb-2 pr-3">Invite 72h</th>
                      <th className="text-right pb-2 pr-3">D1</th>
                      <th className="text-right pb-2 pr-3">D7</th>
                      <th className="text-right pb-2">D30</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyKpis.map((row) => (
                      <tr key={row.metric_date} className="border-t border-white/5">
                        <td className="py-2 pr-3 text-zinc-300">{row.metric_date}</td>
                        <td className="py-2 pr-3 text-right">{row.wau_7d ?? 0}</td>
                        <td className="py-2 pr-3 text-right">{Number(row.friend_24h_rate_pct ?? 0).toFixed(1)}%</td>
                        <td className="py-2 pr-3 text-right">{Number(row.rsvp_24h_rate_pct ?? 0).toFixed(1)}%</td>
                        <td className="py-2 pr-3 text-right">{Number(row.invite_72h_rate_pct ?? 0).toFixed(1)}%</td>
                        <td className="py-2 pr-3 text-right">{Number(row.d1_retention_pct ?? 0).toFixed(1)}%</td>
                        <td className="py-2 pr-3 text-right">{Number(row.d7_retention_pct ?? 0).toFixed(1)}%</td>
                        <td className="py-2 text-right">{Number(row.d30_retention_pct ?? 0).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-zinc-400 mb-2">Latest RSVP Source Mix</div>
                {latestRsvpSources.length === 0 ? (
                  <div className="text-xs text-zinc-500">No persisted RSVP source data yet.</div>
                ) : (
                  <div className="space-y-1">
                    {latestRsvpSources.map((row) => (
                      <div key={`${row.metric_date}-${row.source}`} className="flex items-center justify-between text-sm">
                        <span className="text-zinc-300">
                          {row.source} <span className="text-zinc-500">({row.metric_date})</span>
                        </span>
                        <span className="text-zinc-100 font-medium">
                          {row.rsvp_count} <span className="text-zinc-500">({Number(row.pct_of_day ?? 0).toFixed(1)}%)</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-xs text-zinc-500">
            {loadingDailyKpis
              ? "Loading daily KPI metrics..."
              : "No persisted daily KPIs yet. Run the SQL migration, then use Refresh Daily KPIs or the ops:kpi-refresh script."}
          </div>
        )}
      </div>

      <div className="mb-8 rounded-2xl border border-white/10 bg-zinc-900/40 p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <div className="text-sm font-semibold">Safety Reports</div>
            <div className="text-xs text-zinc-500">Triage queue for user and event reports from the community.</div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={safetyStatusFilter}
              onChange={(event) => setSafetyStatusFilter(event.target.value as typeof safetyStatusFilter)}
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-200"
            >
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="reviewed">Reviewed</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
            <button
              onClick={() => void loadSafetyReports()}
              disabled={loadingSafetyReports}
              className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15 disabled:opacity-60 text-sm"
            >
              {loadingSafetyReports ? "Loading..." : "Reload"}
            </button>
          </div>
        </div>

        {safetyReports.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-zinc-400">Open queue</div>
                <div className="text-xl font-semibold">{safetySummary.open}</div>
                <div className="text-xs text-zinc-500 mt-1">{safetySummary.last7d} reported in last 7 days</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-zinc-400">Reviewed</div>
                <div className="text-xl font-semibold">{safetySummary.reviewed}</div>
                <div className="text-xs text-zinc-500 mt-1">{safetySummary.resolved} resolved, {safetySummary.dismissed} dismissed</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-zinc-400">Target mix</div>
                <div className="text-xl font-semibold">{safetySummary.userReports}</div>
                <div className="text-xs text-zinc-500 mt-1">{safetySummary.eventReports} event reports</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-zinc-400">Top reasons</div>
                <div className="text-sm font-medium text-zinc-200 mt-1">
                  {safetySummary.topReasons.length > 0
                    ? safetySummary.topReasons.map(([reason, count]) => `${reason} (${count})`).join(", ")
                    : "No reports yet"}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-zinc-500">
                  <tr>
                    <th className="text-left pb-2 pr-3">When</th>
                    <th className="text-left pb-2 pr-3">Status</th>
                    <th className="text-left pb-2 pr-3">Type</th>
                    <th className="text-left pb-2 pr-3">Reason</th>
                    <th className="text-left pb-2 pr-3">Target</th>
                    <th className="text-left pb-2 pr-3">Reporter</th>
                    <th className="text-left pb-2 pr-3">Details</th>
                    <th className="text-left pb-2">Triage</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSafetyReports.map((row) => (
                    <tr key={row.id} className="border-t border-white/5 align-top">
                      <td className="py-2 pr-3 text-zinc-300">{formatDateTime(row.created_at)}</td>
                      <td className="py-2 pr-3">
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-zinc-300">
                          {row.status}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-zinc-300">{row.target_type}</td>
                      <td className="py-2 pr-3 text-zinc-300">{row.reason}</td>
                      <td className="py-2 pr-3 text-zinc-400">
                        {row.target_type === "user" ? (
                          <div>
                            <div className="text-zinc-300">
                              {row.target_user_id ? safetyUserNames[row.target_user_id] ?? row.target_user_id.slice(0, 8) : "Unknown user"}
                            </div>
                            {row.target_user_id ? (
                              <div className="text-[11px] text-zinc-500">{row.target_user_id.slice(0, 8)}</div>
                            ) : null}
                          </div>
                        ) : (
                          <div>
                            <div className="text-zinc-300">
                              {row.target_event_id ? safetyEventTitles[row.target_event_id] ?? row.target_event_id.slice(0, 8) : "Unknown event"}
                            </div>
                            {row.target_event_id ? (
                              <div className="text-[11px] text-zinc-500">{row.target_event_id.slice(0, 8)}</div>
                            ) : null}
                          </div>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-zinc-400">
                        <div className="text-zinc-300">
                          {safetyUserNames[row.reporter_user_id] ?? row.reporter_user_id.slice(0, 8)}
                        </div>
                        <div className="text-[11px] text-zinc-500">{row.reporter_user_id.slice(0, 8)}</div>
                      </td>
                      <td className="py-2 pr-3 text-zinc-400">
                        <div>{row.details || "No extra detail"}</div>
                        {row.reviewed_at ? (
                          <div className="text-[11px] text-zinc-500 mt-1">
                            Reviewed {formatDateTime(row.reviewed_at)}
                            {row.reviewed_by ? ` by ${safetyUserNames[row.reviewed_by] ?? row.reviewed_by.slice(0, 8)}` : ""}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => void updateSafetyReportStatus(row.id, "reviewed")}
                            disabled={updatingSafetyReportId === row.id || row.status === "reviewed"}
                            className="px-2 py-1 rounded-lg bg-white/10 border border-white/10 hover:bg-white/15 disabled:opacity-50"
                          >
                            Review
                          </button>
                          <button
                            onClick={() => void updateSafetyReportStatus(row.id, "resolved")}
                            disabled={updatingSafetyReportId === row.id || row.status === "resolved"}
                            className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-400/20 text-emerald-200 hover:bg-emerald-500/15 disabled:opacity-50"
                          >
                            Resolve
                          </button>
                          <button
                            onClick={() => void updateSafetyReportStatus(row.id, "dismissed")}
                            disabled={updatingSafetyReportId === row.id || row.status === "dismissed"}
                            className="px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-400/20 text-amber-200 hover:bg-amber-500/15 disabled:opacity-50"
                          >
                            Dismiss
                          </button>
                          {row.status !== "open" ? (
                            <button
                              onClick={() => void updateSafetyReportStatus(row.id, "open")}
                              disabled={updatingSafetyReportId === row.id}
                              className="px-2 py-1 rounded-lg bg-black/30 border border-white/10 text-zinc-300 hover:bg-black/40 disabled:opacity-50"
                            >
                              Reopen
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredSafetyReports.length === 0 ? (
              <div className="text-xs text-zinc-500 mt-3">No safety reports match the current filter.</div>
            ) : null}
          </>
        ) : (
          <div className="text-xs text-zinc-500">
            {loadingSafetyReports ? "Loading safety reports..." : "No safety reports yet."}
          </div>
        )}
      </div>

      <div className="mb-8 rounded-2xl border border-white/10 bg-zinc-900/40 p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <div className="text-sm font-semibold">Retention Email Performance</div>
            <div className="text-xs text-zinc-500">Last 30 days from `email_events`, grouped by trigger.</div>
          </div>
          <button
            onClick={() => void loadRetentionEmailMetrics()}
            disabled={loadingRetentionEmails}
            className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15 disabled:opacity-60 text-sm"
          >
            {loadingRetentionEmails ? "Loading..." : "Reload"}
          </button>
        </div>

        {retentionEmailSummary.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-zinc-400">Emails sent</div>
                <div className="text-xl font-semibold">{totalRetentionEmailSent}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-zinc-400">Opened</div>
                <div className="text-xl font-semibold">{totalRetentionEmailOpened}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-zinc-400">Clicked</div>
                <div className="text-xl font-semibold">{totalRetentionEmailClicked}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-zinc-400">Open rate</div>
                <div className="text-xl font-semibold">
                  {totalRetentionEmailSent > 0
                    ? `${((totalRetentionEmailOpened / totalRetentionEmailSent) * 100).toFixed(1)}%`
                    : "0.0%"}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-3 overflow-x-auto">
              <div className="text-xs text-zinc-400 mb-2">By Trigger</div>
              <table className="w-full text-sm">
                <thead className="text-zinc-500">
                  <tr>
                    <th className="text-left pb-2 pr-3">Trigger</th>
                    <th className="text-right pb-2 pr-3">Sent</th>
                    <th className="text-right pb-2 pr-3">Delivered</th>
                    <th className="text-right pb-2 pr-3">Opened</th>
                    <th className="text-right pb-2 pr-3">Clicked</th>
                    <th className="text-right pb-2 pr-3">Bounced</th>
                    <th className="text-right pb-2 pr-3">Failed</th>
                    <th className="text-right pb-2 pr-3">Open rate</th>
                    <th className="text-right pb-2">Last sent</th>
                  </tr>
                </thead>
                <tbody>
                  {retentionEmailSummary.map((row) => (
                    <tr key={row.triggerKey} className="border-t border-white/5">
                      <td className="py-2 pr-3 text-zinc-300">{row.triggerKey}</td>
                      <td className="py-2 pr-3 text-right">{row.sent}</td>
                      <td className="py-2 pr-3 text-right">{row.delivered}</td>
                      <td className="py-2 pr-3 text-right">{row.opened}</td>
                      <td className="py-2 pr-3 text-right">{row.clicked}</td>
                      <td className="py-2 pr-3 text-right">{row.bounced}</td>
                      <td className="py-2 pr-3 text-right">{row.failed}</td>
                      <td className="py-2 pr-3 text-right">{(row.openRate * 100).toFixed(1)}%</td>
                      <td className="py-2 text-right text-zinc-400">{formatDateTime(row.latestSentAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="text-xs text-zinc-500">
            {loadingRetentionEmails
              ? "Loading retention email metrics..."
              : "No retention email data yet, or the current admin role cannot read `email_events`."}
          </div>
        )}
      </div>

      {/* Event lists */}
      <div className="hidden mb-8">
        <button
          type="button"
          onClick={() => setShowUpcomingEvents((v) => !v)}
          className="w-full flex items-center justify-between text-left px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 mb-3"
        >
          <span className="text-lg font-semibold">Upcoming Events ({upcomingEvents.length})</span>
          {showUpcomingEvents ? (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          )}
        </button>

        {showUpcomingEvents ? (
          loadingEvents ? (
            <div className="text-zinc-400">Loading events...</div>
          ) : upcomingEvents.length === 0 ? (
            <div className="text-zinc-500">No upcoming events.</div>
          ) : (
            <div className="space-y-2">
              {upcomingEvents.map((e) => (
                <button
                  key={e.id}
                  onClick={() => selectEventForEdit(e)}
                  className={`w-full text-left p-4 rounded-2xl border transition-colors ${
                    form.id === e.id
                      ? "bg-zinc-900 border-pink-500/40"
                      : "bg-zinc-900/40 border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">{e.title}</div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                        {sourceLabel(e.event_source)}
                      </span>
                      {e.moderation_status === "quarantined" ? (
                        <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-amber-200">
                          Quarantined
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">
                    {formatEventDateTimeRange(e)}
                    {" - "}
                    {e.location ?? "Location TBD"}
                  </div>
                </button>
              ))}
            </div>
          )
        ) : null}

        <button
          type="button"
          onClick={() => setShowPastEvents((v) => !v)}
          className="w-full flex items-center justify-between text-left px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 mt-8 mb-3"
        >
          <span className="text-lg font-semibold">Past Events ({pastEvents.length})</span>
          {showPastEvents ? (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          )}
        </button>

        {showPastEvents ? (
          loadingEvents ? (
            <div className="text-zinc-400">Loading events...</div>
          ) : pastEvents.length === 0 ? (
            <div className="text-zinc-500">No past events.</div>
          ) : (
            <div className="space-y-2">
              {pastEvents.map((e) => (
                <button
                  key={e.id}
                  onClick={() => selectEventForEdit(e)}
                  className={`w-full text-left p-4 rounded-2xl border transition-colors ${
                    form.id === e.id
                      ? "bg-zinc-900 border-pink-500/40"
                      : "bg-zinc-900/30 border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">{e.title}</div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                        {sourceLabel(e.event_source)}
                      </span>
                      {e.moderation_status === "quarantined" ? (
                        <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-amber-200">
                          Quarantined
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">
                    {formatEventDateTimeRange(e)}
                    {" - "}
                    {e.location ?? "Location TBD"}
                  </div>
                </button>
              ))}
            </div>
          )
        ) : null}
      </div>

      {/* Create/Edit form */}
      <div className="hidden bg-zinc-900/40 border border-white/10 rounded-2xl p-5">
        <h2 className="text-xl font-bold mb-1">
          {form.id ? "Edit Event" : "Create Event"}
        </h2>
        <p className="text-zinc-400 text-sm mb-5">
          {form.id ? "Update fields and save." : "Fill out fields and create."}
        </p>

        <div className="space-y-4">
          <div>
            <div className="text-sm text-zinc-400 mb-1">Title *</div>
            <input
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
              placeholder="Subtronics at Red Rocks"
            />
          </div>

          <div>
            <div className="text-sm text-zinc-400 mb-1">Date & time</div>
            <input
              type="datetime-local"
              value={form.event_date}
              onChange={(e) => handleChange("event_date", e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
            />
          </div>

          <div>
            <div className="text-sm text-zinc-400 mb-1">End date & time (optional)</div>
            <input
              type="datetime-local"
              value={form.event_end_date}
              onChange={(e) => handleChange("event_end_date", e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
            />
          </div>

          <div>
            <div className="text-sm text-zinc-400 mb-1">Location</div>
            <input
              value={form.location}
              onChange={(e) => handleChange("location", e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
              placeholder="Dallas, TX"
            />
          </div>

          <div>
            <div className="text-sm text-zinc-400 mb-1">Image URL</div>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => imageFileRef.current?.click()}
                disabled={uploadingImage}
                className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15 disabled:opacity-60"
              >
                {uploadingImage ? "Uploading..." : "Upload image"}
              </button>
              <input
                ref={imageFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  if (file) void uploadEventImage(file);
                  e.currentTarget.value = "";
                }}
              />
            </div>
            <input
              value={form.image_url}
              onChange={(e) => handleChange("image_url", e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
              placeholder="https://..."
            />
            <div className="text-xs text-zinc-500 mt-2">
              Upload directly, or paste a URL manually.
            </div>
          </div>

          <div>
            <div className="text-sm text-zinc-400 mb-1">Description</div>
            <textarea
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              className="w-full min-h-[120px] bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
              placeholder="Doors at 8. Support: …"
            />
          </div>

          <div>
            <div className="text-sm text-zinc-400 mb-1">Moderation state</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleChange("moderation_status", "approved")}
                className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                  form.moderation_status === "approved"
                    ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
                    : "border-white/10 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                Approved
              </button>
              <button
                type="button"
                onClick={() => handleChange("moderation_status", "quarantined")}
                className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                  form.moderation_status === "quarantined"
                    ? "border-amber-400/40 bg-amber-500/15 text-amber-200"
                    : "border-white/10 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                Quarantined
              </button>
            </div>
          </div>

          <div>
            <div className="text-sm text-zinc-400 mb-1">Moderation note</div>
            <textarea
              value={form.moderation_note}
              onChange={(e) => handleChange("moderation_note", e.target.value)}
              className="w-full min-h-[90px] bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
              placeholder="Why this should stay hidden or be reviewed."
            />
          </div>

          {form.id ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void setModerationState(form.id!, "quarantined", form.moderation_note)}
                disabled={working}
                className="w-full px-4 py-3 rounded-2xl font-semibold bg-amber-500/15 border border-amber-400/30 text-amber-200 hover:bg-amber-500/20 disabled:opacity-50"
              >
                Quarantine Event
              </button>
              <button
                type="button"
                onClick={() => void setModerationState(form.id!, "approved", form.moderation_note)}
                disabled={working}
                className="w-full px-4 py-3 rounded-2xl font-semibold bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
              >
                Restore Event
              </button>
            </div>
          ) : null}

          {form.id ? (
            <button
              type="button"
              onClick={() => void copyTrackedInviteLink()}
              className="w-full px-6 py-3 rounded-2xl font-semibold bg-white/10 border border-white/10 hover:bg-white/15"
            >
              Copy tracked invite link for this event
            </button>
          ) : null}

          <button
            onClick={upsertEvent}
            disabled={working}
            className="w-full px-6 py-4 rounded-2xl font-semibold bg-gradient-to-r from-pink-600 to-purple-600 disabled:opacity-50"
          >
            {working ? "Saving…" : form.id ? "Update Event" : "Create Event"}
          </button>

          {form.id && (
            <button
              onClick={deleteEvent}
              disabled={working}
              className="w-full px-6 py-3 rounded-2xl font-semibold bg-white/10 border border-white/10 hover:bg-white/15 disabled:opacity-50"
            >
              Delete Event
            </button>
          )}
        </div>
      </div>
    </div>
  );
}



