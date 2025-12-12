import nacl from "tweetnacl";

const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;

async function verifyDiscordRequest(request) {
  const signature = request.headers.get("x-signature-ed25519");
  const timestamp = request.headers.get("x-signature-timestamp");
  const body = await request.text();

  if (!signature || !timestamp) return { verified: false, body };

  const isValid = nacl.sign.detached.verify(
    new TextEncoder().encode(timestamp + body),
    Buffer.from(signature, "hex"),
    Buffer.from(PUBLIC_KEY, "hex")
  );

  return { verified: isValid, body };
}

export default async function handler(request) {
  const { verified, body } = await verifyDiscordRequest(request);

  if (!verified) {
    return new Response("Invalid signature", { status: 401 });
  }

  const data = JSON.parse(body);

  if (data.type === 1) {
    return Response.json({ type: 1 });
  }

  if (data.type === 2) {
    const command = data.data.name;

    if (command === "ping") {
      return Response.json({
        type: 4,
        data: { content: "Pong!" }
      });
    }

    return Response.json({
      type: 4,
      data: { content: `Command '${command}' not implemented yet.` }
    });
  }

  return new Response("Unhandled interaction", { status: 400 });
}
