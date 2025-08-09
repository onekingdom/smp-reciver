import type { Env } from '../../utils/env.js';
import { BaseTwitchClient } from './base-client.js';

export interface Clip {
  id: string;
  url: string;
  embed_url: string;
  broadcaster_id: string;
  broadcaster_name: string;
  creator_id: string;
  creator_name: string;
  video_id: string;
  game_id: string;
  language: string;
  title: string;
  view_count: number;
  created_at: string;
  thumbnail_url: string;
  duration: number;
}

export interface GetClipsOptions {
  broadcasterId?: string;
  gameId?: string;
  id?: string[];
  first?: number;
  after?: string;
  before?: string;
  startedAt?: string;
  endedAt?: string;
}

export interface CreateClipOptions {
  broadcasterId: string;
  hasDelay?: boolean;
}

export class TwitchClipsClient extends BaseTwitchClient {
  async getClips(options: GetClipsOptions, channelId?: string): Promise<{ data: Clip[]; pagination: { cursor?: string } }> {
    const api = channelId ? this.withChannel(channelId) : this.api;
    const response = await api.get('/clips', { params: options });
    return response.data;
  }

  async getClipById(clipId: string, channelId?: string): Promise<Clip> {
    const api = channelId ? this.withChannel(channelId) : this.api;
    const response = await api.get('/clips', { params: { id: clipId } });
    return response.data.data[0];
  }

  async createClip(options: CreateClipOptions, channelId: string): Promise<{ id: string; edit_url: string }> {
    const api = this.withChannel(channelId);
    const response = await api.post('/clips', null, { params: options });
    return response.data.data[0];
  }

  async getClipAnalytics(clipId: string, channelId: string): Promise<any> {
    const api = this.withChannel(channelId);
    const response = await api.get('/analytics/clips', { params: { clip_id: clipId } });
    return response.data;
  }
} 