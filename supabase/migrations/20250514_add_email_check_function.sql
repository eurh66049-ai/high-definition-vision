

-- Function to check if an email exists in the profiles table
CREATE OR REPLACE FUNCTION public.get_email_exists(email_to_check TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  email_count INTEGER;
BEGIN
  -- Count profiles with the given email
  SELECT COUNT(*) INTO email_count
  FROM profiles
  WHERE email = email_to_check;
  
  -- Return true if count is greater than 0
  RETURN email_count > 0;
END;
$$;

-- Set appropriate permissions
GRANT EXECUTE ON FUNCTION public.get_email_exists(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_email_exists(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_exists(TEXT) TO service_role;

-- Add email column to profiles if it doesn't exist already
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'email'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email TEXT;
  END IF;
END $$;

-- Update existing profiles with email from auth.users if needed
DO $$
BEGIN
  UPDATE profiles p
  SET email = u.email
  FROM auth.users u
  WHERE p.id = u.id AND p.email IS NULL;
END $$;

