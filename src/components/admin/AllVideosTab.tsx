import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { formatRelativeTime } from "@/lib/format";
import {
  Eye,
  EyeOff,
  Trash2,
  Loader2,
  ExternalLink,
  Search,
  Ban,
  Copy,
} from "lucide-react";

interface VideoRow {
  id: string;
  title: string;
  uploader_name: string | null;
  is_hidden: boolean;
  created_at: string;
  storage_path: string;
  views: number;
  ip_address: string | null;
}

export const AllVideosTab = ({ onBlockIp }: { onBlockIp: (ip: string) => void }) => {
  const [items, setItems] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("videos")
      .select("id,title,uploader_name,is_hidden,created_at,storage_path,views,ip_address")
      .order("created_at", { ascending: false })
      .limit(500);
    setLoading(false);
    if (error) {
      toast({ title: "Could not load", description: error.message, variant: "destructive" });
      return;
    }
    setItems((data ?? []) as VideoRow[]);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (v) =>
        v.title.toLowerCase().includes(needle) ||
        (v.uploader_name ?? "").toLowerCase().includes(needle) ||
        (v.ip_address ?? "").toLowerCase().includes(needle) ||
        v.id.toLowerCase().includes(needle),
    );
  }, [items, q]);

  const toggleHide = async (v: VideoRow) => {
    const { error } = await supabase.from("videos").update({ is_hidden: !v.is_hidden }).eq("id", v.id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: v.is_hidden ? "Restored" : "Hidden" });
    load();
  };

  const deleteVideo = async (v: VideoRow) => {
    if (!confirm(`Permanently delete "${v.title}"?`)) return;
    await supabase.storage.from("videos").remove([v.storage_path]);
    const { error } = await supabase.from("videos").delete().eq("id", v.id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Deleted" });
    load();
  };

  const copyIp = (ip: string) => {
    navigator.clipboard.writeText(ip);
    toast({ title: "IP copied", description: ip });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, uploader, IP, or video ID…"
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
        </Button>
        <span className="text-xs text-muted-foreground">{filtered.length} of {items.length}</span>
      </div>

      {loading && items.length === 0 ? (
        <div className="grid place-items-center py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          No videos match.
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((v) => (
            <div
              key={v.id}
              className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card"
            >
              <div className="flex-1 min-w-[220px]">
                <div className="flex items-center gap-2 flex-wrap">
                  {v.is_hidden && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">Hidden</span>
                  )}
                  <span className="text-xs text-muted-foreground">{formatRelativeTime(v.created_at)}</span>
                  <span className="text-xs text-muted-foreground">· {v.views} views</span>
                </div>
                <h3 className="mt-1 font-semibold leading-snug">{v.title}</h3>
                <p className="text-sm text-muted-foreground">
                  by {v.uploader_name?.trim() || "Anonymous"}
                </p>
                {v.ip_address && (
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <code className="rounded bg-muted px-2 py-0.5 font-mono">{v.ip_address}</code>
                    <button
                      onClick={() => copyIp(v.ip_address!)}
                      className="text-muted-foreground hover:text-foreground"
                      title="Copy IP"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onBlockIp(v.ip_address!)}
                      className="inline-flex items-center gap-1 text-destructive hover:underline"
                    >
                      <Ban className="h-3.5 w-3.5" /> Blacklist
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm" className="gap-1.5">
                  <Link to={`/watch/${v.id}`} target="_blank">
                    <ExternalLink className="h-4 w-4" /> Open
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toggleHide(v)}>
                  {v.is_hidden ? <><Eye className="h-4 w-4" /> Restore</> : <><EyeOff className="h-4 w-4" /> Hide</>}
                </Button>
                <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => deleteVideo(v)}>
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
