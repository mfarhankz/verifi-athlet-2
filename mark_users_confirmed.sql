-- Mark all existing users as confirmed
-- Run this in your Supabase SQL Editor

UPDATE auth.users 
SET email_confirmed_at = created_at 
WHERE email_confirmed_at IS NULL;

-- Verify the update
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN 'Confirmed'
    ELSE 'Not Confirmed'
  END as status
FROM auth.users 
ORDER BY created_at DESC; 