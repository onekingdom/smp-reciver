import { ActionEvent, handleAction } from "../handle-action";
import { TwitchApi } from "../../services/twitchApi";
import { MinecraftActions } from "../minecraft/handle-minecraft-actions";

function createMinecraftActions(event: ActionEvent, twitchApi: TwitchApi) {
  return new MinecraftActions(
    {
      broadcaster_user_id: event.broadcaster_user_id,
      broadcaster_username: event.broadcaster_user_name,
      viewer_id: event.chatter_user_id,
      viewer_name: event.chatter_user_name,
    },
    twitchApi
  );
}

export const MinecraftActionHandlers: Record<string, (event: ActionEvent, twitchApi: TwitchApi) => Promise<void>> = {
  launce: async (event, twitchApi) => {
    const mc = createMinecraftActions(event, twitchApi);
    await mc.Events.launcePlayer();
  },
  random_mob_spawn: async (event, twitchApi) => {
    const mc = createMinecraftActions(event, twitchApi);
    await mc.Events.randomMobSpawn();
  },
  fake_damage: async (event, twitchApi) => {
    const mc = createMinecraftActions(event, twitchApi);
    await mc.Jumpscares.fakeDamage();
  },
  fireworks: async (event, twitchApi) => {
    const mc = createMinecraftActions(event, twitchApi);
    await mc.Jumpscares.fireworks();
  },
  door_scare: async (event, twitchApi) => {
    const mc = createMinecraftActions(event, twitchApi);
    await mc.Jumpscares.doorScare();
  },
  supernova: async (event, twitchApi) => {
    const mc = createMinecraftActions(event, twitchApi);
    await mc.Disasters.superNova();
  },
  windstorm: async (event, twitchApi) => {
    const mc = createMinecraftActions(event, twitchApi);
    await mc.Disasters.Windstorm();
  },
  twitch_subscription: async (event, twitchApi) => {
    const mc = createMinecraftActions(event, twitchApi);
    await mc.Events.TwitchSubscriptionAlert(event.metadata);
  },
};
