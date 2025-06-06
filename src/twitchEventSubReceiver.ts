import { serve } from "bun";
import { WebhookService } from "./services/webhookService.js";
import { WebSocketService } from "./services/websocketService.js";
import type { Env } from "./config/config.js";

export class TwitchEventSubReceiver {
  private webhookService: WebhookService;
  private websocketService: WebSocketService;
  private server: any;

  constructor(private config: Env) {
    this.webhookService = new WebhookService(config);
    this.websocketService = new WebSocketService(config);
  }

  async start(): Promise<void> {
    // Start webhook server
    // const port = this.config.WEBHOOK_PORT || 3000;
    // this.server = serve({
    //   fetch: this.webhookService.getApp().fetch,
    //   port,
    //   websocket: {
    //     message: () => {}, // Required but not used
    //   },
    // });

    // console.log(`🚀 Webhook server running on http://localhost:${port}`);

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
