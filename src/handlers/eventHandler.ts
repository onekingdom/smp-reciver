import type { EventSubNotification, subscription_type } from "../types/twitch";
// import type { IncommingMessageType } from "../types/websocket";
import { z } from "zod";
import { registerTwitchHandlers } from "./twitch";
import { TwitchApi } from "@/services/twitchApi";
import { supabase } from "@/utils/supabase";
import { handleWorkflow } from "@/functions/handle-workflow";

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

    const broadcasterId = data.payload.event.broadcaster_user_id;

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

    
    if (eventType === "channel.chat.message") return;

    // check for workflow trigger
    const { data: workflowData, error } = await supabase
      .from("workflow_triggers")
      .select("*, workflows(*, workflow_actions(*))")
      .eq("twitch_user_id", broadcasterId)
      .eq("event", eventType);

    if (error) {
      console.log(error);
      return;
    }


    if (workflowData && workflowData.length > 0) {
      await handleWorkflow(workflowData, twitchApi, data.payload.event);
    }
  }
}

export const handlers = new HandlerRegistry();
