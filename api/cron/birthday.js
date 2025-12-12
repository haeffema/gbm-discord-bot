import { getBirthdays } from "../../utils/db.js";
import fetch from "node-fetch";

export default async function handler(req, res) {
  // Check authorization if needed (Vercel Cron automatically secures this if configured, 
  // but good practice to check if it's from Vercel. 
  // For hobby, we can trust the internal network or check header 'authorization' if we set one.)
  // We will assume it's publicly accessible but obscure, or rely on Vercel's Cron protection.
  
  const token = process.env.DISCORD_TOKEN;
  const channelId = process.env.BIRTHDAY_CHANNEL_ID; // Must be set!

  if (!channelId) {
      console.error("BIRTHDAY_CHANNEL_ID not set");
      return res.status(500).json({ error: "Configuration error" });
  }

  // Get today's date in Berlin
  const now = new Date().toLocaleString("en-US", { timeZone: "Europe/Berlin" });
  const dateObj = new Date(now);
  const day = dateObj.getDate();
  const month = dateObj.getMonth() + 1;
  const currentYear = dateObj.getFullYear();

  try {
      const users = await getBirthdays(day, month);
      
      if (users.length > 0) {
          // Group logic? No, just one message for all? Or separate? 
          // User requested "congrats message should contain the age". 
          // If multiple people have diff ages, we need separate lines or a loop.
          // Let's send one message with multiple lines if needed.
          
          const lines = users.map(u => {
              const age = u.year ? currentYear - u.year : null;
              if (age) {
                  return `Alles Gute zum ${age}. Geburtstag, <@${u.user_id}>! 🥳`;
              } else {
                  return `Alles Gute zum Geburtstag, <@${u.user_id}>! 🥳`;
              }
          });
          
          const content = `🎉 **Geburtstage Heute!** 🎂\n${lines.join("\n")}`;

          await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
              method: "POST",
              headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bot ${token}`
              },
              body: JSON.stringify({ content })
          });
          console.log(`Sent birthday message to ${users.length} users.`);
      } else {
          console.log("No birthdays today.");
      }
      
      res.status(200).json({ success: true, count: users.length });
  } catch (error) {
      console.error("Cron error:", error);
      res.status(500).json({ error: error.message });
  }
}
