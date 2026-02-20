// src/app/pages/Setup.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { sanitizeRedirectTarget } from "@/lib/redirect";

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

function slugifyBase(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 20);
}

function makeUsernameFromName(name: string) {
  const base = slugifyBase(name) || "user";
  const suffix = Math.floor(1000 + Math.random() * 9000); // 4-digit
  return `${base}-${suffix}`;
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data: sessionRes, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) {
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

      // First-time user path: create profile row if it doesn't exist yet.
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
          // In race conditions, another client/process may have created this row.
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
      setDisplayName((prof?.display_name || "").trim());
      setLoading(false);

      // If already complete, bounce out immediately
      if (prof?.display_name && prof?.onboarding_complete) {
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

    const value = displayName.trim();
    if (value.length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }

    if (!profile) {
      setError("Profile not loaded yet.");
      return;
    }

    const nextUsername =
      profile.username && profile.username.trim().length > 0
        ? profile.username.trim()
        : makeUsernameFromName(value);

    setSaving(true);

    // Update and request the updated row back (helps debugging + consistency)
    const { data: updated, error: upErr } = await supabase
      .from("profiles")
      .update({
        display_name: value,
        username: nextUsername,
        onboarding_complete: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id)
      .select("id,display_name,onboarding_complete,username")
      .single();

    if (upErr) {
      setSaving(false);
      setError(upErr.message);
      return;
    }

    // Safety: verify the saved state is actually complete
    const isComplete =
      !!updated?.display_name && updated?.onboarding_complete === true;

    setSaving(false);

    if (!isComplete) {
      setError("Saved, but setup is still incomplete. Please try again.");
      return;
    }

    // Hard navigate to avoid any flicker/race with RequireAuth re-check
    window.location.assign(redirectTo);
  }

  return (
    <div className="min-h-[100svh] bg-black text-white">
      {/* Soft glow background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-pink-600/20 blur-3xl" />
        <div className="absolute top-24 left-1/3 h-72 w-72 rounded-full bg-purple-600/20 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[100svh] max-w-md flex-col justify-center px-5 py-10">
        <div className="mb-6">
          <div className="text-sm text-white/60">Whozin</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">One quick thing</h1>
          <p className="mt-2 text-sm text-white/70">
            Add your name so your friends recognize you when you RSVP.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-900/55 p-4 backdrop-blur">
          {loading ? (
            <div className="text-sm text-white/70">Loading…</div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-medium text-white/70">Name</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="What are we calling you?"
                  autoComplete="name"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base text-white placeholder:text-white/30 outline-none focus:border-white/20"
                />
                <div className="mt-2 text-xs text-white/50">
                  You can customize your profile later.
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
                {saving ? "Saving…" : "Continue"}
              </button>

              <div className="text-center text-xs text-white/40">
                No passwords. No public profile. Just your crew.
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
