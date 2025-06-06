type VariableResolver = (ctx: { channelId: string }) => Promise<string>;

const variableResolvers: Record<string, VariableResolver> = {
  follower_count: async ({ channelId }) => {
    // Fetch follower count from Twitch API
    return "123"; // Replace with real logic
  },
  // Add more variables here
};
export async function resolveVariables(template: string, ctx: { channelId: string }) {
  const matches = template.match(/\$\{(\w+)\}/g) || [];
  let result = template;
  
  for (const match of matches) {
    const varName = match.slice(2, -1); // Remove ${...}
    const resolver = variableResolvers[varName];
    const value = resolver ? await resolver(ctx) : '';
    result = result.replace(match, value);
  }

  return result;
}
