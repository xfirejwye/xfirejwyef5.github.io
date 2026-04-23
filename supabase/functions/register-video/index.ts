// Inserts a video row, capturing the uploader's real IP and checking the upload blacklist.
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
    const payload = await req.json();
    const { title, description, uploader_name, storage_path, mime_type, size_bytes } = payload;
    if (!title || !storage_path) return json(400, { error: "Missing fields" });

    const ip = getClientIp(req);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (ip) {
      const { data: blocked } = await supabase.rpc("is_ip_blocked", { _ip: ip, _kind: "upload" });
      if (blocked) {
        // best-effort: remove the just-uploaded file
        await supabase.storage.from("videos").remove([storage_path]);
        return json(403, { error: "Your IP is blocked from uploading." });
      }
    }

    const { data, error } = await supabase
      .from("videos")
      .insert({
        title: String(title).slice(0, 200),
        description: description ? String(description).slice(0, 5000) : null,
        uploader_name: uploader_name ? String(uploader_name).slice(0, 60) : null,
        storage_path,
        mime_type: mime_type ?? null,
        size_bytes: size_bytes ?? null,
        ip_address: ip,
      })
      .select("id")
      .single();

    if (error) return json(400, { error: error.message });
    return json(200, { id: data.id });
  } catch (e) {
    return json(500, { error: (e as Error).message });
  }
});
