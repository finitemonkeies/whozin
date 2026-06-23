import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

function asString(value: unknown, max = 2000): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

async function sha256(value: string): Promise<string> {
  const normalized = new TextEncoder().encode(value.trim().toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", normalized);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function getClientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return asString(req.headers.get("x-real-ip"), 128);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const pixelId = Deno.env.get("META_PIXEL_ID");
  const accessToken = Deno.env.get("META_CONVERSIONS_ACCESS_TOKEN");
  const graphApiVersion = Deno.env.get("META_GRAPH_API_VERSION") || "v23.0";
  const testEventCode = Deno.env.get("META_TEST_EVENT_CODE");

  if (req.method === "GET") {
    return jsonResponse(200, {
      ok: true,
      configured: Boolean(supabaseUrl && serviceRoleKey && pixelId && accessToken),
      pixel_id_set: Boolean(pixelId),
      access_token_set: Boolean(accessToken),
      graph_api_version: graphApiVersion,
      test_event_code_set: Boolean(testEventCode),
    });
  }

  if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed" });

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: "Missing Supabase env" });
  }

  if (!pixelId || !accessToken) {
    return jsonResponse(202, { ok: true, skipped: true, reason: "Meta env not configured" });
  }

  const authHeader = req.headers.get("Authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!bearer) {
    return jsonResponse(401, { error: "Unauthorized" });
  }

  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await service.auth.getUser(bearer);
  const user = userData.user;
  if (userError || !user?.id) {
    return jsonResponse(401, { error: "Unauthorized" });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const eventName = asString(body?.event_name, 64);
    const eventId = asString(body?.event_id, 128);
    const eventSourceUrl = asString(body?.event_source_url, 2000);
    const fbc = asString(body?.fbc, 512);
    const fbp = asString(body?.fbp, 512);
    const customData = asRecord(body?.custom_data);

    if (!eventName || !eventId || !eventSourceUrl) {
      return jsonResponse(400, { error: "Missing required event payload" });
    }

    const emailHash = user.email ? await sha256(user.email) : null;
    const externalIdHash = await sha256(user.id);
    const clientIp = getClientIp(req);
    const userAgent = asString(req.headers.get("user-agent"), 512);

    const payload: Record<string, unknown> = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          action_source: "website",
          event_source_url: eventSourceUrl,
          user_data: {
            ...(emailHash ? { em: [emailHash] } : {}),
            external_id: [externalIdHash],
            ...(clientIp ? { client_ip_address: clientIp } : {}),
            ...(userAgent ? { client_user_agent: userAgent } : {}),
            ...(fbc ? { fbc } : {}),
            ...(fbp ? { fbp } : {}),
          },
          custom_data: customData,
        },
      ],
    };

    if (testEventCode) {
      payload.test_event_code = testEventCode;
    }

    const metaRes = await fetch(`https://graph.facebook.com/${graphApiVersion}/${pixelId}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...payload,
        access_token: accessToken,
      }),
    });

    const metaJson = await metaRes.json().catch(() => null);
    if (!metaRes.ok) {
      return jsonResponse(502, {
        error: "Meta conversion failed",
        details: metaJson,
      });
    }

    return jsonResponse(200, {
      ok: true,
      event_name: eventName,
      event_id: eventId,
      meta: metaJson,
    });
  } catch (error) {
    return jsonResponse(500, {
      error: "Unexpected meta conversion failure",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});
