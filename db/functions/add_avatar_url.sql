-- Add avatar_url column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Update existing profiles with default avatar URLs
UPDATE public.profiles
SET avatar_url = 'https://ui-avatars.com/api/?name=' || 
    COALESCE(
        NULLIF(first_name, '') || CASE WHEN last_name IS NOT NULL THEN '+' || last_name ELSE '' END,
        email, 
        'User'
    ) || '&background=random&color=fff'
WHERE avatar_url IS NULL; 