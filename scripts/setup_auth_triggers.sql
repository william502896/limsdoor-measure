-- Create a trigger to automatically create a profile for new users
-- This ensures that the 'profiles' table always has a corresponding row for each user in 'auth.users'

-- 1. Create the Function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, is_superadmin)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'full_name', -- Try to get name from metadata
    false -- Default to false
  )
  ON CONFLICT (user_id) DO NOTHING; -- Handle potential race conditions
  RETURN new;
END;
$$;

-- 2. Create the Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Backfill missing profiles for existing users
-- This fixes the issue for users who already signed up but have no profile
INSERT INTO public.profiles (user_id, name, is_superadmin)
SELECT 
    id, 
    raw_user_meta_data ->> 'full_name',
    false
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.profiles);

-- 4. Verify RLS (Redundant but safe)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
