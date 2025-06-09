import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from "axios";
import { env, type Env } from "../../config/config.js";
import { getTwitchIntegration, refreshTwitchToken, getTwitchAppToken, updateTwitchAppToken } from "../../lib/supabase.js";
import axios from "axios";
import { supabase } from "@/utils/supabase.js";

interface TokenCache {
  token: string;
  expiresAt: number; // Store as timestamp in milliseconds
}

export class TwitchApiInterceptors {
  private channelTokenCache: Map<string, TokenCache> = new Map();
  private refreshInProgress: Map<string, Promise<string | null>> = new Map();
  private readonly MAX_RETRIES = 2;
  private requestRetryCount: Map<string, number> = new Map();
  private appTokenCache: TokenCache | null = null;

  clientInterceptor(api: AxiosInstance, broadcaster_id: string): void {
    api.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        if (!broadcaster_id) {
          throw new Error("Broadcaster ID is required in Twitch client interceptor");
        }

        const token = await this.getChannelToken(broadcaster_id);

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
            console.log("🔄 Token expired, attempting to refresh for broadcaster:", broadcaster_id);
            const newToken = await this.refreshTokenAndRetry(broadcaster_id);
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

  appInterceptor(api: AxiosInstance): void {
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

  private async getChannelToken(channelId: string): Promise<string | null> {
    // Check cache first
    const cached = this.channelTokenCache.get(channelId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.token;
    }

    // Check if a refresh is already in progress
    const inProgress = this.refreshInProgress.get(channelId);
    if (inProgress) {
      return inProgress;
    }

    // Fetch from Supabase
    const integration = await getTwitchIntegration(channelId);
    if (!integration || !integration.expires_at) {
      return null;
    }

    // Cache the token (convert expires_at to milliseconds if it's not already)
    this.channelTokenCache.set(channelId, {
      token: integration.access_token,
      expiresAt: typeof integration.expires_at === "string" ? new Date(integration.expires_at).getTime() : integration.expires_at,
    });

    return integration.access_token;
  }

  private async refreshTokenAndRetry(channelId: string): Promise<string | null> {
    // Check if a refresh is already in progress
    const inProgress = this.refreshInProgress.get(channelId);
    if (inProgress) {
      return inProgress;
    }

    // Create a new refresh promise
    const refreshPromise = (async () => {
      try {
        const integration = await refreshTwitchToken(channelId);
        if (!integration || !integration.expires_at) {
          return null;
        }

        // Update cache (convert expires_at to milliseconds if it's not already)
        this.channelTokenCache.set(channelId, {
          token: integration.access_token,
          expiresAt: typeof integration.expires_at === "string" ? new Date(integration.expires_at).getTime() : integration.expires_at,
        });

        return integration.access_token;
      } finally {
        // Clean up the in-progress promise
        this.refreshInProgress.delete(channelId);
      }
    })();

    // Store the promise
    this.refreshInProgress.set(channelId, refreshPromise);
    return refreshPromise;
  }
  private async getAppAccessToken(): Promise<string> {
    // Check cache first
    if (this.appTokenCache && this.appTokenCache.expiresAt > Date.now()) {
      return this.appTokenCache.token;
    }

    try {
      // Try to get token from Supabase
      const storedToken = await getTwitchAppToken();
      if (storedToken && storedToken.expires_at && parseInt(storedToken.expires_at) > Date.now()) {
        // Cache the token from Supabase
        this.appTokenCache = {
          token: storedToken.access_token ?? "",
          expiresAt: parseInt(storedToken.expires_at),
        };
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

      // Cache the token
      this.appTokenCache = {
        token: access_token,
        expiresAt,
      };

      // Store in Supabase
      await updateTwitchAppToken(access_token, expiresAt);

      return access_token;
    } catch (error) {
      console.error("Failed to get app access token:", error);
      throw error;
    }
  }
}
