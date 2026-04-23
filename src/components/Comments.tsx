import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { formatRelativeTime } from "@/lib/format";
import { Loader2, MessageSquare, Pencil, Send, User } from "lucide-react";

interface Comment {
  id: string;
  video_id: string;
  author_name: string;
  body: string;
  created_at: string;
}

const NAME_KEY = "fs-comment-name";
const randomGuestName = () => `guest_${Math.random().toString(36).slice(2, 7)}`;

export const Comments = ({ videoId }: { videoId: string }) => {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [name, setName] = useState<string>("");
  const [editingName, setEditingName] = useState(false);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(NAME_KEY);
    setName(stored && stored.trim() ? stored : randomGuestName());
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("video_comments")
        .select("id,video_id,author_name,body,created_at")
        .eq("video_id", videoId)
        .order("created_at", { ascending: false });
      if (active) setComments((data as Comment[]) ?? []);
    })();

    const channel = supabase
      .channel(`comments-${videoId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "video_comments", filter: `video_id=eq.${videoId}` },
        (payload) => {
          setComments((prev) => {
            const c = payload.new as Comment;
            if (!prev) return [c];
            if (prev.some((p) => p.id === c.id)) return prev;
            return [c, ...prev];
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "video_comments", filter: `video_id=eq.${videoId}` },
        (payload) => {
          const oldId = (payload.old as { id: string }).id;
          setComments((prev) => prev?.filter((p) => p.id !== oldId) ?? prev);
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [videoId]);

  useEffect(() => {
    if (editingName) nameInputRef.current?.focus();
  }, [editingName]);

  const commitName = () => {
    const trimmed = name.trim().slice(0, 40) || randomGuestName();
    setName(trimmed);
    localStorage.setItem(NAME_KEY, trimmed);
    setEditingName(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    if (text.length > 1000) {
      toast({ title: "Too long", description: "Comments are capped at 1000 characters.", variant: "destructive" });
      return;
    }
    const author = (name.trim() || "Anonymous").slice(0, 40);
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("post-comment", {
      body: { video_id: videoId, author_name: author, body: text },
    });
    setSubmitting(false);
    if (error || (data as any)?.error) {
      toast({
        title: "Could not post",
        description: (data as any)?.error ?? error?.message ?? "Unknown error",
        variant: "destructive",
      });
      return;
    }
    localStorage.setItem(NAME_KEY, author);
    setBody("");
  };

  return (
    <section className="mt-10">
      <header className="flex items-center gap-2 mb-5">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl tracking-wider">
          {comments ? `${comments.length} comment${comments.length === 1 ? "" : "s"}` : "Comments"}
        </h2>
      </header>

      <form onSubmit={submit} className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-primary text-primary-foreground shrink-0">
            <User className="h-4 w-4" />
          </span>
          {editingName ? (
            <Input
              ref={nameInputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitName();
                }
                if (e.key === "Escape") setEditingName(false);
              }}
              maxLength={40}
              className="h-8 max-w-[200px] text-sm"
              placeholder="your name"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingName(true)}
              className="group inline-flex items-center gap-1.5 font-medium text-foreground hover:text-primary transition-colors"
              title="Click to change name"
            >
              <span>{name || "Anonymous"}</span>
              <Pencil className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100" />
            </button>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            No account · Anyone can see this
          </span>
        </div>

        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment…"
          rows={3}
          maxLength={1000}
          className="resize-none"
        />

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground tabular-nums">
            {body.length}/1000
          </span>
          <Button
            type="submit"
            variant="hero"
            size="sm"
            disabled={submitting || !body.trim()}
            className="gap-1.5"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Post
          </Button>
        </div>
      </form>

      <div className="mt-6 space-y-4">
        {comments === null ? (
          <div className="grid place-items-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Be the first to drop a comment.
          </p>
        ) : (
          comments.map((c) => (
            <article key={c.id} className="flex gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-foreground shrink-0">
                <User className="h-4 w-4" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 text-sm">
                  <span className="font-medium text-foreground truncate">{c.author_name}</span>
                  <span className="text-xs text-muted-foreground">{formatRelativeTime(c.created_at)}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {c.body}
                </p>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
};
