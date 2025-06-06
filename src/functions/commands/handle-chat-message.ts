import { z } from "zod";
import { getCommand, addCommand } from "../../lib/supabase";
import { resolveVariables } from "../resolveVariables";
import { ChatMessageSchema } from "../../schema/twitch-schema";
import { TwitchChatClient } from "../../services/twitch/chat";

export async function handleChatMessage(event: z.infer<typeof ChatMessageSchema>) {
  const { broadcaster_user_id, broadcaster_user_name, chatter_user_id, chatter_user_name, message } = event;
  if (!message.text.startsWith("!")) return;

  const [trigger, ...args] = message.text.split(" ");
  // Handle !addcommand
  // if (trigger === "!addcommand" && is_mod) {
  //   const [cmd, ...respArr] = args;
  //   const resp = respArr.join(" ");
  //   await addCommand(channel_id, cmd, resp, user_name);
  //   // send chat: "Command added!"
  //   return;
  // }

  // Fetch and execute command
  const command = await getCommand(broadcaster_user_id, trigger);
  if (command) {
    const response = await resolveVariables(command.response, { channelId: broadcaster_user_id });
    await twitchChatClient.sendMessage(response, broadcaster_user_id, message.id);
  }
}