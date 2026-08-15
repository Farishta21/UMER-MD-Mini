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

  // Pairing Code
  if (!state.creds.registered) {
    const phoneNumber = process.env.PHONE_NUMBER;

    if (!phoneNumber) {
      console.log("❌ PHONE_NUMBER environment variable missing!");
      return;
    }

    try {
      const code = await sock.requestPairingCode(
        phoneNumber.replace(/[^0-9]/g, "")
      );

      console.log("");
      console.log("╔════════════════════════════╗");
      console.log("║      𝐔𝐌𝐄𝐑-𝐌𝐃 𝐌𝐈𝐍𝐈       ║");
      console.log("║      PAIRING CODE 🔐       ║");
      console.log("╠════════════════════════════╣");
      console.log(`║       ${code}       ║`);
      console.log("╚════════════════════════════╝");
      console.log("");
    } catch (err) {
      console.error("❌ Pairing code error:", err.message);
    }
  }

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      console.log("╔════════════════════════════╗");
      console.log("║       𝐔𝐌𝐄𝐑-𝐌𝐃 𝐌𝐈𝐍𝐈       ║");
      console.log("║       CONNECTED ✅         ║");
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

    const command = text.trim().toLowerCase();

    // .ping.dev
    if (command === ".ping.dev") {
      await sock.sendMessage(msg.key.remoteJid, {
        text:
          "🏓 PONG!\n\n" +
          "⚡ 𝐔𝐌𝐄𝐑-𝐌𝐃 𝐌𝐈𝐍𝐈\n" +
          "🚀 Bot is alive!"
      });
    }

    // .menu
    if (command === ".menu") {
      await sock.sendMessage(msg.key.remoteJid, {
        text:
          "╔════════════════════╗\n" +
          "║    𝐔𝐌𝐄𝐑-𝐌𝐃 𝐌𝐈𝐍𝐈    ║\n" +
          "╠════════════════════╣\n" +
          "║ 📋 MENU             ║\n" +
          "║                    ║\n" +
          "║ 🏓 .ping.dev       ║\n" +
          "║ 📋 .menu            ║\n" +
          "╚════════════════════╝"
      });
    }
  });
}

startBot().catch(console.error);
