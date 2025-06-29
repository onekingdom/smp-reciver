import { MinecraftActionType } from "@/types";
import { TwitchApi } from "@/services/twitchApi";
import MinecraftAction from "./handle-minecraft-action-base";
import { WindStormMetadata } from "@/types/websocket";

export class MinecraftDisasters extends MinecraftAction {
  constructor(minecraftAction: MinecraftActionType, twitchApi: TwitchApi) {
    super(minecraftAction, twitchApi);
  }

  public async superNova() {
    await this.execute("disaster.supernova", {
      level: 10,
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
