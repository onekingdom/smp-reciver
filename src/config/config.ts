import { z } from "zod";

const twitchConfigSchema = z.object({
  TWITCH_CONDUIT_ID: z.string().min(1, "TWITCH_CONDUIT_ID is required"),
  TWITCH_CLIENT_ID: z.string().min(1, "TWITCH_CLIENT_ID is required"),
  TWITCH_CLIENT_SECRET: z.string().min(1, "TWITCH_CLIENT_SECRET is required"),
  TWITCH_WEBHOOK_SECRET: z.string().min(1, "TWITCH_WEBHOOK_SECRET is required"),
  WEBHOOK_PORT: z.string().min(1, "WEBHOOK_PORT is required"),
  SUPABASE_URL: z.string().url("SUPABASE_URL must be a valid URL"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  NODE_ENV: z.enum(["development", "production"]).default("development"),
});

const result = twitchConfigSchema.safeParse(process.env);

if (!result.success) {
  const errors = result.error.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join("\n");
  throw new Error(`Configuration validation failed:\n${errors}`);
}

export const env = result.data;
export type Env = z.infer<typeof twitchConfigSchema>;
