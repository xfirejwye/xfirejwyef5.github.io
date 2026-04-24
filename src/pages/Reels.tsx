import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Comments } from "@/components/Comments";
import { toast } from "@/hooks/use-toast";
import {
  ChevronUp,
  ChevronDown,
  Eye,
  Flag,
  Loader2,
  MessageCircle,
  Pause,
  Play,
  Share2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { formatRelativeTime, formatViews } from "@/lib/format";

interface Reel {
  id: string;
  title: string;
  description: string | null;
  uploader_name: string | null;
  views: number;
  created_at: string;
  storage_path: string;
  duration_seconds: number | null;
}

const Reels = () => {
  const { id: routeId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const viewedRef = useRef<Set<string>>(new Set());

  const [reels, setReels] = useState<Reel[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [commentsOpenFor, setCommentsOpenFor] = useState<string | null>(null);

  // Load shorts
  useEffect(() => {
    document.title = "Reels · F5 Videos";
    (async () => {
      // Include anything explicitly marked as a short OR any video with a known duration <= 60s
      const { data, error } = await supabase
        .from("videos")
        .select("id,title,description,uploader_name,views,created_at,storage_path,duration_seconds")
        .eq("is_hidden", false)
        .or("is_short.eq.true,duration_seconds.lte.60")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) {
        toast({ title: "Could not load reels", description: error.message, variant: "destructive" });
        setReels([]);
        return;
      }
      setReels((data as Reel[]) ?? []);
    })();
  }, []);

  // Scroll to a specific reel if ?id is in route
  useEffect(() => {
    if (!reels || reels.length === 0) return;
    const target = routeId && reels.find((r) => r.id === routeId) ? routeId : reels[0].id;
    setActiveId(target);
    requestAnimationFrame(() => {
      itemRefs.current.get(target)?.scrollIntoView({ behavior: "auto", block: "start" });
    });
  }, [reels, routeId]);

  // Observe which reel is in view
  useEffect(() => {
    if (!reels || reels.length === 0) return;
    const root = containerRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const id = (visible.target as HTMLElement).dataset.id;
          if (id) setActiveId(id);
        }
      },
      { root, threshold: [0.5, 0.75, 0.9] },
    );
    itemRefs.current.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [reels]);

  // Play active, pause others; count a view once per reel per session
  useEffect(() => {
    videoRefs.current.forEach((v, id) => {
      if (id === activeId) {
        v.muted = muted;
        if (!paused) v.play().catch(() => {});
      } else {
        v.pause();
        v.currentTime = 0;
      }
    });
    if (activeId && !viewedRef.current.has(activeId)) {
      viewedRef.current.add(activeId);
      supabase.rpc("increment_video_views", { _video_id: activeId }).then(() => {});
    }
  }, [activeId, muted, paused]);

  const activeReel = useMemo(
    () => (reels && activeId ? reels.find((r) => r.id === activeId) ?? null : null),
    [reels, activeId],
  );

  const scrollBy = (dir: 1 | -1) => {
    if (!reels || !activeId) return;
    const idx = reels.findIndex((r) => r.id === activeId);
    const next = reels[idx + dir];
    if (next) itemRefs.current.get(next.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const share = async (r: Reel) => {
    const url = `${window.location.origin}/reels/${r.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: r.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: "Link copied", description: url });
      }
    } catch {
      // user cancelled — ignore
    }
  };

  const report = async (r: Reel) => {
    const reason = prompt("Report reason (optional):", "")?.trim() ?? null;
    const { error } = await supabase.from("video_reports").insert({
      video_id: r.id,
      reason: reason ? reason.slice(0, 1000) : null,
    });
    if (error) {
      toast({ title: "Could not report", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Reported", description: "Thanks — moderators will review." });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 relative">
        {reels === null ? (
          <div className="grid place-items-center py-32 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : reels.length === 0 ? (
          <div className="container py-20 text-center">
            <h1 className="font-display text-3xl tracking-wider">No reels yet</h1>
            <p className="mt-2 text-muted-foreground">
              Upload a video and toggle <span className="text-foreground font-medium">Publish as Short</span> to see it here.
            </p>
            <Button asChild variant="hero" className="mt-6">
              <Link to="/upload">Upload one</Link>
            </Button>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="h-[calc(100vh-4rem)] overflow-y-scroll snap-y snap-mandatory scroll-smooth bg-black"
            style={{ scrollbarWidth: "none" }}
          >
            <style>{`.reels-feed::-webkit-scrollbar{display:none}`}</style>

            {reels.map((r) => {
              const url = supabase.storage.from("videos").getPublicUrl(r.storage_path).data.publicUrl;
              return (
                <section
                  key={r.id}
                  data-id={r.id}
                  ref={(el) => {
                    if (el) itemRefs.current.set(r.id, el);
                    else itemRefs.current.delete(r.id);
                  }}
                  className="snap-start h-[calc(100vh-4rem)] w-full grid place-items-center relative"
                >
                  <div className="relative h-full w-full md:max-w-[420px] md:mx-auto bg-black">
                    <video
                      ref={(el) => {
                        if (el) videoRefs.current.set(r.id, el);
                        else videoRefs.current.delete(r.id);
                      }}
                      src={url}
                      loop
                      playsInline
                      muted={muted}
                      preload="metadata"
                      onClick={() => setPaused((p) => !p)}
                      className="h-full w-full object-contain bg-black cursor-pointer"
                    />

                    {/* Pause overlay */}
                    {activeId === r.id && paused && (
                      <button
                        onClick={() => setPaused(false)}
                        className="absolute inset-0 grid place-items-center bg-black/30"
                        aria-label="Play"
                      >
                        <span className="grid h-20 w-20 place-items-center rounded-full bg-white/15 backdrop-blur-md">
                          <Play className="h-10 w-10 text-white fill-current" />
                        </span>
                      </button>
                    )}

                    {/* Bottom info gradient */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pb-6">
                      <p className="text-white font-semibold text-sm">
                        @{r.uploader_name?.trim() || "anonymous"}
                      </p>
                      <h2 className="mt-1 text-white text-base font-medium leading-snug line-clamp-2">
                        {r.title}
                      </h2>
                      {r.description && (
                        <p className="mt-1 text-white/80 text-xs line-clamp-2">{r.description}</p>
                      )}
                      <p className="mt-1 text-white/60 text-xs">
                        {formatRelativeTime(r.created_at)}
                      </p>
                    </div>

                    {/* Side actions */}
                    <div className="absolute right-2 md:right-3 bottom-24 flex flex-col items-center gap-5 text-white">
                      <button
                        onClick={() => setMuted((m) => !m)}
                        className="grid h-11 w-11 place-items-center rounded-full bg-white/10 hover:bg-white/20 backdrop-blur transition-colors"
                        aria-label={muted ? "Unmute" : "Mute"}
                      >
                        {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                      </button>

                      <div className="flex flex-col items-center">
                        <span className="grid h-11 w-11 place-items-center rounded-full bg-white/10 backdrop-blur">
                          <Eye className="h-5 w-5" />
                        </span>
                        <span className="mt-1 text-xs font-medium tabular-nums">{formatViews(r.views)}</span>
                      </div>

                      <button
                        onClick={() => setCommentsOpenFor(r.id)}
                        className="flex flex-col items-center group"
                        aria-label="Comments"
                      >
                        <span className="grid h-11 w-11 place-items-center rounded-full bg-white/10 group-hover:bg-white/20 backdrop-blur transition-colors">
                          <MessageCircle className="h-5 w-5" />
                        </span>
                        <span className="mt-1 text-xs font-medium">Comments</span>
                      </button>

                      <button
                        onClick={() => share(r)}
                        className="flex flex-col items-center group"
                        aria-label="Share"
                      >
                        <span className="grid h-11 w-11 place-items-center rounded-full bg-white/10 group-hover:bg-white/20 backdrop-blur transition-colors">
                          <Share2 className="h-5 w-5" />
                        </span>
                        <span className="mt-1 text-xs font-medium">Share</span>
                      </button>

                      <button
                        onClick={() => report(r)}
                        className="flex flex-col items-center group"
                        aria-label="Report"
                      >
                        <span className="grid h-11 w-11 place-items-center rounded-full bg-white/10 group-hover:bg-white/20 backdrop-blur transition-colors">
                          <Flag className="h-5 w-5" />
                        </span>
                        <span className="mt-1 text-xs font-medium">Report</span>
                      </button>
                    </div>
                  </div>
                </section>
              );
            })}

            {/* Desktop up/down nav */}
            <div className="hidden md:flex flex-col gap-3 fixed right-6 top-1/2 -translate-y-1/2 z-30">
              <Button
                size="icon"
                variant="outline"
                className="rounded-full bg-background/70 backdrop-blur"
                onClick={() => scrollBy(-1)}
                aria-label="Previous"
              >
                <ChevronUp className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="rounded-full bg-background/70 backdrop-blur"
                onClick={() => scrollBy(1)}
                aria-label="Next"
              >
                <ChevronDown className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}
      </main>

      <Sheet
        open={!!commentsOpenFor}
        onOpenChange={(o) => {
          if (!o) setCommentsOpenFor(null);
        }}
      >
        <SheetContent side="bottom" className="h-[80vh] overflow-y-auto p-0">
          <SheetHeader className="px-4 py-3 border-b border-border sticky top-0 bg-background z-10">
            <SheetTitle className="text-left">Comments</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-8">
            {commentsOpenFor && <Comments videoId={commentsOpenFor} />}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Reels;
