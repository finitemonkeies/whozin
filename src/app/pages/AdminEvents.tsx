import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { isAllowedAdminEmail } from "@/lib/adminAccess";
import { formatEventDateTimeRange, isEventPast } from "@/lib/eventDates";
import { createReferralInviteLink } from "@/lib/referrals";
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
};

type FormState = {
  id: string | null;
  title: string;
  location: string;
  event_date: string;
  event_end_date: string;
  image_url: string;
  description: string;
  moderation_status: "approved" | "quarantined";
  moderation_note: string;
};

function toDatetimeLocal(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export default function AdminEvents() {
  const [searchParams, setSearchParams] = useSearchParams();
  const imageFileRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [working, setWorking] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showUpcomingEvents, setShowUpcomingEvents] = useState(true);
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

  const upcomingEvents = useMemo(() => {
    const nowTs = Date.now();
    return events.filter((event) => !isEventPast(event, nowTs));
  }, [events]);

  const pastEvents = useMemo(() => {
    const nowTs = Date.now();
    return events.filter((event) => isEventPast(event, nowTs));
  }, [events]);

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
    if (searchParams.has("eventId")) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("eventId");
      setSearchParams(nextParams, { replace: true });
    }
  };

  const handleChange = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const randomId = () => Math.random().toString(16).slice(2) + Date.now().toString(16);

  const loadEvents = async () => {
    setLoadingEvents(true);

    const { data, error } = await supabase
      .from("events")
      .select(
        "id,title,location,event_date,event_end_date,image_url,description,event_source,moderation_status,moderation_note"
      )
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

      const { error: uploadErr } = await supabase.storage.from("event-images").upload(path, file, {
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

  const selectEventForEdit = (event: EventRow) => {
    if (isEventPast(event, Date.now())) {
      setShowPastEvents(true);
    } else {
      setShowUpcomingEvents(true);
    }

    setForm({
      id: event.id,
      title: event.title ?? "",
      location: event.location ?? "",
      event_date: toDatetimeLocal(event.event_date),
      event_end_date: toDatetimeLocal(event.event_end_date),
      image_url: event.image_url ?? "",
      description: event.description ?? "",
      moderation_status: event.moderation_status === "quarantined" ? "quarantined" : "approved",
      moderation_note: event.moderation_note ?? "",
    });

    if (searchParams.get("eventId") !== event.id) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("eventId", event.id);
      setSearchParams(nextParams, { replace: true });
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

  const upsertEvent = async () => {
    if (!isAllowed) return;

    const title = form.title.trim();
    if (!title) {
      toast.error("Title is required");
      return;
    }

    setWorking(true);

    const eventDateIso = form.event_date ? new Date(form.event_date).toISOString() : null;
    const eventEndDateIso = form.event_end_date ? new Date(form.event_end_date).toISOString() : null;

    if (eventDateIso && eventEndDateIso) {
      const startTs = new Date(eventDateIso).getTime();
      const endTs = new Date(eventEndDateIso).getTime();
      if (endTs < startTs) {
        toast.error("End date must be after start date");
        setWorking(false);
        return;
      }
    }

    const payload = {
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
        const { error } = await supabase.from("events").update(payload).eq("id", form.id);
        if (error) throw error;
        toast.success("Event updated");
      } else {
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
    if (!isAllowed || !form.id) return;

    const ok = window.confirm("Delete this event? This cannot be undone.");
    if (!ok) return;

    setWorking(true);
    try {
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
        await loadEvents();
      }
    };

    void init();
  }, []);

  useEffect(() => {
    const eventId = searchParams.get("eventId");
    if (!eventId || events.length === 0) return;
    if (form.id === eventId) return;

    const match = events.find((event) => event.id === eventId);
    if (!match) return;

    selectEventForEdit(match);
  }, [events, form.id, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black px-6 py-8 text-white">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (!isAllowed) {
    return (
      <div className="min-h-screen bg-black px-6 py-8 text-white">
        <h1 className="mb-2 text-2xl font-bold">Admin Events</h1>
        <p className="text-zinc-400">You do not have access to this page.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black px-6 py-8 pb-28 text-white">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Admin Events</h1>
          <p className="text-zinc-400">Create, edit, quarantine, and seed events from one dedicated page.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin"
            className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 hover:bg-white/15"
          >
            Back to Admin
          </Link>
          <button
            type="button"
            onClick={() => void loadEvents()}
            disabled={loadingEvents}
            className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 hover:bg-white/15 disabled:opacity-60"
          >
            {loadingEvents ? "Refreshing..." : "Refresh"}
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 hover:bg-white/15"
          >
            + New Event
          </button>
        </div>
      </div>

      <div className="mb-8 rounded-2xl border border-white/10 bg-zinc-900/40 p-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-xs text-zinc-400">Total events</div>
            <div className="text-2xl font-semibold">{events.length}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-xs text-zinc-400">Upcoming</div>
            <div className="text-2xl font-semibold">{upcomingEvents.length}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-xs text-zinc-400">Past</div>
            <div className="text-2xl font-semibold">{pastEvents.length}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-xs text-zinc-400">Editing</div>
            <div className="truncate text-sm font-semibold text-zinc-100">
              {form.id ? form.title || "Selected event" : "New draft"}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-5">
        <h2 className="mb-1 text-xl font-bold">{form.id ? "Edit Event" : "Create Event"}</h2>
        <p className="mb-5 text-sm text-zinc-400">
          {form.id ? "Update fields and save." : "Fill out fields and create."}
        </p>

        <div className="space-y-4">
          <div>
            <div className="mb-1 text-sm text-zinc-400">Title *</div>
            <input
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white focus:outline-none"
              placeholder="Subtronics at Red Rocks"
            />
          </div>

          <div>
            <div className="mb-1 text-sm text-zinc-400">Date & time</div>
            <input
              type="datetime-local"
              value={form.event_date}
              onChange={(e) => handleChange("event_date", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white focus:outline-none"
            />
          </div>

          <div>
            <div className="mb-1 text-sm text-zinc-400">End date & time (optional)</div>
            <input
              type="datetime-local"
              value={form.event_end_date}
              onChange={(e) => handleChange("event_end_date", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white focus:outline-none"
            />
          </div>

          <div>
            <div className="mb-1 text-sm text-zinc-400">Location</div>
            <input
              value={form.location}
              onChange={(e) => handleChange("location", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white focus:outline-none"
              placeholder="Dallas, TX"
            />
          </div>

          <div>
            <div className="mb-1 text-sm text-zinc-400">Image URL</div>
            <div className="mb-2 flex gap-2">
              <button
                type="button"
                onClick={() => imageFileRef.current?.click()}
                disabled={uploadingImage}
                className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 hover:bg-white/15 disabled:opacity-60"
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
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white focus:outline-none"
              placeholder="https://..."
            />
            <div className="mt-2 text-xs text-zinc-500">Upload directly, or paste a URL manually.</div>
          </div>

          <div>
            <div className="mb-1 text-sm text-zinc-400">Description</div>
            <textarea
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              className="min-h-[120px] w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white focus:outline-none"
              placeholder="Doors at 8. Support..."
            />
          </div>

          <div>
            <div className="mb-1 text-sm text-zinc-400">Moderation state</div>
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
            <div className="mb-1 text-sm text-zinc-400">Moderation note</div>
            <textarea
              value={form.moderation_note}
              onChange={(e) => handleChange("moderation_note", e.target.value)}
              className="min-h-[90px] w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white focus:outline-none"
              placeholder="Why this should stay hidden or be reviewed."
            />
          </div>

          {form.id ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => void setModerationState(form.id!, "quarantined", form.moderation_note)}
                disabled={working}
                className="w-full rounded-2xl border border-amber-400/30 bg-amber-500/15 px-4 py-3 font-semibold text-amber-200 hover:bg-amber-500/20 disabled:opacity-50"
              >
                Quarantine Event
              </button>
              <button
                type="button"
                onClick={() => void setModerationState(form.id!, "approved", form.moderation_note)}
                disabled={working}
                className="w-full rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-3 font-semibold text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
              >
                Restore Event
              </button>
            </div>
          ) : null}

          {form.id ? (
            <button
              type="button"
              onClick={() => void copyTrackedInviteLink()}
              className="w-full rounded-2xl border border-white/10 bg-white/10 px-6 py-3 font-semibold hover:bg-white/15"
            >
              Copy tracked invite link for this event
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => void upsertEvent()}
            disabled={working}
            className="w-full rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 px-6 py-4 font-semibold disabled:opacity-50"
          >
            {working ? "Saving..." : form.id ? "Update Event" : "Create Event"}
          </button>

          {form.id ? (
            <button
              type="button"
              onClick={() => void deleteEvent()}
              disabled={working}
              className="w-full rounded-2xl border border-white/10 bg-white/10 px-6 py-3 font-semibold hover:bg-white/15 disabled:opacity-50"
            >
              Delete Event
            </button>
          ) : null}
        </div>
      </div>

      <div className="mb-8 mt-8">
        <button
          type="button"
          onClick={() => setShowUpcomingEvents((value) => !value)}
          className="mb-3 flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left hover:bg-white/10"
        >
          <span className="text-lg font-semibold">Upcoming Events ({upcomingEvents.length})</span>
          {showUpcomingEvents ? (
            <ChevronDown className="h-4 w-4 text-zinc-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-zinc-400" />
          )}
        </button>

        {showUpcomingEvents ? (
          loadingEvents ? (
            <div className="text-zinc-400">Loading events...</div>
          ) : upcomingEvents.length === 0 ? (
            <div className="text-zinc-500">No upcoming events.</div>
          ) : (
            <div className="space-y-2">
              {upcomingEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => selectEventForEdit(event)}
                  className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                    form.id === event.id
                      ? "border-pink-500/40 bg-zinc-900"
                      : "border-white/10 bg-zinc-900/40 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">{event.title}</div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                        {sourceLabel(event.event_source)}
                      </span>
                      {event.moderation_status === "quarantined" ? (
                        <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-amber-200">
                          Quarantined
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-zinc-400">
                    {formatEventDateTimeRange(event)}
                    {" - "}
                    {event.location ?? "Location TBD"}
                  </div>
                </button>
              ))}
            </div>
          )
        ) : null}

        <button
          type="button"
          onClick={() => setShowPastEvents((value) => !value)}
          className="mb-3 mt-8 flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left hover:bg-white/10"
        >
          <span className="text-lg font-semibold">Past Events ({pastEvents.length})</span>
          {showPastEvents ? (
            <ChevronDown className="h-4 w-4 text-zinc-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-zinc-400" />
          )}
        </button>

        {showPastEvents ? (
          loadingEvents ? (
            <div className="text-zinc-400">Loading events...</div>
          ) : pastEvents.length === 0 ? (
            <div className="text-zinc-500">No past events.</div>
          ) : (
            <div className="space-y-2">
              {pastEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => selectEventForEdit(event)}
                  className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                    form.id === event.id
                      ? "border-pink-500/40 bg-zinc-900"
                      : "border-white/10 bg-zinc-900/30 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">{event.title}</div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                        {sourceLabel(event.event_source)}
                      </span>
                      {event.moderation_status === "quarantined" ? (
                        <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-amber-200">
                          Quarantined
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-zinc-400">
                    {formatEventDateTimeRange(event)}
                    {" - "}
                    {event.location ?? "Location TBD"}
                  </div>
                </button>
              ))}
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}
