import type { TwitchApi } from "@/services/twitchApi";
import TwitchVariableResolvers from "./variables/twitch";
import { GlobalVariableResolvers } from "./variables/global";

type TwitchContext = { twitchApi: TwitchApi; event: any };
type TwitchVariableResolver = (ctx: TwitchContext) => Promise<string>;
type GlobalVariableResolver = () => Promise<string>;

const TwitchResolvers = TwitchVariableResolvers as Record<string, TwitchVariableResolver>;
const GlobalResolvers = GlobalVariableResolvers as Record<string, GlobalVariableResolver>;

export async function resolveVariables(template: string, ctx?: TwitchContext) {
  // Support variable names with dots for namespacing, e.g., ${twitch.subscriber_count}
  const matches = template.match(/\$\{([\w\.-]+)\}/g) || [];
  let result = template;

  for (const match of matches) {
    const raw = match.slice(2, -1); // Remove ${...}

    // Determine namespace and key. If none provided, default to 'twitch'
    const hasNamespace = raw.includes(".");
    const [namespace, key] = hasNamespace ? (raw.split(".", 2) as [string, string]) : ["twitch", raw];

    let value = "";
    if (namespace === "global") {
      const resolver = GlobalResolvers[key];
      value = resolver ? await resolver() : "";
    } else if (namespace === "twitch") {
      const resolver = TwitchResolvers[key];
      if (!resolver) {
        value = "";
      } else {
        if (!ctx || !ctx.twitchApi) {
          throw new Error(`Twitch context is required for variable: ${match}`);
        }
        value = await resolver(ctx);
      }
    } else {
      // Unknown namespace – leave blank for now
      value = "";
    }
    result = result.replace(match, value);
  }

  return result;
}
