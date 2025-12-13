import nacl from "tweetnacl";

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
      if (
        !url ||
        !["tiktok.com"].some(baseUrl => url.includes(baseUrl))
      ) {
        return res.status(200).json({
          type: 4,
          data: { content: "Diese URL wird noch nicht unterstützt." },
        });
      }

      res.status(200).json({ type: 5 });

      const { waitUntil } = await import("@vercel/functions");
      const { updateInteraction } = await import("../utils/discordApi.js");
      const { downloadTikTokVideo } = await import(
        "../utils/tiktokDownloader.js"
      );
      const { downloadReel } = await import("../utils/reelDownloader.js");

      waitUntil(
        (async () => {
          try {
            if (url.includes("tiktok.com")) {
              const videoBuffer = await downloadTikTokVideo(url);

              if (!videoBuffer) {
                await updateInteraction(
                  applicationId,
                  token,
                  `Kein Video gefunden: ${url}`
                );
                return;
              }

              await updateInteraction(
                applicationId,
                token,
                "",
                videoBuffer,
                "tiktok.mp4"
              );
            }

            if (url.includes("instagram.com")) {
                const videoBuffer = await downloadReel(url);

              if (!videoBuffer) {
                await updateInteraction(
                  applicationId,
                  token,
                  `Kein Video gefunden: ${url}`
                );
                return;
              }

              await updateInteraction(
                applicationId,
                token,
                "",
                videoBuffer,
                "reel.mp4"
              );
            }
          } catch (err) {
            console.error(err);
            await updateInteraction(
              applicationId,
              token,
              `Fehler: ${err.message}`
            );
          }
        })()
      );

      return;
    }

    if (command === "set-birthday") {
      const options = data.data.options || [];
      const day = options.find((o) => o.name === "day")?.value;
      const month = options.find((o) => o.name === "month")?.value;
      const year = options.find((o) => o.name === "year")?.value;
      const targetUserId = options.find((o) => o.name === "user")?.value;

      const userId = targetUserId || data.member?.user?.id || data.user?.id;

      const currentYear = new Date().getFullYear();
      if (
        !day ||
        !month ||
        !year ||
        day < 1 ||
        day > 31 ||
        month < 1 ||
        month > 12 ||
        year < 1900 ||
        year > currentYear
      ) {
        return res.status(200).json({
          type: 4,
          data: { content: "Kein valides Datum." },
        });
      }

      res.status(200).json({ type: 5 });
      const { waitUntil } = await import("@vercel/functions");
      const { updateInteraction } = await import("../utils/discordApi.js");
      const { setBirthday } = await import("../utils/db.js");

      waitUntil(
        (async () => {
          try {
            await setBirthday(userId, day, month, year);
            await updateInteraction(
              applicationId,
              token,
              `Geburtstag für <@${userId}> am ${day}.${month}.${year} eingetragen!`
            );
          } catch (e) {
            await updateInteraction(
              applicationId,
              token,
              `Fehler: ${e.message}`
            );
          }
        })()
      );
      return;
    }

    if (command === "remove-birthday") {
      const targetUserId = data.data.options?.[0]?.value;
      const userId = targetUserId || data.member?.user?.id || data.user?.id;

      res.status(200).json({ type: 5 });
      const { waitUntil } = await import("@vercel/functions");
      const { updateInteraction } = await import("../utils/discordApi.js");
      const { removeBirthday } = await import("../utils/db.js");

      waitUntil(
        (async () => {
          try {
            await removeBirthday(userId);
            if (targetUserId) {
              await updateInteraction(
                applicationId,
                token,
                `Geburtstag von <@${userId}> entfernt.`
              );
            } else {
              await updateInteraction(
                applicationId,
                token,
                `Geburtstag entfernt.`
              );
            }
          } catch (e) {
            await updateInteraction(
              applicationId,
              token,
              `Fehler: ${e.message}`
            );
          }
        })()
      );
      return;
    }

    if (command === "add-league-account") {
      const options = data.data.options || [];
      const gameName = options.find((o) => o.name === "game-name")?.value;
      const tagLine = options.find((o) => o.name === "tag-line")?.value;
      const targetUserId = options.find((o) => o.name === "user")?.value;

      const userId = targetUserId || data.member?.user?.id || data.user?.id;

      res.status(200).json({ type: 5 });
      const { waitUntil } = await import("@vercel/functions");
      const { updateInteraction } = await import("../utils/discordApi.js");
      const { addLeagueAccount } = await import("../utils/db.js");
      const { getAccountByRiotId } = await import("../utils/riotApi.js");

      waitUntil(
        (async () => {
          try {
            const account = await getAccountByRiotId(gameName, tagLine);
            if (!account) {
              await updateInteraction(
                applicationId,
                token,
                `Kein Riot Account gefunden (EUW) ${gameName}#${tagLine}.`
              );
              return;
            }

            await addLeagueAccount(userId, account.puuid);
            await updateInteraction(
              applicationId,
              token,
              `Riot Account **${account.gameName}#${account.tagLine}** für <@${userId}> gesetzt!`
            );
          } catch (e) {
            console.error(e);
            await updateInteraction(
              applicationId,
              token,
              `Fehler: ${e.message}`
            );
          }
        })()
      );
      return;
    }

    if (command === "remove-league-account") {
      const targetUserId = data.data.options?.[0]?.value;
      const userId = targetUserId || data.member?.user?.id || data.user?.id;

      res.status(200).json({ type: 5 });
      const { waitUntil } = await import("@vercel/functions");
      const { updateInteraction } = await import("../utils/discordApi.js");
      const { removeLeagueAccount } = await import("../utils/db.js");

      waitUntil(
        (async () => {
          try {
            await removeLeagueAccount(userId);
            if (targetUserId) {
              await updateInteraction(
                applicationId,
                token,
                `Riot Account für <@${userId}> entfernt.`
              );
            } else {
              await updateInteraction(
                applicationId,
                token,
                `Riot Account entfernt.`
              );
            }
          } catch (e) {
            console.error(e);
            await updateInteraction(
              applicationId,
              token,
              `Fehler: ${e.message}`
            );
          }
        })()
      );
      return;
    }

    if (["ranked", "flex"].includes(command)) {
      const targetUserId = data.data.options?.[0]?.value;
      const userId = targetUserId || data.member?.user?.id || data.user?.id;

      res.status(200).json({ type: 5 });
      const { waitUntil } = await import("@vercel/functions");
      const { updateInteraction } = await import("../utils/discordApi.js");
      const { getLeagueAccount, getAllLeagueAccounts } = await import(
        "../utils/db.js"
      );
      const {
        getAccountByPuuid,
        getLeagueEntries,
        getMatchIdsByPuuid,
        getMatchDetails,
      } = await import("../utils/riotApi.js");

      waitUntil(
        (async () => {
          try {
            const account = await getLeagueAccount(userId);
            if (!account) {
              await updateInteraction(
                applicationId,
                token,
                `<@${userId}> hat keinen Riot Account verlinkt. Nutze \`/add-league-account\` um einen hinzuzufügen.`
              );
              return;
            }

            const riotAccount = await getAccountByPuuid(account.puuid);
            if (!riotAccount) {
              await updateInteraction(
                applicationId,
                token,
                `Keine Daten gefunden.`
              );
              return;
            }

            const dpmUrl = `https://dpm.lol/${encodeURIComponent(
              riotAccount.gameName
            )}-${encodeURIComponent(riotAccount.tagLine)}`;

            let embed = {
              title: `${riotAccount.gameName}#${riotAccount.tagLine}`,
              url: dpmUrl,
              fields: [],
            };

            const queueType =
              command === "ranked" ? "RANKED_SOLO_5x5" : "RANKED_FLEX_SR";
            const queueId = command === "ranked" ? 420 : 440;

            const [entries, matchIds] = await Promise.all([
              getLeagueEntries(account.puuid),
              getMatchIdsByPuuid(account.puuid, 5, queueId),
            ]);
            const entry = entries.find((e) => e.queueType === queueType);

            if (entry) {
              const winRate = Math.round(
                (entry.wins / (entry.wins + entry.losses)) * 100
              );
              embed.color = getRankColor(entry.tier);

              embed.fields.push(
                {
                  name: `${command === "ranked" ? "Solo/Duo" : "Flex"} Rank`,
                  value: `${entry.tier} ${entry.rank} (${entry.leaguePoints} LP)`,
                  inline: true,
                },
                {
                  name: "Win Rate",
                  value: `${winRate}% (${entry.wins}W / ${entry.losses}L)`,
                  inline: true,
                }
              );
            } else {
              embed.description = `Unranked in ${
                command === "ranked" ? "Solo/Duo" : "Flex"
              }.`;
              embed.color = 0x99aab5;
            }

            if (matchIds && matchIds.length > 0) {
              const matchPromises = matchIds.map((id) => getMatchDetails(id));
              const matches = await Promise.all(matchPromises);

              let historyText = "";
              for (const match of matches) {
                if (!match) continue;
                const participant = match.info.participants.find(
                  (p) => p.puuid === account.puuid
                );
                if (!participant) continue;

                const win = participant.win;
                const champion = participant.championName;
                const kda = `${participant.kills}/${participant.deaths}/${participant.assists}`;

                historyText += `${
                  win ? "✅" : "❌"
                } **${champion}** (${kda})\n`;
              }

              if (historyText) {
                embed.fields.push({
                  name: "Last 5 Games",
                  value: historyText,
                  inline: false,
                });
              }
            }

            await updateInteraction(
              applicationId,
              token,
              "",
              undefined,
              undefined,
              [embed]
            );
          } catch (e) {
            console.error(e);
            await updateInteraction(
              applicationId,
              token,
              `Fehler: ${e.message}`
            );
          }
        })()
      );
      return;
    }

    if (["ranked-race", "flex-race"].includes(command)) {
      res.status(200).json({ type: 5 });
      const { waitUntil } = await import("@vercel/functions");
      const { updateInteraction } = await import("../utils/discordApi.js");
      const { getAllLeagueAccounts } = await import("../utils/db.js");
      const { getAccountByPuuid, getLeagueEntries } = await import(
        "../utils/riotApi.js"
      );

      waitUntil(
        (async () => {
          try {
            const accounts = await getAllLeagueAccounts();
            if (!accounts || accounts.length === 0) {
              await updateInteraction(
                applicationId,
                token,
                "Keine Accounts verlinkt bisher."
              );
              return;
            }

            const queueType =
              command === "ranked-race" ? "RANKED_SOLO_5x5" : "RANKED_FLEX_SR";

            const playerDataPromises = accounts.map(async (account) => {
              try {
                const [riotAccount, entries] = await Promise.all([
                  getAccountByPuuid(account.puuid),
                  getLeagueEntries(account.puuid),
                ]);

                if (!riotAccount) return null;

                const entry = entries.find((e) => e.queueType === queueType);
                return {
                  discordUserId: account.user_id,
                  gameName: riotAccount.gameName,
                  tagLine: riotAccount.tagLine,
                  entry: entry || null,
                };
              } catch (err) {
                console.error(
                  `Failed to fetch data for ${account.user_id}:`,
                  err
                );
                return null;
              }
            });

            const results = await Promise.all(playerDataPromises);
            const validResults = results.filter(
              (r) => r !== null && r.entry !== null
            );

            const tierOrder = [
              "CHALLENGER",
              "GRANDMASTER",
              "MASTER",
              "DIAMOND",
              "EMERALD",
              "PLATINUM",
              "GOLD",
              "SILVER",
              "BRONZE",
              "IRON",
            ];
            const rankOrder = { I: 1, II: 2, III: 3, IV: 4 };

            validResults.sort((a, b) => {
              const tierA = tierOrder.indexOf(a.entry.tier);
              const tierB = tierOrder.indexOf(b.entry.tier);
              if (tierA !== tierB) return tierA - tierB;

              const rankA = rankOrder[a.entry.rank];
              const rankB = rankOrder[b.entry.rank];
              if (rankA !== rankB) return rankA - rankB;

              return b.entry.leaguePoints - a.entry.leaguePoints;
            });

            const top10 = validResults.slice(0, 10);

            let description = "";
            top10.forEach((p, index) => {
              const winRate = Math.round(
                (p.entry.wins / (p.entry.wins + p.entry.losses)) * 100
              );
              const dpmUrl = `https://dpm.lol/${encodeURIComponent(
                p.gameName
              )}-${encodeURIComponent(p.tagLine)}`;
              const medal =
                index === 0
                  ? "🥇"
                  : index === 1
                  ? "🥈"
                  : index === 2
                  ? "🥉"
                  : `#${index + 1}`;

              description += `**${medal}** [${p.gameName}#${p.tagLine}](${dpmUrl})\n`;
              description += `${p.entry.tier} ${p.entry.rank} • ${p.entry.leaguePoints} LP • ${winRate}% WR\n\n`;
            });

            if (!description) {
              description = "No ranked players found for this queue.";
            }

            const embed = {
              title: `${
                command === "ranked-race" ? "Solo/Duo" : "Flex"
              } Leaderboard`,
              description: description,
              color: 0xf1c40f,
            };

            await updateInteraction(
              applicationId,
              token,
              "",
              undefined,
              undefined,
              [embed]
            );
          } catch (e) {
            console.error(e);
            await updateInteraction(
              applicationId,
              token,
              `Fehler: ${e.message}`
            );
          }
        })()
      );
      return;
    }

    if (command === "code") {
      return res.status(200).json({
        type: 4,
        data: { content: "https://github.com/haeffema/gbm-discord-bot" },
      });
    }

    function getRankColor(tier) {
      const colors = {
        IRON: 0x5d5d5d,
        BRONZE: 0x8c523a,
        SILVER: 0x80989d,
        GOLD: 0xcdfafa,
        PLATINUM: 0x25c6a5,
        EMERALD: 0x25c65f,
        DIAMOND: 0x576bce,
        MASTER: 0x9d48e0,
        GRANDMASTER: 0xef4f4f,
        CHALLENGER: 0xf4c874,
      };
      return colors[tier] || 0x0099ff;
    }

    return res.status(200).json({
      type: 4,
      data: { content: `Command '${command}' not implemented yet.` },
    });
  }

  return res.status(400).send("Unhandled interaction");
}
