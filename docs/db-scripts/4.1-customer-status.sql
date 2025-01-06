-- Add status column to customers table with default value 'active'
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'active';