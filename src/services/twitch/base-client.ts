import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from "axios";
import type { Env } from "../../config/config.js";
import { getTwitchIntegration, refreshTwitchToken, getTwitchAppToken, updateTwitchAppToken } from "../../lib/supabase.js";
import axios from "axios";

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

  constructor(private config: Env) {}

  private async getAppAccessToken(): Promise<string> {
    // Check cache first
    if (this.appTokenCache && this.appTokenCache.expiresAt > Date.now()) {
      return this.appTokenCache.token;
    }

    try {
      // Try to get token from Supabase first
      const storedToken = await getTwitchAppToken();
      if (storedToken && storedToken.expires_at && parseInt(storedToken.expires_at) > Date.now()) {
        // Cache the token from Supabase
        this.appTokenCache = {
          token: storedToken.access_token ?? '',
          expiresAt: parseInt(storedToken.expires_at)
        };
        return storedToken.access_token ?? '';
      }

      // If no valid token in Supabase, get new one from Twitch
      const response = await axios.post(
        'https://id.twitch.tv/oauth2/token',
        null,
        {
          params: {
            client_id: this.config.TWITCH_CLIENT_ID,
            client_secret: this.config.TWITCH_CLIENT_SECRET,
            grant_type: 'client_credentials'
          }
        }
      );

      const { access_token, expires_in } = response.data;
      const expiresAt = Date.now() + (expires_in * 1000);
      
      // Cache the token
      this.appTokenCache = {
        token: access_token,
        expiresAt
      };

      // Store in Supabase
      await updateTwitchAppToken(access_token, expiresAt);

      return access_token;
    } catch (error) {
      console.error('Failed to get app access token:', error);
      throw error;
    }
  }

  private isEventSubEndpoint(url: string): boolean {
    return url.startsWith('/eventsub/');
  }

  applyInterceptors(api: AxiosInstance): void {
    // Request interceptor
    api.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        // Generate a unique request ID for tracking retries
        const requestId = `${config.method}-${config.url}-${Date.now()}`;
        config.headers["X-Request-ID"] = requestId;

        // Check if this is an EventSub endpoint
        if (this.isEventSubEndpoint(config.url || '')) {
          // For EventSub endpoints, always use app access token
          const appToken = await this.getAppAccessToken();
          config.headers["Authorization"] = `Bearer ${appToken}`;
        } else {
          // For other endpoints, use channel-specific or global token
          const channelId = config.headers["X-Channel-Id"] as string | undefined;
          delete config.headers["X-Channel-Id"]; // Remove the header after using it

          if (channelId) {
            // Try to get channel-specific token
            const token = await this.getChannelToken(channelId);
            if (token) {
              config.headers["Authorization"] = `Bearer ${token}`;
            } else {
              // Fallback to global client credentials if no channel token
              config.headers["Authorization"] = `Bearer ${this.config.TWITCH_CLIENT_SECRET}`;
            }
          } else {
            // Use global client credentials
            config.headers["Authorization"] = `Bearer ${this.config.TWITCH_CLIENT_SECRET}`;
          }
        }

        config.headers["Client-Id"] = this.config.TWITCH_CLIENT_ID;
        config.headers["Content-Type"] = "application/json";
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    api.interceptors.response.use(
      (response: AxiosResponse) => {
        // Clear retry count on successful response
        const requestId = response.config.headers["X-Request-ID"] as string;
        if (requestId) {
          this.requestRetryCount.delete(requestId);
        }
        return response;
      },
      async (error: AxiosError) => {
        const requestId = error.config?.headers?.["X-Request-ID"] as string;
        if (!requestId) {
          throw error; // No request ID, can't track retries
        }

        // Get current retry count
        const retryCount = this.requestRetryCount.get(requestId) || 0;

        if (error.response?.status === 401 && retryCount < this.MAX_RETRIES) {
          const url = error.config?.url || '';
          
          if (this.isEventSubEndpoint(url)) {
            try {
              // For EventSub endpoints, try to refresh app token
              this.appTokenCache = null; // Clear cached token
              const newToken = await this.getAppAccessToken(); // This will now update Supabase too
              
              // Retry the original request with the new token
              const config = error.config!;
              config.headers = config.headers || {};
              config.headers["Authorization"] = `Bearer ${newToken}`;
              return api(config);
            } catch (refreshError) {
              console.error("App token refresh failed:", refreshError);
              this.requestRetryCount.delete(requestId);
            }
          } else {
            // Handle channel-specific token refresh as before
            const channelId = error.config?.headers?.["X-Channel-Id"] as string | undefined;
            if (channelId) {
              try {
                // Increment retry count
                this.requestRetryCount.set(requestId, retryCount + 1);

                // Try to refresh the token
                const newToken = await this.refreshTokenAndRetry(channelId);
                if (newToken) {
                  // Retry the original request with the new token
                  const config = error.config!;
                  config.headers = config.headers || {};
                  config.headers["Authorization"] = `Bearer ${newToken}`;
                  return api(config);
                }
              } catch (refreshError) {
                console.error("Token refresh failed:", refreshError);
                // Clear retry count on refresh failure
                this.requestRetryCount.delete(requestId);
              }
            }
          }
        }

        // If we get here, either:
        // 1. It wasn't a 401
        // 2. Token refresh failed
        // 3. We've exceeded max retries
        this.requestRetryCount.delete(requestId); // Clean up retry count

        if (error.response) {
          const errorMessage =
            retryCount >= this.MAX_RETRIES
              ? `API Error: Max retries (${this.MAX_RETRIES}) exceeded. ${error.response.status} ${JSON.stringify(error.response.data)}`
              : `API Error: ${error.response.status} ${JSON.stringify(error.response.data)}`;
          throw new Error(errorMessage);
        }
        throw error;
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
      expiresAt: typeof integration.expires_at === 'string' 
        ? new Date(integration.expires_at).getTime()
        : integration.expires_at
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
          expiresAt: typeof integration.expires_at === 'string'
            ? new Date(integration.expires_at).getTime()
            : integration.expires_at
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
}

export class BaseTwitchClient {
  protected api: AxiosInstance;
  protected interceptors: TwitchApiInterceptors;

  constructor(protected config: Env) {
    this.api = axios.create({
      baseURL: "https://api.twitch.tv/helix",
    });

    // Initialize and apply interceptors
    this.interceptors = new TwitchApiInterceptors(config);
    this.interceptors.applyInterceptors(this.api);
  }

  protected withChannel(channelId: string): AxiosInstance {
    const channelApi = axios.create({
      baseURL: this.api.defaults.baseURL,
      headers: {
        "X-Channel-Id": channelId,
      },
    });

    // Apply the same interceptors to the channel-specific instance
    this.interceptors.applyInterceptors(channelApi);
    return channelApi;
  }
} 