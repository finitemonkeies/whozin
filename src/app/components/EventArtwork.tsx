import { useEffect, useMemo, useState } from "react";

type ArtTone = {
  background: string;
  orbClass: string;
  accentClass: string;
  meshClass: string;
};

const ART_TONES: ArtTone[] = [
  {
    background:
      "linear-gradient(135deg, rgba(236,72,153,0.96), rgba(124,58,237,0.9) 52%, rgba(15,23,42,0.98))",
    orbClass: "bg-pink-400/35",
    accentClass: "text-pink-100",
    meshClass: "from-pink-400/18 via-transparent to-violet-400/18",
  },
  {
    background:
      "linear-gradient(135deg, rgba(59,130,246,0.95), rgba(168,85,247,0.88) 54%, rgba(9,9,11,0.98))",
    orbClass: "bg-violet-400/30",
    accentClass: "text-blue-100",
    meshClass: "from-sky-300/20 via-transparent to-violet-400/18",
  },
  {
    background:
      "linear-gradient(135deg, rgba(244,63,94,0.95), rgba(249,115,22,0.88) 54%, rgba(9,9,11,0.98))",
    orbClass: "bg-orange-300/30",
    accentClass: "text-rose-100",
    meshClass: "from-rose-300/20 via-transparent to-orange-300/18",
  },
];

function pickTone(seed: string) {
  const value = Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return ART_TONES[value % ART_TONES.length];
}

function cleanLabel(value?: string | null) {
  const normalized = (value ?? "").trim();
  return normalized.length > 0 ? normalized : "";
}

export function EventArtwork({
  title,
  imageUrl,
  location,
  dateLabel,
  tags = [],
  badge,
  className = "",
  titleClassName = "",
}: {
  title: string;
  imageUrl?: string | null;
  location?: string | null;
  dateLabel?: string | null;
  tags?: string[];
  badge?: string | null;
  className?: string;
  titleClassName?: string;
}) {
  const hasImageProp = !!imageUrl && imageUrl.trim().length > 0;
  const [imageOk, setImageOk] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const showImage = hasImageProp && imageOk;

  useEffect(() => {
    setImageLoaded(false);
    setImageOk(true);
  }, [imageUrl, title]);

  const tone = useMemo(() => pickTone(`${title}-${location}-${tags.join("-")}`), [location, tags, title]);

  const visibleTags = useMemo(
    () =>
      tags
        .map((tag) => cleanLabel(tag))
        .filter((tag) => tag.length > 0 && tag.toLowerCase() !== "internal")
        .slice(0, 2),
    [tags]
  );

  const eyebrow = badge?.trim() || visibleTags[0] || "";
  const secondaryLine = [dateLabel, location].map((value) => cleanLabel(value)).filter(Boolean).slice(0, 2);

  return (
    <div className={`relative overflow-hidden bg-zinc-900 ${className}`.trim()}>
      {showImage ? (
        <>
          {!imageLoaded ? <div className="absolute inset-0 animate-pulse bg-zinc-900/80" /> : null}
          <img
            src={imageUrl!}
            alt={title}
            className={`h-full w-full object-cover transition duration-500 ${
              imageLoaded ? "scale-100 opacity-100" : "scale-[1.02] opacity-0"
            }`}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageOk(false)}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.12),rgba(0,0,0,0.22)_45%,rgba(0,0,0,0.82))]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%)]" />
        </>
      ) : (
        <>
          <div className="absolute inset-0" style={{ background: tone.background }} />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:22px_22px] opacity-20" />
          <div className={`absolute inset-0 bg-gradient-to-br ${tone.meshClass}`} />
          <div className={`absolute -left-10 -top-12 h-40 w-40 rounded-full blur-3xl ${tone.orbClass}`} />
          <div className="absolute -bottom-16 right-0 h-44 w-44 rounded-full bg-black/35 blur-3xl" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        </>
      )}

      <div className="absolute inset-x-0 bottom-0 p-4">
        <div className="max-w-[86%]">
          {eyebrow ? (
            <div className={`text-[10px] font-semibold uppercase tracking-[0.24em] ${tone.accentClass}`}>
              {eyebrow}
            </div>
          ) : null}
          <div className={`mt-2 line-clamp-2 text-[1.4rem] font-semibold leading-[1.02] text-white ${titleClassName}`}>
            {title}
          </div>
          {secondaryLine.length > 0 ? (
            <div className="mt-2 text-sm text-white/80">{secondaryLine.join(" • ")}</div>
          ) : null}
          {visibleTags.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {visibleTags.map((tag) => (
                <span
                  key={`${title}-${tag}`}
                  className="rounded-full border border-white/15 bg-black/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
