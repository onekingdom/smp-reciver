import { TwitchApiBaseClient } from "./base-client.js";

export class TwitchChatClient extends TwitchApiBaseClient {
  constructor(broadcaster_id: string | null = null) {
    super(broadcaster_id);
  }

  async sendMessage(message: string, replyToMessageId?: string) {
    const response = await this.appApi().post(`/chat/messages`, {
      message,
      broadcaster_id: this.broadcaster_id,
      sender_id: "900954624",
      reply_parent_message_id: replyToMessageId,
      // for_source_only: true,
    });
    return response.data;
  }
}
