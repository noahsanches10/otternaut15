/*
  # Fix Service Type Validation

  1. Changes
    - Allow removal of all default service types if custom types exist
    - Maintain validation for leads and customers
    - Ensure at least one service type exists (default or custom)
    - Fix case-insensitive comparison for service types

  2. Impact
    - Users can now remove all default service types if they have custom ones
    - Maintains data integrity by preventing invalid service types
    - Improves validation logic and error handling
*/

-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS validate_service_type ON leads CASCADE;
DROP TRIGGER IF EXISTS validate_service_type_customers ON customers CASCADE;
DROP TRIGGER IF EXISTS ensure_service_types_trigger ON user_profiles CASCADE;
DROP FUNCTION IF EXISTS check_service_type() CASCADE;
DROP FUNCTION IF EXISTS ensure_service_types() CASCADE;

-- Create function to check service types for leads and customers
CREATE OR REPLACE FUNCTION check_service_type()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow NULL values
  IF NEW.service_type IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get user profile
  DECLARE
    user_profile RECORD;
  BEGIN
    SELECT * INTO user_profile
    FROM user_profiles
    WHERE id = NEW.user_id;

    -- Check if service type exists in either default or custom types
    IF EXISTS (
      SELECT 1
      WHERE (
        EXISTS (
          SELECT 1
          FROM unnest(user_profile.service_types) type
          WHERE LOWER(type) = LOWER(NEW.service_type)
        )
        OR EXISTS (
          SELECT 1
          FROM unnest(user_profile.custom_service_types) type
          WHERE LOWER(type) = LOWER(NEW.service_type)
        )
      )
    ) THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Invalid service type: %. Must be one of the configured service types.', NEW.service_type;
  END;
END;
$$ LANGUAGE plpgsql;

-- Create function to ensure at least one service type exists
CREATE OR REPLACE FUNCTION ensure_service_types()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if there are any custom service types
  IF array_length(NEW.custom_service_types, 1) > 0 THEN
    -- Allow empty default service types if custom types exist
    RETURN NEW;
  END IF;

  -- If no custom types exist, require at least one default type
  IF array_length(NEW.service_types, 1) IS NULL OR array_length(NEW.service_types, 1) = 0 THEN
    RAISE EXCEPTION 'At least one service type must exist (either default or custom)';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER validate_service_type
  BEFORE INSERT OR UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION check_service_type();

CREATE TRIGGER validate_service_type_customers
  BEFORE INSERT OR UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION check_service_type();

CREATE TRIGGER ensure_service_types_trigger
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION ensure_service_types();

-- Update any existing leads/customers with invalid service types to NULL
UPDATE leads
SET service_type = NULL
WHERE service_type IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM user_profiles p
  WHERE p.id = leads.user_id
  AND (
    EXISTS (
      SELECT 1
      FROM unnest(p.service_types) type
      WHERE LOWER(type) = LOWER(service_type)
    )
    OR EXISTS (
      SELECT 1
      FROM unnest(p.custom_service_types) type
      WHERE LOWER(type) = LOWER(service_type)
    )
  )
);

UPDATE customers
SET service_type = NULL
WHERE service_type IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM user_profiles p
  WHERE p.id = customers.user_id
  AND (
    EXISTS (
      SELECT 1
      FROM unnest(p.service_types) type
      WHERE LOWER(type) = LOWER(service_type)
    )
    OR EXISTS (
      SELECT 1
      FROM unnest(p.custom_service_types) type
      WHERE LOWER(type) = LOWER(service_type)
    )
  )
);