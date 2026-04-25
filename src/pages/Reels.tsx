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
  Flag,
  Heart,
  Loader2,
  MessageCircle,
  Play,
  Share2,
  X,
} from "lucide-react";
import { formatRelativeTime, formatCount } from "@/lib/format";
import { useVideoLike } from "@/hooks/useVideoLike";
import { cn } from "@/lib/utils";

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
  const [paused, setPaused] = useState(false);
  const [commentsOpenFor, setCommentsOpenFor] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    document.title = "Reels · F5 Videos";
    (async () => {
      // Fetch all visible videos; we'll filter to <=60s on the client
      // (for older uploads we don't have duration_seconds stored yet).
      const { data, error } = await supabase
        .from("videos")
        .select("id,title,description,uploader_name,views,created_at,storage_path,duration_seconds,is_short")
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) {
        toast({ title: "Could not load reels", description: error.message, variant: "destructive" });
        setReels([]);
        return;
      }
      const all = (data as (Reel & { is_short?: boolean })[]) ?? [];

      // Quick pass: anything we already know qualifies (short flag or known duration <=60)
      const knownQualifies = (v: { is_short?: boolean; duration_seconds: number | null }) =>
        v.is_short === true || (v.duration_seconds != null && v.duration_seconds <= 60);
      const knownDisqualifies = (v: { is_short?: boolean; duration_seconds: number | null }) =>
        v.is_short !== true && v.duration_seconds != null && v.duration_seconds > 60;

      const qualified = all.filter(knownQualifies);
      const unknown = all.filter((v) => !knownQualifies(v) && !knownDisqualifies(v));

      // Show what we already know immediately
      setReels(qualified);

      if (unknown.length === 0) return;

      // Probe unknown durations in the browser, with limited concurrency
      const probe = (url: string) =>
        new Promise<number | null>((resolve) => {
          const v = document.createElement("video");
          v.preload = "metadata";
          v.muted = true;
          v.src = url;
          const done = (n: number | null) => {
            v.removeAttribute("src");
            v.load();
            resolve(n);
          };
          v.onloadedmetadata = () => done(isFinite(v.duration) ? v.duration : null);
          v.onerror = () => done(null);
          // Safety timeout
          setTimeout(() => done(null), 8000);
        });

      const CONCURRENCY = 4;
      const results: { v: Reel; duration: number | null }[] = [];
      let i = 0;
      const workers = Array.from({ length: Math.min(CONCURRENCY, unknown.length) }, async () => {
        while (i < unknown.length) {
          const idx = i++;
          const item = unknown[idx];
          const url = supabase.storage.from("videos").getPublicUrl(item.storage_path).data.publicUrl;
          const d = await probe(url);
          results.push({ v: item, duration: d });
        }
      });
      await Promise.all(workers);

      const newlyQualified = results
        .filter((r) => r.duration != null && r.duration <= 60)
        .map((r) => ({ ...r.v, duration_seconds: r.duration as number }));

      if (newlyQualified.length > 0) {
        // Merge + keep newest-first order
        setReels((prev) => {
          const map = new Map<string, Reel>();
          [...(prev ?? []), ...newlyQualified].forEach((r) => map.set(r.id, r));
          return Array.from(map.values()).sort(
            (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
          );
        });
      }

      // Best-effort: persist measured durations so future loads skip probing.
      // Will silently fail if anon UPDATE isn't allowed by RLS (current schema disallows it).
      const toPersist = results.filter((r) => r.duration != null);
      if (toPersist.length > 0) {
        await Promise.allSettled(
          toPersist.map((r) =>
            supabase
              .from("videos")
              .update({ duration_seconds: r.duration as number })
              .eq("id", r.v.id),
          ),
        );
      }
    })();
  }, []);

  useEffect(() => {
    if (!reels || reels.length === 0) return;
    const target = routeId && reels.find((r) => r.id === routeId) ? routeId : reels[0].id;
    setActiveId(target);
    requestAnimationFrame(() => {
      itemRefs.current.get(target)?.scrollIntoView({ behavior: "auto", block: "start" });
    });
  }, [reels, routeId]);

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
          if (id) {
            setActiveId(id);
            setPaused(false);
          }
        }
      },
      { root, threshold: [0.5, 0.75, 0.9] },
    );
    itemRefs.current.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [reels]);

  // Audio is always unmuted; only mute when paused
  useEffect(() => {
    videoRefs.current.forEach((v, id) => {
      if (id === activeId) {
        v.muted = paused; // muted only when paused
        if (!paused) {
          v.play().catch(() => {});
        } else {
          v.pause();
        }
      } else {
        v.muted = true;
        v.pause();
        v.currentTime = 0;
      }
    });
    if (activeId && !viewedRef.current.has(activeId)) {
      viewedRef.current.add(activeId);
      supabase.rpc("increment_video_views", { _video_id: activeId }).then(() => {});
    }
  }, [activeId, paused]);

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

  const handleVideoClick = (id: string) => {
    if (id !== activeId) return;
    setPaused((p) => {
      const next = !p;
      const video = videoRefs.current.get(id);
      if (video) {
        video.muted = next; // mute when pausing
        if (next) {
          video.pause();
        } else {
          video.play().catch(() => {});
        }
      }
      return next;
    });
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

  const commentsOpen = !!commentsOpenFor;

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
          <div className="flex h-[calc(100dvh-4rem-3.5rem)] md:h-[calc(100vh-4rem)]">
            {/* ── Feed ── */}
            <div
              ref={containerRef}
              className="flex-1 overflow-y-scroll snap-y snap-mandatory scroll-smooth bg-black"
              style={{ scrollbarWidth: "none" }}
            >
              <style>{`div::-webkit-scrollbar{display:none}`}</style>

              {reels.map((r) => {
                const url = supabase.storage.from("videos").getPublicUrl(r.storage_path).data.publicUrl;
                const isActive = activeId === r.id;
                return (
                  <section
                    key={r.id}
                    data-id={r.id}
                    ref={(el) => {
                      if (el) itemRefs.current.set(r.id, el);
                      else itemRefs.current.delete(r.id);
                    }}
                    className="snap-start h-[calc(100dvh-4rem-3.5rem)] md:h-[calc(100vh-4rem)] w-full grid place-items-center relative"
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
                        muted={true} // start muted for autoplay policy; unmuted on play via effect
                        preload="metadata"
                        onClick={() => handleVideoClick(r.id)}
                        className="h-full w-full object-contain bg-black cursor-pointer"
                      />

                      {isActive && paused && (
                        <button
                          onClick={() => handleVideoClick(r.id)}
                          className="absolute inset-0 grid place-items-center bg-black/30"
                          aria-label="Play"
                        >
                          <span className="grid h-20 w-20 place-items-center rounded-full bg-white/15 backdrop-blur-md">
                            <Play className="h-10 w-10 text-white fill-current" />
                          </span>
                        </button>
                      )}

                      {/* Bottom meta */}
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

                      {/* Right-side action buttons */}
                      <div className="absolute right-2 md:right-3 bottom-24 flex flex-col items-center gap-5 text-white">
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

              {/* Desktop prev/next nav */}
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

            {/* ── Desktop comments sidebar (TikTok-style) ── */}
            {commentsOpen && !isMobile && (
              <div className="hidden md:flex flex-col w-[360px] shrink-0 border-l border-border bg-background h-full">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                  <span className="font-semibold text-sm">Comments</span>
                  <button
                    onClick={() => setCommentsOpenFor(null)}
                    className="grid h-8 w-8 place-items-center rounded-full hover:bg-muted transition-colors"
                    aria-label="Close comments"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-4 pb-8">
                  {commentsOpenFor && <Comments videoId={commentsOpenFor} />}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Mobile comments sheet (bottom drawer, TikTok-style) ── */}
      {isMobile && (
        <Sheet
          open={commentsOpen}
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
      )}
    </div>
  );
};

export default Reels;
