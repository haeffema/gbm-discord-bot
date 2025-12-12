import fetch from "node-fetch";
import FormData from "form-data";

export async function updateInteraction(applicationId, token, content, fileBuffer = null, fileName = "video.mp4") {
  const url = `https://discord.com/api/v10/webhooks/${applicationId}/${token}/messages/@original`;

  let body;
  const headers = {};

  if (fileBuffer) {
    const form = new FormData();
    form.append("payload_json", JSON.stringify({ content }));
    form.append("files[0]", fileBuffer, fileName);
    body = form;
    // form-data headers need to be merged with any others? 
    // fetch accepts form as body and handles headers if we pass form.getHeaders().
    Object.assign(headers, form.getHeaders());
  } else {
    body = JSON.stringify({ content });
    headers["Content-Type"] = "application/json";
  }

  try {
    const res = await fetch(url, {
      method: "PATCH",
      headers,
      body,
    });

    if (!res.ok) {
        const text = await res.text();
        console.error("Discord API Error:", res.status, text);
        throw new Error(`Discord API Error: ${res.status}`);
    }
    return true;
  } catch (err) {
    console.error("Failed to update interaction:", err);
    return false;
  }
}
