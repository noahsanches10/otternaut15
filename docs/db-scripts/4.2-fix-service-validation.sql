-- Drop existing triggers and functions with CASCADE to handle dependencies
DROP TRIGGER IF EXISTS validate_service_type ON leads CASCADE;
DROP TRIGGER IF EXISTS validate_service_type_customers ON customers CASCADE;
DROP FUNCTION IF EXISTS check_service_type() CASCADE;

-- Create new function to check service types that handles case-insensitive comparisons
CREATE OR REPLACE FUNCTION check_service_type()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow NULL values
  IF NEW.service_type IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if service_type exists in user's service_types or custom_service_types
  -- Using case-insensitive comparison
  IF EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = NEW.user_id
    AND (
      EXISTS (
        SELECT 1
        FROM unnest(service_types) type
        WHERE LOWER(type) = LOWER(NEW.service_type)
      )
      OR EXISTS (
        SELECT 1
        FROM unnest(custom_service_types) type
        WHERE LOWER(type) = LOWER(NEW.service_type)
      )
    )
  ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid service type: %. Must be one of the configured service types.', NEW.service_type;
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers for both leads and customers
CREATE TRIGGER validate_service_type
  BEFORE INSERT OR UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION check_service_type();

CREATE TRIGGER validate_service_type_customers
  BEFORE INSERT OR UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION check_service_type();

-- Update existing records to ensure service_types are valid
UPDATE leads l
SET service_type = NULL
WHERE service_type IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM user_profiles p
  WHERE p.id = l.user_id
  AND (
    EXISTS (
      SELECT 1
      FROM unnest(p.service_types) type
      WHERE LOWER(type) = LOWER(l.service_type)
    )
    OR EXISTS (
      SELECT 1
      FROM unnest(p.custom_service_types) type
      WHERE LOWER(type) = LOWER(l.service_type)
    )
  )
);

UPDATE customers c
SET service_type = NULL
WHERE service_type IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM user_profiles p
  WHERE p.id = c.user_id
  AND (
    EXISTS (
      SELECT 1
      FROM unnest(p.service_types) type
      WHERE LOWER(type) = LOWER(c.service_type)
    )
    OR EXISTS (
      SELECT 1
      FROM unnest(p.custom_service_types) type
      WHERE LOWER(type) = LOWER(c.service_type)
    )
  )
);