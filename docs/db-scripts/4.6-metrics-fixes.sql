-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_monthly_stats_user_month ON monthly_stats(user_id, month);
CREATE INDEX IF NOT EXISTS idx_personal_bests_user_metric ON personal_bests(user_id, metric_type);

-- Drop existing triggers to update them
DROP TRIGGER IF EXISTS update_monthly_stats_on_lead ON leads;
DROP TRIGGER IF EXISTS update_monthly_stats_on_customer ON customers;

-- Update the monthly stats function to handle empty results better
CREATE OR REPLACE FUNCTION update_monthly_stats()
RETURNS trigger AS $$
DECLARE
  current_month date;
  lead_count integer;
  customer_count integer;
  month_revenue numeric;
BEGIN
  current_month := date_trunc('month', NEW.created_at)::date;
  
  -- Get lead count for the month
  SELECT COUNT(*) INTO lead_count
  FROM leads
  WHERE user_id = NEW.user_id
  AND date_trunc('month', created_at) = date_trunc('month', current_month);

  -- Get customer count for the month
  SELECT COUNT(*) INTO customer_count
  FROM customers
  WHERE user_id = NEW.user_id
  AND date_trunc('month', created_at) = date_trunc('month', current_month);

  -- Get total revenue for the month
  SELECT COALESCE(SUM(sale_value), 0) INTO month_revenue
  FROM customers
  WHERE user_id = NEW.user_id
  AND date_trunc('month', created_at) = date_trunc('month', current_month);

  -- Insert or update monthly stats
  INSERT INTO monthly_stats (
    user_id,
    month,
    total_revenue,
    total_leads,
    conversion_rate
  ) VALUES (
    NEW.user_id,
    current_month,
    month_revenue,
    lead_count,
    CASE 
      WHEN lead_count > 0 THEN (customer_count::numeric / lead_count::numeric) * 100
      ELSE 0
    END
  )
  ON CONFLICT (user_id, month)
  DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    total_leads = EXCLUDED.total_leads,
    conversion_rate = EXCLUDED.conversion_rate,
    updated_at = now();

  -- Update personal bests
  -- Revenue
  IF month_revenue > 0 THEN
    INSERT INTO personal_bests (user_id, metric_type, value, achieved_at)
    VALUES (NEW.user_id, 'monthly_revenue', month_revenue, now())
    ON CONFLICT (user_id, metric_type)
    DO UPDATE SET
      value = GREATEST(personal_bests.value, EXCLUDED.value),
      achieved_at = CASE 
        WHEN EXCLUDED.value > personal_bests.value THEN now()
        ELSE personal_bests.achieved_at
      END;
  END IF;

  -- Leads
  IF lead_count > 0 THEN
    INSERT INTO personal_bests (user_id, metric_type, value, achieved_at)
    VALUES (NEW.user_id, 'monthly_leads', lead_count, now())
    ON CONFLICT (user_id, metric_type)
    DO UPDATE SET
      value = GREATEST(personal_bests.value, EXCLUDED.value),
      achieved_at = CASE 
        WHEN EXCLUDED.value > personal_bests.value THEN now()
        ELSE personal_bests.achieved_at
      END;
  END IF;

  -- Conversion Rate
  IF lead_count > 0 AND customer_count > 0 THEN
    INSERT INTO personal_bests (user_id, metric_type, value, achieved_at)
    VALUES (NEW.user_id, 'monthly_conversion', (customer_count::numeric / lead_count::numeric) * 100, now())
    ON CONFLICT (user_id, metric_type)
    DO UPDATE SET
      value = GREATEST(personal_bests.value, EXCLUDED.value),
      achieved_at = CASE 
        WHEN EXCLUDED.value > personal_bests.value THEN now()
        ELSE personal_bests.achieved_at
      END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers
CREATE TRIGGER update_monthly_stats_on_lead
  AFTER INSERT OR UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_monthly_stats();

CREATE TRIGGER update_monthly_stats_on_customer
  AFTER INSERT OR UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_monthly_stats();

  -- Add missing RLS policies for metrics
CREATE POLICY "Users can insert own metrics"
  ON metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own metrics"
  ON metrics
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_metrics_user_type_period ON metrics(user_id, type, period_start);
CREATE INDEX IF NOT EXISTS idx_metrics_created_at ON metrics(created_at);

