import { wsServer } from "@/services/minecraftWebsocketServer";
import { MinecraftActionType } from "@/types";
import { supabase } from "@/utils/supabase";
import { MinecraftActions } from "./handle-minecraft-actions";
import { MinecraftActionsType } from "@/types/websocket";
import { TwitchApi } from "@/services/twitchApi";



class MinecraftActionBase {
  protected broadcaster_username: string;
  protected broadcaster_user_id: string;
  protected viewer_name: string;
  protected viewer_id: string;
  protected twitchApi: TwitchApi;

  constructor(minecraftAction: MinecraftActionType, twitchApi: TwitchApi) {
    this.broadcaster_username = minecraftAction.broadcaster_username;
    this.broadcaster_user_id = minecraftAction.broadcaster_user_id;
    this.viewer_name = minecraftAction.viewer_name;
    this.viewer_id = minecraftAction.viewer_id;
    this.twitchApi = twitchApi;
  }

  async execute(action: MinecraftActionsType, metadata?: Record<string, any>) {
    const minecraft_uuid = await this.getPlayerUUID();

    await wsServer.broadcast({
      action: action,
      player_uuid: minecraft_uuid,
      streamer_name: this.broadcaster_username,
      streamer_id: this.broadcaster_user_id,
      viewer_name: this.viewer_name,
      metadata: metadata,
    });
  }

  private async getPlayerUUID(): Promise<string> {
    const { data, error } = await supabase.rpc("get_minecraft_player_id", {
      input_twitch_user_id: this.broadcaster_user_id,
    });
    if (error) {
      console.error("Error fetching Minecraft UUID:", error);
      // throw new Error("Error fetching Minecraft UUID");
    }

    if (!data) {
      throw new Error("Minecraft UUID not found");
    }

    return data;
  }



  
}

export default MinecraftActionBase;
