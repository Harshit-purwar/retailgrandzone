export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      addresses: {
        Row: {
          id: string;
          user_id: string;
          label: string;
          full_name: string;
          phone: string;
          address_line: string;
          city: string;
          state: string;
          pincode: string;
          latitude: number | null;
          longitude: number | null;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          label?: string;
          full_name?: string;
          phone?: string;
          address_line?: string;
          city?: string;
          state?: string;
          pincode?: string;
          latitude?: number | null;
          longitude?: number | null;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          label?: string;
          full_name?: string;
          phone?: string;
          address_line?: string;
          city?: string;
          state?: string;
          pincode?: string;
          latitude?: number | null;
          longitude?: number | null;
          is_default?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      banners: {
        Row: {
          active: boolean;
          combo_id: string | null;
          created_at: string;
          cta_text: string;
          id: string;
          image_url: string;
          link_category: string | null;
          placement: string;
          product_id: string | null;
          product_ids: Json;
          sort_order: number;
          store_id: string | null;
          subtitle: string;
          title: string;
        };
        Insert: {
          active?: boolean;
          combo_id?: string | null;
          created_at?: string;
          cta_text?: string;
          id?: string;
          image_url?: string;
          link_category?: string | null;
          placement?: string;
          product_id?: string | null;
          product_ids?: Json;
          sort_order?: number;
          store_id?: string | null;
          subtitle?: string;
          title?: string;
        };
        Update: {
          active?: boolean;
          combo_id?: string | null;
          created_at?: string;
          cta_text?: string;
          id?: string;
          image_url?: string;
          link_category?: string | null;
          placement?: string;
          product_id?: string | null;
          product_ids?: Json;
          sort_order?: number;
          store_id?: string | null;
          subtitle?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "banners_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "banners_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          active: boolean;
          created_at: string;
          id: string;
          image_url: string | null;
          name: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          name: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          name?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      coin_campaigns: {
        Row: {
          active: boolean;
          created_at: string;
          ends_at: string;
          eligible_categories: Json;
          expires_days: number;
          id: string;
          max_per_customer: number;
          name: string;
          reward_amounts: Json;
          starts_at: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          ends_at?: string;
          eligible_categories?: Json;
          expires_days?: number;
          id?: string;
          max_per_customer?: number;
          name: string;
          reward_amounts?: Json;
          starts_at?: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          ends_at?: string;
          eligible_categories?: Json;
          expires_days?: number;
          id?: string;
          max_per_customer?: number;
          name?: string;
          reward_amounts?: Json;
          starts_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      coin_rewards: {
        Row: {
          amount: number;
          campaign_id: string;
          created_at: string;
          expires_at: string;
          id: string;
          order_id: string | null;
          status: string;
          used_at: string | null;
          used_order_id: string | null;
          user_email: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          campaign_id: string;
          created_at?: string;
          expires_at: string;
          id?: string;
          order_id?: string | null;
          status?: string;
          used_at?: string | null;
          used_order_id?: string | null;
          user_email?: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          campaign_id?: string;
          created_at?: string;
          expires_at?: string;
          id?: string;
          order_id?: string | null;
          status?: string;
          used_at?: string | null;
          used_order_id?: string | null;
          user_email?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      coin_wallet: {
        Row: {
          balance: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          balance?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          balance?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      combos: {
        Row: {
          active: boolean;
          combo_price: number;
          created_at: string;
          description: string;
          id: string;
          image_url: string;
          name: string;
          product_ids: Json;
          store_id: string | null;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          combo_price?: number;
          created_at?: string;
          description?: string;
          id?: string;
          image_url?: string;
          name: string;
          product_ids?: Json;
          store_id?: string | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          combo_price?: number;
          created_at?: string;
          description?: string;
          id?: string;
          image_url?: string;
          name?: string;
          product_ids?: Json;
          store_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "combos_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      coupons: {
        Row: {
          active: boolean;
          code: string;
          created_at: string;
          discount_type: string;
          expires_at: string | null;
          free_delivery: boolean;
          id: string;
          max_discount: number;
          min_order: number;
          value: number;
        };
        Insert: {
          active?: boolean;
          code: string;
          created_at?: string;
          discount_type?: string;
          expires_at?: string | null;
          free_delivery?: boolean;
          id?: string;
          max_discount?: number;
          min_order?: number;
          value?: number;
        };
        Update: {
          active?: boolean;
          code?: string;
          created_at?: string;
          discount_type?: string;
          expires_at?: string | null;
          free_delivery?: boolean;
          id?: string;
          max_discount?: number;
          min_order?: number;
          value?: number;
        };
        Relationships: [];
      };
      help_requests: {
        Row: {
          admin_notes: string | null;
          created_at: string;
          full_name: string;
          id: string;
          issue_category: string;
          message: string;
          order_id: string | null;
          phone: string;
          status: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          admin_notes?: string | null;
          created_at?: string;
          full_name: string;
          id?: string;
          issue_category?: string;
          message: string;
          order_id?: string | null;
          phone: string;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          admin_notes?: string | null;
          created_at?: string;
          full_name?: string;
          id?: string;
          issue_category?: string;
          message?: string;
          order_id?: string | null;
          phone?: string;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "help_requests_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          combo_id: string | null;
          combo_items: Json;
          id: string;
          image_url: string;
          order_id: string;
          price: number;
          product_id: string | null;
          quantity: number;
          title: string;
        };
        Insert: {
          combo_id?: string | null;
          combo_items?: Json;
          id?: string;
          image_url?: string;
          order_id: string;
          price?: number;
          product_id?: string | null;
          quantity?: number;
          title: string;
        };
        Update: {
          combo_id?: string | null;
          combo_items?: Json;
          id?: string;
          image_url?: string;
          order_id?: string;
          price?: number;
          product_id?: string | null;
          quantity?: number;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          address_line: string;
          cancel_reason: string | null;
          cancelled_at: string | null;
          city: string;
          coins_applied: number;
          coupon_code: string | null;
          created_at: string;
          customer_gstin: string;
          delivery_estimate: string | null;
          delivery_fee: number;
          discount: number;
          email: string | null;
          full_name: string;
          gst_percent: number;
          id: string;
          invoice_notes: string;
          invoice_number: string | null;
          latitude: number | null;
          longitude: number | null;
          payment_id: string | null;
          payment_method: string;
          payment_status: string;
          phone: string;
          pincode: string;
          seller_gstin: string;
          state: string;
          status: string;
          store_id: string | null;
          total: number;
          user_id: string | null;
        };
        Insert: {
          address_line: string;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          city: string;
          coins_applied?: number;
          coupon_code?: string | null;
          created_at?: string;
          customer_gstin?: string;
          delivery_estimate?: string | null;
          delivery_fee?: number;
          discount?: number;
          email?: string | null;
          full_name: string;
          gst_percent?: number;
          id?: string;
          invoice_notes?: string;
          invoice_number?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          payment_id?: string | null;
          payment_method?: string;
          payment_status?: string;
          phone: string;
          pincode: string;
          seller_gstin?: string;
          state: string;
          status?: string;
          store_id?: string | null;
          total?: number;
          user_id?: string | null;
        };
        Update: {
          address_line?: string;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          city?: string;
          coins_applied?: number;
          coupon_code?: string | null;
          created_at?: string;
          customer_gstin?: string;
          delivery_estimate?: string | null;
          delivery_fee?: number;
          discount?: number;
          email?: string | null;
          full_name?: string;
          gst_percent?: number;
          id?: string;
          invoice_notes?: string;
          invoice_number?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          payment_id?: string | null;
          payment_method?: string;
          payment_status?: string;
          phone?: string;
          pincode?: string;
          seller_gstin?: string;
          state?: string;
          status?: string;
          store_id?: string | null;
          total?: number;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "orders_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          active: boolean;
          brand: string;
          category: string;
          colors: Json;
          combo_product_ids: Json;
          created_at: string;
          description: string;
          gift_available: boolean;
          gift_note: string;
          highlights: Json;
          id: string;
          image_url: string;
          images: Json;
          mrp: number;
          price: number;
          rating: number;
          rating_count: number;
          seo_description: string;
          seo_keywords: string;
          seo_title: string;
          slug: string | null;
          specs: Json;
          stock: number;
          store_id: string | null;
          title: string;
          warranty: string;
        };
        Insert: {
          active?: boolean;
          brand?: string;
          category?: string;
          colors?: Json;
          combo_product_ids?: Json;
          created_at?: string;
          description?: string;
          gift_available?: boolean;
          gift_note?: string;
          highlights?: Json;
          id?: string;
          image_url?: string;
          images?: Json;
          mrp?: number;
          price?: number;
          rating?: number;
          rating_count?: number;
          seo_description?: string;
          seo_keywords?: string;
          seo_title?: string;
          slug?: string | null;
          specs?: Json;
          stock?: number;
          store_id?: string | null;
          title: string;
          warranty?: string;
        };
        Update: {
          active?: boolean;
          brand?: string;
          category?: string;
          colors?: Json;
          combo_product_ids?: Json;
          created_at?: string;
          description?: string;
          gift_available?: boolean;
          gift_note?: string;
          highlights?: Json;
          id?: string;
          image_url?: string;
          images?: Json;
          mrp?: number;
          price?: number;
          rating?: number;
          rating_count?: number;
          seo_description?: string;
          seo_keywords?: string;
          seo_title?: string;
          slug?: string | null;
          specs?: Json;
          stock?: number;
          store_id?: string | null;
          title?: string;
          warranty?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          admin_note: string;
          comment: string;
          created_at: string;
          id: string;
          images: Json;
          order_id: string | null;
          product_id: string;
          rating: number;
          status: string;
          title: string;
          updated_at: string;
          user_email: string;
          user_id: string;
          verified: boolean;
          video_url: string;
        };
        Insert: {
          admin_note?: string;
          comment?: string;
          created_at?: string;
          id?: string;
          images?: Json;
          order_id?: string | null;
          product_id: string;
          rating: number;
          status?: string;
          title?: string;
          updated_at?: string;
          user_email?: string;
          user_id: string;
          verified?: boolean;
          video_url?: string;
        };
        Update: {
          admin_note?: string;
          comment?: string;
          created_at?: string;
          id?: string;
          images?: Json;
          order_id?: string | null;
          product_id?: string;
          rating?: number;
          status?: string;
          title?: string;
          updated_at?: string;
          user_email?: string;
          user_id?: string;
          verified?: boolean;
          video_url?: string;
        };
        Relationships: [];
      };
      store_settings: {
        Row: {
          admin_whatsapp: string;
          cancellation_fee_percent: number;
          delivery_estimate: string;
          delivery_fee: number;
          delivery_fee_enabled: boolean;
          free_delivery_above: number;
          id: string;
          support_phone: string;
          updated_at: string;
        };
        Insert: {
          admin_whatsapp?: string;
          cancellation_fee_percent?: number;
          delivery_estimate?: string;
          delivery_fee?: number;
          delivery_fee_enabled?: boolean;
          free_delivery_above?: number;
          id?: string;
          support_phone?: string;
          updated_at?: string;
        };
        Update: {
          admin_whatsapp?: string;
          cancellation_fee_percent?: number;
          delivery_estimate?: string;
          delivery_fee?: number;
          delivery_fee_enabled?: boolean;
          free_delivery_above?: number;
          id?: string;
          support_phone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      stores: {
        Row: {
          active: boolean;
          address: string;
          city: string;
          created_at: string;
          delivery_estimate: string;
          id: string;
          latitude: number;
          longitude: number;
          name: string;
          radius_km: number;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          address?: string;
          city?: string;
          created_at?: string;
          delivery_estimate?: string;
          id?: string;
          latitude: number;
          longitude: number;
          name: string;
          radius_km?: number;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          address?: string;
          city?: string;
          created_at?: string;
          delivery_estimate?: string;
          id?: string;
          latitude?: number;
          longitude?: number;
          name?: string;
          radius_km?: number;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_admin: { Args: never; Returns: boolean };
      claim_lucky_coin: {
        Args: { p_order_id: string };
        Returns: Json;
      };
      expire_old_coins: { Args: never; Returns: undefined };
      redeem_coins: {
        Args: { p_order_id: string; p_amount: number };
        Returns: Json;
      };
      refund_coins_for_order: {
        Args: { p_order_id: string };
        Returns: number;
      };
      release_coins_for_pending_order: {
        Args: { p_order_id: string };
        Returns: number;
      };
      submit_review: {
        Args: {
          p_product_id: string;
          p_rating: number;
          p_title: string;
          p_comment: string;
          p_images: Json;
          p_video_url: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      app_role: "admin" | "moderator" | "user";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const;
