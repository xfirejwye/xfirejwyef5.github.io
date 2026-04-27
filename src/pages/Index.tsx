import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { VideoCard, type VideoCardData } from "@/components/VideoCard";
import { Loader2, Upload, Sparkles, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";

type VideoRow = VideoCardData & { description?: string | null };

const Index = () => {
  const [videos, setVideos] = useState<VideoRow[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    document.title = "F5 Videos — Anonymous video sharing";
    (async () => {
      const { data } = await supabase
        .from("videos")
        .select("id,title,description,uploader_name,views,created_at,storage_path,thumbnail_path")
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .limit(60);

      setVideos((data as VideoRow[]) ?? []);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!videos) return null;

    const q = query.trim().toLowerCase();
    if (!q) return videos;

    return videos.filter((v) => {
      const title = v.title?.toLowerCase() ?? "";
      const desc = (v.description ?? "").toLowerCase();
      const user = (v.uploader_name ?? "").toLowerCase();

      return title.includes(q) || desc.includes(q) || user.includes(q);
    });
  }, [videos, query]);

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />

      <main>
        <section className="relative overflow-hidden border-b border-border/60">
          <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />

          <div className="container relative py-10 md:py-20">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                No account · No limits
              </span>

              <h1 className="mt-4 font-display text-4xl sm:text-5xl md:text-7xl tracking-wider leading-[0.95]">
                Drop a video.
                <br />
                <span className="text-gradient">Stay anonymous.</span>
              </h1>

              <p className="mt-4 max-w-xl text-base md:text-lg text-muted-foreground">
                F5 Videos is a no-signup video host. Upload up to 500 MB,
                add a title, and share the link. That&apos;s it.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild variant="hero" size="lg" className="gap-2">
                  <Link to="/upload">
                    <Upload className="h-5 w-5" />
                    Upload a video
                  </Link>
                </Button>

                <Button asChild variant="outline" size="lg">
                  <a href="#discover">Browse videos</a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section id="discover" className="container py-10 md:py-14">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <h2 className="font-display text-3xl tracking-wider">
              Latest uploads
            </h2>

            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

              <Input
                type="search"
                placeholder="Search title, description or user…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 pr-9"
              />

              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <p className="text-sm text-muted-foreground w-full sm:w-auto sm:ml-auto">
              {filtered?.length ?? 0} {query ? "match" : "video"}
              {(filtered?.length ?? 0) === 1 ? "" : "es"}
            </p>
          </div>

          {filtered === null ? (
            <div className="grid place-items-center py-20 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <p className="text-muted-foreground">
                {query
                  ? `No videos match "${query}".`
                  : "No videos yet."}
              </p>

              {!query && (
                <Button asChild variant="hero" className="mt-4">
                  <Link to="/upload">Be the first to upload</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((v) => (
                <VideoCard key={v.id} v={v} />
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-border/60 mt-10">
        <div className="container py-8 text-sm text-muted-foreground flex flex-wrap items-center justify-between gap-3">
          <div>
            <p>© F5 Videos · Content uploaded by users</p>

          <p className="text-xs mt-1">
  Made by{" "}
  
    href="https://discord.com/users/1116706267390550089"
    target="_blank"
    rel="noopener noreferrer"
    className="bg-gradient-to-r from-red-500 to-white bg-clip-text text-transparent font-semibold hover:opacity-80 transition"
  >
    xfirejwye
  </a>{" "}
  the goat
</p>
<p className="text-xs mt-1">
  
    href="https://discord.com/users/1159616738405650462"
    target="_blank"
    rel="noopener noreferrer"
    className="bg-gradient-to-r from-white to-neutral-500 bg-clip-text text-transparent font-semibold hover:opacity-80 transition"
  >
    am5
  </a>{" "}
  is the goat
</p>

          <div className="flex flex-col sm:items-end gap-1 text-xs">
            <Link
              to="/privacy-policy"
              className="text-foreground/80 hover:text-primary transition-colors font-medium"
            >
              Privacy Policy
            </Link>
            <p>For takedown requests, use the report button on any video.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
