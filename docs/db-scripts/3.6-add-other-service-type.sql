-- Update existing profiles to include 'Other' in service_types
UPDATE public.user_profiles 
SET service_types = array_append(
  CASE 
    WHEN service_types IS NULL THEN ARRAY[]::TEXT[] 
    ELSE service_types 
  END, 
  'Other'
);

-- Update the handle_new_user function to include 'Other' in default service types
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.user_profiles (
        id,
        lead_sources,
        lead_stages,
        service_types,
        service_frequencies,
        custom_lead_sources,
        custom_lead_stages,
        custom_service_types,
        custom_service_frequencies
    )
    VALUES (
        new.id,
        ARRAY['Referral', 'Website', 'Cold-Call', 'Trade-Show', 'Social-Media', 'Other']::TEXT[],
        ARRAY['New', 'Contacted', 'Qualified', 'Negotiation', 'Won', 'Lost']::TEXT[],
        ARRAY['Lawn-Maintenance', 'Tree-Service', 'Pest-Control', 'Landscaping', 'Snow-Removal', 'Irrigation', 'Hardscaping', 'Other']::TEXT[],
        ARRAY['One-Time', 'Semi-Annual', 'Tri-Annual', 'Quarterly', 'Bi-Monthly', 'Monthly', 'Custom']::TEXT[],
        ARRAY[]::TEXT[],
        ARRAY[]::TEXT[],
        ARRAY[]::TEXT[],
        ARRAY[]::TEXT[]
    );
    RETURN new;
END;
$$ language plpgsql security definer;
