import { BaseTwitchClient } from "./base-client";

export class TwitchChatClient extends BaseTwitchClient {
  async sendMessage(message: string, channelId: string, replyToMessageId?: string) {
    const response = await this.api.post(`/chat/messages`, {
      message,
      broadcaster_id: channelId,
      sender_id: "900954624",
      reply_parent_message_id: replyToMessageId,
      // for_source_only: true,
    });
    console.log(response.data);
    return response.data;
  }
}