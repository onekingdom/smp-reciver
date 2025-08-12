import type { HandlerRegistry } from "./eventHandler";
import * as TwitchSchema from "../schema/twitch-schema";
import { handleChatMessage } from "../functions/eventsub/handle-chat-message";
import { logTwitchEvent } from "@/lib/supabase";
import { handleSubscribe } from "@/functions/eventsub/handle-subscribe";

export const registerTwitchHandlers = (handlers: HandlerRegistry) => {
  // stream online
  handlers.registerTwitchHandler("stream.online", async (event) => {}, TwitchSchema.StreamOnlineSchema);

  // stream offline
  handlers.registerTwitchHandler("stream.offline", async (event) => {}, TwitchSchema.StreamOfflineSchema);

  // follower
  handlers.registerTwitchHandler(
    "channel.follow",
    async (event) => {
      // wsServer.broadcast({
      //   action: "somethingInside",
      //   player_uuid: "82e95e4f-1bb4-4d84-93be-c94d73151661",
      //   streamer_name: event.broadcaster_user_name,
      //   streamer_id: event.broadcaster_user_id,
      //   viewer_name: event.user_name,
      // } as RedemptionData);
    },
    TwitchSchema.ChannelFollowSchema
  );

  // subscriber
  handlers.registerTwitchHandler(
    "channel.subscribe",
    async (event, twitchApi) => {
      await handleSubscribe(event, twitchApi);
    },
    TwitchSchema.SubscriptionEventSchema
  );
  handlers.registerTwitchHandler("channel.subscription.gift", async (event) => {}, TwitchSchema.SubscriptionGiftSchema);

  // raid
  handlers.registerTwitchHandler("channel.raid", async (event) => {}, TwitchSchema.ChannelRaidSchema);

  // channelPoints
  handlers.registerTwitchHandler(
    "channel.channel_points_custom_reward_redemption.add",
    async (event) => {},
    TwitchSchema.ChannelPointsCustomRewardRedemptionAddSchema
  );

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
