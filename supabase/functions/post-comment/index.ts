// Posts a comment, capturing the requester's real IP and checking the IP blacklist.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const { video_id, author_name, body } = await req.json();
    const text = String(body ?? "").trim();
    const author = String(author_name ?? "Anonymous").trim().slice(0, 40) || "Anonymous";
    if (!video_id || !text) return json(400, { error: "Missing fields" });
    if (text.length > 1000) return json(400, { error: "Comment too long" });

    const ip = getClientIp(req);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (ip) {
      const { data: blocked } = await supabase.rpc("is_ip_blocked", { _ip: ip, _kind: "comment" });
      if (blocked) return json(403, { error: "Your IP is blocked from commenting." });
    }

    const { data, error } = await supabase
      .from("video_comments")
      .insert({ video_id, author_name: author, body: text, ip_address: ip })
      .select("id,video_id,author_name,body,created_at")
      .single();

    if (error) return json(400, { error: error.message });
    return json(200, { comment: data });
  } catch (e) {
    return json(500, { error: (e as Error).message });
  }
});
