import { createClient } from "@supabase/supabase-js";
import { env } from "../config/config.js";
import axios from "axios";
import { Database } from "../types/supabase";
import { supabase } from "../utils/supabase";

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

export async function getTwitchAppToken(){
  const { data, error } = await supabase
    .from('twitch_app_token')
    .select('access_token, expires_at')
    .single();

  if (error) {
    console.error('Error fetching app token:', error);
    return null;
  }

  return data;
}

export async function updateTwitchAppToken(token: string, expiresAt: number): Promise<boolean> {
  const { error } = await supabase
    .from('twitch_app_token')
    .upsert({
      id: 1, // We'll use a single row for the app token
      access_token: token,
      expires_at: new Date(expiresAt).toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'id'
    });

  if (error) {
    console.error('Error updating app token:', error);
    return false;
  }

  return true;
}
