const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  Browsers
} = require("@whiskeysockets/baileys");

const pino = require("pino");

let reconnecting = false;

async function startBot() {
  console.log("🚀 Starting UMER-MD MINI...");

  const { state, saveCreds } =
    await useMultiFileAuthState("./session");

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),

    printQRInTerminal: false,

    browser: Browsers.macOS("Chrome"),

    markOnlineOnConnect: false,

    syncFullHistory: false
  });

  // Save authentication credentials
  sock.ev.on("creds.update", saveCreds);

  // Connection events
  sock.ev.on("connection.update", async (update) => {
    const {
      connection,
      lastDisconnect
    } = update;

    console.log("📡 Connection:", connection || "waiting...");

    // Connected
    if (connection === "open") {
      console.log("");
      console.log("╔════════════════════════════╗");
      console.log("║       𝐔𝐌𝐄𝐑-𝐌𝐃 𝐌𝐈𝐍𝐈       ║");
      console.log("║       CONNECTED ✅         ║");
      console.log("╚════════════════════════════╝");
      console.log("");
      console.log("🔥 Bot is ready!");
      console.log("📥 Waiting for messages...");
    }

    // Connection closed
    if (connection === "close") {
      const statusCode =
        lastDisconnect?.error?.output?.statusCode;

      console.log("");
      console.log("❌ Connection closed");
      console.log("📊 Status code:", statusCode || "unknown");

      if (statusCode === DisconnectReason.loggedOut) {
        console.log("🚪 WhatsApp session logged out.");
        console.log("🔐 Pairing required again.");
        return;
      }

      if (!reconnecting) {
        reconnecting = true;

        console.log("🔄 Reconnecting in 5 seconds...");

        setTimeout(() => {
          reconnecting = false;
          startBot().catch(console.error);
        }, 5000);
      }
    }
  });

  // Pairing code
  if (!state.creds.registered) {
    const phoneNumber = process.env.PHONE_NUMBER;

    if (!phoneNumber) {
      console.log("❌ PHONE_NUMBER secret is missing!");
      return;
    }

    const number = phoneNumber.replace(/[^0-9]/g, "");

    console.log("");
    console.log("⏳ Waiting before requesting pairing code...");

    setTimeout(async () => {
      try {
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

        console.log("📱 WhatsApp");
        console.log("➡️ Settings");
        console.log("➡️ Linked Devices");
        console.log("➡️ Link a device");
        console.log("➡️ Link with phone number instead");
        console.log("");
        console.log("⏳ Waiting for WhatsApp authentication...");
      } catch (error) {
        console.log("❌ Pairing code error:");
        console.log(error?.message || error);
      }
    }, 5000);
  } else {
    console.log("🔐 Existing session found.");
    console.log("⏭️ Pairing code not required.");
  }

  // Incoming messages
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    try {
      if (type !== "notify") return;

      for (const msg of messages) {
        if (!msg?.message) continue;
        if (msg.key.fromMe) continue;

        const jid = msg.key.remoteJid;

        const text =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          "";

        if (!text) continue;

        console.log("");
        console.log("📩 MESSAGE RECEIVED");
        console.log("👤 From:", jid);
        console.log("💬 Text:", text);

        const command = text.trim().toLowerCase();

        // .ping.dev
        if (command === ".ping.dev") {
          console.log("🏓 Sending PONG...");

          await sock.sendMessage(jid, {
            text:
              "🏓 PONG!\n\n" +
              "⚡ 𝐔𝐌𝐄𝐑-𝐌𝐃 𝐌𝐈𝐍𝐈\n" +
              "🚀 Bot is alive!"
          });

          console.log("✅ PONG sent!");
        }

        // .menu
        else if (command === ".menu") {
          console.log("📋 Sending menu...");

          await sock.sendMessage(jid, {
            text:
              "╔══════════════════════════╗\n" +
              "║      𝐔𝐌𝐄𝐑-𝐌𝐃 𝐌𝐈𝐍𝐈      ║\n" +
              "╠══════════════════════════╣\n" +
              "║                          ║\n" +
              "║  📋 AVAILABLE COMMANDS   ║\n" +
              "║                          ║\n" +
              "║  🏓 .ping.dev            ║\n" +
              "║  📋 .menu                ║\n" +
              "║                          ║\n" +
              "╚══════════════════════════╝"
          });

          console.log("✅ Menu sent!");
        }
      }
    } catch (error) {
      console.log("❌ Message handler error:");
      console.log(error?.message || error);
    }
  });
}

startBot().catch((error) => {
  console.log("❌ BOT START ERROR:");
  console.log(error);
});
