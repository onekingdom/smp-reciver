import type { z } from "zod";
import type { ChatMessageSchema } from "@/schema/twitch-schema";
import { z as zod } from "zod";

// Import variable resolvers from separate files
import { GlobalVariableResolvers, type GlobalContext } from "./variables/global";
import { TwitchVariableResolvers, type TwitchContext } from "./variables/twitch";
import customLogger from "@/lib/logger";

// Base context that all resolvers can use
export type BaseContext = {
  event?: z.infer<typeof ChatMessageSchema>;
  [key: string]: any; // Allow additional properties for future services
};

// Generic resolver function type (legacy - returns strings only)
export type VariableResolver<TContext = BaseContext> = (ctx: TContext) => Promise<string>;

// Flexible resolver function type that can return any data type
export type FlexibleResolver<TContext = BaseContext> = (ctx: TContext) => Promise<any>;

// Service dependency configuration
export type ServiceDependencies = {
  required: string[]; // Required services for this namespace
  optional: string[]; // Optional services
};

// Union of all possible contexts (expand this as you add services)
export type ServiceContext = GlobalContext | TwitchContext; // | YouTubeContext | DiscordContext | SpotifyContext;

// ===== SERVICE CONFIGURATIONS =====

// Define what each namespace requires
const ServiceRequirements: Record<string, ServiceDependencies> = {
  global: {
    required: [],
    optional: [],
  },
  twitch: {
    required: ["twitchApi"],
    optional: ["event"],
  },
};

// ===== RESOLVER REGISTRY =====

const ResolverRegistry: Record<string, Record<string, VariableResolver<any> | FlexibleResolver<any>>> = {
  global: GlobalVariableResolvers,
  twitch: TwitchVariableResolvers,
};

// ===== MAIN RESOLVER FUNCTION =====

export async function resolveVariables(template: string, ctx: ServiceContext = {}, actionResults?: Record<string, any>): Promise<string> {
  // Extract all variable references
  const matches = template.match(/\$\{([\w\.-]+)\}/g) || [];
  if (matches.length === 0) return template;

  // Get all namespaces used in template
  const usedNamespaces = extractNamespacesFromTemplate(template);

  // Validate that context has all required services
  validateContextForNamespaces(ctx, usedNamespaces);

  let result = template;

  // Resolve each variable
  for (const match of matches) {
    const raw = match.slice(2, -1); // Remove ${...}

    // Determine namespace and key
    const hasNamespace = raw.includes(".");

    // check if the namespace is a UUID and resolve from actionResults
    const parts = raw.split(".");
    const potentialUuid = parts[0];
    if (isUuid(potentialUuid)) {
      if (!actionResults?.[potentialUuid]) {
        customLogger.warn(`No action results found for UUID: ${potentialUuid}`);
        result = result.replace(match, "");
        continue;
      }

      const pathParts = parts.slice(1); // remaining path inside the action result
      const value = getDeepValue(actionResults?.[potentialUuid], pathParts);
      result = result.replace(match, value === undefined || value === null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value));
      continue;
    }

    const [namespace, key] = hasNamespace ? (raw.split(".", 2) as [string, string]) : ["twitch", raw]; // Default to twitch for backwards compatibility

    const namespaceResolvers = ResolverRegistry[namespace];
    if (!namespaceResolvers) {
      customLogger.warn(`Unknown namespace: ${namespace}`);
      result = result.replace(match, "");
      continue;
    }

    const resolver = namespaceResolvers[key];
    if (!resolver) {
      console.warn(`Unknown variable: ${namespace}.${key}`);
      result = result.replace(match, "");
      continue;
    }

    try {
      const value = await resolver(ctx);
      // Convert non-string values to string for template replacement
      const stringValue = typeof value === 'string' ? value : 
                         (value === null || value === undefined) ? '' :
                         typeof value === 'object' ? JSON.stringify(value) : 
                         String(value);
      result = result.replace(match, stringValue);
    } catch (error) {
      console.error(`Error resolving ${namespace}.${key}:`, error);
      result = result.replace(match, "");
    }
  }

  return result;
}

// ===== RAW VALUE RESOLVER FUNCTION =====

export async function resolveRawValue(variableRef: string, ctx: ServiceContext = {}, actionResults?: Record<string, any>): Promise<any> {
  // Remove ${...} if present
  const raw = variableRef.startsWith('${') && variableRef.endsWith('}') 
    ? variableRef.slice(2, -1) 
    : variableRef;

  // Get all namespaces used in variable reference
  const usedNamespaces = extractNamespacesFromTemplate(`\${${raw}}`);

  // Validate that context has all required services
  validateContextForNamespaces(ctx, usedNamespaces);

  // Determine namespace and key
  const hasNamespace = raw.includes(".");

  // Check if the namespace is a UUID and resolve from actionResults
  const parts = raw.split(".");
  const potentialUuid = parts[0];
  if (isUuid(potentialUuid)) {
    console.log(`Found UUID: ${potentialUuid}`);

    if (!actionResults?.[potentialUuid]) {
      console.warn(`No action results found for UUID: ${potentialUuid}`);
      return null;
    }

    const pathParts = parts.slice(1); // remaining path inside the action result
    return getDeepValue(actionResults?.[potentialUuid], pathParts);
  }

  const [namespace, key] = hasNamespace ? (raw.split(".", 2) as [string, string]) : ["twitch", raw]; // Default to twitch for backwards compatibility

  const namespaceResolvers = ResolverRegistry[namespace];
  if (!namespaceResolvers) {
    console.warn(`Unknown namespace: ${namespace}`);
    return null;
  }

  const resolver = namespaceResolvers[key];
  if (!resolver) {
    console.warn(`Unknown variable: ${namespace}.${key}`);
    return null;
  }

  try {
    // Return the raw value without string conversion
    return await resolver(ctx);
  } catch (error) {
    console.error(`Error resolving ${namespace}.${key}:`, error);
    return null;
  }
}

