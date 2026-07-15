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
      customers: {
        Row: {
          address: string | null
          created_at: string
          id: string
          lifetime_spend_cents: number
          name: string
          phone: string
          plumber_id: string
          updated_at: string
          visit_count: number
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          lifetime_spend_cents?: number
          name: string
          phone: string
          plumber_id: string
          updated_at?: string
          visit_count?: number
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          lifetime_spend_cents?: number
          name?: string
          phone?: string
          plumber_id?: string
          updated_at?: string
          visit_count?: number
        }
        Relationships: []
      }
      jobs: {
        Row: {
          ai_summary: string | null
          completed_at: string | null
          created_at: string
          customer_id: string
          description: string
          final_price_cents: number | null
          id: string
          paid_at: string | null
          plumber_id: string
          scheduled_at: string | null
          status: Database["public"]["Enums"]["job_status"]
          suggested_price_cents: number | null
          updated_at: string
          urgency: Database["public"]["Enums"]["urgency"]
        }
        Insert: {
          ai_summary?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id: string
          description: string
          final_price_cents?: number | null
          id?: string
          paid_at?: string | null
          plumber_id: string
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          suggested_price_cents?: number | null
          updated_at?: string
          urgency?: Database["public"]["Enums"]["urgency"]
        }
        Update: {
          ai_summary?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          description?: string
          final_price_cents?: number | null
          id?: string
          paid_at?: string | null
          plumber_id?: string
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          suggested_price_cents?: number | null
          updated_at?: string
          urgency?: Database["public"]["Enums"]["urgency"]
        }
        Relationships: [
          {
            foreignKeyName: "jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          customer_id: string
          direction: Database["public"]["Enums"]["message_direction"]
          id: string
          job_id: string | null
          plumber_id: string
        }
        Insert: {
          body: string
          created_at?: string
          customer_id: string
          direction: Database["public"]["Enums"]["message_direction"]
          id?: string
          job_id?: string | null
          plumber_id: string
        }
        Update: {
          body?: string
          created_at?: string
          customer_id?: string
          direction?: Database["public"]["Enums"]["message_direction"]
          id?: string
          job_id?: string | null
          plumber_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string
          customer_id: string | null
          id: string
          job_id: string | null
          kind: string
          plumber_id: string
          status: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          customer_id?: string | null
          id?: string
          job_id?: string | null
          kind?: string
          plumber_id: string
          status?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          customer_id?: string | null
          id?: string
          job_id?: string | null
          kind?: string
          plumber_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          business_name: string
          created_at: string
          id: string
          phone: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          business_name: string
          created_at?: string
          id: string
          phone?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          business_name?: string
          created_at?: string
          id?: string
          phone?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      submit_request: {
        Args: {
          p_address: string
          p_description: string
          p_name: string
          p_phone: string
          p_slug: string
          p_urgency: Database["public"]["Enums"]["urgency"]
        }
        Returns: string
      }
    }
    Enums: {
      job_status:
        | "pending"
        | "scheduled"
        | "in_progress"
        | "completed"
        | "paid"
        | "declined"
        | "cancelled"
      message_direction: "inbound" | "outbound" | "system"
      urgency: "today" | "week" | "whenever"
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
      job_status: [
        "pending",
        "scheduled",
        "in_progress",
        "completed",
        "paid",
        "declined",
        "cancelled",
      ],
      message_direction: ["inbound", "outbound", "system"],
      urgency: ["today", "week", "whenever"],
    },
  },
} as const
