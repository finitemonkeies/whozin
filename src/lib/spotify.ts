import { supabase } from "@/lib/supabase";
import { buildSiteUrl } from "@/lib/site";

type SpotifyArtist = {
  name: string;
  genres: string[];
};

type SpotifyTopArtistsResponse = {
  items?: SpotifyArtist[];
};

type SpotifyTaste = {
  artists: string[];
  genres: string[];
};

function normalizeList(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

async function fetchTopArtists(providerToken: string): Promise<SpotifyArtist[]> {
  const url = "https://api.spotify.com/v1/me/top/artists?time_range=medium_term&limit=30";
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${providerToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Spotify top artists failed (${res.status})`);
  }

  const json = (await res.json()) as SpotifyTopArtistsResponse;
  return Array.isArray(json.items) ? json.items : [];
}

export async function syncSpotifyTasteFromSession(): Promise<SpotifyTaste | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const providerToken = (session as any)?.provider_token as string | undefined;
  if (!providerToken) return null;

  const artists = await fetchTopArtists(providerToken);
  if (artists.length === 0) return null;

  const topArtists = normalizeList(artists.map((a) => a.name)).slice(0, 15);

  const genreScores = new Map<string, number>();
  artists.forEach((artist, idx) => {
    const weight = Math.max(1, 30 - idx);
    (artist.genres ?? []).forEach((genre) => {
      const key = genre.trim().toLowerCase();
      if (!key) return;
      genreScores.set(key, (genreScores.get(key) ?? 0) + weight);
    });
  });

  const topGenres = Array.from(genreScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([genre]) => genre);

  const taste: SpotifyTaste = {
    artists: topArtists,
    genres: topGenres,
  };

  localStorage.setItem("spotify_connected", "true");
  localStorage.setItem("whozin_spotify_taste", JSON.stringify(taste));
  localStorage.setItem("whozin_spotify_last_sync", new Date().toISOString());

  return taste;
}

export async function hasSpotifyProviderToken(): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const providerToken = (session as any)?.provider_token as string | undefined;
  return !!providerToken;
}

export async function startSpotifyOAuthRedirect(redirectPath = "/explore"): Promise<void> {
  localStorage.setItem("whozin_post_auth_redirect", redirectPath);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "spotify",
    options: {
      redirectTo: buildSiteUrl("/auth/callback"),
      scopes: "user-top-read",
    },
  });

  if (error) throw error;
  if (data?.url) {
    window.location.assign(data.url);
  }
}
