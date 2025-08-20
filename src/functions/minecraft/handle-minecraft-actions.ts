import { MinecraftActionType } from "@/types";
import MinecraftActionBase from "./handle-minecraft-action-base";
import { MinecraftEvents } from "./handle-minecraft-events";
import { TwitchApi } from "@/services/twitchApi";
import { MinecraftJumpscares } from "./handle-minecraft-jumpscares";
import { MinecraftDisasters } from "./handle-minecraft-disasters";

export class MinecraftActions {
  protected minecraftActionBase: MinecraftActionBase;
  public Events: MinecraftEvents;
  public Jumpscares: MinecraftJumpscares;
  public Disasters: MinecraftDisasters;
  
  
  
  constructor(broadcaster_id: string, twitchApi: TwitchApi) {


    
    this.minecraftActionBase = new MinecraftActionBase(broadcaster_id, twitchApi);
    this.Events = new MinecraftEvents(broadcaster_id, twitchApi);
    this.Jumpscares = new MinecraftJumpscares(broadcaster_id, twitchApi);
    this.Disasters = new MinecraftDisasters(broadcaster_id, twitchApi);
    }
}
