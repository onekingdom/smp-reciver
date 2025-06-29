import { MinecraftActionType } from "@/types";
import MinecraftActionBase from "./handle-minecraft-action-base";
import { MinecraftEvents } from "./handle-minecraft-events";
import { TwitchApi } from "@/services/twitchApi";
import { MinecraftJumpscares } from "./handle-minecraft-jumpscares";
import { MinecraftDisasters } from "./handle-minecraft-disasters";

export class MinecraftActions {
  public minecraftActionBase: MinecraftActionBase;
  public Events: MinecraftEvents;
  public Jumpscares: MinecraftJumpscares;
  public Disasters: MinecraftDisasters;
  constructor(minecraftAction: MinecraftActionType, twitchApi: TwitchApi) {
    this.minecraftActionBase = new MinecraftActionBase(minecraftAction, twitchApi);
    this.Events = new MinecraftEvents(minecraftAction, twitchApi);
    this.Jumpscares = new MinecraftJumpscares(minecraftAction, twitchApi);
    this.Disasters = new MinecraftDisasters(minecraftAction, twitchApi);
    }
}
