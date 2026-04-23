// Public endpoint: returns HTML with Open Graph meta tags for a video
// so social platforms (Discord, Twitter, Facebook, iMessage) show a rich
// video preview like YouTube does.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  // Expect /watch/:id or ?id=:id
  const idFromPath = url.pathname.match(/\/watch\/([^/?#]+)/)?.[1];
  const id = idFromPath ?? url.searchParams.get("id");
  const origin = url.searchParams.get("origin") ?? `${url.protocol}//${url.host}`;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );

  let title = "F5 Video Hub";
  let description = "Upload and watch videos anonymously. No account, no limits.";
  let imageUrl = `${origin}/favicon.png`;
  let videoUrl: string | null = null;
  let mime = "video/mp4";
  const canonical = id ? `${origin}/watch/${id}` : origin;

  if (id) {
    const { data } = await supabase
      .from("videos")
      .select("title,description,storage_path,thumbnail_path,mime_type,is_hidden")
      .eq("id", id)
      .eq("is_hidden", false)
      .maybeSingle();

    if (data) {
      title = `${data.title} · F5 Videos`;
      description = (data.description ?? "Watch on F5 Videos").slice(0, 300);
      mime = data.mime_type ?? "video/mp4";
      const pub = supabase.storage.from("videos");
      videoUrl = pub.getPublicUrl(data.storage_path).data.publicUrl;
      if (data.thumbnail_path) {
        imageUrl = pub.getPublicUrl(data.thumbnail_path).data.publicUrl;
      }
    }
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${esc(canonical)}" />
<meta name="theme-color" content="#a70404" />

<meta property="og:type" content="video.other" />
<meta property="og:site_name" content="F5 Videos" />
<meta property="og:url" content="${esc(canonical)}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />

<meta property="og:image" content="${esc(imageUrl)}" />
<meta property="og:image:secure_url" content="${esc(imageUrl)}" />
<meta property="og:image:type" content="image/jpeg" />
<meta property="og:image:width" content="1280" />
<meta property="og:image:height" content="720" />
<meta property="og:image:alt" content="${esc(title)}" />

${videoUrl ? `<meta property="og:video" content="${esc(videoUrl)}" />
<meta property="og:video:url" content="${esc(videoUrl)}" />
<meta property="og:video:secure_url" content="${esc(videoUrl)}" />
<meta property="og:video:type" content="${esc(mime)}" />
<meta property="og:video:width" content="1280" />
<meta property="og:video:height" content="720" />` : ""}

<meta name="twitter:card" content="player" />
<meta name="twitter:site" content="@f5videos" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${esc(imageUrl)}" />
${videoUrl ? `<meta name="twitter:player" content="${esc(canonical)}" />
<meta name="twitter:player:width" content="1280" />
<meta name="twitter:player:height" content="720" />
<meta name="twitter:player:stream" content="${esc(videoUrl)}" />
<meta name="twitter:player:stream:content_type" content="${esc(mime)}" />` : ""}

<script type="application/ld+json">
${JSON.stringify({
  "@context": "https://schema.org",
  "@type": "VideoObject",
  name: title,
  description,
  thumbnailUrl: [imageUrl],
  uploadDate: new Date().toISOString(),
  contentUrl: videoUrl,
  embedUrl: canonical,
})}
</script>

<meta http-equiv="refresh" content="0; url=${esc(canonical)}" />
</head>
<body>
<p>Redirecting to <a href="${esc(canonical)}">${esc(title)}</a>…</p>
</body>
</html>`;

  return new Response(html, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
});
