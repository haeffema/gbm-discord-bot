import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import os from "os";
import ytdlp from "yt-dlp-exec";
import instagramGetUrl from "instagram-url-direct";

const PROVIDERS = [
  {
    name: "InstagramUrlDirect",
    run: async (url) => {
      // url_list: [ string ]
      const data = await instagramGetUrl(url);
      if (data.url_list && data.url_list.length > 0) {
        return data.url_list[0];
      }
      throw new Error("No URL found");
    },
  },
  {
    name: "Cobalt",
    run: async (url) => {
      const res = await fetch("https://api.cobalt.tools/api/json", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          url: url,
          filenamePattern: "basic",
        }),
      });

      const data = await res.json();
      if (data.status === "stream" || data.status === "redirect") {
        return data.url;
      }
      if (data.status === "picker") {
         return data.picker[0].url;
      }
      throw new Error(`Cobalt error: ${data.text || JSON.stringify(data)}`);
    },
  },
  {
    name: "OpenGraph",
    run: async (url) => {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      });
      const html = await res.text();
      // Support og:video and og:video:secure_url, handle single/double quotes
      const match = html.match(/<meta property="og:video(:secure_url)?" content=["']([^"']+)["']/);
      if (match && match[2]) {
        return match[2].replace(/&amp;/g, "&");
      }
      throw new Error("No og:video found");
    },
  },
  {
    name: "yt-dlp",
    run: async (url) => {
      const tmpDir = os.tmpdir();
      const outputPath = path.join(tmpDir, `reel_${Date.now()}.mp4`);
      
      await ytdlp(url, {
        output: outputPath,
        format: "mp4",
        noPlaylist: true,
      });

      if (fs.existsSync(outputPath)) {
        const buffer = fs.readFileSync(outputPath);
        fs.unlinkSync(outputPath);
        return buffer;
      }
      throw new Error("yt-dlp failed to download file");
    },
  },
];

export async function downloadReel(url) {
  // Normalize URL: handle /reels/ -> /reel/
  let normalizedUrl = url.replace(/\/reels\//g, "/reel/");
  
  console.log(`Processing URL: ${normalizedUrl}`);

  for (const provider of PROVIDERS) {
    try {
      console.log(`Trying provider (Reel): ${provider.name}`);
      const result = await provider.run(normalizedUrl);

      if (!result) {
        console.log(`${provider.name} returned empty result`);
        continue;
      }

      if (Buffer.isBuffer(result)) {
        console.log(`${provider.name} returned buffer`);
        return result;
      }

      if (typeof result === "string") {
        const videoUrl = result;
        console.log(`${provider.name} returned URL: ${videoUrl.substring(0, 50)}...`);
        
        if (!videoUrl.startsWith('http')) {
           console.log("Invalid URL protocol");
           continue;
        }

        const headRes = await fetch(videoUrl, { method: "HEAD" });
        
        const videoRes = await fetch(videoUrl);
        if (!videoRes.ok) throw new Error(`Failed to download video from ${provider.name} (Status: ${videoRes.status})`);

        const arrayBuffer = await videoRes.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }

    } catch (err) {
      console.error(`${provider.name} failed:`, err.message);
    }
  }
  return null;
}
