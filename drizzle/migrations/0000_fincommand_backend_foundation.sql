CREATE TABLE public.fincommand_companies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, cin text, pan text, gstin text, registered_address text, logo_url text, date_of_incorporation date, fiscal_year_start integer NOT NULL DEFAULT 4 CHECK (fiscal_year_start BETWEEN 1 AND 12), currency text NOT NULL DEFAULT 'INR', presentation_currency text, reporting_standard text NOT NULL DEFAULT 'IND_AS', is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.fincommand_companies TO authenticated;
GRANT ALL ON public.fincommand_companies TO service_role;
ALTER TABLE public.fincommand_companies ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.fincommand_memberships (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.fincommand_companies(id) ON DELETE CASCADE, user_id uuid NOT NULL, source_user_id uuid, role text NOT NULL CHECK(role IN ('admin','cfo','ceo','auditor','manager','viewer')), permissions jsonb NOT NULL DEFAULT '{}', is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(company_id,user_id), UNIQUE(source_user_id)
);
GRANT SELECT ON public.fincommand_memberships TO authenticated;
GRANT ALL ON public.fincommand_memberships TO service_role;
ALTER TABLE public.fincommand_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY fincommand_membership_self ON public.fincommand_memberships FOR SELECT TO authenticated USING(user_id = (SELECT auth.uid()));
CREATE FUNCTION public.fincommand_can_read_company(target_company uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS(SELECT 1 FROM public.fincommand_memberships WHERE company_id = target_company AND user_id = (SELECT auth.uid()) AND is_active); $$;
REVOKE ALL ON FUNCTION public.fincommand_can_read_company(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fincommand_can_read_company(uuid) TO authenticated, service_role;
CREATE POLICY fincommand_company_read ON public.fincommand_companies FOR SELECT TO authenticated USING(public.fincommand_can_read_company(id));
CREATE TABLE public.fincommand_financial_years (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.fincommand_companies(id) ON DELETE CASCADE, label text NOT NULL, short_label text, start_date date NOT NULL, end_date date NOT NULL, year_type text NOT NULL DEFAULT 'FY' CHECK(year_type IN('FY','CY')), is_locked boolean NOT NULL DEFAULT false, locked_by uuid, locked_at timestamptz, notes text, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(company_id,label), UNIQUE(id,company_id), CHECK(end_date >= start_date)
);
GRANT SELECT ON public.fincommand_financial_years TO authenticated;
GRANT ALL ON public.fincommand_financial_years TO service_role;
ALTER TABLE public.fincommand_financial_years ENABLE ROW LEVEL SECURITY;
CREATE POLICY fincommand_year_read ON public.fincommand_financial_years FOR SELECT TO authenticated USING(public.fincommand_can_read_company(company_id));
CREATE TABLE public.fincommand_tb_uploads (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.fincommand_companies(id) ON DELETE CASCADE, financial_year_id uuid NOT NULL, uploaded_by uuid, source text NOT NULL DEFAULT 'excel' CHECK(source IN('excel','zoho','tally','sap','api')), filename text, storage_path text, file_size_kb integer, ledger_count integer NOT NULL DEFAULT 0, mapped_count integer NOT NULL DEFAULT 0, unmatched_count integer NOT NULL DEFAULT 0, unmatched_ledgers jsonb NOT NULL DEFAULT '[]', coverage_pct numeric(5,2), has_monthly_cols boolean NOT NULL DEFAULT true, status text NOT NULL DEFAULT 'processing' CHECK(status IN('processing','complete','error','superseded')), error_message text, is_current boolean NOT NULL DEFAULT false, raw_zoho_months jsonb, uploaded_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,company_id,financial_year_id), FOREIGN KEY(financial_year_id,company_id) REFERENCES public.fincommand_financial_years(id,company_id)
);
GRANT SELECT ON public.fincommand_tb_uploads TO authenticated;
GRANT ALL ON public.fincommand_tb_uploads TO service_role;
ALTER TABLE public.fincommand_tb_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY fincommand_upload_read ON public.fincommand_tb_uploads FOR SELECT TO authenticated USING(public.fincommand_can_read_company(company_id));
CREATE UNIQUE INDEX fincommand_one_current_upload ON public.fincommand_tb_uploads(company_id,financial_year_id) WHERE is_current;
CREATE TABLE public.fincommand_tb_ledgers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), upload_id uuid NOT NULL, company_id uuid NOT NULL REFERENCES public.fincommand_companies(id) ON DELETE CASCADE, financial_year_id uuid NOT NULL, ledger_code text, ledger_name text NOT NULL, note_no integer, note_name text, section text CHECK(section IN('anc','ac','eq','lnc','lc','inc','exp')), treasury_type text CHECK(treasury_type IN('cash','bank_ca','bank_sb','fd','mf')), normal_bal text NOT NULL DEFAULT 'Dr' CHECK(normal_bal IN('Dr','Cr')), op_dr numeric(18,2) NOT NULL DEFAULT 0, op_cr numeric(18,2) NOT NULL DEFAULT 0,
 m1_dr numeric(18,2) NOT NULL DEFAULT 0, m1_cr numeric(18,2) NOT NULL DEFAULT 0, m2_dr numeric(18,2) NOT NULL DEFAULT 0, m2_cr numeric(18,2) NOT NULL DEFAULT 0, m3_dr numeric(18,2) NOT NULL DEFAULT 0, m3_cr numeric(18,2) NOT NULL DEFAULT 0, m4_dr numeric(18,2) NOT NULL DEFAULT 0, m4_cr numeric(18,2) NOT NULL DEFAULT 0, m5_dr numeric(18,2) NOT NULL DEFAULT 0, m5_cr numeric(18,2) NOT NULL DEFAULT 0, m6_dr numeric(18,2) NOT NULL DEFAULT 0, m6_cr numeric(18,2) NOT NULL DEFAULT 0, m7_dr numeric(18,2) NOT NULL DEFAULT 0, m7_cr numeric(18,2) NOT NULL DEFAULT 0, m8_dr numeric(18,2) NOT NULL DEFAULT 0, m8_cr numeric(18,2) NOT NULL DEFAULT 0, m9_dr numeric(18,2) NOT NULL DEFAULT 0, m9_cr numeric(18,2) NOT NULL DEFAULT 0, m10_dr numeric(18,2) NOT NULL DEFAULT 0, m10_cr numeric(18,2) NOT NULL DEFAULT 0, m11_dr numeric(18,2) NOT NULL DEFAULT 0, m11_cr numeric(18,2) NOT NULL DEFAULT 0, m12_dr numeric(18,2) NOT NULL DEFAULT 0, m12_cr numeric(18,2) NOT NULL DEFAULT 0,
 zoho_account_id text, zoho_account_type text, depth integer NOT NULL DEFAULT 0, is_child_present boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), FOREIGN KEY(upload_id,company_id,financial_year_id) REFERENCES public.fincommand_tb_uploads(id,company_id,financial_year_id) ON DELETE CASCADE
);
GRANT SELECT ON public.fincommand_tb_ledgers TO authenticated;
GRANT ALL ON public.fincommand_tb_ledgers TO service_role;
ALTER TABLE public.fincommand_tb_ledgers ENABLE ROW LEVEL SECURITY;
CREATE POLICY fincommand_ledger_read ON public.fincommand_tb_ledgers FOR SELECT TO authenticated USING(public.fincommand_can_read_company(company_id));
CREATE INDEX fincommand_ledger_upload ON public.fincommand_tb_ledgers(upload_id);
CREATE VIEW public.fincommand_monthly_ledgers WITH (security_invoker=true) AS
 SELECT l.id, l.company_id, l.financial_year_id, l.upload_id, l.ledger_code, l.ledger_name, l.section, l.note_no, l.note_name, l.treasury_type, l.normal_bal,
 (y.start_date + (m.month_index - 1) * interval '1 month')::date AS month_date, m.month_index,
 m.debit, m.credit, CASE WHEN l.normal_bal = 'Dr' THEN m.debit-m.credit ELSE m.credit-m.debit END AS amount_base,
 CASE WHEN l.normal_bal = 'Dr' THEN l.op_dr-l.op_cr ELSE l.op_cr-l.op_dr END + SUM(CASE WHEN l.normal_bal = 'Dr' THEN m.debit-m.credit ELSE m.credit-m.debit END) OVER(PARTITION BY l.id ORDER BY m.month_index) AS closing_balance_base
 FROM public.fincommand_tb_ledgers l
 JOIN public.fincommand_tb_uploads u ON u.id=l.upload_id AND u.company_id=l.company_id AND u.is_current AND u.status='complete'
 JOIN public.fincommand_financial_years y ON y.id=l.financial_year_id AND y.company_id=l.company_id
 CROSS JOIN LATERAL (VALUES(1,l.m1_dr,l.m1_cr),(2,l.m2_dr,l.m2_cr),(3,l.m3_dr,l.m3_cr),(4,l.m4_dr,l.m4_cr),(5,l.m5_dr,l.m5_cr),(6,l.m6_dr,l.m6_cr),(7,l.m7_dr,l.m7_cr),(8,l.m8_dr,l.m8_cr),(9,l.m9_dr,l.m9_cr),(10,l.m10_dr,l.m10_cr),(11,l.m11_dr,l.m11_cr),(12,l.m12_dr,l.m12_cr)) m(month_index,debit,credit);
GRANT SELECT ON public.fincommand_monthly_ledgers TO authenticated;
GRANT ALL ON public.fincommand_monthly_ledgers TO service_role;
COMMENT ON VIEW public.fincommand_monthly_ledgers IS 'Company-scoped FinCommand trial-balance movements and running balances; security_invoker preserves underlying membership RLS. No anonymous access.';