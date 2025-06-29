import { MinecraftActionType } from "@/types";
import MinecraftAction from "./handle-minecraft-action-base";
import { TwitchApi } from "@/services/twitchApi";
import { TwitchSubscriptionMetadata } from "@/types/websocket";

export class MinecraftEvents extends MinecraftAction {
  constructor(minecraftAction: MinecraftActionType, twitchApi: TwitchApi) {
    super(minecraftAction, twitchApi);
  }

  public async launcePlayer() {
    await this.execute("event.launce");
  }

  public async randomMobSpawn() {
    const viewers = await this.twitchApi.chat.getViewers();

    const disabled_viewers = ["onekingdombot", "streamelements", "streamlabs", "nightbot", "modbot", "Fossabot", "PhantomBot"];

    const viewer_list: string[] = viewers
      ?.filter((viewer) => !disabled_viewers.map((v) => v.toLowerCase()).includes(viewer.user_name.toLowerCase()))
      .map((viewer) => viewer.user_name) || ["unknown"];
    await this.execute("event.random_mob_spawn", {
      viewer_list: viewer_list,
      mob_list: ["zombie", "skeleton", "creeper"],
      amount: 10,
    });
  }

  public async TwitchSubscriptionAlert(metadata: TwitchSubscriptionMetadata) {
    await this.execute("event.twitch_subscription", metadata);
  }
}
