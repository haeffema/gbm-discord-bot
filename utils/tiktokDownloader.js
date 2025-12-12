import fetch from "node-fetch";

const PROVIDERS = [
  {
    name: "TikWM",
    run: async (url) => {
      const res = await fetch(`https://www.tikwm.com/api/?url=${url}`);
      const data = await res.json();
      if (data.code === 0 && data.data?.play) {
        return data.data.play;
      }
      throw new Error(`TikWM error: ${JSON.stringify(data)}`);
    },
  },
  {
    name: "LoveTik",
    run: async (url) => {
      const res = await fetch("https://lovetik.com/api/v2/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: url }),
      });
      if (!res.ok) throw new Error(`LoveTik status: ${res.status}`);
      const data = await res.json();
      if (data.links?.[0]?.a) {
        return data.links[0].a;
      }
      throw new Error("LoveTik found no links");
    },
  },
];

export async function downloadTikTokVideo(url) {
  for (const provider of PROVIDERS) {
    try {
      console.log(`Trying provider: ${provider.name}`);
      const videoUrl = await provider.run(url);
      
      if (!videoUrl) continue;

      // Check size before downloading completely if possible
      const headRes = await fetch(videoUrl, { method: "HEAD" });
      if (headRes.ok) {
        const size = parseInt(headRes.headers.get("content-length") || "0", 10);
        if (size > 8 * 1024 * 1024) {
             console.log(`Video too large: ${size} bytes`);
             // We can return null here to let the main handler deal with "too large" message locally 
             // OR we could return a special object. 
             // For now, let's just let it download and fail in the main loop or (optimization) return null to signal "too large/fail" immediately?
             // The original code checked buffer size.
             // Let's download it. Vercel memory limit might be tight, but 8MB is fine.
        }
      }

      const videoRes = await fetch(videoUrl);
      if (!videoRes.ok) throw new Error(`Failed to download video from ${provider.name}`);

      const arrayBuffer = await videoRes.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err) {
      console.error(`${provider.name} failed:`, err.message);
    }
  }
  return null;
}
