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
      account_mappings: {
        Row: {
          canonical_subtype: string
          canonical_type: string
          confidence: string
          id: string
          source: string
          source_account_id: string
          source_account_name: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          canonical_subtype: string
          canonical_type: string
          confidence?: string
          id?: string
          source: string
          source_account_id: string
          source_account_name?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          canonical_subtype?: string
          canonical_type?: string
          confidence?: string
          id?: string
          source?: string
          source_account_id?: string
          source_account_name?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      accounts: {
        Row: {
          account_subtype: string
          account_type: string
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          source: string
          source_id: string | null
          tenant_id: string
        }
        Insert: {
          account_subtype: string
          account_type: string
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          source?: string
          source_id?: string | null
          tenant_id?: string
        }
        Update: {
          account_subtype?: string
          account_type?: string
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          source?: string
          source_id?: string | null
          tenant_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor: string
          created_at: string
          id: string
          object_key: string | null
          object_type: string
          previous: Json | null
          tenant_id: string
        }
        Insert: {
          action: string
          actor?: string
          created_at?: string
          id?: string
          object_key?: string | null
          object_type: string
          previous?: Json | null
          tenant_id?: string
        }
        Update: {
          action?: string
          actor?: string
          created_at?: string
          id?: string
          object_key?: string | null
          object_type?: string
          previous?: Json | null
          tenant_id?: string
        }
        Relationships: []
      }
      bank_balances: {
        Row: {
          account_id: string | null
          account_name: string | null
          account_subtype: string
          as_of_date: string
          closing_balance_base: number
          id: string
          source: string
          tenant_id: string
        }
        Insert: {
          account_id?: string | null
          account_name?: string | null
          account_subtype?: string
          as_of_date: string
          closing_balance_base?: number
          id?: string
          source?: string
          tenant_id?: string
        }
        Update: {
          account_id?: string | null
          account_name?: string | null
          account_subtype?: string
          as_of_date?: string
          closing_balance_base?: number
          id?: string
          source?: string
          tenant_id?: string
        }
        Relationships: []
      }
      bills: {
        Row: {
          amount_base: number
          balance_due: number
          bill_date: string
          cost_center: string | null
          days_overdue: number
          due_date: string | null
          id: string
          source: string
          source_id: string | null
          status: string
          tenant_id: string
          total: number
          vendor_id: string | null
          vendor_name: string | null
        }
        Insert: {
          amount_base?: number
          balance_due?: number
          bill_date: string
          cost_center?: string | null
          days_overdue?: number
          due_date?: string | null
          id?: string
          source?: string
          source_id?: string | null
          status?: string
          tenant_id?: string
          total?: number
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Update: {
          amount_base?: number
          balance_due?: number
          bill_date?: string
          cost_center?: string | null
          days_overdue?: number
          due_date?: string | null
          id?: string
          source?: string
          source_id?: string | null
          status?: string
          tenant_id?: string
          total?: number
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Relationships: []
      }
      budgets: {
        Row: {
          account_subtype: string | null
          amount_base: number
          budget_type: string
          cost_center: string | null
          id: string
          period_end: string
          period_start: string
          tenant_id: string
        }
        Insert: {
          account_subtype?: string | null
          amount_base?: number
          budget_type: string
          cost_center?: string | null
          id?: string
          period_end: string
          period_start: string
          tenant_id?: string
        }
        Update: {
          account_subtype?: string | null
          amount_base?: number
          budget_type?: string
          cost_center?: string | null
          id?: string
          period_end?: string
          period_start?: string
          tenant_id?: string
        }
        Relationships: []
      }
      connections: {
        Row: {
          display_name: string
          id: string
          last_cursor: string | null
          last_error: string | null
          last_success_at: string | null
          org_identifier: string | null
          records_pulled: number
          source: string
          status: string
          tenant_id: string
        }
        Insert: {
          display_name: string
          id?: string
          last_cursor?: string | null
          last_error?: string | null
          last_success_at?: string | null
          org_identifier?: string | null
          records_pulled?: number
          source: string
          status?: string
          tenant_id?: string
        }
        Update: {
          display_name?: string
          id?: string
          last_cursor?: string | null
          last_error?: string | null
          last_success_at?: string | null
          org_identifier?: string | null
          records_pulled?: number
          source?: string
          status?: string
          tenant_id?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          credit_limit: number | null
          id: string
          is_active: boolean
          name: string
          source: string
          source_id: string | null
          tenant_id: string
        }
        Insert: {
          credit_limit?: number | null
          id?: string
          is_active?: boolean
          name: string
          source?: string
          source_id?: string | null
          tenant_id?: string
        }
        Update: {
          credit_limit?: number | null
          id?: string
          is_active?: boolean
          name?: string
          source?: string
          source_id?: string | null
          tenant_id?: string
        }
        Relationships: []
      }
      dashboard_filters: {
        Row: {
          dashboard_id: string
          default_value: string | null
          filter_type: string
          id: string
          key: string
          label: string
          options: Json
          sort_order: number
          source_field: string | null
        }
        Insert: {
          dashboard_id: string
          default_value?: string | null
          filter_type?: string
          id?: string
          key: string
          label: string
          options?: Json
          sort_order?: number
          source_field?: string | null
        }
        Update: {
          dashboard_id?: string
          default_value?: string | null
          filter_type?: string
          id?: string
          key?: string
          label?: string
          options?: Json
          sort_order?: number
          source_field?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_filters_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "dashboards"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_shares: {
        Row: {
          created_at: string
          dashboard_id: string
          id: string
          permission: string
          role_id: string | null
          user_label: string | null
        }
        Insert: {
          created_at?: string
          dashboard_id: string
          id?: string
          permission?: string
          role_id?: string | null
          user_label?: string | null
        }
        Update: {
          created_at?: string
          dashboard_id?: string
          id?: string
          permission?: string
          role_id?: string | null
          user_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_shares_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "dashboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboard_shares_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboards: {
        Row: {
          created_at: string
          created_by: string
          default_period: string
          description: string | null
          id: string
          is_default: boolean
          is_template: boolean
          layout_cols: number
          name: string
          row_height_px: number
          slug: string
          tenant_id: string
          theme: Json
          updated_at: string
          visibility: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          default_period?: string
          description?: string | null
          id?: string
          is_default?: boolean
          is_template?: boolean
          layout_cols?: number
          name: string
          row_height_px?: number
          slug: string
          tenant_id?: string
          theme?: Json
          updated_at?: string
          visibility?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          default_period?: string
          description?: string | null
          id?: string
          is_default?: boolean
          is_template?: boolean
          layout_cols?: number
          name?: string
          row_height_px?: number
          slug?: string
          tenant_id?: string
          theme?: Json
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      date_dim: {
        Row: {
          date_key: string
          day: number
          month: number
          month_label: string
          quarter: number
          year: number
        }
        Insert: {
          date_key: string
          day: number
          month: number
          month_label: string
          quarter: number
          year: number
        }
        Update: {
          date_key?: string
          day?: number
          month?: number
          month_label?: string
          quarter?: number
          year?: number
        }
        Relationships: []
      }
      employee_events: {
        Row: {
          department: string | null
          employee_id: string | null
          event_date: string
          event_type: string
          id: string
          location: string | null
          tenant_id: string
        }
        Insert: {
          department?: string | null
          employee_id?: string | null
          event_date: string
          event_type: string
          id?: string
          location?: string | null
          tenant_id?: string
        }
        Update: {
          department?: string | null
          employee_id?: string | null
          event_date?: string
          event_type?: string
          id?: string
          location?: string | null
          tenant_id?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          age_group: string | null
          department: string
          employment_type: string
          gender: string | null
          hire_date: string
          id: string
          is_active: boolean
          location: string | null
          name: string
          salary: number
          separation_date: string | null
          tenant_id: string
          tenure_years: number
        }
        Insert: {
          age_group?: string | null
          department: string
          employment_type?: string
          gender?: string | null
          hire_date: string
          id?: string
          is_active?: boolean
          location?: string | null
          name: string
          salary?: number
          separation_date?: string | null
          tenant_id?: string
          tenure_years?: number
        }
        Update: {
          age_group?: string | null
          department?: string
          employment_type?: string
          gender?: string | null
          hire_date?: string
          id?: string
          is_active?: boolean
          location?: string | null
          name?: string
          salary?: number
          separation_date?: string | null
          tenant_id?: string
          tenure_years?: number
        }
        Relationships: []
      }
      entity_registry: {
        Row: {
          date_field: string | null
          default_value_field: string | null
          description: string | null
          entity: string
          fields: Json
          label: string
          sort_order: number
          supports_time_grain: boolean
        }
        Insert: {
          date_field?: string | null
          default_value_field?: string | null
          description?: string | null
          entity: string
          fields?: Json
          label: string
          sort_order?: number
          supports_time_grain?: boolean
        }
        Update: {
          date_field?: string | null
          default_value_field?: string | null
          description?: string | null
          entity?: string
          fields?: Json
          label?: string
          sort_order?: number
          supports_time_grain?: boolean
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount_base: number
          balance_due: number
          cost_center: string | null
          customer_id: string | null
          customer_name: string | null
          days_overdue: number
          due_date: string | null
          id: string
          invoice_date: string
          source: string
          source_id: string | null
          status: string
          tenant_id: string
          total: number
        }
        Insert: {
          amount_base?: number
          balance_due?: number
          cost_center?: string | null
          customer_id?: string | null
          customer_name?: string | null
          days_overdue?: number
          due_date?: string | null
          id?: string
          invoice_date: string
          source?: string
          source_id?: string | null
          status?: string
          tenant_id?: string
          total?: number
        }
        Update: {
          amount_base?: number
          balance_due?: number
          cost_center?: string | null
          customer_id?: string | null
          customer_name?: string | null
          days_overdue?: number
          due_date?: string | null
          id?: string
          invoice_date?: string
          source?: string
          source_id?: string | null
          status?: string
          tenant_id?: string
          total?: number
        }
        Relationships: []
      }
      items: {
        Row: {
          category: string | null
          id: string
          name: string
          source: string
          source_id: string | null
          tenant_id: string
          unit_price: number | null
        }
        Insert: {
          category?: string | null
          id?: string
          name: string
          source?: string
          source_id?: string | null
          tenant_id?: string
          unit_price?: number | null
        }
        Update: {
          category?: string | null
          id?: string
          name?: string
          source?: string
          source_id?: string | null
          tenant_id?: string
          unit_price?: number | null
        }
        Relationships: []
      }
      journal_lines: {
        Row: {
          account_code: string | null
          account_id: string | null
          account_name: string | null
          account_subtype: string | null
          account_type: string | null
          amount_base: number
          cost_center: string | null
          credit: number
          customer_id: string | null
          debit: number
          id: string
          item_id: string | null
          memo: string | null
          project_id: string | null
          source: string
          source_id: string | null
          tenant_id: string
          txn_date: string
          txn_source_id: string | null
          txn_type: string | null
          vendor_id: string | null
        }
        Insert: {
          account_code?: string | null
          account_id?: string | null
          account_name?: string | null
          account_subtype?: string | null
          account_type?: string | null
          amount_base?: number
          cost_center?: string | null
          credit?: number
          customer_id?: string | null
          debit?: number
          id?: string
          item_id?: string | null
          memo?: string | null
          project_id?: string | null
          source?: string
          source_id?: string | null
          tenant_id?: string
          txn_date: string
          txn_source_id?: string | null
          txn_type?: string | null
          vendor_id?: string | null
        }
        Update: {
          account_code?: string | null
          account_id?: string | null
          account_name?: string | null
          account_subtype?: string | null
          account_type?: string | null
          amount_base?: number
          cost_center?: string | null
          credit?: number
          customer_id?: string | null
          debit?: number
          id?: string
          item_id?: string | null
          memo?: string | null
          project_id?: string | null
          source?: string
          source_id?: string | null
          tenant_id?: string
          txn_date?: string
          txn_source_id?: string | null
          txn_type?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_cache: {
        Row: {
          created_at: string
          definition_version: number
          expires_at: string
          filter_hash: string
          id: string
          metric_key: string
          payload: Json
          period_key: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          definition_version: number
          expires_at: string
          filter_hash?: string
          id?: string
          metric_key: string
          payload: Json
          period_key: string
          tenant_id?: string
        }
        Update: {
          created_at?: string
          definition_version?: number
          expires_at?: string
          filter_hash?: string
          id?: string
          metric_key?: string
          payload?: Json
          period_key?: string
          tenant_id?: string
        }
        Relationships: []
      }
      metric_definition_versions: {
        Row: {
          created_at: string
          id: string
          metric_id: string
          snapshot: Json
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          metric_id: string
          snapshot: Json
          version: number
        }
        Update: {
          created_at?: string
          id?: string
          metric_id?: string
          snapshot?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "metric_definition_versions_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "metric_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_definitions: {
        Row: {
          aggregation: string | null
          comparison: string
          created_at: string
          decimals: number
          description: string | null
          filters: Json
          formula: Json | null
          group_by: string | null
          id: string
          is_system: boolean
          key: string
          metric_kind: string
          name: string
          scale: number
          sign_convention: string
          source_entity: string | null
          target_value: number | null
          tenant_id: string
          thresholds: Json | null
          time_grain: string
          unit: string | null
          updated_at: string
          value_field: string | null
          value_type: string
          version: number
        }
        Insert: {
          aggregation?: string | null
          comparison?: string
          created_at?: string
          decimals?: number
          description?: string | null
          filters?: Json
          formula?: Json | null
          group_by?: string | null
          id?: string
          is_system?: boolean
          key: string
          metric_kind?: string
          name: string
          scale?: number
          sign_convention?: string
          source_entity?: string | null
          target_value?: number | null
          tenant_id?: string
          thresholds?: Json | null
          time_grain?: string
          unit?: string | null
          updated_at?: string
          value_field?: string | null
          value_type?: string
          version?: number
        }
        Update: {
          aggregation?: string | null
          comparison?: string
          created_at?: string
          decimals?: number
          description?: string | null
          filters?: Json
          formula?: Json | null
          group_by?: string | null
          id?: string
          is_system?: boolean
          key?: string
          metric_kind?: string
          name?: string
          scale?: number
          sign_convention?: string
          source_entity?: string | null
          target_value?: number | null
          tenant_id?: string
          thresholds?: Json | null
          time_grain?: string
          unit?: string | null
          updated_at?: string
          value_field?: string | null
          value_type?: string
          version?: number
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_base: number
          applied_to_id: string | null
          cost_center: string | null
          direction: string
          id: string
          paid_on: string
          party_id: string | null
          party_name: string | null
          source: string
          source_id: string | null
          tenant_id: string
        }
        Insert: {
          amount_base?: number
          applied_to_id?: string | null
          cost_center?: string | null
          direction?: string
          id?: string
          paid_on: string
          party_id?: string | null
          party_name?: string | null
          source?: string
          source_id?: string | null
          tenant_id?: string
        }
        Update: {
          amount_base?: number
          applied_to_id?: string | null
          cost_center?: string | null
          direction?: string
          id?: string
          paid_on?: string
          party_id?: string | null
          party_name?: string | null
          source?: string
          source_id?: string | null
          tenant_id?: string
        }
        Relationships: []
      }
      roles: {
        Row: {
          id: string
          name: string
          permissions: Json
          tenant_id: string
        }
        Insert: {
          id?: string
          name: string
          permissions?: Json
          tenant_id?: string
        }
        Update: {
          id?: string
          name?: string
          permissions?: Json
          tenant_id?: string
        }
        Relationships: []
      }
      vendors: {
        Row: {
          id: string
          is_active: boolean
          name: string
          source: string
          source_id: string | null
          tenant_id: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          name: string
          source?: string
          source_id?: string | null
          tenant_id?: string
        }
        Update: {
          id?: string
          is_active?: boolean
          name?: string
          source?: string
          source_id?: string | null
          tenant_id?: string
        }
        Relationships: []
      }
      widgets: {
        Row: {
          dashboard_id: string
          drilldown: Json | null
          grid_h: number
          grid_w: number
          grid_x: number
          grid_y: number
          id: string
          metric_binding: Json
          sort_order: number
          subtitle: string | null
          title: string | null
          viz_config: Json
          widget_type: string
        }
        Insert: {
          dashboard_id: string
          drilldown?: Json | null
          grid_h?: number
          grid_w?: number
          grid_x?: number
          grid_y?: number
          id?: string
          metric_binding?: Json
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          viz_config?: Json
          widget_type: string
        }
        Update: {
          dashboard_id?: string
          drilldown?: Json | null
          grid_h?: number
          grid_w?: number
          grid_x?: number
          grid_y?: number
          id?: string
          metric_binding?: Json
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          viz_config?: Json
          widget_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "widgets_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "dashboards"
            referencedColumns: ["id"]
          },
        ]
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
