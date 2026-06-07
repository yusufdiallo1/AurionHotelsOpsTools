// Generated Supabase types. Regenerate after every migration via the Supabase MCP
// `generate_typescript_types` tool (CLI gen fails on access control), then paste here.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string
          created_at: string | null
          handover_id: string | null
          id: string
          meta: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string
          created_at?: string | null
          handover_id?: string | null
          id?: string
          meta?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string
          created_at?: string | null
          handover_id?: string | null
          id?: string
          meta?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_handover_id_fkey"
            columns: ["handover_id"]
            isOneToOne: false
            referencedRelation: "handovers"
            referencedColumns: ["id"]
          },
        ]
      }
      handovers: {
        Row: {
          cash_drawer: number
          cash_recount: number | null
          cash_variance: number | null
          created_at: string | null
          drive_error: string | null
          drive_file_id: string | null
          drive_uploaded_at: string | null
          id: string
          incoming_name: string | null
          incoming_signature_url: string | null
          incoming_signed_at: string | null
          maintenance_issues: string | null
          notes: string | null
          outgoing_name: string
          outgoing_signature_url: string | null
          outgoing_signed_at: string | null
          pdf_archive_error: string | null
          pdf_archived_at: string | null
          pdf_path: string | null
          pending_requests: string | null
          property_id: string
          rooms_occupied: number
          sheet_sync_error: string | null
          sheet_synced_at: string | null
          shift_date: string
          shift_type: string
          status: string
          synced_to_sheets: boolean
          variance_note: string | null
        }
        Insert: {
          cash_drawer: number
          cash_recount?: number | null
          cash_variance?: number | null
          created_at?: string | null
          drive_error?: string | null
          drive_file_id?: string | null
          drive_uploaded_at?: string | null
          id?: string
          incoming_name?: string | null
          incoming_signature_url?: string | null
          incoming_signed_at?: string | null
          maintenance_issues?: string | null
          notes?: string | null
          outgoing_name: string
          outgoing_signature_url?: string | null
          outgoing_signed_at?: string | null
          pdf_archive_error?: string | null
          pdf_archived_at?: string | null
          pdf_path?: string | null
          pending_requests?: string | null
          property_id: string
          rooms_occupied: number
          sheet_sync_error?: string | null
          sheet_synced_at?: string | null
          shift_date: string
          shift_type: string
          status?: string
          synced_to_sheets?: boolean
          variance_note?: string | null
        }
        Update: {
          cash_drawer?: number
          cash_recount?: number | null
          cash_variance?: number | null
          created_at?: string | null
          drive_error?: string | null
          drive_file_id?: string | null
          drive_uploaded_at?: string | null
          id?: string
          incoming_name?: string | null
          incoming_signature_url?: string | null
          incoming_signed_at?: string | null
          maintenance_issues?: string | null
          notes?: string | null
          outgoing_name?: string
          outgoing_signature_url?: string | null
          outgoing_signed_at?: string | null
          pdf_archive_error?: string | null
          pdf_archived_at?: string | null
          pdf_path?: string | null
          pending_requests?: string | null
          property_id?: string
          rooms_occupied?: number
          sheet_sync_error?: string | null
          sheet_synced_at?: string | null
          shift_date?: string
          shift_type?: string
          status?: string
          synced_to_sheets?: boolean
          variance_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "handovers_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string | null
          handover_id: string | null
          id: string
          read: boolean
          recipient_id: string
          title: string
          type: string
        }
        Insert: {
          body?: string
          created_at?: string | null
          handover_id?: string | null
          id?: string
          read?: boolean
          recipient_id: string
          title?: string
          type: string
        }
        Update: {
          body?: string
          created_at?: string | null
          handover_id?: string | null
          id?: string
          read?: boolean
          recipient_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_handover_id_fkey"
            columns: ["handover_id"]
            isOneToOne: false
            referencedRelation: "handovers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          property_id: string | null
          role: string
          shift_type: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          email?: string
          full_name?: string
          id: string
          phone?: string | null
          property_id?: string | null
          role?: string
          shift_type?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          property_id?: string | null
          role?: string
          shift_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          code: string
          created_at: string | null
          id: string
          name_ar: string
          name_en: string
          total_rooms: number
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          name_ar: string
          name_en: string
          total_rooms?: number
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          name_ar?: string
          name_en?: string
          total_rooms?: number
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
