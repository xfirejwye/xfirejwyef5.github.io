import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { formatRelativeTime } from "@/lib/format";
import { Loader2, Trash2, Plus, Ban } from "lucide-react";

export interface BlacklistEntry {
  id: string;
  ip: string;
  block_uploads: boolean;
  block_comments: boolean;
  block_viewing: boolean;
  note: string | null;
  created_at: string;
}

export const BlacklistTab = ({
  pendingIp,
  clearPendingIp,
}: {
  pendingIp: string | null;
  clearPendingIp: () => void;
}) => {
  const [items, setItems] = useState<BlacklistEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [ip, setIp] = useState("");
  const [note, setNote] = useState("");
  const [blockUploads, setBlockUploads] = useState(true);
  const [blockComments, setBlockComments] = useState(true);
  const [blockViewing, setBlockViewing] = useState(false);
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ip_blacklist")
      .select("*")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast({ title: "Could not load blacklist", description: error.message, variant: "destructive" });
      return;
    }
    // ip from postgres comes back as string
    setItems((data ?? []).map((r: any) => ({ ...r, ip: String(r.ip) })) as BlacklistEntry[]);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (pendingIp) {
      setIp(pendingIp);
      clearPendingIp();
      // scroll to form
      requestAnimationFrame(() => {
        document.getElementById("add-ip-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }, [pendingIp, clearPendingIp]);

  const add = async () => {
    const trimmed = ip.trim();
    if (!trimmed) {
      toast({ title: "Enter an IP address", variant: "destructive" });
      return;
    }
    if (!blockUploads && !blockComments && !blockViewing) {
      toast({ title: "Pick at least one block type", variant: "destructive" });
      return;
    }
    setAdding(true);
    const { error } = await supabase.from("ip_blacklist").insert({
      ip: trimmed,
      block_uploads: blockUploads,
      block_comments: blockComments,
      block_viewing: blockViewing,
      note: note.trim() || null,
    });
    setAdding(false);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "IP blacklisted", description: trimmed });
    setIp("");
    setNote("");
    setBlockUploads(true);
    setBlockComments(true);
    setBlockViewing(false);
    load();
  };

  const toggle = async (entry: BlacklistEntry, field: "block_uploads" | "block_comments" | "block_viewing") => {
    const { error } = await supabase
      .from("ip_blacklist")
      .update({ [field]: !entry[field] })
      .eq("id", entry.id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    load();
  };

  const remove = async (entry: BlacklistEntry) => {
    if (!confirm(`Remove ${entry.ip} from the blacklist?`)) return;
    const { error } = await supabase.from("ip_blacklist").delete().eq("id", entry.id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Removed" });
    load();
  };

  return (
    <div className="space-y-6">
      <div
        id="add-ip-form"
        className="rounded-xl border border-border bg-card p-4 shadow-card space-y-4"
      >
        <div className="flex items-center gap-2">
          <Ban className="h-4 w-4 text-destructive" />
          <h3 className="font-semibold">Add IP to blacklist</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">IP address (v4 or v6)</label>
            <Input
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="e.g. 203.0.113.42"
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Note (optional)</label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. spam, harassment"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={blockUploads} onCheckedChange={(v) => setBlockUploads(!!v)} />
            Block uploads
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={blockComments} onCheckedChange={(v) => setBlockComments(!!v)} />
            Block comments
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={blockViewing} onCheckedChange={(v) => setBlockViewing(!!v)} />
            Block viewing
          </label>
          <Button onClick={add} disabled={adding} variant="hero" size="sm" className="gap-1.5 ml-auto">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add
          </Button>
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="grid place-items-center py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          No blacklisted IPs yet.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((e) => (
            <div
              key={e.id}
              className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-3 px-4 shadow-card"
            >
              <div className="flex-1 min-w-[200px]">
                <code className="font-mono text-sm">{e.ip}</code>
                {e.note && <span className="ml-2 text-xs text-muted-foreground">— {e.note}</span>}
                <p className="text-xs text-muted-foreground mt-0.5">
                  added {formatRelativeTime(e.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox checked={e.block_uploads} onCheckedChange={() => toggle(e, "block_uploads")} />
                  Uploads
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox checked={e.block_comments} onCheckedChange={() => toggle(e, "block_comments")} />
                  Comments
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox checked={e.block_viewing} onCheckedChange={() => toggle(e, "block_viewing")} />
                  Viewing
                </label>
              </div>
              <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => remove(e)}>
                <Trash2 className="h-4 w-4" /> Remove
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
