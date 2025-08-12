import { TwitchApi } from "@/services/twitchApi";

const TwitchVariableResolvers: Record<string, (ctx: { twitchApi: TwitchApi; event: any }) => Promise<string>> = {
  follower_count: async ({ twitchApi }) => {
    const count = await twitchApi.followers.getFollowerCount();
    return String(count ?? 0);
  },
  follow_age: async ({ twitchApi, event }) => {
    const info = await twitchApi.followers.getFollowInfo(event.chatter_user_id);
    if (!info) return "";
    const followedAt = new Date(info.followed_at).getTime();
    const now = Date.now();
    const deltaMs = Math.max(0, now - followedAt);
    // Simple humanizer: days
    const days = Math.floor(deltaMs / (1000 * 60 * 60 * 24));
    if (days <= 0) return "today";
    if (days === 1) return "1 day";
    return `${days} days`;
  },

  username: async ({ event }) => {
    return event.chatter_user_name;
  },

  user_id: async ({ event }) => {
    return event.chatter_user_id;
  },

  broadcaster_name: async ({ event }) => {
    return event.broadcaster_user_name;
  },

  broadcaster_id: async ({ event }) => {
    return event.broadcaster_user_id;
  },

  subscriber_count: async ({ twitchApi, event }) => {
    const count = await twitchApi.subscriptions.getSubscriberCount();
    return String(count ?? 0);
  },
};



export default TwitchVariableResolvers;