-- Create monthly_stats table
CREATE TABLE IF NOT EXISTS monthly_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  month date NOT NULL,
  total_revenue numeric DEFAULT 0,
  total_leads integer DEFAULT 0,
  conversion_rate numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, month)
);

-- Create personal_bests table
CREATE TABLE IF NOT EXISTS personal_bests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  metric_type text NOT NULL,
  value numeric NOT NULL,
  achieved_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, metric_type)
);

-- Enable RLS
ALTER TABLE monthly_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_bests ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own monthly stats"
  ON monthly_stats
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read own personal bests"
  ON personal_bests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to update monthly stats
CREATE OR REPLACE FUNCTION update_monthly_stats()
RETURNS trigger AS $$
BEGIN
  -- Update monthly stats
  INSERT INTO monthly_stats (user_id, month, total_revenue, total_leads, conversion_rate)
  VALUES (
    NEW.user_id,
    date_trunc('month', NEW.created_at)::date,
    COALESCE((
      SELECT SUM(c.sale_value)
      FROM customers c
      WHERE c.user_id = NEW.user_id
      AND date_trunc('month', c.created_at) = date_trunc('month', NEW.created_at)
    ), 0),
    COALESCE((
      SELECT COUNT(*)
      FROM leads l
      WHERE l.user_id = NEW.user_id
      AND date_trunc('month', l.created_at) = date_trunc('month', NEW.created_at)
    ), 0),
    COALESCE((
      SELECT (COUNT(DISTINCT c.id)::numeric / NULLIF(COUNT(DISTINCT l.id), 0)::numeric) * 100
      FROM leads l
      LEFT JOIN customers c ON c.user_id = l.user_id
      AND date_trunc('month', c.created_at) = date_trunc('month', l.created_at)
      WHERE l.user_id = NEW.user_id
      AND date_trunc('month', l.created_at) = date_trunc('month', NEW.created_at)
    ), 0)
  )
  ON CONFLICT (user_id, month)
  DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    total_leads = EXCLUDED.total_leads,
    conversion_rate = EXCLUDED.conversion_rate,
    updated_at = now();

  -- Update personal bests
  INSERT INTO personal_bests (user_id, metric_type, value, achieved_at)
  SELECT 
    NEW.user_id,
    'monthly_revenue',
    total_revenue,
    now()
  FROM monthly_stats
  WHERE user_id = NEW.user_id
  AND month = date_trunc('month', NEW.created_at)::date
  AND total_revenue > COALESCE((
    SELECT value 
    FROM personal_bests 
    WHERE user_id = NEW.user_id 
    AND metric_type = 'monthly_revenue'
  ), 0)
  ON CONFLICT (user_id, metric_type)
  DO UPDATE SET
    value = EXCLUDED.value,
    achieved_at = now()
  WHERE EXCLUDED.value > personal_bests.value;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_monthly_stats_on_lead
  AFTER INSERT OR UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_monthly_stats();

CREATE TRIGGER update_monthly_stats_on_customer
  AFTER INSERT OR UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_monthly_stats();