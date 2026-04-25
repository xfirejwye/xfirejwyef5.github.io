import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const LS_KEY = "fs-liked-videos";

const readLocal = (): Set<string> => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
};

const writeLocal = (set: Set<string>) => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(Array.from(set)));
  } catch {
    /* ignore */
  }
};

export const useVideoLike = (videoId: string | null | undefined) => {
  const [count, setCount] = useState<number>(0);
  const [liked, setLiked] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);

  // Initial load
  useEffect(() => {
    if (!videoId) return;
    let cancelled = false;
    (async () => {
      const { count: c } = await supabase
        .from("video_likes")
        .select("id", { count: "exact", head: true })
        .eq("video_id", videoId);
      if (!cancelled) setCount(c ?? 0);
      const local = readLocal();
      if (!cancelled) setLiked(local.has(videoId));
    })();
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  const toggle = useCallback(async () => {
    if (!videoId || busy || liked) return; // one like per IP, no unlike
    setBusy(true);
    // optimistic
    setLiked(true);
    setCount((c) => c + 1);
    const { data, error } = await supabase.rpc("like_video", { _video_id: videoId });
    setBusy(false);
    if (error || !data || (data as { ok?: boolean }).ok === false) {
      // revert on hard failure
      setLiked(false);
      setCount((c) => Math.max(0, c - 1));
      return;
    }
    const result = data as { ok: boolean; count?: number };
    if (typeof result.count === "number") setCount(result.count);
    const local = readLocal();
    local.add(videoId);
    writeLocal(local);
  }, [videoId, busy, liked]);

  return { count, liked, busy, toggle };
};
