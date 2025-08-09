import { addCooldown, updateCooldown } from "@/lib/supabase";
import { Database } from "@/types/supabase";

type CooldownRow = Database["public"]["Tables"]["commands_active_cooldowns"]["Row"];

export interface CooldownConfig {
  type: "user" | "global";
  duration_seconds: number;
}

export interface CooldownCheckResult {
  allowed: boolean;
  blockedBy?: {
    type: "user" | "global";
    remainingTime: number;
  };
}

export async function checkCommandCooldowns(
  commandId: string,
  userId: string,
  cooldownConfigs: CooldownConfig[],
  activeCooldowns: CooldownRow[]
): Promise<CooldownCheckResult> {
  const currentTime = Date.now();

  // First, check if any cooldowns are blocking this command
  for (const config of cooldownConfigs) {
    const isBlocked = await isCooldownActive(
      commandId,
      userId,
      config.type,
      activeCooldowns,
      currentTime
    );

    if (isBlocked.active) {
      return {
        allowed: false,
        blockedBy: {
          type: config.type,
          remainingTime: isBlocked.remainingTime!
        }
      };
    }
  }

  // If we reach here, no cooldowns are blocking
  // Now activate cooldowns for this command execution
  for (const config of cooldownConfigs) {
    await activateCooldown(
      commandId,
      userId,
      config.type,
      config.duration_seconds * 1000,
      activeCooldowns
    );
  }

  return { allowed: true };
}

async function isCooldownActive(
  commandId: string,
  userId: string,
  type: "user" | "global",
  activeCooldowns: CooldownRow[],
  currentTime: number
): Promise<{ active: boolean; remainingTime?: number }> {
  
  if (type === "global") {
    // Check for global cooldown
    const globalCooldown = activeCooldowns.find(cd => 
      cd.command_id === commandId && 
      cd.type === "global" && 
      cd.chatter_id === null
    );

    if (globalCooldown) {
      const expiresAt = new Date(globalCooldown.expires_at).getTime();
      if (currentTime < expiresAt) {
        return {
          active: true,
          remainingTime: expiresAt - currentTime
        };
      }
    }
  } else if (type === "user") {
    // For user cooldowns, FIRST check if there's an active global cooldown
    // because global cooldowns block everyone
    const globalCooldown = activeCooldowns.find(cd => 
      cd.command_id === commandId && 
      cd.type === "global" && 
      cd.chatter_id === null
    );

    if (globalCooldown) {
      const globalExpiresAt = new Date(globalCooldown.expires_at).getTime();
      if (currentTime < globalExpiresAt) {
        return {
          active: true,
          remainingTime: globalExpiresAt - currentTime
        };
      }
    }

    // Then check user-specific cooldown
    const userCooldown = activeCooldowns.find(cd => 
      cd.command_id === commandId && 
      cd.type === "user" && 
      cd.chatter_id === userId
    );

    if (userCooldown) {
      const expiresAt = new Date(userCooldown.expires_at).getTime();
      if (currentTime < expiresAt) {
        return {
          active: true,
          remainingTime: expiresAt - currentTime
        };
      }
    }
  }

  return { active: false };
}

async function activateCooldown(
  commandId: string,
  userId: string,
  type: "user" | "global",
  duration: number,
  activeCooldowns: CooldownRow[]
): Promise<void> {
  const expiresAt = new Date(Date.now() + duration);

  if (type === "global") {
    // Find existing global cooldown
    const existingCooldown = activeCooldowns.find(cd => 
      cd.command_id === commandId && 
      cd.type === "global" && 
      cd.chatter_id === null
    );

    if (existingCooldown) {
      await updateCooldown(existingCooldown.id, expiresAt);
    } else {
      await addCooldown(commandId, "global", null, expiresAt.toISOString());
    }
  } else if (type === "user") {
    // Find existing user cooldown
    const existingCooldown = activeCooldowns.find(cd => 
      cd.command_id === commandId && 
      cd.type === "user" && 
      cd.chatter_id === userId
    );

    if (existingCooldown) {
      await updateCooldown(existingCooldown.id, expiresAt);
    } else {
      await addCooldown(commandId, "user", userId, expiresAt.toISOString());
    }
  }
}

// Helper function to get the maximum remaining time from multiple blocked cooldowns
export function getMaxRemainingTime(results: CooldownCheckResult[]): number {
  const blockedResults = results.filter(r => !r.allowed && r.blockedBy);
  if (blockedResults.length === 0) return 0;
  
  return Math.max(...blockedResults.map(r => r.blockedBy!.remainingTime));
}

// Usage example for your main command handler:
/*
if (command.command_cooldowns && command.command_cooldowns.length > 0) {
  const cooldownResult = await checkCommandCooldowns(
    command.id,
    chatter_user_id,
    command.command_cooldowns.map(cd => ({
      type: cd.type as "user" | "global",
      duration_seconds: cd.duration_seconds
    })),
    command.commands_active_cooldowns || []
  );

  if (!cooldownResult.allowed) {
    const remainingSeconds = Math.ceil(cooldownResult.blockedBy!.remainingTime / 1000);
    const cooldownType = cooldownResult.blockedBy!.type === "global" ? "globally" : "for you";
    
    await twitchApi.chat.sendMessage({ 
      message: `Command is on cooldown ${cooldownType}. Please wait ${remainingSeconds} seconds.`, 
      replyToMessageId: message_id 
    });
    return;
  }
}
*/