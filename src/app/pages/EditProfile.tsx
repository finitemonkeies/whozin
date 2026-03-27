import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload } from "lucide-react";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import { normalizePartnerSlug, type PartnerProfileFields } from "@/lib/partnerProfiles";

function sanitizeUsername(input: string) {
  const v = input.trim().toLowerCase();
  return v.replace(/[^a-z0-9_]/g, "");
}

function randomId() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function defaultAvatar(seed: string) {
  return `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(seed || "whozin")}`;
}

export function EditProfile() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [savingUsername, setSavingUsername] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [accountType, setAccountType] = useState<"person" | "partner">("person");
  const [partnerType, setPartnerType] = useState<string>("");
  const [partnerBadgeLabel, setPartnerBadgeLabel] = useState("");
  const [partnerSlug, setPartnerSlug] = useState("");
  const [partnerBioShort, setPartnerBioShort] = useState("");
  const [partnerInstagramUrl, setPartnerInstagramUrl] = useState("");
  const [partnerWebsiteUrl, setPartnerWebsiteUrl] = useState("");
  const [partnerContactEmail, setPartnerContactEmail] = useState("");
  const normalizedUsername = useMemo(() => sanitizeUsername(username), [username]);

  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string>("");

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        navigate("/login");
        return;
      }

      setUserId(session.user.id);

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "username,display_name,avatar_url,account_type,partner_type,partner_badge_label,partner_slug,partner_bio_short,partner_instagram_url,partner_website_url,partner_contact_email"
        )
        .eq("id", session.user.id)
        .maybeSingle();

      if (error) {
        toast.error("Could not load your profile", { description: error.message });
      }

      if (data) {
        setUsername(data.username ?? "");
        setDisplayName(data.display_name ?? "");
        setAccountType(data.account_type === "partner" ? "partner" : "person");
        setPartnerType(data.partner_type ?? "");
        setPartnerBadgeLabel(data.partner_badge_label ?? "");
        setPartnerSlug(data.partner_slug ?? "");
        setPartnerBioShort(data.partner_bio_short ?? "");
        setPartnerInstagramUrl(data.partner_instagram_url ?? "");
        setPartnerWebsiteUrl(data.partner_website_url ?? "");
        setPartnerContactEmail(data.partner_contact_email ?? "");
        setAvatarUrl(data.avatar_url ?? defaultAvatar(data.username ?? session.user.id));
      } else {
        setAvatarUrl(defaultAvatar(session.user.id));
      }

      setLoading(false);
    };

    void loadProfile();
  }, [navigate]);

  const pickAvatar = () => fileRef.current?.click();

  const uploadAndSaveAvatar = async (file: File) => {
    if (!userId) {
      toast.error("Sign in first");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Pick an image file");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      toast.error("Image is too large", { description: "Max size is 6MB." });
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setUploadingAvatar(true);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/${randomId()}.${ext}`;

      const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });

      if (uploadErr) {
        toast.error("Could not upload that", { description: uploadErr.message });
        return;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = data?.publicUrl;
      if (!publicUrl) {
        toast.error("Upload worked, but the image URL is missing");
        return;
      }

      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);

      if (updateErr) {
        toast.error("Could not save your photo", { description: updateErr.message });
        return;
      }

      setAvatarUrl(publicUrl);
      localStorage.setItem("whozin_avatar_bust", Date.now().toString());
      toast.success("Photo saved.");
    } finally {
      setUploadingAvatar(false);
      URL.revokeObjectURL(localPreview);
      setPreviewUrl("");
    }
  };

  const handleProfileSave = async () => {
    const u = normalizedUsername;

    if (!u) {
      toast.error("Drop an @ first");
      return;
    }
    if (u.length < 3 || u.length > 20) {
      toast.error("@ must be 3-20 characters");
      return;
    }

    if (!userId) {
      toast.error("Session expired");
      navigate("/login");
      return;
    }

    setSavingUsername(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          username: u,
          display_name: displayName.trim() || null,
          avatar_url: avatarUrl || defaultAvatar(u),
          account_type: accountType,
          partner_type: accountType === "partner" ? partnerType || null : null,
          partner_badge_label: accountType === "partner" ? partnerBadgeLabel.trim() || "Partner" : null,
          partner_slug: accountType === "partner" ? normalizePartnerSlug(partnerSlug || displayName || u) || null : null,
          partner_bio_short: accountType === "partner" ? partnerBioShort.trim() || null : null,
          partner_instagram_url: accountType === "partner" ? partnerInstagramUrl.trim() || null : null,
          partner_website_url: accountType === "partner" ? partnerWebsiteUrl.trim() || null : null,
          partner_contact_email: accountType === "partner" ? partnerContactEmail.trim() || null : null,
        })
        .eq("id", userId);

      if (error) {
        if ((error as any).code === "23505") {
          toast.error("That @ is taken");
        } else {
          toast.error("Could not update your profile", { description: error.message });
        }
        return;
      }

      toast.success("Profile saved.");
      track("profile_updated");
      navigate("/profile");
    } finally {
      setSavingUsername(false);
    }
  };

  const displayedAvatar = previewUrl || avatarUrl || defaultAvatar(normalizedUsername);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading your profile...</div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white px-6 py-8 pb-28">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate("/profile")}
          className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Edit Profile</h1>
      </div>

      <div className="flex flex-col items-center mb-8">
        <img
          src={displayedAvatar}
          alt="Avatar preview"
          className="w-28 h-28 rounded-full object-cover border-4 border-zinc-800"
        />

        <button
          onClick={pickAvatar}
          disabled={uploadingAvatar}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15 transition disabled:opacity-60"
        >
          <Upload className="w-4 h-4" />
          {uploadingAvatar ? "Uploading..." : "Change photo"}
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            if (file) void uploadAndSaveAvatar(file);
            e.currentTarget.value = "";
          }}
        />
      </div>

      <div className="space-y-6">
        <div>
          <label className="text-xs text-zinc-400 uppercase tracking-wider">Display Name</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-2 w-full rounded-xl bg-zinc-900 border border-white/10 px-4 py-3 outline-none focus:border-pink-500/50"
            placeholder="Just James"
            autoComplete="name"
          />
          <p className="text-xs text-zinc-500 mt-2">
            This is the name we should use in invites, emails, and profile surfaces.
          </p>
        </div>

        <div>
          <label className="text-xs text-zinc-400 uppercase tracking-wider">Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-2 w-full rounded-xl bg-zinc-900 border border-white/10 px-4 py-3 outline-none focus:border-pink-500/50"
            placeholder="alex_raves"
          />
          <p className="text-xs text-zinc-500 mt-2">
            Use 3-20 characters: letters, numbers, and underscores.
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Live as <span className="text-zinc-300">@{normalizedUsername || "username"}</span>
          </p>
        </div>

        {accountType === "partner" ? (
          <>
            <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 px-4 py-3">
              <div className="text-sm font-semibold text-white">Partner account</div>
              <div className="mt-1 text-xs text-zinc-300">
                This profile is treated like an organizer surface. Keep the bio short, add Instagram and website, and use a clear badge label.
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-wider">Partner Type</label>
              <select
                value={partnerType}
                onChange={(e) => setPartnerType(e.target.value)}
                className="mt-2 w-full rounded-xl bg-zinc-900 border border-white/10 px-4 py-3 outline-none focus:border-pink-500/50"
              >
                <option value="">Select type</option>
                <option value="promoter">Promoter</option>
                <option value="venue">Venue</option>
                <option value="collective">Collective</option>
                <option value="dj">DJ</option>
                <option value="artist">Artist</option>
                <option value="brand">Brand</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-wider">Badge Label</label>
              <input
                value={partnerBadgeLabel}
                onChange={(e) => setPartnerBadgeLabel(e.target.value)}
                className="mt-2 w-full rounded-xl bg-zinc-900 border border-white/10 px-4 py-3 outline-none focus:border-pink-500/50"
                placeholder="Founding Partner"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-wider">Partner Slug</label>
              <input
                value={partnerSlug}
                onChange={(e) => setPartnerSlug(normalizePartnerSlug(e.target.value))}
                className="mt-2 w-full rounded-xl bg-zinc-900 border border-white/10 px-4 py-3 outline-none focus:border-pink-500/50"
                placeholder="queen-out"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-wider">Short Bio</label>
              <textarea
                value={partnerBioShort}
                onChange={(e) => setPartnerBioShort(e.target.value)}
                className="mt-2 w-full min-h-[110px] rounded-xl bg-zinc-900 border border-white/10 px-4 py-3 outline-none focus:border-pink-500/50"
                placeholder="Queer Bay rave series building high-energy nights and repeat community."
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-wider">Instagram URL</label>
              <input
                value={partnerInstagramUrl}
                onChange={(e) => setPartnerInstagramUrl(e.target.value)}
                className="mt-2 w-full rounded-xl bg-zinc-900 border border-white/10 px-4 py-3 outline-none focus:border-pink-500/50"
                placeholder="https://instagram.com/queenoutsf"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-wider">Website URL</label>
              <input
                value={partnerWebsiteUrl}
                onChange={(e) => setPartnerWebsiteUrl(e.target.value)}
                className="mt-2 w-full rounded-xl bg-zinc-900 border border-white/10 px-4 py-3 outline-none focus:border-pink-500/50"
                placeholder="https://queenout.com"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-wider">Contact Email</label>
              <input
                value={partnerContactEmail}
                onChange={(e) => setPartnerContactEmail(e.target.value)}
                className="mt-2 w-full rounded-xl bg-zinc-900 border border-white/10 px-4 py-3 outline-none focus:border-pink-500/50"
                placeholder="hello@queenout.com"
              />
            </div>
          </>
        ) : null}

        <button
          onClick={handleProfileSave}
          disabled={savingUsername || uploadingAvatar}
          className="whozin-brand-button w-full rounded-xl py-3 font-bold disabled:opacity-60"
        >
          {savingUsername ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
