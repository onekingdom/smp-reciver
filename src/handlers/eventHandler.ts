import type { EventSubNotification, subscription_type } from "../types/twitch";
// import type { IncommingMessageType } from "../types/websocket";
import { z } from "zod";
import { registerTwitchHandlers } from "./twitch";
import { TwitchApi } from "@/services/twitchApi";

export class HandlerRegistry {
  private twitchHandlers = new Map<string, (data: unknown, twitchApi: TwitchApi) => Promise<void>>();
  private clientHandlers = new Map<string, (data: unknown) => Promise<unknown>>();

  constructor() {
    registerTwitchHandlers(this);
  }

  // Register Twitch EventSub handler
  registerTwitchHandler<T = unknown>(eventType: subscription_type, handler: (data: T, twitchApi: TwitchApi) => Promise<void>, schema?: z.ZodType<T>) {
    this.twitchHandlers.set(eventType, async (data: unknown, twitchApi: TwitchApi) => {
      try {
        const parsedData = schema ? schema.parse(data) : data;
        await handler(parsedData as T, twitchApi);
      } catch (error) {
        console.log(error);
      }
    });
  }

  // Get client handler for WebSocket server
  getHandler(type: string): ((data: unknown) => Promise<unknown>) | undefined {
    return this.clientHandlers.get(type);
  }

  // Process Twitch EventSub events
  async processTwitchEvent(eventType: subscription_type, data: EventSubNotification): Promise<void> {
    const twitchApi = new TwitchApi(data.payload.event.broadcaster_user_id);

    const handler = this.twitchHandlers.get(eventType);

    if (!handler) {
      console.log("No handler found for event type:", eventType);
      return;
    }

    try {
      await handler(data.payload.event, twitchApi);
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}

export const handlers = new HandlerRegistry();
