import "dotenv/config";
import { getSummonerByPuuid } from "../utils/riotApi.js";

const PUUID = "EuWa5ErMRC0Y3dkGdWIfFRLHw_-h-JVcBUy4XljhReESlrbPzUzNvO-m1AsTJ768uNgHh-LmZqQX7Q";

(async () => {
    console.log("Testing Riot API with PUUID:", PUUID);
    console.log("Token configured:", !!process.env.RIOT_API_TOKEN);
    try {
        const summoner = await getSummonerByPuuid(PUUID);
        console.log("Success:", summoner);
    } catch (e) {
        console.error("Error:", e.message);
        if (e.cause) console.error("Cause:", e.cause);
    }
})();
