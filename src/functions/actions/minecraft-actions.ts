import { ActionEvent, handleAction } from "../handle-action";
import { TwitchApi } from "../../services/twitchApi";
import { MinecraftActions } from "../minecraft/handle-minecraft-actions";
import MinecraftActionBase from "../minecraft/handle-minecraft-action-base";
import { RandomMobSpawnMetadata, SupernovaMetadata, TwitchSubscriptionMetadata } from "@/types/websocket";
import { resolveVariables, resolveObjectValues } from "../resolveVariables";



export const MinecraftActionHandlers: Record<string, (event: ActionEvent, twitchApi: TwitchApi, mc?: MinecraftActions) => Promise<void>> = {
  launce: async (event, twitchApi, mc) => {

    await mc?.Events.launcePlayer();
  },
  spawn_mobs: async (event, twitchApi, mc) => {

    const metadata = await resolveObjectValues(event.currentActionContext, {twitchApi: twitchApi}, event.results) as RandomMobSpawnMetadata;
    
    console.log("After resolving:", metadata);

    await mc?.Events.randomMobSpawn(metadata);
  },
  fake_damage: async (event, twitchApi, mc) => {
    await mc?.Jumpscares.fakeDamage();
  },
  fireworks: async (event, twitchApi, mc) => {
    await mc?.Jumpscares.fireworks();
  },
  door_scare: async (event, twitchApi, mc) => {
    await mc?.Jumpscares.doorScare();
  },
  supernova: async (event, twitchApi, mc) => {

    const metadata = await resolveObjectValues(event.currentActionContext, {twitchApi: twitchApi}, event.results) as SupernovaMetadata;

    await mc?.Disasters.superNova(metadata);
  },
  windstorm: async (event, twitchApi, mc) => {
    await mc?.Disasters.Windstorm();
  },
  twitch_subscription: async (event, twitchApi, mc) => {
    const metadata = await resolveObjectValues(event.currentActionContext, {twitchApi: twitchApi}, event.results) as TwitchSubscriptionMetadata;

    await mc?.Events.TwitchSubscriptionAlert(metadata);
  },
};
