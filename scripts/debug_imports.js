import { createRequire } from "module";
const require = createRequire(import.meta.url);

try {
  const instagramGetUrl = require("instagram-url-direct");
  console.log("instagram-url-direct imported via require:", typeof instagramGetUrl);
} catch (e) {
  console.log("instagram-url-direct require failed", e.message);
}

try {
  const mrnima = require("@mrnima/instagram-downloader");
  console.log("@mrnima/instagram-downloader imported via require:", typeof mrnima);
  console.log("Keys:", Object.keys(mrnima));
} catch (e) {
    console.log("@mrnima/instagram-downloader require failed", e.message);
}
