import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, Trash2, Lock, Loader2, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { formatRelativeTime } from "@/lib/format";

const ADMIN_KEY = "fs-admin-pin";
// NOTE: this is a soft client gate for a public hidden page; not a security boundary.
// Real admin access lives in the database (only this page lets admins toggle/hide videos).
// You can change the PIN here.
const PIN = "fs-admin-2026";

interface ReportedVideo {
  id: string;
  title: string;
  uploader_name: string | null;
  is_hidden: boolean;
  created_at: string;
  storage_path: string;
  reportCount: number;
  latestReason: string | null;
}

const Admin = () => {
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ReportedVideo[]>([]);

  useEffect(() => {
    document.title = "Admin · FS Videos";
    if (sessionStorage.getItem(ADMIN_KEY) === PIN) setAuthed(true);
  }, []);

  const load = async () => {
    setLoading(true);
    const { data: reports } = await supabase
      .from("video_reports")
      .select("video_id, reason, created_at")
      .order("created_at", { ascending: false });

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
    const { data: vids } = await supabase
      .from("videos")
      .select("id,title,uploader_name,is_hidden,created_at,storage_path")
      .in("id", ids);

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
    if (authed) load();
  }, [authed]);

  const tryLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === PIN) {
      sessionStorage.setItem(ADMIN_KEY, PIN);
      setAuthed(true);
    } else {
      toast({ title: "Wrong PIN", variant: "destructive" });
    }
  };

  const toggleHide = async (v: ReportedVideo) => {
    const { error } = await supabase
      .from("videos")
      .update({ is_hidden: !v.is_hidden })
      .eq("id", v.id);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: v.is_hidden ? "Video restored" : "Video hidden" });
    load();
  };

  const deleteVideo = async (v: ReportedVideo) => {
    if (!confirm(`Permanently delete "${v.title}"?`)) return;
    await supabase.storage.from("videos").remove([v.storage_path]);
    const { error } = await supabase.from("videos").delete().eq("id", v.id);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Deleted" });
    load();
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-sm py-20">
          <form onSubmit={tryLogin} className="space-y-4 rounded-2xl border border-border p-6 shadow-card">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <h1 className="font-display text-2xl tracking-wider">Admin</h1>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin">Admin PIN</Label>
              <Input
                id="pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" variant="hero" className="w-full">Enter</Button>
            <p className="text-xs text-muted-foreground">
             if ur not admin get off this page now nigga
            </p>
          </form>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-10">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="font-display text-4xl tracking-wider">Reported videos</h1>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
          </Button>
        </div>

        {loading && items.length === 0 ? (
          <div className="grid place-items-center py-20 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="mt-8 rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
            No reports. Nice and quiet.
          </p>
        ) : (
          <div className="mt-8 space-y-3">
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
                    <p className="mt-2 text-sm italic text-muted-foreground">
                      “{v.latestReason}”
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button asChild variant="ghost" size="sm" className="gap-1.5">
                    <Link to={`/v/${v.id}`} target="_blank">
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
      </main>
    </div>
  );
};

export default Admin;
