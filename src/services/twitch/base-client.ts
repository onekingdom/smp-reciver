import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from "axios";
import { env, type Env } from "../../config/config.js";
import { getTwitchIntegration, refreshTwitchToken, getTwitchAppToken, updateTwitchAppToken } from "../../lib/supabase.js";
import axios from "axios";
import { supabase } from "@/utils/supabase.js";

interface TokenCache {
  token: string;
  expiresAt: number; // Store as timestamp in milliseconds
}

export abstract class TwitchApiBaseClient {
  private readonly MAX_RETRIES = 2;
  private requestRetryCount: Map<string, number> = new Map();
  protected broadcaster_id: string | null = null;

  constructor(broadcaster_id: string | null = null) {
    this.broadcaster_id = broadcaster_id;
  }

  protected clientInterceptor(api: AxiosInstance): void {
    api.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        if (!this.broadcaster_id) {
          throw new Error("Broadcaster ID is required in Twitch client interceptor");
        }

        const token = await this.getChannelToken(this.broadcaster_id);

        config.headers["Client-Id"] = env.TWITCH_CLIENT_ID;
        config.headers["Content-Type"] = "application/json";
        config.headers["Authorization"] = `Bearer ${token}`;

        return config;
      },
      (error) => Promise.reject(error)
    );

    api.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        const config = error.config!;
        // Use a unique key for this request (e.g., method+url+timestamp or a request ID header)
        const requestId = (config.headers["X-Request-ID"] as string) || `${config.method}-${config.url}`;

        const retryCount = this.requestRetryCount.get(requestId) || 0;

        if (error.response?.status === 401 && retryCount < this.MAX_RETRIES) {
          try {
            this.requestRetryCount.set(requestId, retryCount + 1);
            if (!this.broadcaster_id) {
              throw new Error("Broadcaster ID is required in Twitch client interceptor");
            }
            console.log("🔄 Token expired, attempting to refresh for broadcaster:", this.broadcaster_id);
            const newToken = await this.refreshTokenAndRetry(this.broadcaster_id);
            if (newToken) {
              config.headers = config.headers || {};
              config.headers["Authorization"] = `Bearer ${newToken}`;
              console.log("✅ Token refreshed, retrying request");
              return api(config);
            }
          } catch (refreshError) {
            console.error("❌ Token refresh failed:", refreshError);
          } finally {
            // Clean up retry count after attempt
            this.requestRetryCount.delete(requestId);
          }
        } else {
          // Clean up on non-401 or if max retries exceeded
          this.requestRetryCount.delete(requestId);
        }
        return Promise.reject(error);
      }
    );
  }

  protected appInterceptor(api: AxiosInstance): void {
    api.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const token = await this.getAppAccessToken();

        config.headers["Client-Id"] = env.TWITCH_CLIENT_ID;
        config.headers["Content-Type"] = "application/json";
        config.headers["Authorization"] = `Bearer ${token}`;
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  }

  protected clientApi(): AxiosInstance {
    const api = axios.create({
      baseURL: "https://api.twitch.tv/helix",
    });
    this.clientInterceptor(api);
    return api;
  }

  protected appApi(): AxiosInstance {
    const api = axios.create({
      baseURL: "https://api.twitch.tv/helix",
    });
    this.appInterceptor(api);
    return api;
  }

  private async getChannelToken(channelId: string): Promise<string | null> {
    // Check cache first

    // Fetch from Supabase
    const integration = await getTwitchIntegration(channelId);
    if (!integration || !integration.expires_at) {
      return null;
    }

    return integration.access_token;
  }
  private async refreshTokenAndRetry(channelId: string): Promise<string | null> {
    // Check if a refresh is already in progress

    // Create a new refresh promise
    const refreshPromise = (async () => {
      try {
        const integration = await refreshTwitchToken(channelId);
        if (!integration || !integration.expires_at) {
          return null;
        }

        // Update cache (convert expires_at to milliseconds if it's not already)

        return integration.access_token;
      } finally {
      }
    })();

    return refreshPromise;
  }
  private async getAppAccessToken(): Promise<string> {
    try {
      // Try to get token from Supabase
      const storedToken = await getTwitchAppToken();
      if (storedToken && storedToken.expires_at && parseInt(storedToken.expires_at) > Date.now()) {
        // Cache the token from Supabase

        return storedToken.access_token ?? "";
      }

      // If no valid token in Supabase, get new one from Twitch
      const response = await axios.post("https://id.twitch.tv/oauth2/token", null, {
        params: {
          client_id: env.TWITCH_CLIENT_ID,
          client_secret: env.TWITCH_CLIENT_SECRET,
          grant_type: "client_credentials",
        },
      });

      const { access_token, expires_in } = response.data;
      const expiresAt = Date.now() + expires_in * 1000;

      // Store in Supabase
      await updateTwitchAppToken(access_token, expiresAt);

      return access_token;
    } catch (error) {
      console.error("Failed to get app access token:", error);
      throw error;
    }
  }
}
