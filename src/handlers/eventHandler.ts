// src/lib/handlers/index.ts
import type { EventSubNotification, subscription_type } from "../types/twitch";
// import type { IncommingMessageType } from "../types/websocket";
import { z } from "zod";
import { registerTwitchHandlers } from "./twitch";
import { TwitchApiService } from "@/services/twitchApi";

export class HandlerRegistry {
  private twitchHandlers = new Map<string, (data: unknown) => Promise<void>>();
  private clientHandlers = new Map<string, (data: unknown) => Promise<unknown>>();

  private twitchApiService: TwitchApiService;

  constructor(broadcaster_id: string | null = null) {
    registerTwitchHandlers(this);
    this.twitchApiService = new TwitchApiService(broadcaster_id);
  }

  // Register Twitch EventSub handler
  registerTwitchHandler<T = unknown>(eventType: subscription_type, handler: (data: T) => Promise<void>, schema?: z.ZodType<T>) {
    this.twitchHandlers.set(eventType, async (data: unknown) => {
      try {
        const parsedData = schema ? schema.parse(data) : data;
        await handler(parsedData as T);
      } catch (error) {
        console.log(error)
        // logger.error(`Twitch handler failed for ${eventType}`, error as Error);
      }
    });
  }

  // Register WebSocket client handler
  // registerClientHandler<T = unknown, R = unknown>(eventType: IncommingMessageType, handler: (data: T) => Promise<R>, schema?: z.ZodType<T>) {
  //   this.clientHandlers.set(eventType, async (data: unknown) => {
  //     try {
  //       const parsedData = schema ? schema.parse(data) : data;

  //       return await handler(parsedData as T);
  //     } catch (error) {
  //       console.log(error);
  //       // logger.error(`Client handler failed for ${eventType}`, error as Error);
  //       throw error;
  //     }
  //   });
  // }

  // Get client handler for WebSocket server
  getHandler(type: string): ((data: unknown) => Promise<unknown>) | undefined {
    return this.clientHandlers.get(type);
  }

  // Process Twitch EventSub events
  async processTwitchEvent(eventType: string, data: EventSubNotification): Promise<void> {

    const handler = this.twitchHandlers.get(eventType);

    if (!handler) {
      console.log("No handler found for event type:", eventType);
      return;
    }

    try {
      console.log(`Processing event type: ${eventType}`);
      await handler(data.payload.event);
    } catch (error) {
      throw error;
    }
  }
}

