import nacl from "tweetnacl";
import { downloadTikTokVideo } from "../utils/tiktokDownloader.js";

const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;

async function verifyDiscordRequest(req) {
  const signature = req.headers["x-signature-ed25519"];
  const timestamp = req.headers["x-signature-timestamp"];
  const body = await getRawBody(req);

  if (!signature || !timestamp) return { verified: false, body };

  const isValid = nacl.sign.detached.verify(
    Buffer.from(timestamp + body),
    Buffer.from(signature, "hex"),
    Buffer.from(PUBLIC_KEY, "hex")
  );

  return { verified: isValid, body };
}

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  const { verified, body } = await verifyDiscordRequest(req);
  if (!verified) return res.status(401).send("Invalid signature");

  let data;
  try {
    data = JSON.parse(body);
  } catch {
    return res.status(400).send("Invalid JSON");
  }

  if (data.type === 1) {
    return res.status(200).json({ type: 1 });
  }

  if (data.type === 2) {
    const command = data.data.name;
    const applicationId = data.application_id;
    const token = data.token;

    if (command === "ping") {
      return res.status(200).json({
        type: 4,
        data: { content: "Pong!" },
      });
    }

    if (command === "download") {
      const url = data.data.options?.[0]?.value;
      if (!url || !url.includes("tiktok.com")) {
        return res.status(200).json({
          type: 4,
          data: { content: "Please provide a valid TikTok URL." },
        });
      }

      res.status(200).json({ type: 5 });
      
      const { waitUntil } = await import("@vercel/functions");
      const { updateInteraction } = await import("../utils/discordApi.js");
      const { downloadTikTokVideo } = await import("../utils/tiktokDownloader.js");

      waitUntil((async () => {
        try {
            await updateInteraction(applicationId, token, "searching video...");
            
            const videoBuffer = await downloadTikTokVideo(url);
    
            if (!videoBuffer) {
               await updateInteraction(applicationId, token, `could not download video: ${url}`);
               return;
            }
    
            if (videoBuffer.length > 8 * 1024 * 1024) {
               await updateInteraction(applicationId, token, "file to big");
               return;
            }
    
            // Just send file, no content message
            await updateInteraction(applicationId, token, "", videoBuffer, "tiktok.mp4");
    
        } catch (err) {
            console.error(err);
            await updateInteraction(applicationId, token, `${err.message}`);
        }
      })());
      
      return; 
    }

    if (command === "set-birthday") {
        // Extract options
        const options = data.data.options || [];
        const day = options.find(o => o.name === "day")?.value;
        const month = options.find(o => o.name === "month")?.value;
        const year = options.find(o => o.name === "year")?.value;
        const targetUserId = options.find(o => o.name === "user")?.value;
        
        // Determine target user
        const userId = targetUserId || data.member?.user?.id || data.user?.id;
        
        // Validation
        const currentYear = new Date().getFullYear();
        if (!day || !month || !year || 
            day < 1 || day > 31 || 
            month < 1 || month > 12 || 
            year < 1900 || year > currentYear) {
             return res.status(200).json({
                type: 4,
                data: { content: "Invalid date. Please check day (1-31), month (1-12), and year." },
             });
        }

        res.status(200).json({ type: 5 }); // Defer
        const { waitUntil } = await import("@vercel/functions");
        const { updateInteraction } = await import("../utils/discordApi.js");
        const { setBirthday } = await import("../utils/db.js");

        waitUntil((async () => {
             try {
                 await setBirthday(userId, day, month, year);
                 await updateInteraction(applicationId, token, `Birthday set for <@${userId}> to ${day}.${month}.${year}!`);
             } catch (e) {
                 await updateInteraction(applicationId, token, `Error: ${e.message}`);
             }
        })());
        return;
    }

    if (command === "remove-birthday") {
        const targetUserId = data.data.options?.[0]?.value;
        const userId = targetUserId || data.member?.user?.id || data.user?.id;
        
        res.status(200).json({ type: 5 });
        const { waitUntil } = await import("@vercel/functions");
        const { updateInteraction } = await import("../utils/discordApi.js");
        const { removeBirthday } = await import("../utils/db.js");

        waitUntil((async () => {
             try {
                 await removeBirthday(userId);
                 if (targetUserId) {
                     await updateInteraction(applicationId, token, `Removed birthday for <@${userId}>.`);
                 } else {
                     await updateInteraction(applicationId, token, `Birthday removed.`);
                 }
             } catch (e) {
                 await updateInteraction(applicationId, token, `Error: ${e.message}`);
             }
        })());
        return;
    }

    return res.status(200).json({
      type: 4,
      data: { content: `Command '${command}' not implemented yet.` },
    });
  }

  return res.status(400).send("Unhandled interaction");
}
