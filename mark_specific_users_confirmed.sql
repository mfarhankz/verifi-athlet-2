-- Mark specific users as confirmed by email
-- Replace the email addresses with the actual ones you want to confirm

UPDATE auth.users 
SET email_confirmed_at = created_at 
WHERE email IN (
  'user1@example.com',
  'user2@example.com',
  'user3@example.com'
) AND email_confirmed_at IS NULL;

-- Verify the update for specific users
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
WHERE email IN (
  'user1@example.com',
  'user2@example.com',
  'user3@example.com'
)
ORDER BY created_at DESC; 