import { supabase } from "@/utils/supabase";
import type { Database } from "@/types/supabase";
import type { z } from "zod";
import type { ChatMessageSchema } from "@/schema/twitch-schema";
import { TwitchApi } from "@/services/twitchApi";

export type CommandPermissionRow = Database["public"]["Tables"]["command_permissions"]["Row"];

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

export async function checkPermission(
  userId: string,
  broadcasterId: string,
  commandPermissions: CommandPermissionRow[] | null | undefined,
  event?: z.infer<typeof ChatMessageSchema>,
  twitchApi?: TwitchApi
): Promise<PermissionCheckResult> {
  // Broadcaster always allowed
  if (userId === broadcasterId) return { allowed: true };

  // If no permissions configured, allow everyone
  if (!commandPermissions || commandPermissions.length === 0) return { allowed: true };

  const requiredRoles = commandPermissions.map((p) => (p.role || "").toLowerCase());
  if (requiredRoles.includes("everyone")) return { allowed: true };

  // Twitch chatter role evaluation from badges/message
  const chatterRoles = new Set<string>();

  if (event) {
    // badges contain set_id like 'broadcaster', 'moderator', 'vip', 'subscriber'
    const badgeSetIds = new Set((event.badges ?? []).map((b) => b.set_id.toLowerCase()));
    if (badgeSetIds.has("broadcaster")) chatterRoles.add("broadcaster");
    if (badgeSetIds.has("moderator")) chatterRoles.add("moderator");
    if (badgeSetIds.has("vip")) chatterRoles.add("vip");
    if (badgeSetIds.has("subscriber")) chatterRoles.add("subscriber");
    if (badgeSetIds.has("founder")) chatterRoles.add("founder");
  }

  // Follower requires API check (not in badges)
  if (requiredRoles.includes("follower") && twitchApi) {
    const isFollower = await twitchApi.followers.isFollower(userId);
    if (isFollower) chatterRoles.add("follower");
  }

  // Immediate allow if any required role matches chatter roles
  const hasTwitchRole = requiredRoles.some((r) => chatterRoles.has(r));
  if (hasTwitchRole) return { allowed: true };

  // Optional: also support DB roles if you still want them
  // const { data, error } = await supabase.rpc("get_user_roles", { p_user_id: userId });
  // if (!error && data) {
  //   const dbRoles = new Set((data ?? []).map((r: any) => String(r.role_name).toLowerCase()));
  //   if (requiredRoles.some((r) => dbRoles.has(r))) return { allowed: true };
  // }

  const uniqueRequired = Array.from(new Set(requiredRoles));
  return {
    allowed: false,
    reason: `You don't have permission. Required: ${uniqueRequired.join(", ")}`,
  };
}