-- Update the metrics trigger function to handle errors better
CREATE OR REPLACE FUNCTION update_metrics()
RETURNS trigger AS $$
BEGIN
  -- Update metrics for leads
  IF TG_TABLE_NAME = 'leads' THEN
    INSERT INTO metrics (user_id, type, value, period, period_start)
    VALUES (
      NEW.user_id,
      'new_leads',
      1,
      'daily',
      date_trunc('day', NEW.created_at)
    );
  END IF;

  -- Update metrics for customers
  IF TG_TABLE_NAME = 'customers' THEN
    -- New customer metric
    INSERT INTO metrics (user_id, type, value, period, period_start)
    VALUES (
      NEW.user_id,
      'new_customers',
      1,
      'daily',
      date_trunc('day', NEW.created_at)
    );

    -- Revenue metric
    IF NEW.sale_value IS NOT NULL AND NEW.sale_value > 0 THEN
      INSERT INTO metrics (user_id, type, value, period, period_start)
      VALUES (
        NEW.user_id,
        'total_revenue',
        NEW.sale_value,
        'daily',
        date_trunc('day', NEW.created_at)
      );
    END IF;

    -- Handle recurring revenue
    IF NEW.service_frequency != 'One-Time' AND NEW.sale_value > 0 THEN
      INSERT INTO metrics (user_id, type, value, period, period_start)
      VALUES (
        NEW.user_id,
        'recurring_revenue',
        NEW.sale_value,
        'daily',
        date_trunc('day', NEW.created_at)
      );
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and continue
    RAISE WARNING 'Error in update_metrics trigger: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate policies with proper security
DROP POLICY IF EXISTS "Users can read own monthly stats" ON monthly_stats;
DROP POLICY IF EXISTS "Users can insert own monthly stats" ON monthly_stats;
DROP POLICY IF EXISTS "Users can update own monthly stats" ON monthly_stats;

CREATE POLICY "Users can read own monthly stats"
  ON monthly_stats
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own monthly stats"
  ON monthly_stats
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own monthly stats"
  ON monthly_stats
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Personal bests policies
DROP POLICY IF EXISTS "Users can read own personal bests" ON personal_bests;
DROP POLICY IF EXISTS "Users can insert own personal bests" ON personal_bests;
DROP POLICY IF EXISTS "Users can update own personal bests" ON personal_bests;

CREATE POLICY "Users can read own personal bests"
  ON personal_bests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own personal bests"
  ON personal_bests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own personal bests"
  ON personal_bests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Update trigger function to handle RLS properly
CREATE OR REPLACE FUNCTION update_monthly_stats()
RETURNS trigger AS $$
DECLARE
  current_month date;
  lead_count integer;
  customer_count integer;
  month_revenue numeric;
  v_user_id uuid;
BEGIN
  -- Set user_id based on the triggering table
  v_user_id := NEW.user_id;
  current_month := date_trunc('month', NEW.created_at)::date;

  -- Use security definer context to bypass RLS
  -- Get lead count for the month
  SELECT COUNT(*) INTO lead_count
  FROM leads
  WHERE user_id = v_user_id
  AND date_trunc('month', created_at) = date_trunc('month', current_month);

  -- Get customer count for the month
  SELECT COUNT(*) INTO customer_count
  FROM customers
  WHERE user_id = v_user_id
  AND date_trunc('month', created_at) = date_trunc('month', current_month);

  -- Get total revenue for the month
  SELECT COALESCE(SUM(sale_value), 0) INTO month_revenue
  FROM customers
  WHERE user_id = v_user_id
  AND date_trunc('month', created_at) = date_trunc('month', current_month);

  -- Insert or update monthly stats
  INSERT INTO monthly_stats (
    user_id,
    month,
    total_revenue,
    total_leads,
    conversion_rate
  ) VALUES (
    v_user_id,
    current_month,
    month_revenue,
    lead_count,
    CASE 
      WHEN lead_count > 0 THEN (customer_count::numeric / lead_count::numeric) * 100
      ELSE 0
    END
  )
  ON CONFLICT (user_id, month)
  DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    total_leads = EXCLUDED.total_leads,
    conversion_rate = EXCLUDED.conversion_rate,
    updated_at = now();

  -- Update personal bests
  -- Revenue
  IF month_revenue > 0 THEN
    INSERT INTO personal_bests (user_id, metric_type, value, achieved_at)
    VALUES (v_user_id, 'monthly_revenue', month_revenue, now())
    ON CONFLICT (user_id, metric_type)
    DO UPDATE SET
      value = GREATEST(personal_bests.value, EXCLUDED.value),
      achieved_at = CASE 
        WHEN EXCLUDED.value > personal_bests.value THEN now()
        ELSE personal_bests.achieved_at
      END;
  END IF;

  -- Leads
  IF lead_count > 0 THEN
    INSERT INTO personal_bests (user_id, metric_type, value, achieved_at)
    VALUES (v_user_id, 'monthly_leads', lead_count, now())
    ON CONFLICT (user_id, metric_type)
    DO UPDATE SET
      value = GREATEST(personal_bests.value, EXCLUDED.value),
      achieved_at = CASE 
        WHEN EXCLUDED.value > personal_bests.value THEN now()
        ELSE personal_bests.achieved_at
      END;
  END IF;

  -- Conversion Rate
  IF lead_count > 0 AND customer_count > 0 THEN
    INSERT INTO personal_bests (user_id, metric_type, value, achieved_at)
    VALUES (v_user_id, 'monthly_conversion', (customer_count::numeric / lead_count::numeric) * 100, now())
    ON CONFLICT (user_id, metric_type)
    DO UPDATE SET
      value = GREATEST(personal_bests.value, EXCLUDED.value),
      achieved_at = CASE 
        WHEN EXCLUDED.value > personal_bests.value THEN now()
        ELSE personal_bests.achieved_at
      END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;