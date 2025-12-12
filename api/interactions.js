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
    req.on("data", chunk => data += chunk);
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  const { verified, body } = await verifyDiscordRequest(req);

  if (!verified) return res.status(401).send("Invalid signature");

  const data = JSON.parse(body);

  if (data.type === 1) {
    return res.status(200).json({ type: 1 });
  }

  if (data.type === 2) {
    const command = data.data.name;

    if (command === "ping") {
      return res.status(200).json({ type: 4, data: { content: "Pong!" } });
    }

    return res.status(200).json({
      type: 4,
      data: { content: `Command '${command}' not implemented yet.` }
    });
  }

  return res.status(400).send("Unhandled interaction");
}
