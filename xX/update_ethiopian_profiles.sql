-- Update profiles with realistic Ethiopian names and phone numbers
BEGIN;

-- Create a temporary table with Ethiopian names
CREATE TEMP TABLE ethiopian_names (
    first_name text,
    last_name text,
    phone_prefix text
);

-- Insert common Ethiopian names
INSERT INTO ethiopian_names (first_name, last_name, phone_prefix) VALUES
    ('Abebe', 'Bekele', '+25191'),
    ('Kebede', 'Tessema', '+25192'),
    ('Tadesse', 'Negussie', '+25193'),
    ('Solomon', 'Mamo', '+25194'),
    ('Dawit', 'Haile', '+25195'),
    ('Yohannes', 'Teklu', '+25196'),
    ('Mulugeta', 'Desta', '+25197'),
    ('Tesfaye', 'Girma', '+25198'),
    ('Girma', 'Alemu', '+25199');

-- Update profiles with Ethiopian names and phone numbers
WITH numbered_profiles AS (
    SELECT 
        id,
        email,
        ROW_NUMBER() OVER (ORDER BY id) as row_num
    FROM profiles
)
UPDATE profiles p
SET 
    first_name = en.first_name,
    last_name = en.last_name,
    full_name = en.first_name || ' ' || en.last_name,
    phone_number = en.phone_prefix || LPAD(FLOOR(RANDOM() * 10000000)::text, 7, '0')
FROM numbered_profiles np
JOIN ethiopian_names en ON en.first_name = (
    SELECT first_name 
    FROM ethiopian_names 
    ORDER BY row_num 
    LIMIT 1 OFFSET (np.row_num - 1) % (SELECT COUNT(*) FROM ethiopian_names)
)
WHERE p.id = np.id;

-- Update auth.users phone numbers to match profiles
UPDATE auth.users au
SET 
    phone = p.phone_number
FROM profiles p
WHERE au.id = p.id;

-- Clean up
DROP TABLE ethiopian_names;

-- Verify the changes
SELECT 
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.full_name,
    p.phone_number,
    p.role,
    au.phone as auth_phone
FROM profiles p
JOIN auth.users au ON p.id = au.id
ORDER BY p.id;

COMMIT; 