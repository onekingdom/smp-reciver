export type GetChattersResponse = {
  data: Array<{
    user_id: string;
    user_login: string;
    user_name: string;
  }>;
  pagination: {
    cursor?: string;
  };
  total: number;
};