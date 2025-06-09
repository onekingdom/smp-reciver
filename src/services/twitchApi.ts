import type { EventSubscription } from "../types/twitch.js";
import type { Env } from "../config/config.js";
import axios, { type AxiosInstance } from "axios";
import { TwitchApiInterceptors } from "./twitch/base-client.js";

export class TwitchApiService {
  private api: AxiosInstance;
  private interceptors: TwitchApiInterceptors;
  protected broadcaster_id: string | null = null;

  constructor(broadcaster_id: string | null = null) {
    this.broadcaster_id = broadcaster_id;

    this.api = axios.create({
      baseURL: "https://api.twitch.tv/helix",
    });

    // Initialize and apply interceptors
    this.interceptors = new TwitchApiInterceptors();
    this.interceptors.appInterceptor(this.api);
  }

  // Helper method to create a channel-specific API instance
  clientApi(): AxiosInstance {
    if (!this.broadcaster_id) {
      throw new Error("Broadcaster ID is required");
    }

    const channelApi = axios.create({
      baseURL: this.api.defaults.baseURL, 
    });

    // Apply the same interceptors to the channel-specific instance
    this.interceptors.clientInterceptor(channelApi, this.broadcaster_id);
    return channelApi;
  }

  appApi(): AxiosInstance {
    const appApi = axios.create({
      baseURL: "https://api.twitch.tv/helix",
    });

    this.interceptors.appInterceptor(appApi);
    return appApi;
  }


}
