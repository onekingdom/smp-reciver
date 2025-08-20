import type { HandlerRegistry } from "./eventHandler";
import * as TwitchSchema from "../schema/twitch-schema";
import { handleChatMessage } from "../functions/eventsub/handle-chat-message";
import { logTwitchEvent } from "@/lib/supabase";
import { handleSubscribe } from "@/functions/eventsub/handle-subscribe";
import { wsServer } from "@/services/minecraftWebsocketServer";
import { TwitchSubscriptionMetadata } from "@/types/websocket";

export const registerTwitchHandlers = (handlers: HandlerRegistry) => {




  // chat message
  handlers.registerTwitchHandler(
    "channel.chat.message",
    async (event, twitchApi) => {
      await handleChatMessage(event, twitchApi);
    },
    TwitchSchema.ChatMessageSchema
  );

  // channel points redemption
  handlers.registerTwitchHandler(
    "channel.channel_points_custom_reward_redemption.update",
    async (event) => {
      // console.log(event);
    },
    TwitchSchema.ChannelPointsCustomRewardRedemptionAddSchema
  );
};
