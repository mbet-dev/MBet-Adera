-- Add profile_image_url column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- Update existing records with a default avatar URL
UPDATE public.profiles
SET profile_image_url = 'https://ui-avatars.com/api/?name=' || 
    COALESCE(
        NULLIF(full_name, ''),
        email,
        'User'
    ) || '&background=random&color=fff'
WHERE profile_image_url IS NULL; 