import { wsServer } from "@/services/minecraftWebsocketServer";
import { TwitchApi } from "@/services/twitchApi";
import { MinecraftActions } from "./minecraft/handle-minecraft-actions";

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

  switch (event.module) {
    case "minecraft":
      const MinecraftAction = new MinecraftActions(
        {
          broadcaster_user_id: event.broadcaster_user_id,
          broadcaster_username: event.broadcaster_user_name,
          viewer_id: event.chatter_user_id,
          viewer_name: event.chatter_user_name,
        },
        twitchApi
      );
      switch (event.action) {
        case "launce":
          await MinecraftAction.Events.launcePlayer();
          break;

        case "random_mob_spawn":
          await MinecraftAction.Events.randomMobSpawn();
          break;

        case "fake_damage":
          await MinecraftAction.Jumpscares.fakeDamage();
          break;

        case "fireworks":
          await MinecraftAction.Jumpscares.fireworks();
          break;

        case "door_scare":
          await MinecraftAction.Jumpscares.doorScare();
          break;

        case "supernova":
          await MinecraftAction.Disasters.superNova();
          break;

        case "windstorm":
          await MinecraftAction.Disasters.Windstorm();
          break;

        case "twitch_subscription":
          await MinecraftAction.Events.TwitchSubscriptionAlert(event.metadata);
          break;

        default:
          console.log("No action found");
          break;
      }
      break;
  }
}
