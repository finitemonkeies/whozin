import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload } from "lucide-react";
import { toast } from "sonner";
import { track } from "@/lib/analytics";

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
        .select("username,avatar_url")
        .eq("id", session.user.id)
        .maybeSingle();

      if (error) {
        toast.error("Failed to load profile", { description: error.message });
      }

      if (data) {
        setUsername(data.username ?? "");
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
      toast.error("Not signed in");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      toast.error("Image too large", { description: "Max size is 6MB." });
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
        toast.error("Upload failed", { description: uploadErr.message });
        return;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = data?.publicUrl;
      if (!publicUrl) {
        toast.error("Upload succeeded but no public URL returned");
        return;
      }

      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);

      if (updateErr) {
        toast.error("Failed to save avatar", { description: updateErr.message });
        return;
      }

      setAvatarUrl(publicUrl);
      localStorage.setItem("whozin_avatar_bust", Date.now().toString());
      toast.success("Avatar saved");
    } finally {
      setUploadingAvatar(false);
      URL.revokeObjectURL(localPreview);
      setPreviewUrl("");
    }
  };

  const handleProfileSave = async () => {
    const u = normalizedUsername;

    if (!u) {
      toast.error("Username is required");
      return;
    }
    if (u.length < 3 || u.length > 20) {
      toast.error("Username must be 3-20 characters");
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
        .update({ username: u, avatar_url: avatarUrl || defaultAvatar(u) })
        .eq("id", userId);

      if (error) {
        if ((error as any).code === "23505") {
          toast.error("That username is taken");
        } else {
          toast.error("Failed to update profile", { description: error.message });
        }
        return;
      }

      toast.success("Profile updated");
      track("profile_updated");
      navigate("/profile");
    } finally {
      setSavingUsername(false);
    }
  };

  const displayedAvatar = previewUrl || avatarUrl || defaultAvatar(normalizedUsername);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>
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
          {uploadingAvatar ? "Uploading..." : "Upload photo"}
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
            Saved as <span className="text-zinc-300">@{normalizedUsername || "username"}</span>
          </p>
        </div>

        <button
          onClick={handleProfileSave}
          disabled={savingUsername || uploadingAvatar}
          className="w-full py-3 bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl font-bold disabled:opacity-60"
        >
          {savingUsername ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
