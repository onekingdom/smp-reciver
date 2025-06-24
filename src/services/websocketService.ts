import type { TwitchEventSubMessage, EventSubscription, EventSubNotification, subscription_type } from "../types/twitch.js";
import { TwitchApi } from "./twitchApi.js";
import { HandlerRegistry } from "../handlers/eventHandler.js";
import { env, type Env } from "../config/config.js";
import { TwitchEventSubClient } from "./twitch/eventsub.js";
import { logWebSocketEvent } from "../lib/supabase.js";
import { AxiosError } from "axios";

export class WebSocketService {
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private reconnectUrl: string | null = null;
  private keepaliveTimer: Timer | null = null;
  private keepaliveInterval: number = 10; // Default, will be updated from session
  private lastKeepaliveTime: number = Date.now();
  private missedKeepalives: number = 0;
  private readonly MAX_MISSED_KEEPALIVES = 10;
  private twitchApi: TwitchApi;

  private eventSubClient: TwitchEventSubClient;
  private conduitId: string | null = null;

  constructor(private wsUrl: string = "wss://eventsub.wss.twitch.tv/ws", private handlerRegistry: HandlerRegistry) {
    this.conduitId = env.TWITCH_CONDUIT_ID;
    this.twitchApi = new TwitchApi();
    this.eventSubClient = new TwitchEventSubClient();
    this.handlerRegistry = handlerRegistry;
  }

