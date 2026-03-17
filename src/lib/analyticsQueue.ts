export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

export type QueuedAnalyticsEvent =
  | { type: "track"; event: string; props: AnalyticsProps }
  | {
      type: "identify";
      userId: string;
      props: Record<string, string>;
    }
  | { type: "reset" };

declare global {
  interface Window {
    __whozinAnalyticsQueue?: QueuedAnalyticsEvent[];
    posthog?: {
      capture?: (event: string, props?: AnalyticsProps) => void;
      identify?: (userId: string, props?: Record<string, string>) => void;
      reset?: () => void;
      get_distinct_id?: () => string;
    };
  }
}

export function getAnalyticsQueue() {
  if (typeof window === "undefined") return [];
  window.__whozinAnalyticsQueue ??= [];
  return window.__whozinAnalyticsQueue;
}

export function queueAnalyticsEvent(event: QueuedAnalyticsEvent) {
  if (typeof window === "undefined") return;
  getAnalyticsQueue().push(event);
}
