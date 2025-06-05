export interface TwitchEventSubMessage {
  metadata: {
    message_id: string;
    message_type: string;
    message_timestamp: string;
    subscription_type?: string;
    subscription_version?: string;
  };
  payload: {
    session?: {
      id: string;
      status: string;
      connected_at: string;
      keepalive_timeout_seconds: number;
      reconnect_url?: string;
    };
    subscription?: {
      id: string;
      status: string;
      type: string;
      version: string;
      condition: Record<string, any>;
      transport: {
        method: string;
        session_id?: string;
        callback?: string;
      };
      created_at: string;
    };
    event?: Record<string, any>;
  };
}

export interface TwitchWebhookEvent {
  subscription: {
    id: string;
    type: string;
    version: string;
    status: string;
    cost: number;
    condition: Record<string, any>;
    transport: {
      method: string;
      callback: string;
    };
    created_at: string;
  };
  event?: Record<string, any>;
  challenge?: string;
}


export interface EventSubscription {
  type: string;
  version: string;
  condition: Record<string, any>;
}