  async connect(): Promise<void> {
    try {
      console.log("🔌 Connecting to Twitch EventSub WebSocket...");

      // Get or create conduit before connecting
      if (!this.conduitId) {
        try {
          await this.initializeConduit();
        } catch (error) {
          console.error("❌ Failed to initialize conduit:", error);
          throw error;
        }
      }

      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log("✅ WebSocket connected");
      };

      this.ws.onmessage = async (event) => {
        try {
          const message: TwitchEventSubMessage = JSON.parse(event.data as string);
          await this.handleMessage(message);
        } catch (error) {
          console.error("❌ Error parsing WebSocket message:", error);
        }
      };

      this.ws.onclose = (event) => this.handleClose(event);

      this.ws.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
      };
    } catch (error) {
      console.error("❌ Failed to connect WebSocket:", error);
      throw error;
    }
  }

  private async reconnect(): Promise<void> {
    if (this.reconnectUrl) {
      console.log("🔄 Reconnecting to:", this.reconnectUrl);
      try {
        this.ws = new WebSocket(this.reconnectUrl);
        this.setupEventHandlers();
      } catch (error) {
        console.error("❌ Reconnection failed:", error);
      }
    }
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onmessage = async (event) => {
      try {
        const message: TwitchEventSubMessage = JSON.parse(event.data as string);
        await this.handleMessage(message);
      } catch (error) {
        console.error("❌ Error parsing WebSocket message:", error);
      }
    };

    this.ws.onclose = (event) => this.handleClose(event);
  }

  private startKeepaliveTimer(timeoutSeconds: number): void {
    if (this.keepaliveTimer) {
      clearTimeout(this.keepaliveTimer);
    }

    this.keepaliveInterval = timeoutSeconds;
    // Set timeout to check for missed keepalives
    // Add some buffer for network delays
    const checkInterval = (timeoutSeconds + 2) * 1000;

    this.keepaliveTimer = setTimeout(() => {
      this.checkKeepalive();
    }, checkInterval);

    console.log(`⏰ Keepalive timer set to check every ${checkInterval / 1000} seconds`);
  }

  private async checkKeepalive(): Promise<void> {
    const now = Date.now();
    const timeSinceLastKeepalive = now - this.lastKeepaliveTime;
    const expectedInterval = this.keepaliveInterval * 1000;

    // If we haven't received a keepalive in the expected time (plus buffer)
    if (timeSinceLastKeepalive > expectedInterval + 2000) {
      this.missedKeepalives++;
      console.log(
        `⚠️ Missed keepalive ${this.missedKeepalives}/${this.MAX_MISSED_KEEPALIVES} - ${Math.round(
          timeSinceLastKeepalive / 1000
        )}s since last keepalive`
      );

      if (this.missedKeepalives >= this.MAX_MISSED_KEEPALIVES) {
        console.log("🔌 Closing connection - too many missed keepalives");
        this.ws?.close();
        // log the event
        await logWebSocketEvent({
          event_type: "close",

          message: {
            code: 4002,
            reason: "Client failed ping-pong",
          },
          shard_id: undefined,
          connection_id: this.sessionId || undefined,
          extra: undefined,
          status: "error",
        });
        return;
      }
    }

    // Continue checking
    const nextCheckIn = this.keepaliveInterval * 1000;
    this.keepaliveTimer = setTimeout(() => {
      this.checkKeepalive();
    }, nextCheckIn);
  }

  private async handleMessage(message: TwitchEventSubMessage): Promise<void> {
    const { metadata, payload } = message;
    // Determine shard_id if available (from payload.subscription?.transport?.shard_id)
    let shard_id: string | undefined = undefined;

    switch (metadata.message_type) {
      case "session_welcome":
        console.log("👋 Session welcome received");
        this.sessionId = payload.session?.id || null;
        this.reconnectUrl = payload.session?.reconnect_url || null;
        this.lastKeepaliveTime = Date.now(); // Initialize keepalive timestamp

        if (payload.session?.keepalive_timeout_seconds) {
          this.startKeepaliveTimer(payload.session.keepalive_timeout_seconds);
        }

        // log the event
        await logWebSocketEvent({
          event_type: "session_welcome",
          message: payload,
          shard_id: undefined,
          connection_id: this.sessionId || undefined,
          status: "success",
        });

        // Update conduit shards with the new session ID
        if (this.conduitId && this.sessionId) {
          try {
            await this.eventSubClient.updateAllShardTransports(this.conduitId, {
              method: "websocket",
              session_id: this.sessionId,
            });
            // Log the event
            console.log(`✅ Updated conduit ${this.conduitId} shards with new session ID`);
          } catch (error) {
            console.error("❌ Failed to update conduit shards with session ID:", error);
            // log the event
            await logWebSocketEvent({
              event_type: "session_welcome",
              message: error,
              shard_id: undefined,
              connection_id: this.sessionId || undefined,
              status: "error",
            });
          }
        }

        break;

      case "session_keepalive":
        this.lastKeepaliveTime = Date.now();
        this.missedKeepalives = 0; // Reset missed counter

        // Update keepalive interval if provided
        if (payload.session?.keepalive_timeout_seconds) {
          this.keepaliveInterval = payload.session.keepalive_timeout_seconds;
        }
        break;

      case "notification":
        const event = {
          metadata,
          payload,
        } as EventSubNotification;

        if (metadata.subscription_type && payload.event) {
          await this.handlerRegistry.processTwitchEvent(metadata.subscription_type as subscription_type, event);
        }
        break;

      case "session_reconnect":
        console.log("🔄 Session reconnect requested");
        this.reconnectUrl = payload.session?.reconnect_url || null;
        if (this.reconnectUrl) {
          console.log("🔄 Will reconnect to new URL in 5 seconds...");
          // Give a small delay to ensure any pending messages are processed
          setTimeout(() => {
            console.log("🔄 Closing current connection to reconnect...");
            this.ws?.close();
            
          }, 5000);
        } else {
          console.error("❌ Reconnect URL not provided in session_reconnect message");
          // log the event
          await logWebSocketEvent({
            event_type: "session_reconnect",
            message: payload,
            shard_id: undefined,
            connection_id: this.sessionId || undefined,
            status: "error",
          });
        }
        break;

      case "revocation":
        console.log("⚠️ Subscription revoked:", {
          type: metadata.subscription_type,
          subscriptionId: payload.subscription?.id,
          status: payload.subscription?.status,
          reason: this.getRevocationReason(payload.subscription?.status),
        });

        // Handle different revocation reasons
        switch (payload.subscription?.status) {
          case "user_removed":
            console.log("❌ User no longer exists");
            // log the event
            await logWebSocketEvent({
              event_type: "revocation.user_removed",
              message: payload,
              shard_id: undefined,
              connection_id: this.sessionId || undefined,
              status: "success",
            });
            break;
          case "authorization_revoked":
            console.log("❌ Authorization token was revoked");
            // log the event
            await logWebSocketEvent({
              event_type: "revocation.authorization_revoked",
              message: payload,
              shard_id: undefined,
              connection_id: this.sessionId || undefined,
              status: "success",
            });
            break;
          case "version_removed":
            console.log("❌ Subscription type/version no longer supported");
            // log the event
            await logWebSocketEvent({
              event_type: "revocation.version_removed",
              message: payload,
              shard_id: undefined,
              connection_id: this.sessionId || undefined,
              status: "success",
            });
            break;
          default:
            console.log("❌ Unknown revocation reason");
            // log the event
            await logWebSocketEvent({
              event_type: "revocation.unknown",
              message: payload,
              shard_id: undefined,
              connection_id: this.sessionId || undefined,
              status: "success",
            });
        }
        break;

      default:
        console.log("❓ Unknown message type:", metadata.message_type);
        // log the event
        await logWebSocketEvent({
          event_type: "unknown_message_type",
          message: payload,
          shard_id: undefined,
          connection_id: this.sessionId || undefined,
          status: "success",
        });
    }
  }

  private getRevocationReason(status: string | undefined): string {
    switch (status) {
      case "user_removed":
        return "The user no longer exists";
      case "authorization_revoked":
        return "The authorization token was revoked";
      case "version_removed":
        return "The subscription type/version is no longer supported";
      default:
        return "Unknown reason";
    }
  }

  private getCloseReason(code: number): string {
    switch (code) {
      case 4000:
        return "Internal server error";
      case 4001:
        return "Client sent inbound traffic";
      case 4002:
        return "Client failed ping-pong";
      case 4003:
        return "Connection unused";
      case 4004:
        return "Reconnect grace time expired";
      case 4005:
        return "Network timeout";
      case 4006:
        return "Network error";
      case 4007:
        return "Invalid reconnect URL";
      case 1000:
        return "Normal closure";
      default:
        return "Unknown close code";
    }
  }

  private async handleClose(event: CloseEvent): Promise<void> {
    const closeCode = event.code;
    const closeReason = this.getCloseReason(closeCode);
    // Log the close event
    await logWebSocketEvent({
      event_type: "close",
      message: {
        code: closeCode,
        reason: closeReason,
        details: event.reason || "No reason provided",
      },
      shard_id: undefined,
      connection_id: this.sessionId || undefined,
      extra: undefined,
    });

    // Clear keepalive timer
    if (this.keepaliveTimer) {
      clearTimeout(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }

    // Handle specific close codes
    switch (closeCode) {
      case 4000:
        console.error("❌ Internal server error - Twitch's servers encountered an error");
        // Attempt reconnection after a delay
        setTimeout(() => this.connect(), 5000);
        break;

      case 4001:
        console.error("❌ Client sent inbound traffic - Sending messages to Twitch is not allowed");
        // Don't reconnect as this is a client error
        break;

      case 4002:
        console.error("❌ Client failed ping-pong - Keepalive response was not received");
        // Attempt reconnection after a delay
        setTimeout(() => this.connect(), 5000);
        break;

      case 4003:
        console.error("❌ Connection unused - No subscriptions were created within the time limit");
        // Attempt reconnection and ensure subscriptions are created
        setTimeout(async () => {
          await this.connect();
        }, 5000);
        break;

      case 4004:
        console.error("❌ Reconnect grace time expired - Failed to reconnect within 30 seconds");
        // Attempt a fresh connection
        setTimeout(() => this.connect(), 5000);
        break;

      case 4005:
        console.error("❌ Network timeout - Transient network issue");
        // Attempt reconnection after a delay
        setTimeout(() => this.connect(), 5000);
        break;

      case 4006:
        console.error("❌ Network error - Transient network issue");
        // Attempt reconnection after a delay
        setTimeout(() => this.connect(), 5000);
        break;

      case 4007:
        console.error("❌ Invalid reconnect URL - The provided reconnect URL was invalid");
        // Attempt a fresh connection
        setTimeout(() => this.connect(), 5000);
        break;

      default:
        console.log("ℹ️ Normal closure or unknown close code");
        // For normal closure (1000) or unknown codes, attempt reconnection if we have a reconnect URL
        if (this.reconnectUrl) {
          setTimeout(() => this.reconnect(), 5000);
        }
    }
  }

  // private async subscribeToEvents(): Promise<void> {
  //   if (!this.conduitId) {
  //     console.error("❌ Failed to initialize conduit for subscriptions");
  //   }

  //   // Verify we have a valid session ID
  //   if (!this.sessionId) {
  //     console.error("❌ Cannot create subscriptions: missing session ID");
  //     return;
  //   }

  //   console.log("🔄 Starting subscription creation process...");
  //   const subscriptions: EventSubscription[] = [
  //     {
  //       type: "channel.chat.message",
  //       version: "1",
  //       condition: {
  //         broadcaster_user_id: this.broadcasterId,
  //         user_id: this.broadcasterId,
  //       },
  //     },
  //   ];

  //   // Get current conduit status with shards
  //   const conduitData = await this.eventSubClient.getConduitWithShards(this.conduitId!, this.broadcasterId);
  //   if (!conduitData) {
  //     console.error(`❌ Conduit ${this.conduitId} not found or failed to get shards`);
  //     return;
  //   }

  //   // Verify we have enabled shards
  //   const enabledShards = conduitData.shards.filter((s) => s.status === "enabled");
  //   if (enabledShards.length === 0) {
  //     console.error(`❌ No enabled shards found in conduit ${this.conduitId}`);
  //     return;
  //   }

  //   console.log(`📊 Current conduit status:`, {
  //     id: conduitData.id,
  //     shardCount: conduitData.shard_count,
  //     activeShards: enabledShards.length,
  //     shardDetails: enabledShards.map((s) => ({
  //       id: s.id,
  //       status: s.status,
  //       transport: s.transport,
  //     })),
  //   });

  //   // Group subscriptions by shard to distribute load
  //   const shardGroups = this.groupSubscriptionsByShard(subscriptions, enabledShards.length);
  //   console.log(`📊 Subscription distribution:`, {
  //     totalSubscriptions: subscriptions.length,
  //     availableShards: enabledShards.length,
  //     shardGroups: shardGroups.map((group, i) => ({
  //       shardIndex: i,
  //       shardId: enabledShards[i]?.id,
  //       subscriptionCount: group.length,
  //       types: group.map((s) => s.type),
  //     })),
  //   });

  //   for (const [shardIndex, shardSubscriptions] of shardGroups.entries()) {
  //     const shard = enabledShards[shardIndex];
  //     if (!shard) {
  //       console.error(`❌ Shard index ${shardIndex} not found in enabled shards`);
  //       continue;
  //     }

  //     console.log(`🔄 Processing shard ${shardIndex + 1} (${shard.id})...`);

  //     // Create subscriptions for this shard
  //     for (const subscription of shardSubscriptions) {
  //       try {
  //         console.log(`🔄 Creating subscription for ${subscription.type} in shard ${shardIndex + 1}...`);
  //         const createdSubscription = await this.eventSubClient.createSubscription(
  //           {
  //             type: subscription.type,
  //             version: subscription.version,
  //             condition: subscription.condition,
  //             transport: {
  //               method: "conduit",
  //               conduit_id: this.conduitId!,
  //               shard_id: shard.id,
  //             },
  //           },
  //           this.broadcasterId
  //         );

  //         console.log(`✅ Created subscription in shard ${shardIndex + 1}:`, {
  //           type: subscription.type,
  //           id: createdSubscription.data[0].id,
  //           status: createdSubscription.data[0].status,
  //         });
  //       } catch (error) {
  //         console.error(`❌ Failed to create subscription in shard ${shardIndex + 1} for ${subscription.type}:`, error);
  //         if (error instanceof AxiosError && error.response) {
  //           console.error("API Error details:", {
  //             status: error.response.status,
  //             data: error.response.data,
  //           });
  //         }
  //         // Continue with next subscription instead of failing the entire shard
  //       }
  //     }
  //   }

  //   // Verify final subscription status
  //   try {
  //     const finalSubscriptions = await this.eventSubClient.getSubscriptions(this.broadcasterId);
  //     console.log(`📊 Final subscription status:`, {
  //       totalSubscriptions: finalSubscriptions.data.length,
  //       byStatus: finalSubscriptions.data.reduce((acc, sub) => {
  //         acc[sub.status] = (acc[sub.status] || 0) + 1;
  //         return acc;
  //       }, {} as Record<string, number>),
  //     });
  //   } catch (error) {
  //     console.error("❌ Failed to get final subscription status:", error);
  //     if (error instanceof AxiosError && error.response) {
  //       console.error("API Error details:", {
  //         status: error.response.status,
  //         data: error.response.data,
  //       });
  //     }
  //   }
  // }

  private groupSubscriptionsByShard(subscriptions: EventSubscription[], shardCount: number): EventSubscription[][] {
    // Group subscriptions by type to ensure similar events go to the same shard
    const typeGroups = new Map<string, EventSubscription[]>();

    for (const sub of subscriptions) {
      const group = typeGroups.get(sub.type) || [];
      group.push(sub);
      typeGroups.set(sub.type, group);
    }

    // Distribute type groups across shards
    const shardGroups: EventSubscription[][] = Array.from({ length: shardCount }, () => []);
    let currentShard = 0;

    for (const [_, group] of typeGroups) {
      shardGroups[currentShard].push(...group);
      currentShard = (currentShard + 1) % shardCount;
    }

    return shardGroups;
  }

  private async initializeConduit(): Promise<void> {
    try {
      // Create a conduit with 3 shards
      console.log("🔄 Creating conduit with 3 shards...");
      const conduit = await this.eventSubClient.createConduit({ shard_count: 3 });
      this.conduitId = conduit.data[0].id;
      console.log(`✅ Created conduit ${this.conduitId} with 3 shards`);

      // Wait a moment for shards to be created
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Get conduit details with shards to verify
      const conduitData = await this.eventSubClient.getConduitWithShards(this.conduitId);
      if (!conduitData) {
        throw new Error(`Failed to get conduit ${this.conduitId} with shards`);
      }

      // Verify shards are created
      if (!conduitData.shards || conduitData.shards.length === 0) {
        console.log("⚠️ No shards found, waiting for shard creation...");
        // Wait longer and check again
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const retryData = await this.eventSubClient.getConduitWithShards(this.conduitId);
        if (!retryData || !retryData.shards || retryData.shards.length === 0) {
          throw new Error(`Shards not created for conduit ${this.conduitId}`);
        }
        conduitData.shards = retryData.shards;
      }

      console.log(`📊 Initial conduit status:`, {
        id: conduitData.id,
        shardCount: conduitData.shard_count,
        shardStatuses: conduitData.shards.map((s) => ({
          id: s.id,
          status: s.status,
          transport: s.transport,
        })),
      });

      // Enable all shards
      console.log("🔄 Enabling conduit shards...");
      await this.eventSubClient.enableAllShards(this.conduitId);
      console.log("✅ Enabled all conduit shards");

      // Wait a moment for shard status updates to take effect
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify shards are enabled
      const enabledData = await this.eventSubClient.getConduitWithShards(this.conduitId);

      if (!enabledData) {
        throw new Error(`Failed to verify conduit ${this.conduitId} shard status`);
      }

      const disabledShards = enabledData.shards.filter((s) => s.status !== "enabled");
      if (disabledShards.length > 0) {
        console.warn(
          `⚠️ Some shards are still disabled:`,
          disabledShards.map((s) => ({
            id: s.id,
            status: s.status,
          }))
        );
      } else {
        console.log(`✅ All ${enabledData.shards.length} shards are enabled`);
      }

      // Update shards with WebSocket transport
      if (this.sessionId) {
        console.log(`🔄 Updating conduit ${this.conduitId} shards with WebSocket transport...`);
        await this.eventSubClient.updateAllShardTransports(this.conduitId, {
          method: "websocket",
          session_id: this.sessionId,
        });
        console.log(`✅ Updated conduit ${this.conduitId} shards with WebSocket transport`);

        // Wait a moment for transport updates to take effect
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Verify final conduit status
        const finalData = await this.eventSubClient.getConduitWithShards(this.conduitId);
        if (!finalData) {
          throw new Error(`Failed to verify final conduit ${this.conduitId} status`);
        }

        console.log(`📊 Final conduit status:`, {
          id: finalData.id,
          shardCount: finalData.shard_count,
          activeShards: finalData.shards.filter((s) => s.status === "enabled").length,
          shardStatuses: finalData.shards.map((s) => ({
            id: s.id,
            status: s.status,
            transport: s.transport,
          })),
        });
      } else {
        console.log("⚠️ No session ID available yet, shards will be updated when session is established");
      }
    } catch (error) {
      console.error("❌ Failed to create conduit:", error);
      if (error instanceof AxiosError && error.response) {
        console.error("API Error details:", {
          status: error.response.status,
          data: error.response.data,
        });
      }
      throw error;
    }
  }

  // Add cleanup method to delete conduit when service is stopped

  disconnect(): void {
    if (this.keepaliveTimer) {
      clearTimeout(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
