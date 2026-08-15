const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  Browsers
} = require("@whiskeysockets/baileys");

const pino = require("pino");

let pairingCodeRequested = false;

async function startBot() {
  const { state, saveCreds } =
    await useMultiFileAuthState("./session");

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    browser: Browsers.macOS("Chrome"),
    markOnlineOnConnect: false
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Request pairing code only when WhatsApp sends the QR/auth event.
    if (qr && !state.creds.registered && !pairingCodeRequested) {
      pairingCodeRequested = true;

      const phoneNumber = process.env.PHONE_NUMBER;

      if (!phoneNumber) {
        console.log("❌ PHONE_NUMBER secret missing!");
        return;
      }

      try {
        const number = phoneNumber.replace(/[^0-9]/g, "");

        console.log("🔐 Requesting pairing code...");

        const code = await sock.requestPairingCode(number);

        console.log("");
        console.log("╔════════════════════════════╗");
        console.log("║       𝐔𝐌𝐄𝐑-𝐌𝐃 𝐌𝐈𝐍𝐈       ║");
        console.log("║       PAIRING CODE 🔐      ║");
        console.log("╠════════════════════════════╣");
        console.log(`║          ${code}           ║`);
        console.log("╚════════════════════════════╝");
        console.log("");
        console.log("📱 WhatsApp → Linked Devices");
        console.log("➡️ Link a device");
        console.log("➡️ Link with phone number instead");
      } catch (error) {
        console.log("❌ Pairing code error:", error.message);
      }
    }

    if (connection === "open") {
      console.log("╔════════════════════════════╗");
      console.log("║       𝐔𝐌𝐄𝐑-𝐌𝐃 𝐌𝐈𝐍𝐈       ║");
      console.log("║       CONNECTED ✅         ║");
      console.log("╚════════════════════════════╝");
    }

    if (connection === "close") {
      const statusCode =
        lastDisconnect?.error?.output?.statusCode;

      console.log("⚠️ Connection closed:", statusCode);

      if (statusCode !== DisconnectReason.loggedOut) {
        console.log("🔄 Reconnecting...");
        pairingCodeRequested = false;
        setTimeout(startBot, 3000);
      } else {
        console.log("❌ WhatsApp session logged out.");
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const msg of messages) {
      if (!msg?.message || msg.key.fromMe) continue;

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        "";

      const command = text.trim().toLowerCase();

      if (command === ".ping.dev") {
        await sock.sendMessage(msg.key.remoteJid, {
          text:
            "🏓 PONG!\n\n" +
            "⚡ 𝐔𝐌𝐄𝐑-𝐌𝐃 𝐌𝐈𝐍𝐈\n" +
            "🚀 Bot is alive!"
        });
      }

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
    }
  });
}

startBot().catch(console.error);
