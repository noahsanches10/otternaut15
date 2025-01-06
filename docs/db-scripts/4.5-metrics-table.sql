-- Create metrics table
CREATE TABLE IF NOT EXISTS metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  type text NOT NULL,
  value numeric NOT NULL,
  period text NOT NULL,
  period_start timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own metrics"
  ON metrics
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to update metrics
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
    INSERT INTO metrics (user_id, type, value, period, period_start)
    VALUES (
      NEW.user_id,
      'new_customers',
      1,
      'daily',
      date_trunc('day', NEW.created_at)
    );

    -- Add revenue metric if sale_value exists
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
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS update_metrics_on_lead ON leads;
CREATE TRIGGER update_metrics_on_lead
  AFTER INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_metrics();

DROP TRIGGER IF EXISTS update_metrics_on_customer ON customers;
CREATE TRIGGER update_metrics_on_customer
  AFTER INSERT ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_metrics();

  