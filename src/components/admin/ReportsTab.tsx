import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { formatRelativeTime } from "@/lib/format";
import { Eye, EyeOff, Trash2, Loader2, ExternalLink, Ban, Copy } from "lucide-react";

interface ReportedVideo {
  id: string;
  title: string;
  uploader_name: string | null;
  is_hidden: boolean;
  created_at: string;
  storage_path: string;
  ip_address: string | null;
  reportCount: number;
  latestReason: string | null;
}

export const ReportsTab = ({ onBlockIp }: { onBlockIp: (ip: string) => void }) => {
  const [items, setItems] = useState<ReportedVideo[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: reports, error: repErr } = await supabase
      .from("video_reports")
      .select("video_id, reason, created_at")
      .order("created_at", { ascending: false });

    if (repErr) {
      toast({ title: "Could not load reports", description: repErr.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const grouped = new Map<string, { count: number; latestReason: string | null }>();
    (reports ?? []).forEach((r: any) => {
      const cur = grouped.get(r.video_id);
      if (!cur) grouped.set(r.video_id, { count: 1, latestReason: r.reason });
      else cur.count += 1;
    });

    const ids = Array.from(grouped.keys());
    if (ids.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data: vids, error: vErr } = await supabase
      .from("videos")
      .select("id,title,uploader_name,is_hidden,created_at,storage_path,ip_address")
      .in("id", ids);

    if (vErr) {
      toast({ title: "Could not load videos", description: vErr.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const merged: ReportedVideo[] = (vids ?? []).map((v: any) => ({
      ...v,
      reportCount: grouped.get(v.id)?.count ?? 0,
      latestReason: grouped.get(v.id)?.latestReason ?? null,
    }));
    merged.sort((a, b) => b.reportCount - a.reportCount);
    setItems(merged);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleHide = async (v: ReportedVideo) => {
    const { error } = await supabase.from("videos").update({ is_hidden: !v.is_hidden }).eq("id", v.id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: v.is_hidden ? "Restored" : "Hidden" });
    load();
  };

  const deleteVideo = async (v: ReportedVideo) => {
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
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
        </Button>
      </div>
      {loading && items.length === 0 ? (
        <div className="grid place-items-center py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          No reports. Nice and quiet.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((v) => (
            <div
              key={v.id}
              className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card"
            >
              <div className="flex-1 min-w-[220px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">
                    {v.reportCount} report{v.reportCount === 1 ? "" : "s"}
                  </span>
                  {v.is_hidden && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">Hidden</span>
                  )}
                  <span className="text-xs text-muted-foreground">{formatRelativeTime(v.created_at)}</span>
                </div>
                <h3 className="mt-1 font-semibold leading-snug">{v.title}</h3>
                <p className="text-sm text-muted-foreground">
                  by {v.uploader_name?.trim() || "Anonymous"}
                </p>
                {v.latestReason && (
                  <p className="mt-2 text-sm italic text-muted-foreground">"{v.latestReason}"</p>
                )}
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
