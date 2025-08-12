import { format } from "date-fns";

export const GlobalVariableResolvers: Record<string, () => Promise<string>> = {
  // Random
  random_number: async () => {
    return Math.random().toString();
  },
  random_string: async () => {
    return Math.random().toString(36).substring(2, 15);
  },
  random_boolean: async () => {
    return Math.random() > 0.5 ? "true" : "false";
  },

  // Current time
  current_time: async () => {
    return format(new Date(), "HH:mm:ss");
  },

  current_date: async () => {
    return format(new Date(), "yyyy-MM-dd");
  },
};

