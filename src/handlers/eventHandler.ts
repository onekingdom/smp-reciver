export class EventHandler {
  async handleEvent(eventType: string, eventData: any): Promise<void> {
    switch (eventType) {
      case "channel.follow":
        await this.handleFollow(eventData);
        break;

      case "channel.subscribe":
        await this.handleSubscribe(eventData);
        break;

      case "channel.cheer":
        await this.handleCheer(eventData);
        break;

      case "channel.raid":
        await this.handleRaid(eventData);
        break;

      case "stream.online":
        await this.handleStreamOnline(eventData);
        break;

      case "stream.offline":
        await this.handleStreamOffline(eventData);
        break;

      default:
        console.log("Unhandled event type:", eventType, eventData);
    }
  }

  private async handleFollow(data: any): Promise<void> {
    console.log("🎉 New follower:", data.user_name);
    // Add your custom follow logic here
    // Example: Send notification, update database, etc.
  }

  private async handleSubscribe(data: any): Promise<void> {
    console.log("💎 New subscriber:", data.user_name, "Tier:", data.tier);
    // Add your custom subscription logic here
  }

  private async handleCheer(data: any): Promise<void> {
    console.log("✨ Bits cheered:", data.bits, "by", data.user_name);
    if (data.message) {
      console.log("Message:", data.message);
    }
    // Add your custom cheer logic here
  }

  private async handleRaid(data: any): Promise<void> {
    console.log("🚀 Raided by:", data.from_broadcaster_user_name, "Viewers:", data.viewers);
    // Add your custom raid logic here
  }

  private async handleStreamOnline(data: any): Promise<void> {
    console.log("🔴 Stream went online:", data.broadcaster_user_name);
    console.log("Category:", data.category_name);
    // Add your custom stream online logic here
  }

  private async handleStreamOffline(data: any): Promise<void> {
    console.log("⚫ Stream went offline:", data.broadcaster_user_name);
    // Add your custom stream offline logic here
  }
}
