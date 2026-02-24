import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { formatEventDateTimeRange, isEventPast } from "@/lib/eventDates";

type EventRow = {
  id: string;
  title: string;
  location: string | null;
  event_date: string | null;
  event_end_date: string | null;
  image_url: string | null;
  description: string | null;
};

type FormState = {
  id: string | null; // null = create mode, string = edit mode
  title: string;
  location: string;
  event_date: string; // datetime-local value
  event_end_date: string; // datetime-local value
  image_url: string;
  description: string;
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

export default function Admin() {
  const imageFileRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  const [events, setEvents] = useState<EventRow[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  const [working, setWorking] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [form, setForm] = useState<FormState>({
    id: null,
    title: "",
    location: "",
    event_date: "",
    event_end_date: "",
    image_url: "",
    description: "",
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

  const resetForm = () => {
    setForm({
      id: null,
      title: "",
      location: "",
      event_date: "",
      event_end_date: "",
      image_url: "",
      description: "",
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
      .select("id,title,location,event_date,event_end_date,image_url,description")
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

      const email = session?.user?.email?.toLowerCase() ?? "";
      const ok = allowedEmails.has(email);

      setIsAllowed(ok);
      setLoading(false);

      if (ok) {
        await loadEvents();
      }
    };

    init();
  }, [allowedEmails]);

  const selectEventForEdit = (e: EventRow) => {
    setForm({
      id: e.id,
      title: e.title ?? "",
      location: e.location ?? "",
      event_date: toDatetimeLocal(e.event_date),
      event_end_date: toDatetimeLocal(e.event_end_date),
      image_url: e.image_url ?? "",
      description: e.description ?? "",
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

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white px-6 py-8">
        <div className="text-zinc-400">Loadingâ€¦</div>
      </div>
    );
  }

  if (!isAllowed) {
    return (
      <div className="min-h-screen bg-black text-white px-6 py-8">
        <h1 className="text-2xl font-bold mb-2">Admin</h1>
        <p className="text-zinc-400">You donâ€™t have access to this page.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white px-6 py-8 pb-28">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Admin</h1>
          <p className="text-zinc-400">Create, edit, and seed events.</p>
        </div>
        <button
          onClick={resetForm}
          className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15"
        >
          + New
        </button>
      </div>

      {/* Event lists */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Upcoming Events ({upcomingEvents.length})</h2>

        {loadingEvents ? (
          <div className="text-zinc-400">Loading eventsâ€¦</div>
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
                <div className="font-semibold">{e.title}</div>
                <div className="text-xs text-zinc-400 mt-1">
                  {formatEventDateTimeRange(e)}
                  {" - "}
                  {e.location ?? "Location TBD"}
                </div>
              </button>
            ))}
          </div>
        )}

        <h2 className="text-lg font-semibold mt-8 mb-3">Past Events ({pastEvents.length})</h2>
        {loadingEvents ? (
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
                <div className="font-semibold">{e.title}</div>
                <div className="text-xs text-zinc-400 mt-1">
                  {formatEventDateTimeRange(e)}
                  {" - "}
                  {e.location ?? "Location TBD"}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit form */}
      <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-5">
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
              placeholder="Doors at 8. Support: â€¦"
            />
          </div>

          <button
            onClick={upsertEvent}
            disabled={working}
            className="w-full px-6 py-4 rounded-2xl font-semibold bg-gradient-to-r from-pink-600 to-purple-600 disabled:opacity-50"
          >
            {working ? "Savingâ€¦" : form.id ? "Update Event" : "Create Event"}
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
