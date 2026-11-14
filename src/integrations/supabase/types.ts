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
    PostgrestVersion: "14.17"
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
      fincommand_companies: {
        Row: {
          cin: string | null
          created_at: string
          currency: string
          date_of_incorporation: string | null
          fiscal_year_start: number
          gstin: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          pan: string | null
          presentation_currency: string | null
          registered_address: string | null
          reporting_standard: string
          updated_at: string
          zoho_organization_id: string | null
        }
        Insert: {
          cin?: string | null
          created_at?: string
          currency?: string
          date_of_incorporation?: string | null
          fiscal_year_start?: number
          gstin?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          pan?: string | null
          presentation_currency?: string | null
          registered_address?: string | null
          reporting_standard?: string
          updated_at?: string
          zoho_organization_id?: string | null
        }
        Update: {
          cin?: string | null
          created_at?: string
          currency?: string
          date_of_incorporation?: string | null
          fiscal_year_start?: number
          gstin?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          pan?: string | null
          presentation_currency?: string | null
          registered_address?: string | null
          reporting_standard?: string
          updated_at?: string
          zoho_organization_id?: string | null
        }
        Relationships: []
      }
      fincommand_document_lines: {
        Row: {
          account_id: string | null
          amount: number | null
          company_id: string
          description: string | null
          item_id: string | null
          line_id: string
          payload: Json
          project_id: string | null
          quantity: number | null
          rate: number | null
          resource: string
          source_id: string
          tax_id: string | null
        }
        Insert: {
          account_id?: string | null
          amount?: number | null
          company_id: string
          description?: string | null
          item_id?: string | null
          line_id: string
          payload: Json
          project_id?: string | null
          quantity?: number | null
          rate?: number | null
          resource: string
          source_id: string
          tax_id?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number | null
          company_id?: string
          description?: string | null
          item_id?: string | null
          line_id?: string
          payload?: Json
          project_id?: string | null
          quantity?: number | null
          rate?: number | null
          resource?: string
          source_id?: string
          tax_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fincommand_document_lines_company_id_resource_source_id_fkey"
            columns: ["company_id", "resource", "source_id"]
            isOneToOne: false
            referencedRelation: "fincommand_source_records"
            referencedColumns: ["company_id", "resource", "source_id"]
          },
        ]
      }
      fincommand_documents: {
        Row: {
          balance_base: number | null
          balance_due: number | null
          base_currency: string
          company_id: string
          currency: string | null
          document_date: string | null
          document_number: string | null
          due_date: string | null
          exchange_rate: number | null
          fetched_at: string
          location_id: string | null
          normalization_issues: Json
          party_name: string | null
          party_source_id: string | null
          project_id: string | null
          resource: string
          source_id: string
          status: string | null
          subtotal: number | null
          tax_total: number | null
          total: number | null
          total_base: number | null
        }
        Insert: {
          balance_base?: number | null
          balance_due?: number | null
          base_currency: string
          company_id: string
          currency?: string | null
          document_date?: string | null
          document_number?: string | null
          due_date?: string | null
          exchange_rate?: number | null
          fetched_at?: string
          location_id?: string | null
          normalization_issues?: Json
          party_name?: string | null
          party_source_id?: string | null
          project_id?: string | null
          resource: string
          source_id: string
          status?: string | null
          subtotal?: number | null
          tax_total?: number | null
          total?: number | null
          total_base?: number | null
        }
        Update: {
          balance_base?: number | null
          balance_due?: number | null
          base_currency?: string
          company_id?: string
          currency?: string | null
          document_date?: string | null
          document_number?: string | null
          due_date?: string | null
          exchange_rate?: number | null
          fetched_at?: string
          location_id?: string | null
          normalization_issues?: Json
          party_name?: string | null
          party_source_id?: string | null
          project_id?: string | null
          resource?: string
          source_id?: string
          status?: string | null
          subtotal?: number | null
          tax_total?: number | null
          total?: number | null
          total_base?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fincommand_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "fincommand_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fincommand_documents_company_id_resource_source_id_fkey"
            columns: ["company_id", "resource", "source_id"]
            isOneToOne: true
            referencedRelation: "fincommand_source_records"
            referencedColumns: ["company_id", "resource", "source_id"]
          },
        ]
      }
      fincommand_financial_years: {
        Row: {
          company_id: string
          created_at: string
          end_date: string
          id: string
          is_locked: boolean
          label: string
          locked_at: string | null
          locked_by: string | null
          notes: string | null
          short_label: string | null
          start_date: string
          year_type: string
        }
        Insert: {
          company_id: string
          created_at?: string
          end_date: string
          id?: string
          is_locked?: boolean
          label: string
          locked_at?: string | null
          locked_by?: string | null
          notes?: string | null
          short_label?: string | null
          start_date: string
          year_type?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          end_date?: string
          id?: string
          is_locked?: boolean
          label?: string
          locked_at?: string | null
          locked_by?: string | null
          notes?: string | null
          short_label?: string | null
          start_date?: string
          year_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fincommand_financial_years_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "fincommand_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      fincommand_masters: {
        Row: {
          company_id: string
          currency: string | null
          kind: string | null
          name: string | null
          payload: Json
          resource: string
          source_id: string
          status: string | null
        }
        Insert: {
          company_id: string
          currency?: string | null
          kind?: string | null
          name?: string | null
          payload: Json
          resource: string
          source_id: string
          status?: string | null
        }
        Update: {
          company_id?: string
          currency?: string | null
          kind?: string | null
          name?: string | null
          payload?: Json
          resource?: string
          source_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fincommand_masters_company_id_resource_source_id_fkey"
            columns: ["company_id", "resource", "source_id"]
            isOneToOne: true
            referencedRelation: "fincommand_source_records"
            referencedColumns: ["company_id", "resource", "source_id"]
          },
        ]
      }
      fincommand_memberships: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          permissions: Json
          role: string
          source_user_id: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          permissions?: Json
          role: string
          source_user_id?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          permissions?: Json
          role?: string
          source_user_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fincommand_memberships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "fincommand_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      fincommand_source_records: {
        Row: {
          company_id: string
          detail_complete: boolean
          fetched_at: string
          payload: Json
          resource: string
          source_id: string
          source_modified_at: string | null
        }
        Insert: {
          company_id: string
          detail_complete?: boolean
          fetched_at?: string
          payload: Json
          resource: string
          source_id: string
          source_modified_at?: string | null
        }
        Update: {
          company_id?: string
          detail_complete?: boolean
          fetched_at?: string
          payload?: Json
          resource?: string
          source_id?: string
          source_modified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fincommand_source_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "fincommand_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      fincommand_source_snapshots: {
        Row: {
          company_id: string
          fetched_at: string
          id: string
          page: number | null
          payload: Json
          request_path: string
          resource: string
        }
        Insert: {
          company_id: string
          fetched_at?: string
          id?: string
          page?: number | null
          payload: Json
          request_path: string
          resource: string
        }
        Update: {
          company_id?: string
          fetched_at?: string
          id?: string
          page?: number | null
          payload?: Json
          request_path?: string
          resource?: string
        }
        Relationships: [
          {
            foreignKeyName: "fincommand_source_snapshots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "fincommand_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      fincommand_sync_resources: {
        Row: {
          company_id: string
          detail_cursor: string | null
          detail_key: string | null
          http_status: number | null
          id_key: string
          last_error: string | null
          page: number
          path: string
          phase: string
          records_pulled: number
          resource: string
          response_key: string
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          detail_cursor?: string | null
          detail_key?: string | null
          http_status?: number | null
          id_key: string
          last_error?: string | null
          page?: number
          path: string
          phase?: string
          records_pulled?: number
          resource: string
          response_key: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          detail_cursor?: string | null
          detail_key?: string | null
          http_status?: number | null
          id_key?: string
          last_error?: string | null
          page?: number
          path?: string
          phase?: string
          records_pulled?: number
          resource?: string
          response_key?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fincommand_sync_resources_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "fincommand_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      fincommand_tb_ledgers: {
        Row: {
          company_id: string
          created_at: string
          depth: number
          financial_year_id: string
          id: string
          is_child_present: boolean
          ledger_code: string | null
          ledger_name: string
          m1_cr: number
          m1_dr: number
          m10_cr: number
          m10_dr: number
          m11_cr: number
          m11_dr: number
          m12_cr: number
          m12_dr: number
          m2_cr: number
          m2_dr: number
          m3_cr: number
          m3_dr: number
          m4_cr: number
          m4_dr: number
          m5_cr: number
          m5_dr: number
          m6_cr: number
          m6_dr: number
          m7_cr: number
          m7_dr: number
          m8_cr: number
          m8_dr: number
          m9_cr: number
          m9_dr: number
          normal_bal: string
          note_name: string | null
          note_no: number | null
          op_cr: number
          op_dr: number
          section: string | null
          treasury_type: string | null
          upload_id: string
          zoho_account_id: string | null
          zoho_account_type: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          depth?: number
          financial_year_id: string
          id?: string
          is_child_present?: boolean
          ledger_code?: string | null
          ledger_name: string
          m1_cr?: number
          m1_dr?: number
          m10_cr?: number
          m10_dr?: number
          m11_cr?: number
          m11_dr?: number
          m12_cr?: number
          m12_dr?: number
          m2_cr?: number
          m2_dr?: number
          m3_cr?: number
          m3_dr?: number
          m4_cr?: number
          m4_dr?: number
          m5_cr?: number
          m5_dr?: number
          m6_cr?: number
          m6_dr?: number
          m7_cr?: number
          m7_dr?: number
          m8_cr?: number
          m8_dr?: number
          m9_cr?: number
          m9_dr?: number
          normal_bal?: string
          note_name?: string | null
          note_no?: number | null
          op_cr?: number
          op_dr?: number
          section?: string | null
          treasury_type?: string | null
          upload_id: string
          zoho_account_id?: string | null
          zoho_account_type?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          depth?: number
          financial_year_id?: string
          id?: string
          is_child_present?: boolean
          ledger_code?: string | null
          ledger_name?: string
          m1_cr?: number
          m1_dr?: number
          m10_cr?: number
          m10_dr?: number
          m11_cr?: number
          m11_dr?: number
          m12_cr?: number
          m12_dr?: number
          m2_cr?: number
          m2_dr?: number
          m3_cr?: number
          m3_dr?: number
          m4_cr?: number
          m4_dr?: number
          m5_cr?: number
          m5_dr?: number
          m6_cr?: number
          m6_dr?: number
          m7_cr?: number
          m7_dr?: number
          m8_cr?: number
          m8_dr?: number
          m9_cr?: number
          m9_dr?: number
          normal_bal?: string
          note_name?: string | null
          note_no?: number | null
          op_cr?: number
          op_dr?: number
          section?: string | null
          treasury_type?: string | null
          upload_id?: string
          zoho_account_id?: string | null
          zoho_account_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fincommand_tb_ledgers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "fincommand_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fincommand_tb_ledgers_upload_id_company_id_financial_year__fkey"
            columns: ["upload_id", "company_id", "financial_year_id"]
            isOneToOne: false
            referencedRelation: "fincommand_tb_uploads"
            referencedColumns: ["id", "company_id", "financial_year_id"]
          },
        ]
      }
      fincommand_tb_uploads: {
        Row: {
          company_id: string
          coverage_pct: number | null
          error_message: string | null
          file_size_kb: number | null
          filename: string | null
          financial_year_id: string
          has_monthly_cols: boolean
          id: string
          is_current: boolean
          ledger_count: number
          mapped_count: number
          raw_zoho_months: Json | null
          source: string
          status: string
          storage_path: string | null
          unmatched_count: number
          unmatched_ledgers: Json
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          company_id: string
          coverage_pct?: number | null
          error_message?: string | null
          file_size_kb?: number | null
          filename?: string | null
          financial_year_id: string
          has_monthly_cols?: boolean
          id?: string
          is_current?: boolean
          ledger_count?: number
          mapped_count?: number
          raw_zoho_months?: Json | null
          source?: string
          status?: string
          storage_path?: string | null
          unmatched_count?: number
          unmatched_ledgers?: Json
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string
          coverage_pct?: number | null
          error_message?: string | null
          file_size_kb?: number | null
          filename?: string | null
          financial_year_id?: string
          has_monthly_cols?: boolean
          id?: string
          is_current?: boolean
          ledger_count?: number
          mapped_count?: number
          raw_zoho_months?: Json | null
          source?: string
          status?: string
          storage_path?: string | null
          unmatched_count?: number
          unmatched_ledgers?: Json
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fincommand_tb_uploads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "fincommand_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fincommand_tb_uploads_financial_year_id_company_id_fkey"
            columns: ["financial_year_id", "company_id"]
            isOneToOne: false
            referencedRelation: "fincommand_financial_years"
            referencedColumns: ["id", "company_id"]
          },
        ]
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
          actor: string
          change_note: string | null
          changed_fields: Json
          created_at: string
          id: string
          metric_id: string
          snapshot: Json
          version: number
        }
        Insert: {
          actor?: string
          change_note?: string | null
          changed_fields?: Json
          created_at?: string
          id?: string
          metric_id: string
          snapshot: Json
          version: number
        }
        Update: {
          actor?: string
          change_note?: string | null
          changed_fields?: Json
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
      plan_facts: {
        Row: {
          amount_base: number
          category: string
          id: string
          line_key: string
          line_label: string
          month_date: string
          month_key: string
          published_at: string
          scenario_id: string
          scenario_name: string
          series: string
        }
        Insert: {
          amount_base?: number
          category: string
          id?: string
          line_key: string
          line_label: string
          month_date: string
          month_key: string
          published_at?: string
          scenario_id: string
          scenario_name: string
          series: string
        }
        Update: {
          amount_base?: number
          category?: string
          id?: string
          line_key?: string
          line_label?: string
          month_date?: string
          month_key?: string
          published_at?: string
          scenario_id?: string
          scenario_name?: string
          series?: string
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
      fincommand_monthly_ledgers: {
        Row: {
          amount_base: number | null
          closing_balance_base: number | null
          company_id: string | null
          credit: number | null
          debit: number | null
          financial_year_id: string | null
          id: string | null
          ledger_code: string | null
          ledger_name: string | null
          month_date: string | null
          month_index: number | null
          normal_bal: string | null
          note_name: string | null
          note_no: number | null
          section: string | null
          treasury_type: string | null
          upload_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fincommand_tb_ledgers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "fincommand_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fincommand_tb_ledgers_upload_id_company_id_financial_year__fkey"
            columns: ["upload_id", "company_id", "financial_year_id"]
            isOneToOne: false
            referencedRelation: "fincommand_tb_uploads"
            referencedColumns: ["id", "company_id", "financial_year_id"]
          },
        ]
      }
    }
    Functions: {
      fincommand_can_read_company: {
        Args: { target_company: string }
        Returns: boolean
      }
      fincommand_store_zoho_batch: {
        Args: {
          p_company: string
          p_detail: boolean
          p_documents: Json
          p_lines: Json
          p_masters: Json
          p_page: number
          p_path: string
          p_records: Json
          p_resource: string
          p_snapshot: Json
        }
        Returns: undefined
      }
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
    Enums: {},
  },
} as const
