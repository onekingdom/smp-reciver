import { env } from "@/utils/env";
import { TwitchApi } from "@/services/twitchApi";
import { z } from "zod";
import { getCommand } from "../../lib/supabase";
import { ChatMessageSchema } from "../../schema/twitch-schema";
import { handleAction } from "../handle-action";
import { checkCommandCooldowns } from "../command/checkCooldown";

export async function handleChatMessage(event: z.infer<typeof ChatMessageSchema>, twitchApi: TwitchApi) {
  const { broadcaster_user_id, broadcaster_user_name, chatter_user_id, chatter_user_name, message, message_id } = event;

  if (env.NODE_ENV === "development") {
    console.log(`[${broadcaster_user_name}] ${chatter_user_name}: ${message.text}`);
  }

  if (!message.text.startsWith("!")) return;

  const [trigger, ...args] = message.text.split(" ");

  // Fetch and execute command
  const command = await getCommand(broadcaster_user_id, trigger);
  if (!command) {
    return;
  }

  if (command.command_cooldowns && command.command_cooldowns.length > 0) {
    const cooldownResult = await checkCommandCooldowns(
      command.id,
      chatter_user_id,
      command.command_cooldowns.map((cd) => ({
        type: cd.type as "user" | "global",
        duration_seconds: cd.duration_seconds,
      })),
      command.commands_active_cooldowns || []
    );

    if (!cooldownResult.allowed) {
      const remainingSeconds = Math.ceil(cooldownResult.blockedBy!.remainingTime / 1000);
      const cooldownType = cooldownResult.blockedBy!.type === "global" ? "globally" : "for you";

      await twitchApi.chat.sendMessage({
        message: `Command is on cooldown ${cooldownType}. Please wait ${remainingSeconds} seconds.`,
        replyToMessageId: message_id,
      });
      return;
    }

    if (command.response) {
      await twitchApi.chat.sendMessage({ message: command.response, replyToMessageId: message_id });
    }

    if (command.actions) {
      await handleAction(
        {
          action: command.actions.action,
          module: command.actions.module,
          metadata: command.actions.metadata as Record<string, any>,
          broadcaster_user_id,
          broadcaster_user_name,
          chatter_user_id,
          chatter_user_name,
          message: message.text,
        },
        twitchApi
      );
    }
  }
}
