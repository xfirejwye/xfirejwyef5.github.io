export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ip_blacklist: {
        Row: {
          block_comments: boolean
          block_uploads: boolean
          block_viewing: boolean
          created_at: string
          id: string
          ip: unknown
          note: string | null
        }
        Insert: {
          block_comments?: boolean
          block_uploads?: boolean
          block_viewing?: boolean
          created_at?: string
          id?: string
          ip: unknown
          note?: string | null
        }
        Update: {
          block_comments?: boolean
          block_uploads?: boolean
          block_viewing?: boolean
          created_at?: string
          id?: string
          ip?: unknown
          note?: string | null
        }
        Relationships: []
      }
      upload_attempts: {
        Row: {
          created_at: string
          id: string
          ip_hash: string
          video_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_hash: string
          video_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_hash?: string
          video_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_comments: {
        Row: {
          author_name: string
          body: string
          created_at: string
          id: string
          ip_address: unknown
          video_id: string
        }
        Insert: {
          author_name?: string
          body: string
          created_at?: string
          id?: string
          ip_address?: unknown
          video_id: string
        }
        Update: {
          author_name?: string
          body?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos_admin"
            referencedColumns: ["id"]
          },
        ]
      }
      video_reports: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_reports_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_reports_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos_admin"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          created_at: string
          description: string | null
          duration_seconds: number | null
          id: string
          ip_address: unknown
          is_hidden: boolean
          is_short: boolean
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          thumbnail_path: string | null
          title: string
          uploader_name: string | null
          views: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          ip_address?: unknown
          is_hidden?: boolean
          is_short?: boolean
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          thumbnail_path?: string | null
          title: string
          uploader_name?: string | null
          views?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          ip_address?: unknown
          is_hidden?: boolean
          is_short?: boolean
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          thumbnail_path?: string | null
          title?: string
          uploader_name?: string | null
          views?: number
        }
        Relationships: []
      }
    }
    Views: {
      comments_admin: {
        Row: {
          author_name: string | null
          body: string | null
          created_at: string | null
          id: string | null
          ip_address: unknown
          ip_text: string | null
          video_id: string | null
        }
        Insert: {
          author_name?: string | null
          body?: string | null
          created_at?: string | null
          id?: string | null
          ip_address?: unknown
          ip_text?: never
          video_id?: string | null
        }
        Update: {
          author_name?: string | null
          body?: string | null
          created_at?: string | null
          id?: string | null
          ip_address?: unknown
          ip_text?: never
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos_admin"
            referencedColumns: ["id"]
          },
        ]
      }
      videos_admin: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          ip_address: unknown
          ip_text: string | null
          is_hidden: boolean | null
          mime_type: string | null
          size_bytes: number | null
          storage_path: string | null
          thumbnail_path: string | null
          title: string | null
          uploader_name: string | null
          views: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          ip_address?: unknown
          ip_text?: never
          is_hidden?: boolean | null
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          thumbnail_path?: string | null
          title?: string | null
          uploader_name?: string | null
          views?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          ip_address?: unknown
          ip_text?: never
          is_hidden?: boolean | null
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          thumbnail_path?: string | null
          title?: string | null
          uploader_name?: string | null
          views?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_upload_rate_limit: { Args: { _ip_hash: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_video_views: { Args: { _video_id: string }; Returns: undefined }
      is_ip_blocked: { Args: { _ip: unknown; _kind: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
