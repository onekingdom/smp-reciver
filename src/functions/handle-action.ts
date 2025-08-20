import { TwitchApi } from "@/services/twitchApi";
import { MinecraftActions } from "./minecraft/handle-minecraft-actions";
import { MinecraftActionHandlers } from "./actions/minecraft-actions";
import { TwitchActionHandlers } from "./actions/twitch-actions";
import customLogger from "@/lib/logger";

export interface ActionEvent {
  action: string;
  module: string;
  context: Record<string, any>;
  currentActionContext: any;
  results: Record<string, any>;
}

export type ActionHandler = (event: ActionEvent, twitchApi: TwitchApi, wsServer?: MinecraftActions,) => Promise<void>;

// Namespaced registry similar to variable resolvers
const ActionRegistry: Record<string, Record<string, ActionHandler>> = {
  minecraft: MinecraftActionHandlers,
  twitch: TwitchActionHandlers,
};

export async function handleAction(action: ActionEvent, twitchApi: TwitchApi, broadcaster_id: string) {
  const moduleHandlers = ActionRegistry[action.module];
  if (!moduleHandlers) {
    console.log(`No module registered for '${action.module}'`);
    return;
  }
  const handler = moduleHandlers[action.action];
  if (!handler) {
    console.log(`No action handler for '${action.module} + ${action.action}'`);
    return;
  }

  if(action.module === "minecraft") {
    customLogger.info(`Handling Minecraft action: ${action.action}`);
    const minecraftActionBase = new MinecraftActions(broadcaster_id, twitchApi);
    return await handler(action, twitchApi, minecraftActionBase);
  }

  const result = await handler(action, twitchApi);
  return result;
}
