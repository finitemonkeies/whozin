import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { sanitizeRedirectTarget } from "@/lib/redirect";
import { track } from "@/lib/analytics";
import { toast } from "sonner";

type Profile = {
  id: string;
  email: string | null;
  username: string | null;
  display_name: string | null;
  onboarding_complete: boolean;
  avatar_url: string | null;
};

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

function sanitizeUsername(input: string) {
  return input.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
}

export default function Setup() {
  const navigate = useNavigate();
  const location = useLocation();
  const query = useQuery();
  const redirectTo = sanitizeRedirectTarget(query.get("redirect"));

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const isDev = import.meta.env.DEV;

  const showDevSupabaseError = (phase: string, err: any) => {
    if (!isDev || !err) return;
    const parts = [
      err?.code ? `code=${err.code}` : null,
      err?.message ? `message=${err.message}` : null,
      err?.hint ? `hint=${err.hint}` : null,
      err?.details ? `details=${err.details}` : null,
    ].filter(Boolean);
    toast.error(`[setup:${phase}] Supabase error`, {
      description: parts.join(" | ") || "Unknown Supabase error",
      duration: 12000,
    });
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data: sessionRes, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) {
        showDevSupabaseError("getSession", sessionErr);
        if (!cancelled) setError(sessionErr.message);
        setLoading(false);
        return;
      }

      const user = sessionRes.session?.user;
      if (!user) {
        const next = encodeURIComponent(location.pathname + location.search);
        navigate(`/login?redirect=${next}`, { replace: true });
        return;
      }

      let { data, error: profErr } = await supabase
        .from("profiles")
        .select("id,email,username,display_name,onboarding_complete,avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (!profErr && !data) {
        const { data: created, error: createErr } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            email: user.email ?? null,
            username: null,
            display_name: null,
            onboarding_complete: false,
          })
          .select("id,email,username,display_name,onboarding_complete,avatar_url")
          .single();

        if (createErr) {
          showDevSupabaseError("createProfile", createErr);
          const refetch = await supabase
            .from("profiles")
            .select("id,email,username,display_name,onboarding_complete,avatar_url")
            .eq("id", user.id)
            .maybeSingle();

          data = refetch.data;
          profErr = refetch.error;
        } else {
          data = created;
        }
      }

      if (profErr) {
        showDevSupabaseError("loadProfile", profErr);
        if (!cancelled) setError(profErr.message);
        setLoading(false);
        return;
      }

      if (cancelled) return;

      if (!data) {
        if (!cancelled) setError("Could not load your profile. Please try again.");
        setLoading(false);
        return;
      }

      const prof = data as Profile;
      setProfile(prof);
      setDisplayName((prof.display_name || "").trim());
      setUsername((prof.username || "").trim());
      setLoading(false);
      track("setup_viewed", { has_profile: true, complete: !!prof.onboarding_complete });

      if (prof.display_name && prof.onboarding_complete) {
        window.location.assign(redirectTo);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.search, navigate, redirectTo]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    track("setup_submit_attempted");

    const value = displayName.trim();
    const normalizedUsername = sanitizeUsername(username);

    if (value.length < 2) {
      setError("Display name must be at least 2 characters.");
      return;
    }
    if (!normalizedUsername) {
      setError("Username is required.");
      return;
    }
    if (normalizedUsername.length < 3 || normalizedUsername.length > 20) {
      setError("Username must be 3-20 characters.");
      return;
    }

    const { data: sessionRes, error: sessionErr } = await supabase.auth.getSession();
    const user = sessionRes.session?.user;

    if (sessionErr || !user) {
      setError("Your session expired. Please sign in again.");
      const next = encodeURIComponent(location.pathname + location.search);
      navigate(`/login?redirect=${next}`, { replace: true });
      return;
    }

    const { data: existingUsername, error: usernameErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", normalizedUsername)
      .neq("id", user.id)
      .limit(1);

    if (usernameErr) {
      showDevSupabaseError("checkUsername", usernameErr);
      setError("Couldn't verify username availability. Please try again.");
      return;
    }

    if ((existingUsername ?? []).length > 0) {
      setError("That username is already in use. Try a different display name.");
      return;
    }

    setSaving(true);

    const { data: updated, error: upErr } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email: user.email ?? profile?.email ?? null,
          display_name: value,
          username: normalizedUsername,
          onboarding_complete: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      .select("id,display_name,onboarding_complete,username")
      .single();

    if (upErr) {
      showDevSupabaseError("saveProfile", upErr);
      setSaving(false);
      setError("We couldn't save your profile. Please try again.");
      return;
    }

    const isComplete = !!updated?.display_name && updated?.onboarding_complete === true;
    setSaving(false);

    if (!isComplete) {
      setError("Saved, but setup is still incomplete. Please try again.");
      return;
    }

    track("setup_completed", { redirect: redirectTo });
    window.location.assign(redirectTo);
  }

  return (
    <div className="min-h-[100svh] bg-black text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-pink-600/20 blur-3xl" />
        <div className="absolute top-24 left-1/3 h-72 w-72 rounded-full bg-purple-600/20 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[100svh] max-w-md flex-col justify-center px-5 py-10">
        <div className="mb-6">
          <div className="text-sm text-white/60">Whozin</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Complete your profile</h1>
          <p className="mt-2 text-sm text-white/70">
            You're signed in. Add the name your friends know you by.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-900/55 p-4 backdrop-blur">
          {loading ? (
            <div className="text-sm text-white/70">Loading your profile...</div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-medium text-white/70">Display name</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alex Chen"
                  autoComplete="name"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base text-white placeholder:text-white/30 outline-none focus:border-white/20"
                />
                <div className="mt-2 text-xs text-white/50">
                  Display name is what friends see in the app.
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-white/70">Username</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(sanitizeUsername(e.target.value))}
                  placeholder="e.g. alex_raves"
                  autoComplete="username"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base text-white placeholder:text-white/30 outline-none focus:border-white/20"
                />
                <div className="mt-2 text-xs text-white/50">
                  Username is your unique @handle for invites and friend search.
                </div>
                <div className="mt-1 text-xs text-white/50">
                  Use 3-20 characters: letters, numbers, and underscores only.
                </div>
              </div>

              {error ? (
                <div className="rounded-xl border border-pink-500/30 bg-pink-500/10 px-3 py-2 text-sm text-pink-200">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 px-4 py-3 text-sm font-semibold tracking-wide disabled:opacity-60"
              >
                {saving ? "Saving..." : "Finish setup"}
              </button>

              <div className="text-center text-xs text-white/40">
                No public profile. Your visibility is in your control.
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
