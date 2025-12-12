import "dotenv/config";
import fetch from "node-fetch";

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

const commands = [
  {
    name: "ping",
    description: "Test command"
  }
];

const url = `https://discord.com/api/v10/applications/${CLIENT_ID}/guilds/${GUILD_ID}/commands`;

(async () => {
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${TOKEN}`
    },
    body: JSON.stringify(commands)
  });

  const data = await res.json();
  console.log("Registered commands:", data);
})();
