import { downloadReel } from "../utils/reelDownloader.js";

console.log("downloadReel type:", typeof downloadReel);

if (typeof downloadReel !== "function") {
  console.error("FAILED: downloadReel is not a function");
  process.exit(1);
}

console.log("Imports successful.");
