
import { TwitchChatClient } from "./twitch/chat";
import { TwitchEventSubClient } from "./twitch/eventsub";

export class TwitchApi {
  public chat: TwitchChatClient;	
  public eventsub: TwitchEventSubClient;

  constructor(broadcaster_id: string | null = null) {
    console.log(`Creating TwitchApi for ${broadcaster_id}`);
    this.chat = new TwitchChatClient(broadcaster_id);
    this.eventsub = new TwitchEventSubClient(broadcaster_id);
  }
}
