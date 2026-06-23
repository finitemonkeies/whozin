type MetaWindow = Window & {
  fbq?: {
    (...args: unknown[]): void;
    callMethod?: (...args: unknown[]) => void;
    queue?: unknown[];
    loaded?: boolean;
    version?: string;
    push?: (...args: unknown[]) => number;
  };
  _fbq?: MetaWindow["fbq"];
  __whozinMetaPixelInit?: boolean;
};

const META_PIXEL_ID = (import.meta.env.VITE_META_PIXEL_ID as string | undefined)?.trim();
const META_PIXEL_DEBUG =
  ((import.meta.env.VITE_META_PIXEL_DEBUG as string | undefined)?.trim() || "").toLowerCase() === "true";

function isEnabled() {
  return typeof window !== "undefined" && !!META_PIXEL_ID;
}

function getFbq() {
  if (typeof window === "undefined") return null;
  return (window as MetaWindow).fbq ?? null;
}

export function initMetaPixel() {
  if (!isEnabled()) return;

  const w = window as MetaWindow;
  if (w.__whozinMetaPixelInit) return;
  w.__whozinMetaPixelInit = true;

  if (!w.fbq) {
    const fbq = function (...args: unknown[]) {
      if (fbq.callMethod) {
        fbq.callMethod(...args);
      } else {
        fbq.queue?.push(args);
      }
    } as NonNullable<MetaWindow["fbq"]>;

    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = "2.0";
    w.fbq = fbq;
    w._fbq = fbq;
  }

  const scriptId = "whozin-meta-pixel";
  if (!document.getElementById(scriptId)) {
    const script = document.createElement("script");
    script.id = scriptId;
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }

  w.fbq?.("init", META_PIXEL_ID);
  w.fbq?.("consent", "grant");

  if (META_PIXEL_DEBUG) {
    console.info("[meta-pixel] initialized", { pixelId: META_PIXEL_ID });
  }
}

export function trackMetaPageView() {
  const fbq = getFbq();
  if (!fbq) return;
  fbq("track", "PageView");
}

export function trackMetaCompleteRegistration(
  props: Record<string, unknown> = {},
  options?: { eventId?: string | null }
) {
  const fbq = getFbq();
  if (!fbq) return;
  fbq("track", "CompleteRegistration", props, options?.eventId ? { eventID: options.eventId } : undefined);
}

export function trackMetaCustomEvent(
  name: string,
  props: Record<string, unknown> = {},
  options?: { eventId?: string | null }
) {
  const fbq = getFbq();
  if (!fbq) return;
  fbq("trackCustom", name, props, options?.eventId ? { eventID: options.eventId } : undefined);
}
