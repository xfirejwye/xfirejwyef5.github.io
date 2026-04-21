// Stable per-device hash used purely as a soft anti-spam key.
// Not a unique tracker — combines a random per-device id with UA.
const KEY = "fs-client-id";

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function getClientFingerprint(): Promise<string> {
  let cid = localStorage.getItem(KEY);
  if (!cid) {
    cid = crypto.randomUUID();
    localStorage.setItem(KEY, cid);
  }
  const ua = navigator.userAgent || "";
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  return sha256Hex(`${cid}|${ua}|${tz}`);
}
