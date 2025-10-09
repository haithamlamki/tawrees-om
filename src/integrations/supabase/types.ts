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
      agreements: {
        Row: {
          active: boolean
          approval_status: Database["public"]["Enums"]["approval_status"] | null
          approved_at: string | null
          approved_by: string | null
          buy_price: number
          created_at: string
          created_by: string | null
          currency: string
          destination_id: string
          id: string
          margin_percent: number
          min_charge: number | null
          notes: string | null
          origin_id: string
          partner_id: string | null
          rate_type: Database["public"]["Enums"]["rate_type"]
          rejection_reason: string | null
          sell_price: number
          updated_at: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          active?: boolean
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          approved_at?: string | null
          approved_by?: string | null
          buy_price: number
          created_at?: string
          created_by?: string | null
          currency?: string
          destination_id: string
          id?: string
          margin_percent: number
          min_charge?: number | null
          notes?: string | null
          origin_id: string
          partner_id?: string | null
          rate_type: Database["public"]["Enums"]["rate_type"]
          rejection_reason?: string | null
          sell_price: number
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          active?: boolean
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          approved_at?: string | null
          approved_by?: string | null
          buy_price?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          destination_id?: string
          id?: string
          margin_percent?: number
          min_charge?: number | null
          notes?: string | null
          origin_id?: string
          partner_id?: string | null
          rate_type?: Database["public"]["Enums"]["rate_type"]
          rejection_reason?: string | null
          sell_price?: number
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agreements_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agreements_origin_id_fkey"
            columns: ["origin_id"]
            isOneToOne: false
            referencedRelation: "origins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agreements_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "shipping_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          changed_fields: string[] | null
          created_at: string
          id: string
          ip_address: string | null
          module: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changed_fields?: string[] | null
          created_at?: string
          id?: string
          ip_address?: string | null
          module?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changed_fields?: string[] | null
          created_at?: string
          id?: string
          ip_address?: string | null
          module?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_admin: boolean
          room_id: string
          sender_id: string
          sender_name: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_admin?: boolean
          room_id: string
          sender_id: string
          sender_name: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_admin?: boolean
          room_id?: string
          sender_id?: string
          sender_name?: string
        }
        Relationships: []
      }
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
      destinations: {
        Row: {
          active: boolean
          country: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          country: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          country?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          recipient_email: string
          recipient_user_id: string | null
          sent_at: string | null
          status: string
          subject: string
          template_type: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient_email: string
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          template_type: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient_email?: string
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          template_type?: string
        }
        Relationships: []
      }
      last_mile_rates: {
        Row: {
          active: boolean | null
          base_fee: number
          city: string | null
          created_at: string | null
          created_by: string | null
          destination_id: string | null
          id: string
          per_cbm_fee: number | null
          per_kg_fee: number | null
          updated_at: string | null
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          active?: boolean | null
          base_fee: number
          city?: string | null
          created_at?: string | null
          created_by?: string | null
          destination_id?: string | null
          id?: string
          per_cbm_fee?: number | null
          per_kg_fee?: number | null
          updated_at?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          active?: boolean | null
          base_fee?: number
          city?: string | null
          created_at?: string | null
          created_by?: string | null
          destination_id?: string | null
          id?: string
          per_cbm_fee?: number | null
          per_kg_fee?: number | null
          updated_at?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "last_mile_rates_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          browser_push_enabled: boolean
          created_at: string
          email_on_document_uploaded: boolean
          email_on_quote_ready: boolean
          email_on_request_approved: boolean
          email_on_status_update: boolean
          id: string
          in_app_notifications: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          browser_push_enabled?: boolean
          created_at?: string
          email_on_document_uploaded?: boolean
          email_on_quote_ready?: boolean
          email_on_request_approved?: boolean
          email_on_status_update?: boolean
          id?: string
          in_app_notifications?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          browser_push_enabled?: boolean
          created_at?: string
          email_on_document_uploaded?: boolean
          email_on_quote_ready?: boolean
          email_on_request_approved?: boolean
          email_on_status_update?: boolean
          id?: string
          in_app_notifications?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          related_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      origins: {
        Row: {
          active: boolean
          country: string
          created_at: string
          created_by: string | null
          id: string
          is_port: boolean
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          country?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_port?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          country?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_port?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          customer_id: string
          id: string
          paid_at: string | null
          payment_method: string | null
          shipment_request_id: string
          status: string
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          customer_id: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          shipment_request_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          customer_id?: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          shipment_request_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_shipment_request_id_fkey"
            columns: ["shipment_request_id"]
            isOneToOne: false
            referencedRelation: "shipment_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      product_quotes: {
        Row: {
          breakdown: Json | null
          created_at: string | null
          customer_email: string
          customer_name: string
          customer_phone: string | null
          delivery_city: string
          delivery_country: string
          discount_amount: number | null
          discount_name: string | null
          eta_days: number | null
          id: string
          notes: string | null
          opened_at: string | null
          preferred_channel: string | null
          product_id: string | null
          quantity: number
          quote_id: string
          sent_at: string | null
          shipping_fee: number
          status: string | null
          subtotal: number
          total_amount: number
          unit_price: number
          updated_at: string | null
          valid_until: string
          won_at: string | null
        }
        Insert: {
          breakdown?: Json | null
          created_at?: string | null
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          delivery_city: string
          delivery_country: string
          discount_amount?: number | null
          discount_name?: string | null
          eta_days?: number | null
          id?: string
          notes?: string | null
          opened_at?: string | null
          preferred_channel?: string | null
          product_id?: string | null
          quantity: number
          quote_id: string
          sent_at?: string | null
          shipping_fee: number
          status?: string | null
          subtotal: number
          total_amount: number
          unit_price: number
          updated_at?: string | null
          valid_until: string
          won_at?: string | null
        }
        Update: {
          breakdown?: Json | null
          created_at?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          delivery_city?: string
          delivery_country?: string
          discount_amount?: number | null
          discount_name?: string | null
          eta_days?: number | null
          id?: string
          notes?: string | null
          opened_at?: string | null
          preferred_channel?: string | null
          product_id?: string | null
          quantity?: number
          quote_id?: string
          sent_at?: string | null
          shipping_fee?: number
          status?: string | null
          subtotal?: number
          total_amount?: number
          unit_price?: number
          updated_at?: string | null
          valid_until?: string
          won_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_quotes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_unit_price: number
          canonical_url: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          default_quote_note: string | null
          delivery_options: string[] | null
          description: string | null
          dims_cm: Json | null
          extraction_metadata: Json | null
          gallery_images: Json | null
          hero_thumbnail: string
          highlight_bullets: Json | null
          hs_code: string | null
          html_snapshot_id: string | null
          id: string
          lead_time_days: number | null
          meta_description: string | null
          meta_title: string | null
          min_order_qty: number
          msrp: number | null
          name: string
          og_image: string | null
          origin_city: string | null
          origin_country: string | null
          origin_province: string | null
          pricing_tiers: Json | null
          published_at: string | null
          quote_validity_days: number | null
          shipping_template_id: string | null
          short_name: string
          sku: string
          slug: string
          source_hash: string | null
          source_type: string | null
          source_url: string | null
          specs: Json | null
          status: string | null
          summary: string | null
          supplier_data: Json | null
          tags: string[] | null
          updated_at: string | null
          updated_by: string | null
          version_note: string | null
          volume_cbm: number | null
          weight_kg: number | null
          whatsapp_number: string | null
          youtube_duration: number | null
          youtube_id: string
          youtube_title: string | null
        }
        Insert: {
          base_unit_price: number
          canonical_url?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          default_quote_note?: string | null
          delivery_options?: string[] | null
          description?: string | null
          dims_cm?: Json | null
          extraction_metadata?: Json | null
          gallery_images?: Json | null
          hero_thumbnail: string
          highlight_bullets?: Json | null
          hs_code?: string | null
          html_snapshot_id?: string | null
          id?: string
          lead_time_days?: number | null
          meta_description?: string | null
          meta_title?: string | null
          min_order_qty: number
          msrp?: number | null
          name: string
          og_image?: string | null
          origin_city?: string | null
          origin_country?: string | null
          origin_province?: string | null
          pricing_tiers?: Json | null
          published_at?: string | null
          quote_validity_days?: number | null
          shipping_template_id?: string | null
          short_name: string
          sku: string
          slug: string
          source_hash?: string | null
          source_type?: string | null
          source_url?: string | null
          specs?: Json | null
          status?: string | null
          summary?: string | null
          supplier_data?: Json | null
          tags?: string[] | null
          updated_at?: string | null
          updated_by?: string | null
          version_note?: string | null
          volume_cbm?: number | null
          weight_kg?: number | null
          whatsapp_number?: string | null
          youtube_duration?: number | null
          youtube_id: string
          youtube_title?: string | null
        }
        Update: {
          base_unit_price?: number
          canonical_url?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          default_quote_note?: string | null
          delivery_options?: string[] | null
          description?: string | null
          dims_cm?: Json | null
          extraction_metadata?: Json | null
          gallery_images?: Json | null
          hero_thumbnail?: string
          highlight_bullets?: Json | null
          hs_code?: string | null
          html_snapshot_id?: string | null
          id?: string
          lead_time_days?: number | null
          meta_description?: string | null
          meta_title?: string | null
          min_order_qty?: number
          msrp?: number | null
          name?: string
          og_image?: string | null
          origin_city?: string | null
          origin_country?: string | null
          origin_province?: string | null
          pricing_tiers?: Json | null
          published_at?: string | null
          quote_validity_days?: number | null
          shipping_template_id?: string | null
          short_name?: string
          sku?: string
          slug?: string
          source_hash?: string | null
          source_type?: string | null
          source_url?: string | null
          specs?: Json | null
          status?: string | null
          summary?: string | null
          supplier_data?: Json | null
          tags?: string[] | null
          updated_at?: string | null
          updated_by?: string | null
          version_note?: string | null
          volume_cbm?: number | null
          weight_kg?: number | null
          whatsapp_number?: string | null
          youtube_duration?: number | null
          youtube_id?: string
          youtube_title?: string | null
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
          preferred_language: string
          two_factor_enabled: boolean | null
          two_factor_secret: string | null
          updated_at: string
          wms_customer_id: string | null
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
          preferred_language?: string
          two_factor_enabled?: boolean | null
          two_factor_secret?: string | null
          updated_at?: string
          wms_customer_id?: string | null
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
          preferred_language?: string
          two_factor_enabled?: boolean | null
          two_factor_secret?: string | null
          updated_at?: string
          wms_customer_id?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          last_used_at: string
          p256dh_key: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string
          p256dh_key: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string
          p256dh_key?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      qc_checklist: {
        Row: {
          check_item: string
          created_at: string | null
          id: string
          notes: string | null
          qc_id: string
          status: string
        }
        Insert: {
          check_item: string
          created_at?: string | null
          id?: string
          notes?: string | null
          qc_id: string
          status: string
        }
        Update: {
          check_item?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          qc_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "qc_checklist_qc_id_fkey"
            columns: ["qc_id"]
            isOneToOne: false
            referencedRelation: "quality_checks"
            referencedColumns: ["id"]
          },
        ]
      }
      qc_photos: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number
          id: string
          qc_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          file_size: number
          id?: string
          qc_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          qc_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qc_photos_qc_id_fkey"
            columns: ["qc_id"]
            isOneToOne: false
            referencedRelation: "quality_checks"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_checks: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          performed_at: string | null
          performed_by: string | null
          qc_fee: number | null
          quantity_actual: number | null
          quantity_expected: number | null
          shipment_id: string
          status: string
          updated_at: string | null
          weight_actual: number | null
          weight_expected: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          performed_at?: string | null
          performed_by?: string | null
          qc_fee?: number | null
          quantity_actual?: number | null
          quantity_expected?: number | null
          shipment_id: string
          status?: string
          updated_at?: string | null
          weight_actual?: number | null
          weight_expected?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          performed_at?: string | null
          performed_by?: string | null
          qc_fee?: number | null
          quantity_actual?: number | null
          quantity_expected?: number | null
          shipment_id?: string
          status?: string
          updated_at?: string | null
          weight_actual?: number | null
          weight_expected?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quality_checks_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          breakdown: Json
          buy_cost: number | null
          created_at: string
          id: string
          margin_override_at: string | null
          margin_override_by: string | null
          margin_override_percentage: number | null
          margin_override_reason: string | null
          paid_at: string | null
          payment_due_date: string | null
          profit_amount: number | null
          profit_margin_percentage: number | null
          sent_at: string | null
          shipment_request_id: string | null
          status: string
          total_sell_price: number
          valid_until: string
          viewed_at: string | null
        }
        Insert: {
          breakdown: Json
          buy_cost?: number | null
          created_at?: string
          id?: string
          margin_override_at?: string | null
          margin_override_by?: string | null
          margin_override_percentage?: number | null
          margin_override_reason?: string | null
          paid_at?: string | null
          payment_due_date?: string | null
          profit_amount?: number | null
          profit_margin_percentage?: number | null
          sent_at?: string | null
          shipment_request_id?: string | null
          status?: string
          total_sell_price: number
          valid_until: string
          viewed_at?: string | null
        }
        Update: {
          breakdown?: Json
          buy_cost?: number | null
          created_at?: string
          id?: string
          margin_override_at?: string | null
          margin_override_by?: string | null
          margin_override_percentage?: number | null
          margin_override_reason?: string | null
          paid_at?: string | null
          payment_due_date?: string | null
          profit_amount?: number | null
          profit_margin_percentage?: number | null
          sent_at?: string | null
          shipment_request_id?: string | null
          status?: string
          total_sell_price?: number
          valid_until?: string
          viewed_at?: string | null
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
      rate_history: {
        Row: {
          change_reason: string | null
          change_type: string
          changed_at: string | null
          changed_by: string | null
          changed_by_email: string | null
          created_at: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          record_id: string
          table_name: string
          version_number: number
        }
        Insert: {
          change_reason?: string | null
          change_type: string
          changed_at?: string | null
          changed_by?: string | null
          changed_by_email?: string | null
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id: string
          table_name: string
          version_number: number
        }
        Update: {
          change_reason?: string | null
          change_type?: string
          changed_at?: string | null
          changed_by?: string | null
          changed_by_email?: string | null
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string
          table_name?: string
          version_number?: number
        }
        Relationships: []
      }
      shipment_documents: {
        Row: {
          created_at: string
          document_type: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          shipment_request_id: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          document_type: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          shipment_request_id: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          shipment_request_id?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_documents_shipment_request_id_fkey"
            columns: ["shipment_request_id"]
            isOneToOne: false
            referencedRelation: "shipment_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_requests: {
        Row: {
          actual_delivery_date: string | null
          calculated_cost: number
          calculation_method: string | null
          cbm_volume: number | null
          container_type_id: string | null
          created_at: string
          customer_id: string
          delivery_address: string | null
          delivery_city: string | null
          delivery_contact_name: string | null
          delivery_contact_phone: string | null
          delivery_country: string | null
          delivery_notes: string | null
          delivery_postal_code: string | null
          delivery_type: string | null
          height_cm: number | null
          id: string
          items: Json | null
          last_mile_fee: number | null
          length_cm: number | null
          notes: string | null
          payment_timing: string | null
          requested_delivery_date: string | null
          shipping_type: string
          status: string
          updated_at: string
          weight_kg: number | null
          width_cm: number | null
        }
        Insert: {
          actual_delivery_date?: string | null
          calculated_cost: number
          calculation_method?: string | null
          cbm_volume?: number | null
          container_type_id?: string | null
          created_at?: string
          customer_id: string
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_contact_name?: string | null
          delivery_contact_phone?: string | null
          delivery_country?: string | null
          delivery_notes?: string | null
          delivery_postal_code?: string | null
          delivery_type?: string | null
          height_cm?: number | null
          id?: string
          items?: Json | null
          last_mile_fee?: number | null
          length_cm?: number | null
          notes?: string | null
          payment_timing?: string | null
          requested_delivery_date?: string | null
          shipping_type: string
          status?: string
          updated_at?: string
          weight_kg?: number | null
          width_cm?: number | null
        }
        Update: {
          actual_delivery_date?: string | null
          calculated_cost?: number
          calculation_method?: string | null
          cbm_volume?: number | null
          container_type_id?: string | null
          created_at?: string
          customer_id?: string
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_contact_name?: string | null
          delivery_contact_phone?: string | null
          delivery_country?: string | null
          delivery_notes?: string | null
          delivery_postal_code?: string | null
          delivery_type?: string | null
          height_cm?: number | null
          id?: string
          items?: Json | null
          last_mile_fee?: number | null
          length_cm?: number | null
          notes?: string | null
          payment_timing?: string | null
          requested_delivery_date?: string | null
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
      shipment_status_history: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          location: string | null
          notes: string | null
          shipment_id: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          shipment_id: string
          status: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          shipment_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_status_history_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_surcharges: {
        Row: {
          amount: number
          created_at: string
          id: string
          is_percentage: boolean
          name: string
          shipment_request_id: string
          surcharge_id: string | null
          type: Database["public"]["Enums"]["surcharge_type"]
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          is_percentage?: boolean
          name: string
          shipment_request_id: string
          surcharge_id?: string | null
          type: Database["public"]["Enums"]["surcharge_type"]
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          is_percentage?: boolean
          name?: string
          shipment_request_id?: string
          surcharge_id?: string | null
          type?: Database["public"]["Enums"]["surcharge_type"]
        }
        Relationships: [
          {
            foreignKeyName: "shipment_surcharges_shipment_request_id_fkey"
            columns: ["shipment_request_id"]
            isOneToOne: false
            referencedRelation: "shipment_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_surcharges_surcharge_id_fkey"
            columns: ["surcharge_id"]
            isOneToOne: false
            referencedRelation: "surcharges"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          actual_delivery: string | null
          assigned_partner_id: string | null
          assigned_to: string | null
          created_at: string
          current_location: string | null
          delivery_confirmed: boolean | null
          delivery_confirmed_at: string | null
          delivery_confirmed_by: string | null
          delivery_photo_url: string | null
          delivery_signature_url: string | null
          estimated_delivery: string | null
          id: string
          notes: string | null
          request_id: string
          status: string
          tracking_number: string
          updated_at: string
        }
        Insert: {
          actual_delivery?: string | null
          assigned_partner_id?: string | null
          assigned_to?: string | null
          created_at?: string
          current_location?: string | null
          delivery_confirmed?: boolean | null
          delivery_confirmed_at?: string | null
          delivery_confirmed_by?: string | null
          delivery_photo_url?: string | null
          delivery_signature_url?: string | null
          estimated_delivery?: string | null
          id?: string
          notes?: string | null
          request_id: string
          status?: string
          tracking_number: string
          updated_at?: string
        }
        Update: {
          actual_delivery?: string | null
          assigned_partner_id?: string | null
          assigned_to?: string | null
          created_at?: string
          current_location?: string | null
          delivery_confirmed?: boolean | null
          delivery_confirmed_at?: string | null
          delivery_confirmed_by?: string | null
          delivery_photo_url?: string | null
          delivery_signature_url?: string | null
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
            foreignKeyName: "shipments_assigned_partner_id_fkey"
            columns: ["assigned_partner_id"]
            isOneToOne: false
            referencedRelation: "shipping_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "shipment_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_partners: {
        Row: {
          address: string | null
          company_name: string
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_name: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_name?: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
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
      surcharges: {
        Row: {
          active: boolean
          amount: number
          created_at: string
          created_by: string | null
          destination_id: string | null
          id: string
          is_percentage: boolean
          name: string
          origin_id: string | null
          rate_type: Database["public"]["Enums"]["rate_type"] | null
          type: Database["public"]["Enums"]["surcharge_type"]
          updated_at: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          active?: boolean
          amount: number
          created_at?: string
          created_by?: string | null
          destination_id?: string | null
          id?: string
          is_percentage?: boolean
          name: string
          origin_id?: string | null
          rate_type?: Database["public"]["Enums"]["rate_type"] | null
          type: Database["public"]["Enums"]["surcharge_type"]
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          active?: boolean
          amount?: number
          created_at?: string
          created_by?: string | null
          destination_id?: string | null
          id?: string
          is_percentage?: boolean
          name?: string
          origin_id?: string | null
          rate_type?: Database["public"]["Enums"]["rate_type"] | null
          type?: Database["public"]["Enums"]["surcharge_type"]
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "surcharges_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surcharges_origin_id_fkey"
            columns: ["origin_id"]
            isOneToOne: false
            referencedRelation: "origins"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          shipping_partner_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          shipping_partner_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          shipping_partner_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_shipping_partner_id_fkey"
            columns: ["shipping_partner_id"]
            isOneToOne: false
            referencedRelation: "shipping_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      wms_contracts: {
        Row: {
          address: string | null
          branches: Json | null
          contract_date: string | null
          contract_number: string | null
          contract_type: string
          create_account: boolean | null
          created_at: string
          created_user_id: string | null
          customer_id: string
          duration_months: number
          email: string | null
          end_date: string
          free_transfer_count: number
          gateway_password: string | null
          gateway_username: string | null
          id: string
          monthly_fee: number
          network_name: string | null
          notes: string | null
          phone: string | null
          products_included: Json | null
          responsible_person: string | null
          start_date: string
          status: string
          storage_conditions: string | null
          storage_space_sqm: number | null
          total_amount: number
          transfer_price_after_limit: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          branches?: Json | null
          contract_date?: string | null
          contract_number?: string | null
          contract_type: string
          create_account?: boolean | null
          created_at?: string
          created_user_id?: string | null
          customer_id: string
          duration_months: number
          email?: string | null
          end_date: string
          free_transfer_count?: number
          gateway_password?: string | null
          gateway_username?: string | null
          id?: string
          monthly_fee: number
          network_name?: string | null
          notes?: string | null
          phone?: string | null
          products_included?: Json | null
          responsible_person?: string | null
          start_date: string
          status?: string
          storage_conditions?: string | null
          storage_space_sqm?: number | null
          total_amount: number
          transfer_price_after_limit?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          branches?: Json | null
          contract_date?: string | null
          contract_number?: string | null
          contract_type?: string
          create_account?: boolean | null
          created_at?: string
          created_user_id?: string | null
          customer_id?: string
          duration_months?: number
          email?: string | null
          end_date?: string
          free_transfer_count?: number
          gateway_password?: string | null
          gateway_username?: string | null
          id?: string
          monthly_fee?: number
          network_name?: string | null
          notes?: string | null
          phone?: string | null
          products_included?: Json | null
          responsible_person?: string | null
          start_date?: string
          status?: string
          storage_conditions?: string | null
          storage_space_sqm?: number | null
          total_amount?: number
          transfer_price_after_limit?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wms_contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "wms_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      wms_customer_branches: {
        Row: {
          address: string
          branch_code: string
          branch_name: string
          city: string
          created_at: string
          customer_id: string
          id: string
          is_main_branch: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          address: string
          branch_code: string
          branch_name: string
          city: string
          created_at?: string
          customer_id: string
          id?: string
          is_main_branch?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          branch_code?: string
          branch_name?: string
          city?: string
          created_at?: string
          customer_id?: string
          id?: string
          is_main_branch?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wms_customer_branches_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "wms_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      wms_customer_users: {
        Row: {
          branch_id: string | null
          created_at: string
          customer_id: string
          id: string
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          customer_id: string
          id?: string
          user_id: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_branch"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "wms_customer_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wms_customer_users_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "wms_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      wms_customers: {
        Row: {
          address: string | null
          city: string | null
          company_name: string
          contact_person: string | null
          created_at: string
          customer_code: string
          email: string | null
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name: string
          contact_person?: string | null
          created_at?: string
          customer_code: string
          email?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string
          contact_person?: string | null
          created_at?: string
          customer_code?: string
          email?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      wms_drivers: {
        Row: {
          created_at: string
          id: string
          license_number: string | null
          name: string
          phone: string
          status: string
          updated_at: string
          user_id: string | null
          vehicle_number: string | null
          vehicle_type: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          license_number?: string | null
          name: string
          phone: string
          status?: string
          updated_at?: string
          user_id?: string | null
          vehicle_number?: string | null
          vehicle_type?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          license_number?: string | null
          name?: string
          phone?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          vehicle_number?: string | null
          vehicle_type?: string | null
        }
        Relationships: []
      }
      wms_inventory: {
        Row: {
          category: string | null
          consumed_quantity: number
          created_at: string
          customer_id: string
          description: string | null
          id: string
          image_url: string | null
          minimum_quantity: number
          price_per_unit: number | null
          product_name: string
          quantity: number
          sku: string
          status: string
          unit: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          consumed_quantity?: number
          created_at?: string
          customer_id: string
          description?: string | null
          id?: string
          image_url?: string | null
          minimum_quantity?: number
          price_per_unit?: number | null
          product_name: string
          quantity?: number
          sku: string
          status?: string
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          consumed_quantity?: number
          created_at?: string
          customer_id?: string
          description?: string | null
          id?: string
          image_url?: string | null
          minimum_quantity?: number
          price_per_unit?: number | null
          product_name?: string
          quantity?: number
          sku?: string
          status?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wms_inventory_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "wms_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      wms_invoice_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          quantity: number
          total_price: number
          unit_price: number
          vat_exempt: boolean | null
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          quantity: number
          total_price: number
          unit_price: number
          vat_exempt?: boolean | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
          vat_exempt?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "wms_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "wms_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      wms_invoice_sequences: {
        Row: {
          created_at: string
          current_number: number
          customer_id: string
          id: string
          prefix: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          current_number?: number
          customer_id: string
          id?: string
          prefix?: string
          updated_at?: string
          year?: number
        }
        Update: {
          created_at?: string
          current_number?: number
          customer_id?: string
          id?: string
          prefix?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "wms_invoice_sequences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "wms_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      wms_invoices: {
        Row: {
          created_at: string
          customer_id: string
          customer_vatin: string | null
          due_date: string
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          order_id: string | null
          paid_at: string | null
          status: string
          subtotal: number
          tax_amount: number
          tax_rate: number
          total_amount: number
          updated_at: string
          vat_exempt: boolean | null
          vat_rate: number | null
          vendor_vatin: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          customer_vatin?: string | null
          due_date: string
          id?: string
          invoice_date: string
          invoice_number: string
          notes?: string | null
          order_id?: string | null
          paid_at?: string | null
          status?: string
          subtotal: number
          tax_amount: number
          tax_rate?: number
          total_amount: number
          updated_at?: string
          vat_exempt?: boolean | null
          vat_rate?: number | null
          vendor_vatin?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          customer_vatin?: string | null
          due_date?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          order_id?: string | null
          paid_at?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total_amount?: number
          updated_at?: string
          vat_exempt?: boolean | null
          vat_rate?: number | null
          vendor_vatin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wms_invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "wms_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wms_invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "wms_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      wms_order_approvals: {
        Row: {
          approver_id: string | null
          created_at: string
          id: string
          notes: string | null
          order_id: string
          status: string
          updated_at: string
        }
        Insert: {
          approver_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          approver_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wms_order_approvals_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "wms_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      wms_order_branch_items: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          order_id: string
          order_item_id: string
          quantity: number
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          order_id: string
          order_item_id: string
          quantity: number
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          order_id?: string
          order_item_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "wms_order_branch_items_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "wms_customer_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wms_order_branch_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "wms_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wms_order_branch_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "wms_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      wms_order_items: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          inventory_id: string
          order_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          inventory_id: string
          order_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          inventory_id?: string
          order_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "wms_order_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "wms_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wms_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "wms_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      wms_orders: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          delivered_at: string | null
          delivery_branch_id: string | null
          delivery_notes: string | null
          delivery_proof_photo: string | null
          delivery_signature: string | null
          driver_id: string | null
          id: string
          notes: string | null
          order_number: string
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          delivered_at?: string | null
          delivery_branch_id?: string | null
          delivery_notes?: string | null
          delivery_proof_photo?: string | null
          delivery_signature?: string | null
          driver_id?: string | null
          id?: string
          notes?: string | null
          order_number: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          delivered_at?: string | null
          delivery_branch_id?: string | null
          delivery_notes?: string | null
          delivery_proof_photo?: string | null
          delivery_signature?: string | null
          driver_id?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wms_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "wms_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wms_orders_delivery_branch_id_fkey"
            columns: ["delivery_branch_id"]
            isOneToOne: false
            referencedRelation: "wms_customer_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wms_orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "wms_drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      wms_product_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          customer_id: string
          description: string | null
          id: string
          image_url: string | null
          product_name: string
          requested_by: string
          requested_quantity: number
          reviewed_at: string | null
          reviewer_id: string | null
          reviewer_notes: string | null
          specifications: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          customer_id: string
          description?: string | null
          id?: string
          image_url?: string | null
          product_name: string
          requested_by: string
          requested_quantity: number
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_notes?: string | null
          specifications?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          customer_id?: string
          description?: string | null
          id?: string
          image_url?: string | null
          product_name?: string
          requested_by?: string
          requested_quantity?: number
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_notes?: string | null
          specifications?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wms_product_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "wms_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      wms_workflow_settings: {
        Row: {
          auto_approve_threshold: number | null
          created_at: string
          customer_id: string | null
          default_approver_id: string | null
          id: string
          notification_preferences: Json
          require_order_approval: boolean
          updated_at: string
        }
        Insert: {
          auto_approve_threshold?: number | null
          created_at?: string
          customer_id?: string | null
          default_approver_id?: string | null
          id?: string
          notification_preferences?: Json
          require_order_approval?: boolean
          updated_at?: string
        }
        Update: {
          auto_approve_threshold?: number | null
          created_at?: string
          customer_id?: string | null
          default_approver_id?: string | null
          id?: string
          notification_preferences?: Json
          require_order_approval?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wms_workflow_settings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "wms_customers"
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
      calculate_invoice_totals: {
        Args: { p_invoice_id: string }
        Returns: Json
      }
      can_view_customer_statistics: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      create_notification: {
        Args: {
          p_message: string
          p_related_id?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      generate_invoice_number: {
        Args: { p_customer_id: string }
        Returns: string
      }
      generate_tracking_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_wms_contract_number: {
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
      sanitize_error_message: {
        Args: { error_msg: string }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "customer"
        | "employee"
        | "shipping_partner"
        | "accountant"
        | "store_customer"
        | "branch_manager"
      approval_status:
        | "pending_admin"
        | "pending_partner"
        | "approved"
        | "rejected"
      rate_type:
        | "AIR_KG"
        | "SEA_CBM"
        | "SEA_CONTAINER_20"
        | "SEA_CONTAINER_40"
        | "SEA_CONTAINER_40HC"
        | "SEA_CONTAINER_45HC"
      surcharge_type:
        | "fuel"
        | "handling"
        | "customs"
        | "insurance"
        | "qc"
        | "storage"
        | "demurrage"
        | "documentation"
        | "other"
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
      app_role: [
        "admin",
        "customer",
        "employee",
        "shipping_partner",
        "accountant",
        "store_customer",
        "branch_manager",
      ],
      approval_status: [
        "pending_admin",
        "pending_partner",
        "approved",
        "rejected",
      ],
      rate_type: [
        "AIR_KG",
        "SEA_CBM",
        "SEA_CONTAINER_20",
        "SEA_CONTAINER_40",
        "SEA_CONTAINER_40HC",
        "SEA_CONTAINER_45HC",
      ],
      surcharge_type: [
        "fuel",
        "handling",
        "customs",
        "insurance",
        "qc",
        "storage",
        "demurrage",
        "documentation",
        "other",
      ],
    },
  },
} as const
