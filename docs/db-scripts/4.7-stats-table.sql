-- Create historical_monthly_stats table to track finalized monthly stats
CREATE TABLE IF NOT EXISTS historical_monthly_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  month date NOT NULL,
  total_revenue numeric DEFAULT 0,
  total_leads integer DEFAULT 0,
  conversion_rate numeric DEFAULT 0,
  finalized boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, month)
);

-- Enable RLS on new table
ALTER TABLE historical_monthly_stats ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for historical stats
CREATE POLICY "Users can read own historical stats"
  ON historical_monthly_stats
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to finalize monthly stats
CREATE OR REPLACE FUNCTION finalize_monthly_stats(p_user_id uuid, p_month date)
RETURNS void AS $$
BEGIN
  -- Insert or update historical stats
  INSERT INTO historical_monthly_stats (
    user_id,
    month,
    total_revenue,
    total_leads,
    conversion_rate,
    finalized
  )
  SELECT
    user_id,
    month,
    total_revenue,
    total_leads,
    conversion_rate,
    true
  FROM monthly_stats
  WHERE user_id = p_user_id
    AND month = p_month
  ON CONFLICT (user_id, month)
  DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    total_leads = EXCLUDED.total_leads,
    conversion_rate = EXCLUDED.conversion_rate,
    finalized = true;

  -- Update personal bests only if the new values are higher than all previous months
  -- Revenue
  INSERT INTO personal_bests (user_id, metric_type, value, achieved_at)
  SELECT 
    p_user_id,
    'monthly_revenue',
    total_revenue,
    now()
  FROM historical_monthly_stats
  WHERE user_id = p_user_id
    AND month = p_month
    AND total_revenue > COALESCE((
      SELECT MAX(total_revenue)
      FROM historical_monthly_stats
      WHERE user_id = p_user_id
        AND month < p_month
        AND finalized = true
    ), 0)
  ON CONFLICT (user_id, metric_type)
  DO UPDATE SET
    value = EXCLUDED.value,
    achieved_at = EXCLUDED.achieved_at
  WHERE EXCLUDED.value > personal_bests.value;

  -- Leads
  INSERT INTO personal_bests (user_id, metric_type, value, achieved_at)
  SELECT 
    p_user_id,
    'monthly_leads',
    total_leads,
    now()
  FROM historical_monthly_stats
  WHERE user_id = p_user_id
    AND month = p_month
    AND total_leads > COALESCE((
      SELECT MAX(total_leads)
      FROM historical_monthly_stats
      WHERE user_id = p_user_id
        AND month < p_month
        AND finalized = true
    ), 0)
  ON CONFLICT (user_id, metric_type)
  DO UPDATE SET
    value = EXCLUDED.value,
    achieved_at = EXCLUDED.achieved_at
  WHERE EXCLUDED.value > personal_bests.value;

  -- Conversion Rate
  INSERT INTO personal_bests (user_id, metric_type, value, achieved_at)
  SELECT 
    p_user_id,
    'monthly_conversion',
    conversion_rate,
    now()
  FROM historical_monthly_stats
  WHERE user_id = p_user_id
    AND month = p_month
    AND conversion_rate > COALESCE((
      SELECT MAX(conversion_rate)
      FROM historical_monthly_stats
      WHERE user_id = p_user_id
        AND month < p_month
        AND finalized = true
    ), 0)
  ON CONFLICT (user_id, metric_type)
  DO UPDATE SET
    value = EXCLUDED.value,
    achieved_at = EXCLUDED.achieved_at
  WHERE EXCLUDED.value > personal_bests.value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the monthly stats trigger to handle month transitions
CREATE OR REPLACE FUNCTION update_monthly_stats()
RETURNS trigger AS $$
DECLARE
  current_month date;
  previous_month date;
  lead_count integer;
  customer_count integer;
  month_revenue numeric;
  v_user_id uuid;
BEGIN
  -- Set user_id based on the triggering table
  v_user_id := NEW.user_id;
  current_month := date_trunc('month', NEW.created_at)::date;
  previous_month := current_month - interval '1 month';

  -- Check if we need to finalize the previous month
  IF NOT EXISTS (
    SELECT 1 FROM historical_monthly_stats
    WHERE user_id = v_user_id
      AND month = previous_month
      AND finalized = true
  ) THEN
    PERFORM finalize_monthly_stats(v_user_id, previous_month);
  END IF;

  -- Regular monthly stats update logic
  SELECT COUNT(*) INTO lead_count
  FROM leads
  WHERE user_id = v_user_id
  AND date_trunc('month', created_at) = current_month;

  SELECT COUNT(*) INTO customer_count
  FROM customers
  WHERE user_id = v_user_id
  AND date_trunc('month', created_at) = current_month;

  SELECT COALESCE(SUM(sale_value), 0) INTO month_revenue
  FROM customers
  WHERE user_id = v_user_id
  AND date_trunc('month', created_at) = current_month;

  -- Update current month stats
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;