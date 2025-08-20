import { MinecraftActionType } from "@/types";
import MinecraftAction from "./handle-minecraft-action-base";
import { TwitchApi } from "@/services/twitchApi";

export class MinecraftJumpscares extends MinecraftAction {
  constructor(broadcaster_id: string, twitchApi: TwitchApi) {
    super(broadcaster_id, twitchApi);
  }

  public async fakeDamage() {
    await this.execute("jumpscare.fake_damage");
  }

  public async fireworks() {
    await this.execute("jumpscare.fireworks");
  }

  public async doorScare() {
    await this.execute("jumpscare.door_scare");
  }
}
