import { HandlerRegistry, handlers } from "@/handlers/eventHandler";
import { MinecraftRedemptionData } from "@/types/websocket";
import type { ServerWebSocket } from "bun";

export class BunWebSocketServer {
  private server!: ReturnType<typeof Bun.serve>;
  private clients = new Map<ServerWebSocket<{ createdAt: number }>, { createdAt: number }>();
  private readonly MAX_MESSAGE_SIZE = 1024 * 1024;

  constructor(private handlerRegistry: HandlerRegistry) {}

  start(): void {
    console.log("Starting server");
    this.server = Bun.serve<{ createdAt: number }, { }>({
      hostname: "0.0.0.0",
      port: 8888,

      fetch: (req, server) => {
        console.log("Fetching");
        if (!server.upgrade(req, { data: { createdAt: Date.now() } })) {
          return new Response("WebSocket upgrade failed", {
            status: 400,
            headers: { "Content-Security-Policy": "default-src 'none'" },
          });
        }
        return undefined;
      },

      websocket: {
        maxPayloadLength: this.MAX_MESSAGE_SIZE,
        idleTimeout: 60,

        open: (ws) => {
          console.log("Open");
          this.clients.set(ws, ws.data);
        },

        message: async (ws, message) => {
          try {
            console.log("Message");
            const parsed = this.parseMessage(message.toString());
            await this.handleMessage(ws, parsed);
          } catch (error) {
            this.handleError(ws, error);
          }
        },

        close: (ws) => {
          this.clients.delete(ws);
        },

        drain: (ws) => {},

        ping: (ws, data) => {
          ws.pong(data.toString());
        },
      },
    });
  }

  private parseMessage(message: string | Uint8Array) {
    const text = typeof message === "string" ? message : new TextDecoder().decode(message);

    if (text.length > this.MAX_MESSAGE_SIZE) {
      throw new Error("Message size exceeds limit");
    }

    return JSON.parse(text);
  }

  private async handleMessage(ws: ServerWebSocket<{ createdAt: number }>, message: any): Promise<void> {
    try {
      const handler = this.handlerRegistry.getHandler(message.event_type);
      if (!handler) {
        console.log("No handler for type: ", message.event_type);
        throw new Error(`No handler for type: ${message.event}`);
      }

      const response = await handler(message);
    } catch (error) {
      this.handleError(ws, error);
    }
  }

  private handleError(ws: ServerWebSocket<{ createdAt: number }>, error: unknown): void {
    const message = error instanceof Error ? error.message : "Invalid message";
    console.log(message);
  }

  broadcast(message: MinecraftRedemptionData<unknown>, filter?: (ws: ServerWebSocket<{ createdAt: number }>) => boolean): void {
    const payload = JSON.stringify(message);

    this.clients.forEach((_, ws) => {
      if (ws.readyState === WebSocket.OPEN && (!filter || filter(ws))) {
        ws.send(payload);
      }
    });
  }

  async stop(): Promise<void> {
    await Promise.race([
      Promise.all(
        Array.from(this.clients.keys()).map(
          (ws) =>
            new Promise<void>((resolve) => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.close(1001, "Server maintenance");
                resolve();
              } else {
                resolve();
              }
            })
        )
      ),
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);

    this.server.stop(true);
    console.log("Server stopped gracefully");
  }
}

export const wsServer = new BunWebSocketServer(handlers);