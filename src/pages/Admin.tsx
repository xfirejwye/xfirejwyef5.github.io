import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, LogOut, ShieldAlert, Flag, Film, MessageSquare, Ban } from "lucide-react";
import { ReportsTab } from "@/components/admin/ReportsTab";
import { AllVideosTab } from "@/components/admin/AllVideosTab";
import { CommentsTab } from "@/components/admin/CommentsTab";
import { BlacklistTab } from "@/components/admin/BlacklistTab";

const Admin = () => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [tab, setTab] = useState("reports");
  const [pendingIp, setPendingIp] = useState<string | null>(null);

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

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  const blockIp = (ip: string) => {
    setPendingIp(ip);
    setTab("blacklist");
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
            doesn't have admin access.
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
        <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
          <div>
            <h1 className="font-display text-4xl tracking-wider">Admin panel</h1>
            <p className="text-sm text-muted-foreground mt-1">Signed in as {userEmail}</p>
          </div>
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 max-w-2xl">
            <TabsTrigger value="reports" className="gap-1.5">
              <Flag className="h-4 w-4" /> Reports
            </TabsTrigger>
            <TabsTrigger value="videos" className="gap-1.5">
              <Film className="h-4 w-4" /> Videos
            </TabsTrigger>
            <TabsTrigger value="comments" className="gap-1.5">
              <MessageSquare className="h-4 w-4" /> Comments
            </TabsTrigger>
            <TabsTrigger value="blacklist" className="gap-1.5">
              <Ban className="h-4 w-4" /> Blacklist
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="mt-6">
            <ReportsTab onBlockIp={blockIp} />
          </TabsContent>
          <TabsContent value="videos" className="mt-6">
            <AllVideosTab onBlockIp={blockIp} />
          </TabsContent>
          <TabsContent value="comments" className="mt-6">
            <CommentsTab onBlockIp={blockIp} />
          </TabsContent>
          <TabsContent value="blacklist" className="mt-6">
            <BlacklistTab pendingIp={pendingIp} clearPendingIp={() => setPendingIp(null)} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
