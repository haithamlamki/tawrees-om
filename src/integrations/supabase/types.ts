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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      container_types: {
        Row: {
          cbm_capacity: number
          created_at: string
          description: string | null
          id: string
          name: string
          size_feet: number
        }
        Insert: {
          cbm_capacity: number
          created_at?: string
          description?: string | null
          id?: string
          name: string
          size_feet: number
        }
        Update: {
          cbm_capacity?: number
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          size_feet?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          city: string | null
          company_name: string | null
          country: string | null
          created_at: string
          customer_notes: string | null
          email: string | null
          full_name: string
          id: string
          payment_preference: string | null
          phone: string | null
          postal_code: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          customer_notes?: string | null
          email?: string | null
          full_name: string
          id: string
          payment_preference?: string | null
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          customer_notes?: string | null
          email?: string | null
          full_name?: string
          id?: string
          payment_preference?: string | null
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          breakdown: Json
          buy_cost: number | null
          created_at: string
          id: string
          profit_amount: number | null
          profit_margin_percentage: number | null
          shipment_request_id: string | null
          total_sell_price: number
          valid_until: string
        }
        Insert: {
          breakdown: Json
          buy_cost?: number | null
          created_at?: string
          id?: string
          profit_amount?: number | null
          profit_margin_percentage?: number | null
          shipment_request_id?: string | null
          total_sell_price: number
          valid_until: string
        }
        Update: {
          breakdown?: Json
          buy_cost?: number | null
          created_at?: string
          id?: string
          profit_amount?: number | null
          profit_margin_percentage?: number | null
          shipment_request_id?: string | null
          total_sell_price?: number
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_shipment_request_id_fkey"
            columns: ["shipment_request_id"]
            isOneToOne: false
            referencedRelation: "shipment_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_requests: {
        Row: {
          calculated_cost: number
          calculation_method: string | null
          cbm_volume: number | null
          container_type_id: string | null
          created_at: string
          customer_id: string
          height_cm: number | null
          id: string
          items: Json | null
          length_cm: number | null
          notes: string | null
          payment_timing: string | null
          shipping_type: string
          status: string
          updated_at: string
          weight_kg: number | null
          width_cm: number | null
        }
        Insert: {
          calculated_cost: number
          calculation_method?: string | null
          cbm_volume?: number | null
          container_type_id?: string | null
          created_at?: string
          customer_id: string
          height_cm?: number | null
          id?: string
          items?: Json | null
          length_cm?: number | null
          notes?: string | null
          payment_timing?: string | null
          shipping_type: string
          status?: string
          updated_at?: string
          weight_kg?: number | null
          width_cm?: number | null
        }
        Update: {
          calculated_cost?: number
          calculation_method?: string | null
          cbm_volume?: number | null
          container_type_id?: string | null
          created_at?: string
          customer_id?: string
          height_cm?: number | null
          id?: string
          items?: Json | null
          length_cm?: number | null
          notes?: string | null
          payment_timing?: string | null
          shipping_type?: string
          status?: string
          updated_at?: string
          weight_kg?: number | null
          width_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_requests_container_type_id_fkey"
            columns: ["container_type_id"]
            isOneToOne: false
            referencedRelation: "container_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_statistics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "shipment_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          created_at: string
          estimated_delivery: string | null
          id: string
          notes: string | null
          request_id: string
          status: string
          tracking_number: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          estimated_delivery?: string | null
          id?: string
          notes?: string | null
          request_id: string
          status?: string
          tracking_number: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          estimated_delivery?: string | null
          id?: string
          notes?: string | null
          request_id?: string
          status?: string
          tracking_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "shipment_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_rates: {
        Row: {
          base_rate: number
          buy_price: number | null
          container_type_id: string | null
          created_at: string
          effective_from: string
          id: string
          is_active: boolean
          margin_percentage: number
          rate_type: string
          sell_price: number | null
          updated_at: string
        }
        Insert: {
          base_rate: number
          buy_price?: number | null
          container_type_id?: string | null
          created_at?: string
          effective_from?: string
          id?: string
          is_active?: boolean
          margin_percentage?: number
          rate_type: string
          sell_price?: number | null
          updated_at?: string
        }
        Update: {
          base_rate?: number
          buy_price?: number | null
          container_type_id?: string | null
          created_at?: string
          effective_from?: string
          id?: string
          is_active?: boolean
          margin_percentage?: number
          rate_type?: string
          sell_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_rates_container_type_id_fkey"
            columns: ["container_type_id"]
            isOneToOne: false
            referencedRelation: "container_types"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_statistics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      customer_statistics: {
        Row: {
          approved_requests: number | null
          company_name: string | null
          customer_id: string | null
          email: string | null
          full_name: string | null
          last_request_date: string | null
          total_requests: number | null
          total_shipments: number | null
          total_spent: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      generate_tracking_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "customer"
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
      app_role: ["admin", "customer"],
    },
  },
} as const
