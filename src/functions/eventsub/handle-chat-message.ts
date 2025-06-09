import { z } from "zod";
import { getCommand, addCommand } from "../../lib/supabase";
import { resolveVariables } from "../resolveVariables";
import { ChatMessageSchema } from "../../schema/twitch-schema";
import { TwitchChatClient } from "../../services/twitch/chat";
import { env } from "@/config/config";
import { TwitchApi } from "@/services/twitchApi";

export async function handleChatMessage(event: z.infer<typeof ChatMessageSchema>, twitchApi: TwitchApi) {
  const { broadcaster_user_id, broadcaster_user_name, chatter_user_id, chatter_user_name, message } = event;

  if(env.NODE_ENV === "development") {
    console.log(`[${broadcaster_user_name}] ${chatter_user_name}: ${message.text}`);
  }


  if (!message.text.startsWith("!")) return;

  const [trigger, ...args] = message.text.split(" ");
 

  // Fetch and execute command
  const command = await getCommand(broadcaster_user_id, trigger);

  if (command) {
    
  }

  await twitchApi.chat.sendMessage("Hello, world!", broadcaster_user_id);

 
}