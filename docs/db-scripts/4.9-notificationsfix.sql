-- Create function to delete notifications when referenced entity is deleted
CREATE OR REPLACE FUNCTION delete_entity_notifications()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete any notifications referencing this entity
  DELETE FROM notifications 
  WHERE entity_id = OLD.id 
  AND type = TG_ARGV[0];
  
  RETURN OLD;
END;
$$;

-- Add triggers to delete notifications when referenced entities are deleted
CREATE TRIGGER lead_notification_cleanup
  AFTER DELETE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION delete_entity_notifications('lead');

CREATE TRIGGER customer_notification_cleanup
  AFTER DELETE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION delete_entity_notifications('customer');

CREATE TRIGGER task_notification_cleanup
  AFTER DELETE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION delete_entity_notifications('task');

CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

  -- Drop existing check constraint
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_action_check;

-- Add new check constraint including 'completed'
ALTER TABLE notifications 
ADD CONSTRAINT notifications_action_check 
CHECK (action IN ('created', 'archived', 'deleted', 'completed'));

-- Drop existing triggers and function
DROP TRIGGER IF EXISTS lead_notification_trigger ON leads;
DROP TRIGGER IF EXISTS customer_notification_trigger ON customers;
DROP TRIGGER IF EXISTS task_notification_trigger ON tasks;
DROP FUNCTION IF EXISTS create_notification();

-- Recreate function with proper capitalization
CREATE OR REPLACE FUNCTION create_notification()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  notification_title text;
  notification_action text;
  entity_type text;
BEGIN
  -- Capitalize the entity type
  entity_type := INITCAP(TG_ARGV[0]);

  -- Handle tasks differently since they don't have an archived column
  IF TG_ARGV[0] = 'task' THEN
    notification_title := CASE
      WHEN TG_OP = 'INSERT' THEN 'New Task created'
      WHEN TG_OP = 'DELETE' THEN 'Task deleted'
      WHEN TG_OP = 'UPDATE' AND NEW.status = 'done' THEN 'Task completed'
      ELSE NULL
    END;
    
    notification_action := CASE
      WHEN TG_OP = 'INSERT' THEN 'created'
      WHEN TG_OP = 'DELETE' THEN 'deleted'
      WHEN TG_OP = 'UPDATE' AND NEW.status = 'done' THEN 'completed'
      ELSE NULL
    END;
  ELSE
    -- Handle leads and customers
    notification_title := CASE
      WHEN TG_OP = 'INSERT' THEN 'New ' || entity_type || ' created'
      WHEN NEW.archived = true THEN entity_type || ' archived'
      WHEN TG_OP = 'DELETE' THEN entity_type || ' deleted'
    END;
    
    notification_action := CASE
      WHEN TG_OP = 'INSERT' THEN 'created'
      WHEN NEW.archived = true THEN 'archived'
      WHEN TG_OP = 'DELETE' THEN 'deleted'
    END;
  END IF;

  -- Only create notification if we have a valid title and action
  IF notification_title IS NOT NULL AND notification_action IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, action, entity_id, title)
    VALUES (
      COALESCE(NEW.user_id, OLD.user_id),
      TG_ARGV[0],
      notification_action,
      COALESCE(NEW.id, OLD.id),
      notification_title
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Recreate triggers
CREATE TRIGGER lead_notification_trigger
  AFTER INSERT OR UPDATE OF archived OR DELETE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION create_notification('lead');

CREATE TRIGGER customer_notification_trigger
  AFTER INSERT OR UPDATE OF archived OR DELETE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION create_notification('customer');

CREATE TRIGGER task_notification_trigger
  AFTER INSERT OR UPDATE OF status OR DELETE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION create_notification('task');