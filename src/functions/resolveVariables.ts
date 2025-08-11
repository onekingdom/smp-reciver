import type { z } from "zod";
import type { ChatMessageSchema } from "@/schema/twitch-schema";
import type { TwitchApi } from "@/services/twitchApi";

type VariableResolver = (ctx: { twitchApi: TwitchApi; event: z.infer<typeof ChatMessageSchema> }) => Promise<string>;

const TwitchVariableResolvers: Record<string, VariableResolver> = {
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

// Registry of namespaced resolvers. Key is namespace (e.g., "twitch").
const ResolverRegistry: Record<string, Record<string, VariableResolver>> = {
  twitch: TwitchVariableResolvers,
  // youtube: YouTubeVariableResolvers, // Future
};

export async function resolveVariables(
  template: string,
  ctx: { twitchApi: TwitchApi; event: z.infer<typeof ChatMessageSchema> }
) {
  // Support variable names with dots for namespacing, e.g., ${twitch.subscriber_count}
  const matches = template.match(/\$\{([\w\.-]+)\}/g) || [];
  let result = template;

  for (const match of matches) {
    const raw = match.slice(2, -1); // Remove ${...}

    // Determine namespace and key. If none provided, default to 'twitch'
    const hasNamespace = raw.includes(".");
    const [namespace, key] = hasNamespace ? (raw.split(".", 2) as [string, string]) : ["twitch", raw];

    const namespaceResolvers = ResolverRegistry[namespace];
    const resolver = namespaceResolvers ? namespaceResolvers[key] : undefined;
    const value = resolver ? await resolver(ctx) : "";
    result = result.replace(match, value);
  }

  return result;
}
