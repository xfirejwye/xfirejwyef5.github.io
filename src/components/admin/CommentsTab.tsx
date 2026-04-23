import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { formatRelativeTime } from "@/lib/format";
import { Loader2, Trash2, ExternalLink, Search, Ban, Copy } from "lucide-react";

interface CommentRow {
  id: string;
  video_id: string;
  author_name: string;
  body: string;
  created_at: string;
  ip_address: string | null;
}

export const CommentsTab = ({ onBlockIp }: { onBlockIp: (ip: string) => void }) => {
  const [items, setItems] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("video_comments")
      .select("id,video_id,author_name,body,created_at,ip_address")
      .order("created_at", { ascending: false })
      .limit(500);
    setLoading(false);
    if (error) {
      toast({ title: "Could not load", description: error.message, variant: "destructive" });
      return;
    }
    setItems((data ?? []) as CommentRow[]);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (c) =>
        c.body.toLowerCase().includes(needle) ||
        c.author_name.toLowerCase().includes(needle) ||
        (c.ip_address ?? "").toLowerCase().includes(needle) ||
        c.video_id.toLowerCase().includes(needle),
    );
  }, [items, q]);

  const remove = async (c: CommentRow) => {
    if (!confirm("Delete this comment?")) return;
    const { error } = await supabase.from("video_comments").delete().eq("id", c.id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Comment deleted" });
    setItems((prev) => prev.filter((p) => p.id !== c.id));
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
            placeholder="Search comment text, author, IP, or video ID…"
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
          No comments match.
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-border bg-card p-4 shadow-card"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-[220px]">
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="font-semibold text-foreground text-sm">{c.author_name}</span>
                    <span className="text-muted-foreground">{formatRelativeTime(c.created_at)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {c.body}
                  </p>
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    {c.ip_address && (
                      <>
                        <code className="rounded bg-muted px-2 py-0.5 text-xs font-mono">{c.ip_address}</code>
                        <button
                          onClick={() => copyIp(c.ip_address!)}
                          className="text-muted-foreground hover:text-foreground"
                          title="Copy IP"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onBlockIp(c.ip_address!)}
                          className="inline-flex items-center gap-1 text-xs text-destructive hover:underline"
                        >
                          <Ban className="h-3.5 w-3.5" /> Blacklist
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button asChild variant="ghost" size="sm" className="gap-1.5">
                    <Link to={`/watch/${c.video_id}`} target="_blank">
                      <ExternalLink className="h-4 w-4" /> Video
                    </Link>
                  </Button>
                  <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => remove(c)}>
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
