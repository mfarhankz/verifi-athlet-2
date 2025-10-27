-- Migration script to move notes from athletes table to comment table
-- This script will:
-- 1. Create a backup of existing notes
-- 2. Move notes to comment table
-- 3. Clean up the notes column (but not drop it yet for safety)

-- First, create a backup table of the existing notes
CREATE TABLE IF NOT EXISTS athletes_notes_backup AS
SELECT id, notes, scenario
FROM athletes
WHERE notes IS NOT NULL AND notes != '';

-- Insert notes into comment table with specific customer-user mapping
WITH customer_user_map AS (
  SELECT *
  FROM (VALUES
    ('3d66b8bc-4d21-496b-ad3d-ba48f8f9c651'::uuid, 'd587cd3a-6914-42d1-aad2-e5169b122539'::uuid),
    ('9b41fda2-ff7d-4da8-b885-c726f70e038f'::uuid, 'ed537cfe-274b-49a1-a3ee-37e6be6a796a'::uuid),
    ('aa09c549-9d69-42ad-95be-330056105232'::uuid, '819b9dc9-b064-4b96-99ea-b2debff23425'::uuid),
    ('ad6cd81d-a795-468a-b7ef-ba693876ef9d'::uuid, '819b9dc9-b064-4b96-99ea-b2debff23425'::uuid),
    ('b66f4fc8-567b-47fa-87d5-b4a5e5aba60d'::uuid, 'e3bb2761-48d9-438f-ab25-a1af2b47f4c7'::uuid),
    ('deed9f36-9207-4856-924d-c2cf611bed9b'::uuid, '819ef76b-fb77-4f0f-af26-bc3da875e18f'::uuid),
    ('f42ca035-d7b8-4ad2-b4bb-b6d49c906901'::uuid, 'f4edde07-0dea-43ce-a367-9931f99fc610'::uuid)
  ) AS t(customer_id, user_id)
)
INSERT INTO comment (
  athlete_id,
  user_id,
  content,
  created_at,
  updated_at,
  customer_id
)
SELECT 
  a.id AS athlete_id,
  cum.user_id,
  a.notes AS content,
  NOW() AS created_at,
  NOW() AS updated_at,
  cum.customer_id
FROM athletes a
JOIN customer_user_map cum ON 1=1  -- We'll join all mappings to each athlete
JOIN user_customer_map ucm ON ucm.customer_id = cum.customer_id
WHERE a.notes IS NOT NULL AND a.notes != ''
ON CONFLICT (id) DO NOTHING;

-- Update the notes column to be empty (but don't remove it yet for safety)
UPDATE athletes
SET notes = NULL
WHERE notes IS NOT NULL;

-- To verify the migration:
-- SELECT COUNT(*) FROM athletes_notes_backup; -- Should match number of non-empty notes
-- SELECT COUNT(*) FROM comment WHERE user_id = (SELECT id FROM user_detail WHERE email = 'system@verifiedathletics.com');
