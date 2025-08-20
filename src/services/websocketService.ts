import type { TwitchEventSubMessage, EventSubscription, EventSubNotification, subscription_type } from "../types/twitch.js";
import { TwitchApi } from "./twitchApi.js";
import { HandlerRegistry } from "../handlers/eventHandler.js";
import { env, type Env } from "../utils/env.js";
import { TwitchEventSubClient } from "./twitch/eventsub.js";
import { logWebSocketEvent } from "../lib/supabase.js";
import { AxiosError } from "axios";
import customLogger from "../lib/logger.js";

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
      customLogger.info("🔌 Connecting to Twitch EventSub WebSocket...");
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        customLogger.success("✅ WebSocket connected");
      };

      this.ws.onmessage = async (event) => {
        try {
          const message: TwitchEventSubMessage = JSON.parse(event.data as string);
          await this.handleMessage(message);
        } catch (error) {
          customLogger.error("❌ Error parsing WebSocket message:", error);
        }
      };

      this.ws.onclose = (event) => this.handleClose(event);

      this.ws.onerror = (error) => {
        customLogger.error("❌ WebSocket error:", error);
      };
    } catch (error) {
      customLogger.error("❌ Failed to connect WebSocket:", error);
      throw error;
    }
  }

  private async reconnect(): Promise<void> {
    if (this.reconnectUrl) {
      customLogger.info("🔄 Reconnecting to:", this.reconnectUrl);
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

    customLogger.info(`⏰ Keepalive timer set to check every ${checkInterval / 1000} seconds`);
  }

  private async checkKeepalive(): Promise<void> {
    const now = Date.now();
    const timeSinceLastKeepalive = now - this.lastKeepaliveTime;
    const expectedInterval = this.keepaliveInterval * 1000;

    // If we haven't received a keepalive in the expected time (plus buffer)
    if (timeSinceLastKeepalive > expectedInterval + 2000) {
      this.missedKeepalives++;
      customLogger.warn(
        `⚠️ Missed keepalive ${this.missedKeepalives}/${this.MAX_MISSED_KEEPALIVES} - ${Math.round(
          timeSinceLastKeepalive / 1000
        )}s since last keepalive`
      );

      if (this.missedKeepalives >= this.MAX_MISSED_KEEPALIVES) {
        customLogger.warn("🔌 Closing connection - too many missed keepalives");
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
        customLogger.info("👋 Session welcome received");
        this.sessionId = payload.session?.id || null;
        this.reconnectUrl = payload.session?.reconnect_url || null;
        this.lastKeepaliveTime = Date.now(); // Initialize keepalive timestamp

        if (payload.session?.keepalive_timeout_seconds) {
          this.startKeepaliveTimer(payload.session.keepalive_timeout_seconds);
        }
        
        // Update conduit shards with the new session ID
        if (this.conduitId && this.sessionId) {
          try {
            await this.eventSubClient.updateAllShardTransports(this.conduitId, {
              method: "websocket",
              session_id: this.sessionId,
            });
            // Log the event
            customLogger.success(`✅ Updated conduit ${this.conduitId} shards with new session ID`);
          } catch (error) {
            console.error("❌ Failed to update conduit shards with session ID:", error);
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
          customLogger.info("🔄 Will reconnect to new URL in 5 seconds...");
          // Give a small delay to ensure any pending messages are processed
          setTimeout(() => {
            customLogger.info("🔄 Closing current connection to reconnect...");
            this.ws?.close();
          }, 5000);
        } else {
          customLogger.error("❌ Reconnect URL not provided in session_reconnect message");
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
        customLogger.warn("⚠️ Subscription revoked:", {
          type: metadata.subscription_type,
          subscriptionId: payload.subscription?.id,
          status: payload.subscription?.status,
          reason: this.getRevocationReason(payload.subscription?.status),
        });

        // Handle different revocation reasons
        switch (payload.subscription?.status) {
          case "user_removed":
            customLogger.error("❌ User no longer exists");
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
            customLogger.error("❌ Authorization token was revoked");
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
            customLogger.error("❌ Subscription type/version no longer supported");
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
            customLogger.error("❌ Unknown revocation reason");
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
        customLogger.error("❓ Unknown message type:", metadata.message_type);
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
        customLogger.error("❌ Internal server error - Twitch's servers encountered an error");
        // Attempt reconnection after a delay
        setTimeout(() => this.connect(), 5000);
        break;

      case 4001:
        customLogger.error("❌ Client sent inbound traffic - Sending messages to Twitch is not allowed");
        // Don't reconnect as this is a client error
        break;

      case 4002:
        customLogger.error("❌ Client failed ping-pong - Keepalive response was not received");
        // Attempt reconnection after a delay
        setTimeout(() => this.connect(), 5000);
        break;

      case 4003:
        customLogger.error("❌ Connection unused - No subscriptions were created within the time limit");
        // Attempt reconnection and ensure subscriptions are created
        setTimeout(async () => {
          await this.connect();
        }, 5000);
        break;

      case 4004:
        customLogger.error("❌ Reconnect grace time expired - Failed to reconnect within 30 seconds");
        // Attempt a fresh connection
        setTimeout(() => this.connect(), 5000);
        break;

      case 4005:
        customLogger.error("❌ Network timeout - Transient network issue");
        // Attempt reconnection after a delay
        setTimeout(() => this.connect(), 5000);
        break;

      case 4006:
        customLogger.error("❌ Network error - Transient network issue");
        // Attempt reconnection after a delay
        setTimeout(() => this.connect(), 5000);
        break;

      case 4007:
        customLogger.error("❌ Invalid reconnect URL - The provided reconnect URL was invalid");
        // Attempt a fresh connection
        setTimeout(() => this.connect(), 5000);
        break;

      default:
        customLogger.info("ℹ️ Normal closure or unknown close code");
        // For normal closure (1000) or unknown codes, attempt reconnection if we have a reconnect URL
        if (this.reconnectUrl) {
          setTimeout(() => this.reconnect(), 5000);
        }
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
