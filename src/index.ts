// src/index.ts
import { env } from "./utils/env.js";
import { wsServer } from "./services/minecraftWebsocketServer.js";
import { handlers } from "./handlers/eventHandler.js";
import { TwitchEventSubReceiver } from "./twitchEventSubReceiver.js";

async function main() {
  try {
    const receiver = new TwitchEventSubReceiver(env, handlers);

    // Handle graceful shutdown
    process.on("SIGINT", async () => {
      console.log("🛑 Received SIGINT, shutting down gracefully...");
      await receiver.stop();
      await wsServer.stop();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      console.log("🛑 Received SIGTERM, shutting down gracefully...");
      await receiver.stop();
      await wsServer.stop();
      process.exit(0);
    });

    wsServer.start();
    await receiver.start();
  } catch (error) {
    console.error("❌ Failed to start receiver:", error);
    process.exit(1);
  }
}

main();
