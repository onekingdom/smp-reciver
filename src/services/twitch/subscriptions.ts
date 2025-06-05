import type { Env } from '../../config/config.js';
import { BaseTwitchClient } from './base-client.js';
import type { AxiosError } from 'axios';

export interface Subscription {
  broadcaster_id: string;
  broadcaster_login: string;
  broadcaster_name: string;
  gifter_id: string;
  gifter_login: string;
  gifter_name: string;
  is_gift: boolean;
  tier: string;
  plan_name: string;
  user_id: string;
  user_login: string;
  user_name: string;
}

export interface GetSubscriptionsOptions {
  broadcasterId: string;
  userId?: string[];
  first?: number;
  after?: string;
}

export class TwitchSubscriptionsClient extends BaseTwitchClient {
  async getSubscriptions(options: GetSubscriptionsOptions, channelId: string): Promise<{ data: Subscription[]; pagination: { cursor?: string } }> {
    const api = this.withChannel(channelId);
    const response = await api.get('/subscriptions', { params: options });
    return response.data;
  }

  async getSubscriptionByUserId(broadcasterId: string, userId: string, channelId: string): Promise<Subscription> {
    const api = this.withChannel(channelId);
    const response = await api.get('/subscriptions/user', {
      params: { broadcaster_id: broadcasterId, user_id: userId }
    });
    return response.data.data[0];
  }

  async getSubscriberCount(broadcasterId: string, channelId: string): Promise<number> {
    const api = this.withChannel(channelId);
    const response = await api.get('/subscriptions', {
      params: { broadcaster_id: broadcasterId, first: 1 }
    });
    return response.data.total;
  }

  async checkUserSubscription(broadcasterId: string, userId: string, channelId: string): Promise<boolean> {
    try {
      await this.getSubscriptionByUserId(broadcasterId, userId, channelId);
      return true;
    } catch (error) {
      if ((error as AxiosError)?.response?.status === 404) {
        return false;
      }
      throw error;
    }
  }
} 