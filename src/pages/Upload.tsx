import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { AgeGate } from "@/components/AgeGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { UploadCloud, Film } from "lucide-react";
import { formatBytes } from "@/lib/format";

const MAX_BYTES = 500 * 1024 * 1024; // 500 MB

const Upload = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploaderName, setUploaderName] = useState("");
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const onPickFile = (f: File | null) => {
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
    setUploading(true);
    setProgress(5);

    try {
      const ext = file.name.split(".").pop() || "mp4";
      const path = `uploads/${crypto.randomUUID()}.${ext}`;

      // Fake progress while upload runs (supabase-js v2 doesn't expose progress)
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

      const { data: row, error: insErr } = await supabase
        .from("videos")
        .insert({
          title: title.trim().slice(0, 200),
          description: description.trim().slice(0, 5000) || null,
          uploader_name: uploaderName.trim().slice(0, 60) || null,
          storage_path: path,
          mime_type: file.type,
          size_bytes: file.size,
        })
        .select("id")
        .single();
      if (insErr) throw insErr;

      setProgress(100);
      toast({ title: "Uploaded!", description: "Your video is live." });
      navigate(`/v/${row!.id}`);
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
      <AgeGate />
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
        </form>
      </main>
    </div>
  );
};

export default Upload;
