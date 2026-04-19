import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Play, Eye } from "lucide-react";
import { formatViews, formatRelativeTime } from "@/lib/format";
import { useEffect, useRef, useState } from "react";

export interface VideoCardData {
  id: string;
  title: string;
  uploader_name: string | null;
  views: number;
  created_at: string;
  storage_path: string;
  thumbnail_path: string | null;
}

export const VideoCard = ({ v }: { v: VideoCardData }) => {
  const [hovered, setHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const videoUrl = supabase.storage.from("videos").getPublicUrl(v.storage_path).data.publicUrl;
  const thumbUrl = v.thumbnail_path
    ? supabase.storage.from("videos").getPublicUrl(v.thumbnail_path).data.publicUrl
    : null;

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (hovered) {
      el.currentTime = 0;
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [hovered]);

  return (
    <Link
      to={`/v/${v.id}`}
      className="group block animate-fade-in"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted shadow-card transition-all group-hover:shadow-glow group-hover:-translate-y-0.5">
        {thumbUrl && (
          <img
            src={thumbUrl}
            alt={v.title}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <video
          ref={videoRef}
          src={videoUrl}
          muted
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/90 text-primary-foreground shadow-glow">
            <Play className="h-6 w-6 fill-current" />
          </div>
        </div>
        <div className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-xs text-white backdrop-blur">
          <Eye className="h-3 w-3" /> {formatViews(v.views)}
        </div>
      </div>

      <div className="mt-3 px-1">
        <h3 className="line-clamp-2 font-semibold leading-snug group-hover:text-primary transition-colors">
          {v.title}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {v.uploader_name?.trim() || "Anonymous"} · {formatRelativeTime(v.created_at)}
        </p>
      </div>
    </Link>
  );
};
