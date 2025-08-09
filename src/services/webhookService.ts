// src/services/webhookService.ts
import { Hono } from 'hono';
import type { TwitchWebhookEvent } from '../types/twitch.js';
import { verifyWebhookSignature } from '../utils/crypto.js';
import type { Env } from '../utils/env.js';

export class WebhookService {
  private app: Hono;

  constructor(private config: Env) {
    this.app = new Hono();
    this.setupRoutes();
  }

  private setupRoutes() {
    // Main EventSub webhook endpoint
    this.app.post('/webhooks/twitch/eventsub', async (c) => {
      try {
        const body = await c.req.text();
        const signature = c.req.header('Twitch-Eventsub-Message-Signature');
        const messageId = c.req.header('Twitch-Eventsub-Message-Id');
        const timestamp = c.req.header('Twitch-Eventsub-Message-Timestamp');
        const messageType = c.req.header('Twitch-Eventsub-Message-Type');

        if (!signature || !messageId || !timestamp || !messageType) {
          console.log('❌ Missing required headers');
          return c.text('Bad Request', 400);
        }

        // Verify webhook signature
        if (!verifyWebhookSignature(signature, messageId, timestamp, body, this.config.TWITCH_WEBHOOK_SECRET)) {
          console.log('❌ Invalid webhook signature');
          return c.text('Forbidden', 403);
        }

        const event: TwitchWebhookEvent = JSON.parse(body);

        // Handle different message types
        switch (messageType) {
          case 'webhook_callback_verification':
            console.log('✅ Webhook verification challenge received');
            return c.text(event.challenge || '');

          case 'revocation':
            console.log('⚠️ Subscription revoked:', event.subscription);
            return c.text('OK');

          case 'notification':
            console.log('📨 Webhook notification received:', {
              type: event.subscription.type,
              id: event.subscription.id
            });
            
            if (event.event) {
              // await this.eventHandler.handleEvent(event.subscription.type, event.event);
            }
            return c.text('OK');

          default:
            console.log('❓ Unknown message type:', messageType);
            return c.text('OK');
        }
      } catch (error) {
        console.error('❌ Webhook error:', error);
        return c.text('Internal Server Error', 500);
      }
    });

    // Health check endpoint
    this.app.get('/health', (c) => c.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      service: 'twitch-eventsub-webhook'
    }));

    // Status endpoint
    this.app.get('/status', (c) => c.json({
      webhook: 'active',
      timestamp: new Date().toISOString()
    }));
  }

  getApp(): Hono {
    return this.app;
  }
}