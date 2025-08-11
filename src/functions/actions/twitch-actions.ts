import { ActionEvent, handleAction } from "../handle-action";
import { TwitchApi } from "../../services/twitchApi";
import { MinecraftActions } from "../minecraft/handle-minecraft-actions";
import { resolveVariables } from "../resolveVariables";

export const TwitchActionHandlers: Record<string, (event: ActionEvent, twitchApi: TwitchApi) => Promise<any>> = {
  create_marker: async (event, twitchApi) => {
    const description = event.currentActionContext.description;

    const marker = await twitchApi.markers.createMarker();
    return marker.data;
  },

  send_chat_message: async (event, twitchApi) => {
    const message = event.currentActionContext.message;

    console.log(event.results);

    const messageResponse = await twitchApi.chat.sendMessage({
      message,
    });

    return messageResponse;
  },
};
