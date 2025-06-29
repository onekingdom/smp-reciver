
import { TwitchChatClient } from "./twitch/chat";
import { TwitchEventSubClient } from "./twitch/eventsub";

export class TwitchApi {
  public chat: TwitchChatClient;	
  public eventsub: TwitchEventSubClient;

  constructor(broadcaster_id: string | null = null) {
    this.chat = new TwitchChatClient(broadcaster_id);
    this.eventsub = new TwitchEventSubClient(broadcaster_id);
  }
}
