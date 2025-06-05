import type { EventSubscription } from "../types/twitch.js";
import type { Env } from "../config/config.js";
import axios, { type AxiosInstance } from "axios";
import { TwitchApiInterceptors } from "./twitch/base-client.js";

export class TwitchApiService {
  private api: AxiosInstance;
  private interceptors: TwitchApiInterceptors;

  constructor(private config: Env) {
    this.api = axios.create({
      baseURL: "https://api.twitch.tv/helix",
    });

    // Initialize and apply interceptors
    this.interceptors = new TwitchApiInterceptors(config);
    this.interceptors.applyInterceptors(this.api);
  }

  // Helper method to create a channel-specific API instance
  withChannel(channelId: string): AxiosInstance {
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

  async createSubscription(subscription: EventSubscription, sessionId: string, channelId?: string): Promise<string> {
    const api = channelId ? this.withChannel(channelId) : this.api;
    const response = await api.post("/eventsub/subscriptions", {
      type: subscription.type,
      version: subscription.version,
      condition: subscription.condition,
      transport: {
        method: "conduit",
        session_id: sessionId,
      },
    });

    return response.data.data[0]?.id;
  }

  async getSubscriptions(channelId?: string): Promise<any[]> {
    const api = channelId ? this.withChannel(channelId) : this.api;
    const response = await api.get("/eventsub/subscriptions");
    return response.data.data;
  }

  async deleteSubscription(subscriptionId: string, channelId?: string): Promise<void> {
    const api = channelId ? this.withChannel(channelId) : this.api;
    await api.delete(`/eventsub/subscriptions?id=${subscriptionId}`);
  }
}
