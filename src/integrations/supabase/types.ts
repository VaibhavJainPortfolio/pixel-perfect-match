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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ai_settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          updated_at: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      consents: {
        Row: {
          consent_type: Database["public"]["Enums"]["consent_type"]
          created_at: string
          granted: boolean
          id: string
          ip: string | null
          updated_at: string
          user_agent: string | null
          user_id: string
          version: string
        }
        Insert: {
          consent_type: Database["public"]["Enums"]["consent_type"]
          created_at?: string
          granted: boolean
          id?: string
          ip?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id: string
          version: string
        }
        Update: {
          consent_type?: Database["public"]["Enums"]["consent_type"]
          created_at?: string
          granted?: boolean
          id?: string
          ip?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          discount_type: Database["public"]["Enums"]["discount_type"]
          max_uses: number | null
          updated_at: string
          used_count: number
          valid_from: string | null
          valid_to: string | null
          value: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          discount_type: Database["public"]["Enums"]["discount_type"]
          max_uses?: number | null
          updated_at?: string
          used_count?: number
          valid_from?: string | null
          valid_to?: string | null
          value: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          discount_type?: Database["public"]["Enums"]["discount_type"]
          max_uses?: number | null
          updated_at?: string
          used_count?: number
          valid_from?: string | null
          valid_to?: string | null
          value?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          id: string
          order_id: string | null
          payload: Json | null
          sent_at: string | null
          status: string
          template: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          order_id?: string | null
          payload?: Json | null
          sent_at?: string | null
          status?: string
          template: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          order_id?: string | null
          payload?: Json | null
          sent_at?: string | null
          status?: string
          template?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_paise: number
          coupon_code: string | null
          created_at: string
          delivered_at: string | null
          gst_paise: number
          id: string
          invoice_number: string | null
          invoice_url: string | null
          paid_at: string | null
          product: Database["public"]["Enums"]["product_type"]
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          total_paise: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paise: number
          coupon_code?: string | null
          created_at?: string
          delivered_at?: string | null
          gst_paise?: number
          id?: string
          invoice_number?: string | null
          invoice_url?: string | null
          paid_at?: string | null
          product?: Database["public"]["Enums"]["product_type"]
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_paise: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paise?: number
          coupon_code?: string | null
          created_at?: string
          delivered_at?: string | null
          gst_paise?: number
          id?: string
          invoice_number?: string | null
          invoice_url?: string | null
          paid_at?: string | null
          product?: Database["public"]["Enums"]["product_type"]
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_paise?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      photos: {
        Row: {
          created_at: string
          height: number | null
          id: string
          landmarks: Json | null
          quality_feedback: string | null
          quality_status: Database["public"]["Enums"]["quality_status"]
          slot: Database["public"]["Enums"]["photo_slot"]
          storage_path: string
          submission_id: string
          updated_at: string
          user_id: string
          width: number | null
        }
        Insert: {
          created_at?: string
          height?: number | null
          id?: string
          landmarks?: Json | null
          quality_feedback?: string | null
          quality_status?: Database["public"]["Enums"]["quality_status"]
          slot: Database["public"]["Enums"]["photo_slot"]
          storage_path: string
          submission_id: string
          updated_at?: string
          user_id: string
          width?: number | null
        }
        Update: {
          created_at?: string
          height?: number | null
          id?: string
          landmarks?: Json | null
          quality_feedback?: string | null
          quality_status?: Database["public"]["Enums"]["quality_status"]
          slot?: Database["public"]["Enums"]["photo_slot"]
          storage_path?: string
          submission_id?: string
          updated_at?: string
          user_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "photos_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_runs: {
        Row: {
          created_at: string
          current_step: Database["public"]["Enums"]["step_key"] | null
          finished_at: string | null
          id: string
          order_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["run_status"]
          total_cost_usd: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_step?: Database["public"]["Enums"]["step_key"] | null
          finished_at?: string | null
          id?: string
          order_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["run_status"]
          total_cost_usd?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_step?: Database["public"]["Enums"]["step_key"] | null
          finished_at?: string | null
          id?: string
          order_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["run_status"]
          total_cost_usd?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_runs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_steps: {
        Row: {
          attempt: number
          cost_usd: number
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          input: Json | null
          model_used: string | null
          output: Json | null
          run_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["step_status"]
          step_key: Database["public"]["Enums"]["step_key"]
          tokens_in: number | null
          tokens_out: number | null
          updated_at: string
        }
        Insert: {
          attempt?: number
          cost_usd?: number
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          input?: Json | null
          model_used?: string | null
          output?: Json | null
          run_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["step_status"]
          step_key: Database["public"]["Enums"]["step_key"]
          tokens_in?: number | null
          tokens_out?: number | null
          updated_at?: string
        }
        Update: {
          attempt?: number
          cost_usd?: number
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          input?: Json | null
          model_used?: string | null
          output?: Json | null
          run_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["step_status"]
          step_key?: Database["public"]["Enums"]["step_key"]
          tokens_in?: number | null
          tokens_out?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_steps_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "pipeline_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      products_catalog: {
        Row: {
          active: boolean
          affiliate_url: string | null
          brand: string | null
          category: string
          colour: string | null
          created_at: string
          fit_notes: string | null
          id: string
          image_url: string | null
          name: string
          price_max: number | null
          price_min: number | null
          tags: string[]
          updated_at: string
          url: string | null
        }
        Insert: {
          active?: boolean
          affiliate_url?: string | null
          brand?: string | null
          category: string
          colour?: string | null
          created_at?: string
          fit_notes?: string | null
          id?: string
          image_url?: string | null
          name: string
          price_max?: number | null
          price_min?: number | null
          tags?: string[]
          updated_at?: string
          url?: string | null
        }
        Update: {
          active?: boolean
          affiliate_url?: string | null
          brand?: string | null
          category?: string
          colour?: string | null
          created_at?: string
          fit_notes?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price_max?: number | null
          price_min?: number | null
          tags?: string[]
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          budget_band: string | null
          city: string | null
          created_at: string
          email: string | null
          full_name: string | null
          height_cm: number | null
          id: string
          last_seen_at: string | null
          marketing_opt_in: boolean
          phone: string | null
          status: Database["public"]["Enums"]["profile_status"]
          updated_at: string
          weight_kg: number | null
          whatsapp_opt_in: boolean
        }
        Insert: {
          age?: number | null
          budget_band?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          height_cm?: number | null
          id: string
          last_seen_at?: string | null
          marketing_opt_in?: boolean
          phone?: string | null
          status?: Database["public"]["Enums"]["profile_status"]
          updated_at?: string
          weight_kg?: number | null
          whatsapp_opt_in?: boolean
        }
        Update: {
          age?: number | null
          budget_band?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          height_cm?: number | null
          id?: string
          last_seen_at?: string | null
          marketing_opt_in?: boolean
          phone?: string | null
          status?: Database["public"]["Enums"]["profile_status"]
          updated_at?: string
          weight_kg?: number | null
          whatsapp_opt_in?: boolean
        }
        Relationships: []
      }
      renders: {
        Row: {
          approved: boolean
          created_at: string
          id: string
          look_key: string
          model: string | null
          order_id: string
          prompt: string | null
          provider: string | null
          status: string
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          approved?: boolean
          created_at?: string
          id?: string
          look_key: string
          model?: string | null
          order_id: string
          prompt?: string | null
          provider?: string | null
          status?: string
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          approved?: boolean
          created_at?: string
          id?: string
          look_key?: string
          model?: string | null
          order_id?: string
          prompt?: string | null
          provider?: string | null
          status?: string
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "renders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          data: Json
          id: string
          order_id: string
          pdf_path: string | null
          published_at: string | null
          share_token: string | null
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          order_id: string
          pdf_path?: string | null
          published_at?: string | null
          share_token?: string | null
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          order_id?: string
          pdf_path?: string | null
          published_at?: string | null
          share_token?: string | null
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "reports_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      review_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          id: string
          notes: string | null
          order_id: string
          reason: string | null
          status: Database["public"]["Enums"]["review_status"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_id: string
          reason?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string
          reason?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_tasks_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      style_rules: {
        Row: {
          active: boolean
          category: Database["public"]["Enums"]["rule_category"]
          condition_key: string
          created_at: string
          id: string
          priority: number
          rule_text: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category: Database["public"]["Enums"]["rule_category"]
          condition_key: string
          created_at?: string
          id?: string
          priority?: number
          rule_text: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: Database["public"]["Enums"]["rule_category"]
          condition_key?: string
          created_at?: string
          id?: string
          priority?: number
          rule_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      submissions: {
        Row: {
          basics: Json
          created_at: string
          id: string
          order_id: string
          status: Database["public"]["Enums"]["submission_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          basics?: Json
          created_at?: string
          id?: string
          order_id: string
          status?: Database["public"]["Enums"]["submission_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          basics?: Json
          created_at?: string
          id?: string
          order_id?: string
          status?: Database["public"]["Enums"]["submission_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "customer" | "stylist" | "support" | "admin" | "super_admin"
      consent_type:
        | "photo_processing"
        | "terms"
        | "privacy"
        | "marketing"
        | "ai_training"
      discount_type: "percent" | "flat"
      notification_channel: "whatsapp" | "email"
      order_status:
        | "created"
        | "paid"
        | "intake"
        | "processing"
        | "review"
        | "delivered"
        | "failed"
        | "refunded"
        | "cancelled"
      photo_slot:
        | "face_front"
        | "face_left"
        | "face_right"
        | "face_45"
        | "body_front"
        | "body_side"
        | "wrist"
        | "outfit"
      product_type: "style_report" | "style_report_plus" | "occasion_pack"
      profile_status: "active" | "suspended" | "deleted"
      quality_status: "pending" | "passed" | "failed"
      review_status: "open" | "in_progress" | "approved" | "changes_requested"
      rule_category:
        | "face_shape"
        | "body_type"
        | "skin_season"
        | "hair"
        | "beard"
        | "occasion"
      run_status:
        | "queued"
        | "running"
        | "waiting_review"
        | "completed"
        | "failed"
      step_key:
        | "photo_qa"
        | "measurements"
        | "face_hair"
        | "body"
        | "skin"
        | "eyewear"
        | "stylist"
        | "renders"
        | "review"
        | "report_build"
        | "pdf"
        | "delivery"
      step_status: "pending" | "running" | "succeeded" | "failed" | "skipped"
      submission_status: "draft" | "photos_pending" | "submitted"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["customer", "stylist", "support", "admin", "super_admin"],
      consent_type: [
        "photo_processing",
        "terms",
        "privacy",
        "marketing",
        "ai_training",
      ],
      discount_type: ["percent", "flat"],
      notification_channel: ["whatsapp", "email"],
      order_status: [
        "created",
        "paid",
        "intake",
        "processing",
        "review",
        "delivered",
        "failed",
        "refunded",
        "cancelled",
      ],
      photo_slot: [
        "face_front",
        "face_left",
        "face_right",
        "face_45",
        "body_front",
        "body_side",
        "wrist",
        "outfit",
      ],
      product_type: ["style_report", "style_report_plus", "occasion_pack"],
      profile_status: ["active", "suspended", "deleted"],
      quality_status: ["pending", "passed", "failed"],
      review_status: ["open", "in_progress", "approved", "changes_requested"],
      rule_category: [
        "face_shape",
        "body_type",
        "skin_season",
        "hair",
        "beard",
        "occasion",
      ],
      run_status: [
        "queued",
        "running",
        "waiting_review",
        "completed",
        "failed",
      ],
      step_key: [
        "photo_qa",
        "measurements",
        "face_hair",
        "body",
        "skin",
        "eyewear",
        "stylist",
        "renders",
        "review",
        "report_build",
        "pdf",
        "delivery",
      ],
      step_status: ["pending", "running", "succeeded", "failed", "skipped"],
      submission_status: ["draft", "photos_pending", "submitted"],
    },
  },
} as const
