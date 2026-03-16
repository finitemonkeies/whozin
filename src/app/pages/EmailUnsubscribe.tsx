import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { buildSiteUrl } from "@/lib/site";

type Status = "working" | "success" | "error";

export default function EmailUnsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token")?.trim() ?? "";
  const [status, setStatus] = useState<Status>(token ? "working" : "error");
  const [message, setMessage] = useState(
    token ? "Processing your unsubscribe request..." : "This unsubscribe link is missing a token.",
  );

  const functionUrl = useMemo(
    () => `${String(import.meta.env.VITE_SUPABASE_URL).replace(/\/+$/, "")}/functions/v1/email-unsubscribe`,
    [],
  );

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    async function unsubscribe() {
      try {
        const res = await fetch(functionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ token }),
        });

        const payload = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(
            payload && typeof payload === "object" && "message" in payload
              ? String((payload as { message?: string }).message ?? "Unsubscribe failed")
              : "Unsubscribe failed",
          );
        }

        if (!cancelled) {
          setStatus("success");
          setMessage("You have been unsubscribed from optional Whozin emails.");
        }
      } catch (error) {
        if (!cancelled) {
          setStatus("error");
          setMessage(error instanceof Error ? error.message : "We could not process that unsubscribe link.");
        }
      }
    }

    void unsubscribe();

    return () => {
      cancelled = true;
    };
  }, [functionUrl, token]);

  return (
    <div className="min-h-screen bg-black text-white px-6 py-12">
      <div className="mx-auto max-w-md">
        <div className="rounded-[28px] border border-white/10 bg-zinc-950/80 p-6 shadow-2xl shadow-black/40">
          <div className="mb-4 text-sm uppercase tracking-[0.22em] text-pink-300">Whozin</div>
          <h1 className="text-3xl font-bold tracking-tight">
            {status === "success" ? "You are unsubscribed" : status === "working" ? "One second..." : "Link issue"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-300">{message}</p>
          <p className="mt-4 text-xs leading-5 text-zinc-500">
            Account, security, and service emails may still be sent when needed.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <Link
              to="/login"
              className="rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 px-4 py-3 text-center text-sm font-semibold"
            >
              Open Whozin
            </Link>
            <a
              href={buildSiteUrl("/settings")}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-zinc-200"
            >
              Go to settings
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
