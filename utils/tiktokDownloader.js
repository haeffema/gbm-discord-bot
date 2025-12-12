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

      const headRes = await fetch(videoUrl, { method: "HEAD" });
      if (headRes.ok) {
        const size = parseInt(headRes.headers.get("content-length") || "0", 10);
        if (size > 8 * 1024 * 1024) {
             console.log(`Video too large: ${size} bytes`);
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
