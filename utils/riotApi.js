import fetch from "node-fetch";

const RIOT_API_TOKEN = process.env.RIOT_API_TOKEN;
const REGION = "europe"; // Regional routing for Account V1, Match V5
const PLATFORM = "euw1"; // Platform routing for Summoner V4, League V4, TFT League V1

const HEADERS = {
  "X-Riot-Token": RIOT_API_TOKEN,
  "User-Agent": "GBM-Discord-Bot/1.0"
};

export async function getAccountByRiotId(gameName, tagLine) {
  if (!RIOT_API_TOKEN) {
    throw new Error("RIOT_API_TOKEN is not configured.");
  }

  const url = `https://${REGION}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;

  const response = await fetch(url, { headers: HEADERS });

  if (!response.ok) {
        if (response.status === 404) return null;
        const body = await response.text();
        throw new Error(`Riot API error (Account): ${response.status} - ${url} - ${body}`);
  }

  return await response.json();
}

export async function getAccountByPuuid(puuid) {
  if (!RIOT_API_TOKEN) throw new Error("RIOT_API_TOKEN is not configured.");

  const url = `https://${REGION}.api.riotgames.com/riot/account/v1/accounts/by-puuid/${encodeURIComponent(puuid)}`;
  const response = await fetch(url, { headers: HEADERS });

  if (!response.ok) {
        if (response.status === 404) return null;
        const body = await response.text();
        throw new Error(`Riot API error (Account by PUUID): ${response.status} - ${url} - ${body}`);
  }
  return await response.json();
}

export async function getLeagueEntries(puuid) {
  if (!RIOT_API_TOKEN) throw new Error("RIOT_API_TOKEN is not configured.");

  const url = `https://${PLATFORM}.api.riotgames.com/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`;
  const response = await fetch(url, { headers: HEADERS });

  if (!response.ok) {
      const body = await response.text();
      throw new Error(`Riot API error (League by PUUID): ${response.status} - ${url} - ${body}`);
  }
  return await response.json();
}

export async function getMatchIdsByPuuid(puuid, count = 5, queue) {
  if (!RIOT_API_TOKEN) throw new Error("RIOT_API_TOKEN is not configured.");

  let url = `https://${REGION}.api.riotgames.com/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?start=0&count=${count}`;
  if (queue) {
    url += `&queue=${queue}`;
  }
  const response = await fetch(url, { headers: HEADERS });

  if (!response.ok) {
      const body = await response.text();
      throw new Error(`Riot API error (Match IDs): ${response.status} - ${url} - ${body}`);
  }
  return await response.json();
}

export async function getMatchDetails(matchId) {
  if (!RIOT_API_TOKEN) throw new Error("RIOT_API_TOKEN is not configured.");

  const url = `https://${REGION}.api.riotgames.com/lol/match/v5/matches/${matchId}`;
  const response = await fetch(url, { headers: HEADERS });

  if (!response.ok) {
      const body = await response.text();
      // Don't throw here to avoid failing the whole command if one match fails
      console.error(`Riot API error (Match Details): ${response.status} - ${url} - ${body}`);
      return null;
  }
  return await response.json();
}
