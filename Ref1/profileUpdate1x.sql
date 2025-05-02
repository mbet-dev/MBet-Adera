-- Begin transaction
BEGIN;

-- 1. Add first_name, last_name, and avatar_url columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Split existing full_name data into first_name and last_name
UPDATE public.profiles
SET 
    first_name = CASE 
        WHEN position(' ' in full_name) > 0 
        THEN substring(full_name from 1 for position(' ' in full_name) - 1)
        ELSE full_name
    END,
    last_name = CASE 
        WHEN position(' ' in full_name) > 0 
        THEN substring(full_name from position(' ' in full_name) + 1)
        ELSE NULL
    END
WHERE full_name IS NOT NULL AND first_name IS NULL;

-- 3. Update avatar_url for existing records based on new first_name and last_name
UPDATE public.profiles
SET avatar_url = 'https://ui-avatars.com/api/?name=' || 
    COALESCE(
        NULLIF(first_name, '') || CASE WHEN last_name IS NOT NULL THEN '+' || last_name ELSE '' END,
        email, 
        'User'
    ) || '&background=random&color=fff'
WHERE avatar_url IS NULL;

-- 4. If the profiles table doesn't exist, create it with the new structure
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_tables 
                   WHERE schemaname = 'public' 
                   AND tablename = 'profiles') THEN
        CREATE TABLE public.profiles (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            email TEXT,
            first_name TEXT,
            last_name TEXT,
            full_name TEXT, -- Keep this for backward compatibility
            avatar_url TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Add RLS policies
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view their own profile" 
        ON public.profiles FOR SELECT 
        USING (auth.uid() = id);
        
        CREATE POLICY "Users can update their own profile" 
        ON public.profiles FOR UPDATE 
        USING (auth.uid() = id);
        
        -- Grant access
        GRANT ALL ON public.profiles TO postgres, service_role;
        GRANT SELECT, UPDATE ON public.profiles TO authenticated;
    END IF;
END
$$;

-- 5. Create or update the function to handle new user profiles with first_name and last_name
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
DECLARE
    full_name_val TEXT;
    first_name_val TEXT;
    last_name_val TEXT;
BEGIN
    -- Get user metadata values with fallbacks
    first_name_val := COALESCE(
        NEW.raw_user_meta_data->>'first_name', 
        NEW.raw_user_meta_data->>'given_name'
    );
    
    last_name_val := COALESCE(
        NEW.raw_user_meta_data->>'last_name', 
        NEW.raw_user_meta_data->>'family_name'
    );
    
    -- Get full name from metadata or construct it
    full_name_val := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name'
    );
    
    -- If we have first and last name but no full name, construct it
    IF (first_name_val IS NOT NULL AND last_name_val IS NOT NULL AND full_name_val IS NULL) THEN
        full_name_val := first_name_val || ' ' || last_name_val;
    END IF;
    
    -- If we have full name but no first/last name, split it
    IF (full_name_val IS NOT NULL AND (first_name_val IS NULL OR last_name_val IS NULL)) THEN
        IF position(' ' in full_name_val) > 0 THEN
            first_name_val := COALESCE(first_name_val, substring(full_name_val from 1 for position(' ' in full_name_val) - 1));
            last_name_val := COALESCE(last_name_val, substring(full_name_val from position(' ' in full_name_val) + 1));
        ELSE
            first_name_val := COALESCE(first_name_val, full_name_val);
        END IF;
    END IF;
    
    -- Fallback to email if we still don't have names
    first_name_val := COALESCE(first_name_val, 'User');
    last_name_val := COALESCE(last_name_val, '');
    full_name_val := COALESCE(full_name_val, first_name_val || CASE WHEN last_name_val <> '' THEN ' ' || last_name_val ELSE '' END);
    
    INSERT INTO public.profiles (
        id, 
        email, 
        full_name, 
        first_name, 
        last_name, 
        avatar_url
    )
    VALUES (
        NEW.id, 
        NEW.email, 
        full_name_val,
        first_name_val,
        last_name_val,
        'https://ui-avatars.com/api/?name=' || 
        COALESCE(
            NULLIF(first_name_val, '') || CASE WHEN last_name_val IS NOT NULL AND last_name_val <> '' THEN '+' || last_name_val ELSE '' END,
            NEW.raw_user_meta_data->>'preferred_username',
            NEW.email,
            'User'
        ) || '&background=random&color=fff'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;

CREATE TRIGGER on_auth_user_created_profile
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_profile();

-- Update Beza's profile
UPDATE public.profiles
SET 
    first_name = 'Beza',
    last_name = 'Alemu',
    full_name = 'Beza Alemu',
    avatar_url = 'https://ui-avatars.com/api/?name=Beza+Alemu&background=random&color=fff'
WHERE id = '1ee6fa70-9c81-4b2e-a16a-550f0fb9850a';

-- Update Alex's profile
UPDATE public.profiles
SET 
    first_name = 'Alex',
    last_name = 'Abrha',
    full_name = 'Alex Abrha',
    avatar_url = 'https://ui-avatars.com/api/?name=Alex+Abrha&background=random&color=fff'
WHERE id = 'de9af1c4-f908-406a-9abc-4d3200f47925';

-- Commit the transaction
COMMIT;
