import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Eye, Flag, Loader2, User } from "lucide-react";
import { formatRelativeTime, formatViews } from "@/lib/format";
import { VideoCard, type VideoCardData } from "@/components/VideoCard";
import { Comments } from "@/components/Comments";

interface Video extends VideoCardData {
  description: string | null;
  mime_type: string | null;
}

const Watch = () => {
  const { id } = useParams<{ id: string }>();
  const [video, setVideo] = useState<Video | null | undefined>(undefined);
  const [related, setRelated] = useState<VideoCardData[]>([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from("videos")
        .select("id,title,description,uploader_name,views,created_at,storage_path,thumbnail_path,mime_type")
        .eq("id", id)
        .eq("is_hidden", false)
        .maybeSingle();
      setVideo((data as Video) ?? null);
      if (data) {
        document.title = `${data.title} · F5 Videos`;
        await supabase.rpc("increment_video_views", { _video_id: id });
      }
      const { data: rel } = await supabase
        .from("videos")
        .select("id,title,uploader_name,views,created_at,storage_path,thumbnail_path")
        .eq("is_hidden", false)
        .neq("id", id)
        .order("views", { ascending: false })
        .limit(8);
      setRelated((rel as VideoCardData[]) ?? []);
    })();
  }, [id]);

  const submitReport = async () => {
    if (!id) return;
    setSubmittingReport(true);
    const { error } = await supabase.from("video_reports").insert({
      video_id: id,
      reason: reportReason.trim().slice(0, 1000) || null,
    });
    setSubmittingReport(false);
    if (error) {
      toast({ title: "Could not submit report", description: error.message, variant: "destructive" });
      return;
    }
    setReportOpen(false);
    setReportReason("");
    toast({ title: "Report submitted", description: "Thanks — moderators will review." });
  };

  if (video === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="grid place-items-center py-32 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    );
  }

  if (video === null) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 text-center">
          <h1 className="font-display text-4xl tracking-wider">Video not found</h1>
          <p className="mt-2 text-muted-foreground">It may have been removed.</p>
          <Button asChild variant="hero" className="mt-6">
            <Link to="/">Back home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const videoUrl = supabase.storage.from("videos").getPublicUrl(video.storage_path).data.publicUrl;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-6 md:py-10">
        <div className="grid lg:grid-cols-[1fr_360px] gap-8">
          <div>
            <div className="overflow-hidden rounded-2xl bg-black shadow-card aspect-video">
              <video
                src={videoUrl}
                controls
                autoPlay
                playsInline
                className="h-full w-full"
              />
            </div>

            <h1 className="mt-5 font-display text-2xl md:text-3xl tracking-wide leading-tight">
              {video.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-primary text-primary-foreground">
                    <User className="h-4 w-4" />
                  </span>
                  <span className="font-medium text-foreground">
                    {video.uploader_name?.trim() || "Anonymous"}
                  </span>
                </span>
                <span>·</span>
                <span className="inline-flex items-center gap-1"><Eye className="h-4 w-4" /> {formatViews(video.views)}</span>
                <span>·</span>
                <span>{formatRelativeTime(video.created_at)}</span>
              </div>

              <Dialog open={reportOpen} onOpenChange={setReportOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Flag className="h-4 w-4" /> Report
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Report this video</DialogTitle>
                    <DialogDescription>
                      Tell us what's wrong. Moderators review every report.
                    </DialogDescription>
                  </DialogHeader>
                  <Textarea
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    rows={4}
                    placeholder="Reason (optional)"
                    maxLength={1000}
                  />
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setReportOpen(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={submitReport} disabled={submittingReport}>
                      {submittingReport ? "Submitting…" : "Submit report"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {video.description && (
              <div className="mt-5 rounded-xl bg-muted/50 p-4 whitespace-pre-wrap text-sm leading-relaxed">
                {video.description}
              </div>
            )}

            <Comments videoId={video.id} />
          </div>

          <aside>
            <h2 className="font-display text-xl tracking-wider mb-4">Up next</h2>
            <div className="space-y-5">
              {related.map((v) => (
                <VideoCard key={v.id} v={v} />
              ))}
              {related.length === 0 && (
                <p className="text-sm text-muted-foreground">No other videos yet.</p>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default Watch;
