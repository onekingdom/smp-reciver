import { wsServer } from "@/services/minecraftWebsocketServer";
import { TwitchApi } from "@/services/twitchApi";
import { MinecraftActions } from "./minecraft/handle-minecraft-actions";
import { MinecraftActionHandlers } from "./actions/minecraft-actions";
import { TwitchActionHandlers } from "./actions/twitch-actions";

export interface ActionEvent {
  action: string;
  module: string;
  context: Record<string, any>;
  currentActionContext: any;
  results: Record<string, any>;
}

export type ActionHandler = (event: ActionEvent, twitchApi: TwitchApi) => Promise<void>;

// Namespaced registry similar to variable resolvers
const ActionRegistry: Record<string, Record<string, ActionHandler>> = {
  minecraft: MinecraftActionHandlers,
  twitch: TwitchActionHandlers,
};

export async function handleAction(action: ActionEvent, twitchApi: TwitchApi) {
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

  const result = await handler(action, twitchApi);
  return result;
}
