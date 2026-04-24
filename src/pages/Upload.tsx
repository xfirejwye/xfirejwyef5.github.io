import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { UploadCloud, Film, Flame } from "lucide-react";
import { formatBytes } from "@/lib/format";
import { getClientFingerprint } from "@/lib/clientFingerprint";

const MAX_BYTES = 500 * 1024 * 1024; // 500 MB

const probeDuration = (file: File): Promise<number | null> =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    v.src = url;
    const cleanup = () => URL.revokeObjectURL(url);
    v.onloadedmetadata = () => {
      const d = isFinite(v.duration) ? v.duration : null;
      cleanup();
      resolve(d);
    };
    v.onerror = () => {
      cleanup();
      resolve(null);
    };
  });

const Upload = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [isShort, setIsShort] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploaderName, setUploaderName] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [formMountedAt] = useState(() => Date.now());

  const onPickFile = async (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("video/")) {
      toast({ title: "Not a video", description: "Please pick a video file.", variant: "destructive" });
      return;
    }
    if (f.size > MAX_BYTES) {
      toast({
        title: "File too large",
        description: `Max 500 MB. Yours is ${formatBytes(f.size)}.`,
        variant: "destructive",
      });
      return;
    }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
    const d = await probeDuration(f);
    setDuration(d);
    // Auto-suggest Short if <= 60s
    if (d !== null && d <= 60) setIsShort(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({ title: "Pick a video first", variant: "destructive" });
      return;
    }
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }

    // Honeypot — bots fill hidden fields
    if (website.trim() !== "") {
      toast({ title: "Upload blocked", variant: "destructive" });
      return;
    }
    // Form submitted suspiciously fast (< 3 seconds)
    if (Date.now() - formMountedAt < 3000) {
      toast({ title: "Slow down", description: "Please take a moment to fill the form.", variant: "destructive" });
      return;
    }

    // Duration limits
    if (duration !== null) {
      if (isShort && duration > 180) {
        toast({ title: "Too long for a Short", description: "Shorts must be 3 minutes or less.", variant: "destructive" });
        return;
      }
      if (!isShort && duration > 60 * 60) {
        toast({ title: "Video too long", description: "Max 1 hour.", variant: "destructive" });
        return;
      }
    }

    setUploading(true);
    setProgress(3);

    try {
      // Rate-limit check
      const fp = await getClientFingerprint();
      const { data: rl, error: rlErr } = await supabase.rpc("check_upload_rate_limit", { _ip_hash: fp });
      if (rlErr) throw rlErr;
      const result = rl as { allowed: boolean; reason?: string; limit?: number; wait_seconds?: number };
      if (!result?.allowed) {
        const messages: Record<string, string> = {
          too_fast: `Please wait ${result.wait_seconds ?? 30}s between uploads.`,
          hourly_limit: `Limit reached: max 3 uploads per hour.`,
          daily_limit: `Limit reached: max 10 uploads per day.`,
          invalid_client: `Could not verify your client.`,
        };
        toast({
          title: "Upload limit reached",
          description: messages[result.reason ?? ""] ?? "Try again later.",
          variant: "destructive",
        });
        setUploading(false);
        setProgress(0);
        return;
      }

      const ext = file.name.split(".").pop() || "mp4";
      const path = `uploads/${crypto.randomUUID()}.${ext}`;

      const progressTimer = setInterval(() => {
        setProgress((p) => (p < 90 ? p + 2 : p));
      }, 400);

      const { error: upErr } = await supabase.storage.from("videos").upload(path, file, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });
      clearInterval(progressTimer);
      if (upErr) throw upErr;
      setProgress(95);

      const { data: regData, error: regErr } = await supabase.functions.invoke("register-video", {
        body: {
          title: title.trim().slice(0, 200),
          description: description.trim().slice(0, 5000) || null,
          uploader_name: uploaderName.trim().slice(0, 60) || null,
          storage_path: path,
          mime_type: file.type,
          size_bytes: file.size,
          is_short: isShort,
          duration_seconds: duration,
        },
      });
      if (regErr || (regData as any)?.error) {
        // Clean up the uploaded file if registration failed
        await supabase.storage.from("videos").remove([path]);
        throw new Error((regData as any)?.error ?? regErr?.message ?? "Registration failed");
      }
      const newId = (regData as any).id as string;

      setProgress(100);
      toast({ title: "Uploaded!", description: "Your video is live." });
      navigate(`/watch/${newId}`);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Upload failed",
        description: err.message ?? "Something went wrong.",
        variant: "destructive",
      });
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-2xl py-10 md:py-14">
        <h1 className="font-display text-4xl md:text-5xl tracking-wider">
          Upload <span className="text-gradient">a video</span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          Anonymous. No account. Up to 500 MB per file.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <label
            htmlFor="file"
            className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 cursor-pointer transition-colors ${
              file ? "border-primary/60 bg-primary/5" : "border-border hover:border-primary/50 hover:bg-accent/5"
            }`}
          >
            {file ? (
              <>
                <Film className="h-10 w-10 text-primary" />
                <div className="text-center">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">{formatBytes(file.size)}</p>
                </div>
              </>
            ) : (
              <>
                <UploadCloud className="h-10 w-10 text-muted-foreground" />
                <div className="text-center">
                  <p className="font-medium">Click to choose a video</p>
                  <p className="text-sm text-muted-foreground">MP4, WebM, MOV, MKV — up to 500 MB</p>
                </div>
              </>
            )}
            <input
              id="file"
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
              disabled={uploading}
            />
          </label>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your video a title"
              maxLength={200}
              disabled={uploading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional — say something about your video"
              rows={4}
              maxLength={5000}
              disabled={uploading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Display name (optional)</Label>
            <Input
              id="name"
              value={uploaderName}
              onChange={(e) => setUploaderName(e.target.value)}
              placeholder="Anonymous"
              maxLength={60}
              disabled={uploading}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to upload as “Anonymous”.
            </p>
          </div>

          {/* Honeypot field — hidden from real users, bots fill it */}
          <div aria-hidden="true" className="absolute left-[-9999px] top-[-9999px] h-0 w-0 overflow-hidden">
            <label htmlFor="website">Website (leave blank)</label>
            <input
              id="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          {uploading && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                Uploading… {progress}%
              </p>
            </div>
          )}

          <Button
            type="submit"
            variant="hero"
            size="lg"
            className="w-full gap-2"
            disabled={uploading || !file}
          >
            <UploadCloud className="h-5 w-5" />
            {uploading ? "Uploading…" : "Publish video"}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Limits: 3 uploads/hour, 10/day per device.
          </p>
        </form>
      </main>
    </div>
  );
};

export default Upload;
