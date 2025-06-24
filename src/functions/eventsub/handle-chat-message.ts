import { env } from "@/config/config";
import { TwitchApi } from "@/services/twitchApi";
import { z } from "zod";
import { getCommand } from "../../lib/supabase";
import { ChatMessageSchema } from "../../schema/twitch-schema";
import { handleAction } from "../handle-action";

export async function handleChatMessage(event: z.infer<typeof ChatMessageSchema>, twitchApi: TwitchApi) {
  const { broadcaster_user_id, broadcaster_user_name, chatter_user_id, chatter_user_name, message } = event;

  if (env.NODE_ENV === "development") {
    console.log(`[${broadcaster_user_name}] ${chatter_user_name}: ${message.text}`);
  }

  if (!message.text.startsWith("!")) return;

  const [trigger, ...args] = message.text.split(" ");

  // Fetch and execute command
  const command = await getCommand(broadcaster_user_id, trigger);

  

  if (!command) return;

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
