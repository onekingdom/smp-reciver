// src/index.ts
import { env } from './config/config.js';
import { TwitchEventSubReceiver } from './twitchEventSubReceiver.js';

async function main() {
  try {
    const receiver = new TwitchEventSubReceiver(env);
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('🛑 Received SIGINT, shutting down gracefully...');
      await receiver.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('🛑 Received SIGTERM, shutting down gracefully...');
      await receiver.stop();
      process.exit(0);
    });

    await receiver.start();
  } catch (error) {
    console.error('❌ Failed to start receiver:', error);
    process.exit(1);
  }
}


main()