import { TwitchApi } from "@/services/twitchApi";
import { env } from "@/utils/env";
import { SubscriptionEventSchema } from "@/schema/twitch-schema";
import { z } from "zod";
import { handleAction } from "../handle-action";

export async function handleSubscribe(event: z.infer<typeof SubscriptionEventSchema>, twitchApi: TwitchApi) {
  console.log(event);
      await handleAction({
        action: "twitch_subscription",
        module: "minecraft",
        metadata: {
          subscriber_name: event.user_name,
          tier: event.tier,
          duration: 5,
          fireworks: 5,
          intensity: "normal",
          show_chat: true,
          show_title: true,
          broadcast: false,
          message: `Thank you ${event.user_name} for subscribing!`,
          volume: 1,
        },
        broadcaster_user_id: event.broadcaster_user_id,
        broadcaster_user_name: event.broadcaster_user_name,
        chatter_user_id: event.user_id,
        chatter_user_name: event.user_name,
      }, twitchApi);
  
}