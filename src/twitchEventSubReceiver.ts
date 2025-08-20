import type { Env } from "./utils/env.js";
import { HandlerRegistry } from "./handlers/eventHandler.js";
import { WebSocketService } from "./services/websocketService.js";
import customLogger from "./lib/logger.js";

export class TwitchEventSubReceiver {
  private websocketService: WebSocketService;
  private server: any;

  constructor(private config: Env, private handlerRegistry: HandlerRegistry) {
    this.websocketService = new WebSocketService("ws://127.0.0.1:8080/ws", handlerRegistry);
  }

  async start(): Promise<void> {
    // Connect WebSocket
    await this.websocketService.connect();
  }

  async stop(): Promise<void> {
    customLogger.info("Shutting down Twitch EventSub receiver...");

    this.websocketService.disconnect();

    if (this.server) {
      this.server.stop();
    }

    customLogger.success("✅ Shutdown complete");
  }
}
