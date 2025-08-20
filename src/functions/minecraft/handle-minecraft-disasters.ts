import { MinecraftActionType } from "@/types";
import { TwitchApi } from "@/services/twitchApi";
import MinecraftAction from "./handle-minecraft-action-base";
import { SupernovaMetadata, WindStormMetadata } from "@/types/websocket";

export class MinecraftDisasters extends MinecraftAction {
  constructor(broadcaster_id: string, twitchApi: TwitchApi) {
    super(broadcaster_id, twitchApi);
  }

  public async superNova(metadata: SupernovaMetadata) {
    await this.execute("disaster.supernova", {
      level: metadata.level,
      viewer_name: metadata.viewer_name,
    });
  }

  public async Windstorm() {
    await this.execute("disaster.windstorm", {
      force: 0.1,
      duration: 10,
      level: 1,
    } as WindStormMetadata);
  }
}
