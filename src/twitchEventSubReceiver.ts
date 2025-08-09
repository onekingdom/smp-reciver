import type { Env } from "./utils/env.js";
import { HandlerRegistry } from "./handlers/eventHandler.js";
import { WebSocketService } from "./services/websocketService.js";

export class TwitchEventSubReceiver {
  private websocketService: WebSocketService;
  private server: any;

  constructor(private config: Env, private handlerRegistry: HandlerRegistry) {
    this.websocketService = new WebSocketService("wss://eventsub.wss.twitch.tv/ws", handlerRegistry);
  }

  async start(): Promise<void> {
    // Connect WebSocket
    await this.websocketService.connect();

    console.log("🎉 Twitch EventSub receiver started successfully!");
  }

  async stop(): Promise<void> {
    console.log("🛑 Shutting down Twitch EventSub receiver...");

    this.websocketService.disconnect();

    if (this.server) {
      this.server.stop();
    }

    console.log("✅ Shutdown complete");
  }
}