// ===== OBJECT VALUE RESOLVER FUNCTION =====

export async function resolveObjectValues(obj: any, ctx: ServiceContext = {}, actionResults?: Record<string, any>): Promise<any> {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    const resolvedArray = [];
    for (const item of obj) {
      resolvedArray.push(await resolveObjectValues(item, ctx, actionResults));
    }
    return resolvedArray;
  }

  // Handle objects
  if (typeof obj === "object") {
    const resolvedObj: any = {};
    for (const [key, value] of Object.entries(obj)) {
      resolvedObj[key] = await resolveObjectValues(value, ctx, actionResults);
    }
    return resolvedObj;
  }

  // Handle strings
  if (typeof obj === "string") {
    // Check if this string is a single variable reference
    const singleVarMatch = obj.match(/^\$\{([\w\.-]+)\}$/);
    if (singleVarMatch) {
      // If it's a single variable, return the raw value (could be array, object, etc.)
      return await resolveRawValue(obj, ctx, actionResults);
    } else {
      // If it contains multiple variables or mixed content, use string resolution
      return await resolveVariables(obj, ctx, actionResults);
    }
  }

  // Return primitive values as-is (numbers, booleans, etc.)
  return obj;
}

// ===== helpers =====
function isUuid(value: string): boolean {
  return zod.string().uuid().safeParse(value).success;
}

function getDeepValue(obj: any, pathParts: string[]): any {
  if (!obj) return undefined;
  if (pathParts.length === 0) return obj;
  return pathParts.reduce((acc: any, key: string) => (acc == null ? undefined : acc[key]), obj);
}

function validateContextForNamespaces(ctx: BaseContext, namespaces: string[]): void {
  const errors: string[] = [];

  for (const namespace of namespaces) {
    if (isUuid(namespace)) {
      continue;
    }

    const requirements = ServiceRequirements[namespace];
    if (!requirements) {
      errors.push(`Unknown namespace: ${namespace}`);
      continue;
    }

    const missingServices = requirements.required.filter((service) => !(service in ctx) || ctx[service] === undefined);

    if (missingServices.length > 0) {
      errors.push(`Namespace '${namespace}' requires: ${missingServices.join(", ")}. ` + `Please provide these services in the context.`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Context validation failed:\n${errors.join("\n")}`);
  }
}

function extractNamespacesFromTemplate(template: string): string[] {
  const matches = template.match(/\$\{([\w\.-]+)\}/g) || [];
  const namespaces = new Set<string>();

  for (const match of matches) {
    const raw = match.slice(2, -1);
    const hasNamespace = raw.includes(".");
    const [namespace] = hasNamespace ? raw.split(".", 2) : ["twitch", raw];
    namespaces.add(namespace);
  }

  return Array.from(namespaces);
}

// ===== HELPER FUNCTIONS FOR DYNAMIC REGISTRATION =====

export function registerVariableResolver(
  namespace: string,
  key: string,
  resolver: VariableResolver<any>,
  dependencies: ServiceDependencies = { required: [], optional: [] }
): void {
  if (!ResolverRegistry[namespace]) {
    ResolverRegistry[namespace] = {};
  }

  ResolverRegistry[namespace][key] = resolver;
  ServiceRequirements[namespace] = dependencies;
}

export function registerNamespace(
  namespace: string,
  resolvers: Record<string, VariableResolver<any>>,
  dependencies: ServiceDependencies = { required: [], optional: [] }
): void {
  ResolverRegistry[namespace] = resolvers;
  ServiceRequirements[namespace] = dependencies;
}

// ===== UTILITY FUNCTIONS =====

export function getAvailableVariables(): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [namespace, resolvers] of Object.entries(ResolverRegistry)) {
    result[namespace] = Object.keys(resolvers);
  }
  return result;
}

export function getRequiredServices(template: string): Record<string, string[]> {
  const namespaces = extractNamespacesFromTemplate(template);
  const result: Record<string, string[]> = {};

  for (const namespace of namespaces) {
    const requirements = ServiceRequirements[namespace];
    if (requirements) {
      result[namespace] = requirements.required;
    }
  }

  return result;
}

export function getServiceRequirements(): Record<string, ServiceDependencies> {
  return { ...ServiceRequirements };
}
