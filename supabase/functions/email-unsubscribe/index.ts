import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type UnsubscribeTokenPayload = {
  user_id: string;
  email?: string | null;
  email_kind?: string | null;
  exp: number;
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
  });
}

function errorToMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return String(error);
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function verifyToken(token: string, secret: string): Promise<UnsubscribeTokenPayload> {
  const [encodedPayload, encodedSignature] = token.split(".");
  if (!encodedPayload || !encodedSignature) {
    throw new Error("Malformed unsubscribe token");
  }

  const secretKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expectedSignature = new Uint8Array(
    await crypto.subtle.sign("HMAC", secretKey, new TextEncoder().encode(encodedPayload)),
  );
  const actualSignature = fromBase64Url(encodedSignature);

  if (actualSignature.length !== expectedSignature.length) {
    throw new Error("Invalid unsubscribe token");
  }

  let mismatch = 0;
  for (let i = 0; i < actualSignature.length; i += 1) {
    mismatch |= actualSignature[i] ^ expectedSignature[i];
  }
  if (mismatch !== 0) {
    throw new Error("Invalid unsubscribe token");
  }

  const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(encodedPayload))) as UnsubscribeTokenPayload;
  if (!payload.user_id || !Number.isFinite(payload.exp)) {
    throw new Error("Invalid unsubscribe token payload");
  }
  if (payload.exp * 1000 < Date.now()) {
    throw new Error("Unsubscribe link expired");
  }
  return payload;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const unsubscribeSecret = Deno.env.get("UNSUBSCRIBE_SECRET");
  if (!supabaseUrl || !serviceRoleKey || !unsubscribeSecret) {
    return jsonResponse(500, { error: "Missing Supabase or unsubscribe env" });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    if (!token) {
      return jsonResponse(400, { error: "Missing unsubscribe token" });
    }

    const payload = await verifyToken(token, unsubscribeSecret);
    const service = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const unsubscribedAt = new Date().toISOString();
    const updatePayload = {
      email_retention_opt_in: false,
      email_product_updates_opt_in: false,
      email_unsubscribed_at: unsubscribedAt,
      email_marketing_consent_source: "unsubscribe_link",
      updated_at: unsubscribedAt,
    };

    let query = service.from("profiles").update(updatePayload).eq("id", payload.user_id);
    if (payload.email) {
      query = query.eq("email", payload.email);
    }

    const { error } = await query;
    if (error) throw error;

    return jsonResponse(200, {
      ok: true,
      unsubscribed: true,
      email_kind: payload.email_kind ?? "marketing",
    });
  } catch (error) {
    return jsonResponse(400, {
      ok: false,
      unsubscribed: false,
      error: "Unsubscribe failed",
      message: errorToMessage(error),
    });
  }
});
