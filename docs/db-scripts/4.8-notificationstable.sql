-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  type text NOT NULL CHECK (type IN ('lead', 'customer', 'task')),
  action text NOT NULL CHECK (action IN ('created', 'archived', 'deleted')),
  entity_id uuid NOT NULL,
  title text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can read own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to create notifications
CREATE OR REPLACE FUNCTION create_notification()
RETURNS TRIGGER AS $$
DECLARE
  notification_title text;
BEGIN
  -- Set notification title based on action and type
  notification_title := CASE
    WHEN TG_OP = 'INSERT' THEN 'New ' || TG_ARGV[0] || ' created'
    WHEN NEW.archived = true THEN TG_ARGV[0] || ' archived'
    WHEN TG_OP = 'DELETE' THEN TG_ARGV[0] || ' deleted'
  END;

  -- Insert notification
  INSERT INTO notifications (user_id, type, action, entity_id, title)
  VALUES (
    COALESCE(NEW.user_id, OLD.user_id),
    TG_ARGV[0],
    CASE
      WHEN TG_OP = 'INSERT' THEN 'created'
      WHEN NEW.archived = true THEN 'archived'
      WHEN TG_OP = 'DELETE' THEN 'deleted'
    END,
    COALESCE(NEW.id, OLD.id),
    notification_title
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for leads
CREATE TRIGGER lead_notification_trigger
  AFTER INSERT OR UPDATE OF archived OR DELETE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION create_notification('lead');

-- Create triggers for customers
CREATE TRIGGER customer_notification_trigger
  AFTER INSERT OR UPDATE OF archived OR DELETE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION create_notification('customer');

-- Create triggers for tasks
CREATE TRIGGER task_notification_trigger
  AFTER INSERT OR DELETE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION create_notification('task');