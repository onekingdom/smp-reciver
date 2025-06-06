export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      auth_logs: {
        Row: {
          action: string
          id: number
          ip_address: string | null
          timestamp: string | null
          user_id: string
        }
        Insert: {
          action: string
          id?: never
          ip_address?: string | null
          timestamp?: string | null
          user_id: string
        }
        Update: {
          action?: string
          id?: never
          ip_address?: string | null
          timestamp?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chat_commands: {
        Row: {
          channel_id: string
          created_at: string
          created_by: string
          id: string
          response: string
          trigger: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          created_by: string
          id?: string
          response: string
          trigger: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          created_by?: string
          id?: string
          response?: string
          trigger?: string
        }
        Relationships: []
      }
      minecraft_players: {
        Row: {
          created_at: string
          id: number
          is_approved: boolean | null
          minecraft_username: string | null
          minecraft_uuid: string | null
          twitch_integration_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          is_approved?: boolean | null
          minecraft_username?: string | null
          minecraft_uuid?: string | null
          twitch_integration_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          is_approved?: boolean | null
          minecraft_username?: string | null
          minecraft_uuid?: string | null
          twitch_integration_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "minecraft_players_twitch_integration_id_fkey"
            columns: ["twitch_integration_id"]
            isOneToOne: false
            referencedRelation: "twitch_integration"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "minecraft_players_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      twitch_app_token: {
        Row: {
          access_token: string | null
          created_at: string
          expires_at: string | null
          id: number
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          expires_at?: string | null
          id?: number
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          created_at?: string
          expires_at?: string | null
          id?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      twitch_integration: {
        Row: {
          access_token: string
          broadcaster_type: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          is_live: boolean
          profile_image_url: string | null
          refresh_token: string
          twitch_user_id: string
          updated_at: string | null
          user_id: string
          username: string
        }
        Insert: {
          access_token: string
          broadcaster_type?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_live?: boolean
          profile_image_url?: string | null
          refresh_token: string
          twitch_user_id: string
          updated_at?: string | null
          user_id: string
          username?: string
        }
        Update: {
          access_token?: string
          broadcaster_type?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_live?: boolean
          profile_image_url?: string | null
          refresh_token?: string
          twitch_user_id?: string
          updated_at?: string | null
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "twitch_integration_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          updated_at: string | null
          username: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      websocket_logs: {
        Row: {
          connection_id: string | null
          created_at: string
          event_type: string
          extra: string | null
          id: string
          message: Json
          shard_id: string | null
        }
        Insert: {
          connection_id?: string | null
          created_at?: string
          event_type: string
          extra?: string | null
          id?: string
          message: Json
          shard_id?: string | null
        }
        Update: {
          connection_id?: string | null
          created_at?: string
          event_type?: string
          extra?: string | null
          id?: string
          message?: Json
          shard_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
