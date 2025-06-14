import { createClient } from "@supabase/supabase-js";
import { env } from "../config/config.js";
import axios from "axios";
import type { Database } from "../types/supabase";
import { supabase } from "../utils/supabase";
import { subscription_type } from "@/types/twitch.js";

export type TwitchIntegration = Database["public"]["Tables"]["twitch_integration"]["Row"] & {
  scopes?: string[];
};

export async function getTwitchIntegration(channelId: string): Promise<TwitchIntegration | null> {
  const { data, error } = await supabase.from("twitch_integration").select("*").eq("twitch_user_id", channelId).single();

  if (error) {
    console.error("Error fetching Twitch integration:", error);
    return null;
  }

  return data;
}

export async function refreshTwitchToken(channelId: string): Promise<TwitchIntegration | null> {
  // Get current integration to get refresh token
  const integration = await getTwitchIntegration(channelId);
  if (!integration) {
    return null;
  }

  try {
    // Request new token from Twitch
    const response = await axios.post("https://id.twitch.tv/oauth2/token", null, {
      params: {
        grant_type: "refresh_token",
        refresh_token: integration.refresh_token,
        client_id: env.TWITCH_CLIENT_ID,
        client_secret: env.TWITCH_CLIENT_SECRET,
      },
    });

    const { access_token, refresh_token, expires_in } = response.data;
    const expires_at = new Date(Date.now() + expires_in * 1000).toISOString();

    // Update in database
    const { data, error } = await supabase
      .from("twitch_integration")
      .update({
        access_token,
        refresh_token,
        expires_at,
        updated_at: new Date().toISOString(),
      })
      .eq("twitch_user_id", channelId)
      .select()
      .single();

    if (error) {
      console.error("Error updating Twitch integration:", error);
      return null;
    }

    return data as TwitchIntegration;
  } catch (error) {
    console.error("Error refreshing Twitch token:", error);
    return null;
  }
}

export async function getTwitchAppToken() {
  const { data, error } = await supabase.from("twitch_app_token").select("access_token, expires_at").single();

  if (error) {
    console.error("Error fetching app token:", error);
    return null;
  }

  return data;
}

export async function updateTwitchAppToken(token: string, expiresAt: number): Promise<boolean> {
  const { error } = await supabase.from("twitch_app_token").upsert(
    {
      id: 1, // We'll use a single row for the app token
      access_token: token,
      expires_at: new Date(expiresAt).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "id",
    }
  );

  if (error) {
    console.error("Error updating app token:", error);
    return false;
  }

  return true;
}

export async function logWebSocketEvent({
  event_type,
  message,
  shard_id,
  connection_id,
  extra,
  status,
}: {
  event_type: string;
  message: any;
  shard_id?: string;
  connection_id?: string;
  extra?: string;
  status?: string;
}): Promise<boolean> {
  // NOTE: Remove generics for now due to typegen mismatch. Run Supabase typegen for full type safety.
  const { error } = await supabase.from("websocket_logs").insert([
    {
      event_type,
      message,
      shard_id: shard_id ?? null,
      connection_id: connection_id ?? null,
      extra: extra ?? null,
      status: status ?? null,
    },
  ]);
  if (error) {
    console.error("Error logging websocket event:", error);
    return false;
  }
  return true;
}

export async function logTwitchEvent(broadcaster_id: string, eventType: subscription_type, event_data: any, received_at?: string) {
  const { error } = await supabase.from("twitch_eventsub_notifications").insert([{ event_type: eventType, broadcaster_id, event_data, received_at }]);
  if (error) {
    console.error("Error logging websocket event:", error);
    return false;
  }
  return true;
}
export async function getCommand(channelId: string, trigger: string) {
  const { data, error } = await supabase.from("chat_commands").select("*").eq("channel_id", channelId).eq("trigger", trigger).single();
  if (error) return null;
  return data;
}

export async function addCommand(channelId: string, trigger: string, response: string, createdBy: string) {
  const { error } = await supabase.from("chat_commands").insert([{ channel_id: channelId, trigger, response, created_by: createdBy }]);
  return !error;
}
