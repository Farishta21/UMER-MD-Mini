const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");

const pino = require("pino");

async function startBot() {
  const { state, saveCreds } =
    await useMultiFileAuthState("./session");

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" })
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      console.log("╔════════════════════════════╗");
      console.log("║       𝐔𝐌𝐄𝐑-𝐌𝐃 𝐌𝐈𝐍𝐈       ║");
      console.log("║       𝐔𝐌𝐄𝐑-𝐌𝐃 CONNECTED ✅      ║");
      console.log("╚════════════════════════════╝");
    }

    if (connection === "close") {
      const statusCode =
        lastDisconnect?.error?.output?.statusCode;

      if (statusCode !== DisconnectReason.loggedOut) {
        console.log("🔄 Reconnecting...");
        startBot();
      } else {
        console.log("❌ WhatsApp session logged out.");
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];

    if (!msg?.message || msg.key.fromMe) return;

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    if (text.toLowerCase() === ".ping") {
      await sock.sendMessage(msg.key.remoteJid, {
        text: "🏓 PONG!\n\n⚡ 𝐔𝐌𝐄𝐑-𝐌𝐃 𝐌𝐈𝐍𝐈 is alive!"
      });
    }
  });
}

startBot().catch(console.error);
