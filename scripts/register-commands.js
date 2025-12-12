import "dotenv/config";
import fetch from "node-fetch";

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

const commands = [
  {
    name: "ping",
    description: "Test command"
  },
  {
    name: "download",
    description: "Download a TikTok video",
    options: [
      {
        name: "url",
        description: "TikTok video URL",
        type: 3,
        required: true
      }
    ]
  },
  {
    name: "set-birthday",
    description: "Set your birthday",
    options: [
      {
        name: "day",
        description: "Day (1-31)",
        type: 4,
        required: true
      },
      {
        name: "month",
        description: "Month (1-12)",
        type: 4,
        required: true
      },
      {
        name: "year",
        description: "Year (e.g. 1990)",
        type: 4,
        required: true
      },
      {
        name: "user",
        description: "User to set birthday for (optional)",
        type: 6,
        required: false
      }
    ]
  },
  {
    name: "remove-birthday",
    description: "Remove your birthday",
    options: [
      {
        name: "user",
        description: "User to remove birthday for (optional)",
        type: 6,
        required: false
      }
    ]
  },
  {
    name: "code",
    description: "Get the bot's source code link",
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
