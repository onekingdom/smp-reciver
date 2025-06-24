import { wsServer } from "@/services/minecraftWebsocketServer";
import { TwitchApi } from "@/services/twitchApi";
import MinecraftAction from "./minecraft/handle-minecraft-action";

interface ActionEvent {
  broadcaster_user_id: string;
  broadcaster_user_name: string;
  chatter_user_id: string;
  chatter_user_name: string;
  message?: string;
  action: string;
  module: string;
  metadata: Record<string, any>;
}

export async function handleAction(event: ActionEvent, twitchApi: TwitchApi) {
  const { broadcaster_user_id, broadcaster_user_name, chatter_user_id, chatter_user_name, message } = event;

  console.log(event);

  switch (event.module) {
    case "minecraft":
      const minecraftAction = new MinecraftAction({
        broadcaster_user_id: event.broadcaster_user_id,
        broadcaster_username: event.broadcaster_user_name,
        viewer_id: event.chatter_user_id,
        viewer_name: event.chatter_user_name,
      });
      switch (event.action) {
        case "jump":
          await minecraftAction.launcePlayer();
          break;
      }
      break;
  }
}
