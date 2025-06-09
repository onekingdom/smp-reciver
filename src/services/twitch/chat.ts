import { TwitchApiBaseClient } from "./base-client.js";

export class TwitchChatClient extends TwitchApiBaseClient {
  async sendMessage(message: string, channelId: string, replyToMessageId?: string) {
    const response = await this.appApi().post(`/chat/messages`, {
      message,
      broadcaster_id: channelId,
      sender_id: "900954624",
      reply_parent_message_id: replyToMessageId,
      // for_source_only: true,
    });
    return response.data;
  }
}