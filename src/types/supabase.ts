export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      actions: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          module: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          module: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          module?: string
        }
        Relationships: []
      }
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
          response: string | null
          trigger: string
          visibility: string
          workflow: string | null
        }
        Insert: {
          channel_id: string
          created_at?: string
          created_by: string
          id?: string
          response?: string | null
          trigger: string
          visibility?: string
          workflow?: string | null
        }
        Update: {
          channel_id?: string
          created_at?: string
          created_by?: string
          id?: string
          response?: string | null
          trigger?: string
          visibility?: string
          workflow?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_commands_workflow_fkey"
            columns: ["workflow"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      command_aliases: {
        Row: {
          alias: string
          command_id: string
          id: string
        }
        Insert: {
          alias: string
          command_id: string
          id?: string
        }
        Update: {
          alias?: string
          command_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "command_aliases_command_id_fkey"
            columns: ["command_id"]
            isOneToOne: false
            referencedRelation: "chat_commands"
            referencedColumns: ["id"]
          },
        ]
      }
      command_cooldowns: {
        Row: {
          command_id: string
          duration_seconds: number
          id: string
          type: string
        }
        Insert: {
          command_id: string
          duration_seconds: number
          id?: string
          type: string
        }
        Update: {
          command_id?: string
          duration_seconds?: number
          id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "command_cooldowns_command_id_fkey"
            columns: ["command_id"]
            isOneToOne: false
            referencedRelation: "chat_commands"
            referencedColumns: ["id"]
          },
        ]
      }
      command_permissions: {
        Row: {
          command_id: string
          id: string
          role: Database["public"]["Enums"]["command_permission"]
        }
        Insert: {
          command_id: string
          id?: string
          role?: Database["public"]["Enums"]["command_permission"]
        }
        Update: {
          command_id?: string
          id?: string
          role?: Database["public"]["Enums"]["command_permission"]
        }
        Relationships: [
          {
            foreignKeyName: "command_permissions_command_id_fkey"
            columns: ["command_id"]
            isOneToOne: false
            referencedRelation: "chat_commands"
            referencedColumns: ["id"]
          },
        ]
      }
      command_usage_logs: {
        Row: {
          channel_id: string
          command_id: string
          id: string
          message: string | null
          used_at: string | null
          user_id: string
          user_name: string
        }
        Insert: {
          channel_id: string
          command_id: string
          id?: string
          message?: string | null
          used_at?: string | null
          user_id: string
          user_name: string
        }
        Update: {
          channel_id?: string
          command_id?: string
          id?: string
          message?: string | null
          used_at?: string | null
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "command_usage_logs_command_id_fkey"
            columns: ["command_id"]
            isOneToOne: false
            referencedRelation: "chat_commands"
            referencedColumns: ["id"]
          },
        ]
      }
      commands_active_cooldowns: {
        Row: {
          chatter_id: string | null
          command_id: string
          created_at: string
          expires_at: string
          id: string
          type: string
        }
        Insert: {
          chatter_id?: string | null
          command_id?: string
          created_at?: string
          expires_at: string
          id?: string
          type: string
        }
        Update: {
          chatter_id?: string | null
          command_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "commands_active_cooldowns_command_id_fkey"
            columns: ["command_id"]
            isOneToOne: false
            referencedRelation: "chat_commands"
            referencedColumns: ["id"]
          },
        ]
      }
      minecraft_players: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          denial_reason: string | null
          id: number
          is_approved: boolean | null
          minecraft_username: string | null
          minecraft_uuid: string | null
          twitch_integration_id: string | null
          user_id: string | null
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          denial_reason?: string | null
          id?: number
          is_approved?: boolean | null
          minecraft_username?: string | null
          minecraft_uuid?: string | null
          twitch_integration_id?: string | null
          user_id?: string | null
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          denial_reason?: string | null
          id?: number
          is_approved?: boolean | null
          minecraft_username?: string | null
          minecraft_uuid?: string | null
          twitch_integration_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "minecraft_players_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
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
      permissions: {
        Row: {
          action: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          resource: string
        }
        Insert: {
          action: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          resource: string
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          resource?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission_id: string | null
          role_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission_id?: string | null
          role_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          permission_id?: string | null
          role_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
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
      twitch_eventsub_notifications: {
        Row: {
          broadcaster_id: string
          event_data: Json
          event_type: string
          id: string
          received_at: string
        }
        Insert: {
          broadcaster_id: string
          event_data: Json
          event_type: string
          id?: string
          received_at?: string
        }
        Update: {
          broadcaster_id?: string
          event_data?: Json
          event_type?: string
          id?: string
          received_at?: string
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
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          expires_at: string | null
          id: string
          role_id: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          expires_at?: string | null
          id?: string
          role_id?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          expires_at?: string | null
          id?: string
          role_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
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
          status: string | null
        }
        Insert: {
          connection_id?: string | null
          created_at?: string
          event_type: string
          extra?: string | null
          id?: string
          message: Json
          shard_id?: string | null
          status?: string | null
        }
        Update: {
          connection_id?: string | null
          created_at?: string
          event_type?: string
          extra?: string | null
          id?: string
          message?: Json
          shard_id?: string | null
          status?: string | null
        }
        Relationships: []
      }
      wordflow_run_queue: {
        Row: {
          created_at: string | null
          id: number
          processed: boolean | null
          run_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          processed?: boolean | null
          run_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          processed?: boolean | null
          run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "run_queue_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      workdflow_run_actions: {
        Row: {
          action_id: string | null
          error: string | null
          finished_at: string | null
          id: string
          input: Json | null
          order: number | null
          output: Json | null
          run_id: string | null
          started_at: string | null
          status: string
        }
        Insert: {
          action_id?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          input?: Json | null
          order?: number | null
          output?: Json | null
          run_id?: string | null
          started_at?: string | null
          status?: string
        }
        Update: {
          action_id?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          input?: Json | null
          order?: number | null
          output?: Json | null
          run_id?: string | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "run_actions_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "workflow_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "run_actions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_actions: {
        Row: {
          config: Json | null
          created_at: string | null
          id: string
          module: string
          order: number
          type: string
          workflow_id: string
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          id?: string
          module: string
          order: number
          type: string
          workflow_id: string
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          id?: string
          module?: string
          order?: number
          type?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_actions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_runs: {
        Row: {
          created_at: string | null
          finished_at: string | null
          id: string
          started_at: string | null
          status: string
          trigger_payload: Json | null
          workflow_id: string | null
        }
        Insert: {
          created_at?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string | null
          status?: string
          trigger_payload?: Json | null
          workflow_id?: string | null
        }
        Update: {
          created_at?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string | null
          status?: string
          trigger_payload?: Json | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_triggers: {
        Row: {
          config: Json | null
          created_at: string | null
          event: string
          id: string
          module: string
          twitch_user_id: string
          workflow_id: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          event: string
          id?: string
          module: string
          twitch_user_id: string
          workflow_id?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          event?: string
          id?: string
          module?: string
          twitch_user_id?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_triggers_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          created_at: string | null
          description: string | null
          enabled: boolean | null
          id: string
          name: string
          twitch_user_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          name: string
          twitch_user_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          name?: string
          twitch_user_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflows_twitch_user_id_fkey"
            columns: ["twitch_user_id"]
            isOneToOne: false
            referencedRelation: "twitch_integration"
            referencedColumns: ["twitch_user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_minecraft_player_id: {
        Args: { input_twitch_user_id: string }
        Returns: string
      }
      get_user_permissions: {
        Args: { p_user_id: string }
        Returns: {
          permission_name: string
          resource: string
          action: string
        }[]
      }
      get_user_roles: {
        Args: { p_user_id: string }
        Returns: {
          role_name: string
          role_description: string
          assigned_at: string
          expires_at: string
        }[]
      }
      user_has_permission: {
        Args: { p_user_id: string; p_permission_name: string }
        Returns: boolean
      }
      user_has_role: {
        Args: { p_user_id: string; p_role_name: string }
        Returns: boolean
      }
    }
    Enums: {
      command_permission:
        | "everyone"
        | "follower"
        | "vip"
        | "subscriber"
        | "founder"
        | "moderator"
        | "super_moderator"
        | "broadcaster"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      command_permission: [
        "everyone",
        "follower",
        "vip",
        "subscriber",
        "founder",
        "moderator",
        "super_moderator",
        "broadcaster",
      ],
    },
  },
} as const
