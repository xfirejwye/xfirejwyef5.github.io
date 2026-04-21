import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, Trash2, Loader2, ExternalLink, LogOut, ShieldAlert } from "lucide-react";
import { formatRelativeTime } from "@/lib/format";

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
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ReportedVideo[]>([]);

  useEffect(() => {
    document.title = "Admin · F5 Videos";

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) {
        setIsAdmin(false);
        setUserEmail(null);
        navigate("/auth", { replace: true });
      }
    });

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth", { replace: true });
        return;
      }
      setUserEmail(session.user.email ?? null);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      const admin = (roles ?? []).some((r: any) => r.role === "admin");
      setIsAdmin(admin);
      setChecking(false);
    })();

    return () => sub.subscription.unsubscribe();
  }, [navigate]);

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
      .select("id,title,uploader_name,is_hidden,created_at,storage_path")
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
    if (isAdmin) load();
  }, [isAdmin]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
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

  if (checking) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="grid place-items-center py-32 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-md py-20 text-center">
          <ShieldAlert className="mx-auto h-12 w-12 text-destructive" />
          <h1 className="mt-4 font-display text-3xl tracking-wider">Not an admin</h1>
          <p className="mt-2 text-muted-foreground">
            You're signed in as <span className="text-foreground">{userEmail}</span>, but this account
            doesn't have admin access. Ask the project owner to grant you the admin role.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="outline" onClick={signOut}>Sign out</Button>
            <Button asChild variant="hero"><Link to="/">Back home</Link></Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-10">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-4xl tracking-wider">Reported videos</h1>
            <p className="text-sm text-muted-foreground mt-1">Signed in as {userEmail}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={signOut}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
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
