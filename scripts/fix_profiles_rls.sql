
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Remove existing conflicting policies to avoid errors
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = user_id);

-- Grant Superadmin Override (Optional, but good backup)
CREATE POLICY "Superadmin full access" 
ON profiles FOR ALL 
USING ( (SELECT is_superadmin FROM profiles WHERE user_id = auth.uid()) = true );
