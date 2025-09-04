-- Create survey tokens table for secure athlete access
CREATE TABLE IF NOT EXISTS survey_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID NOT NULL REFERENCES athlete(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE
);

-- Create index for efficient token lookups
CREATE INDEX IF NOT EXISTS idx_survey_tokens_hash ON survey_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_survey_tokens_athlete ON survey_tokens(athlete_id);
CREATE INDEX IF NOT EXISTS idx_survey_tokens_expires ON survey_tokens(expires_at);

-- Enable RLS on survey_tokens table
ALTER TABLE survey_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for survey_tokens
-- Only allow public access for token validation (no user context needed)
CREATE POLICY "Public can validate survey tokens"
  ON survey_tokens
  FOR SELECT
  TO public
  USING (
    is_active = TRUE 
    AND expires_at > NOW()
    AND used_at IS NULL
  );

-- Only allow authenticated users to create tokens (for admin purposes)
CREATE POLICY "Authenticated users can create survey tokens"
  ON survey_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only allow authenticated users to update tokens
CREATE POLICY "Authenticated users can update survey tokens"
  ON survey_tokens
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Update athlete_fact RLS policies to allow survey token access
-- Drop existing policies first
DROP POLICY IF EXISTS "Public can SELECT survey facts" ON public.athlete_fact;
DROP POLICY IF EXISTS "Public can INSERT survey facts" ON public.athlete_fact;
DROP POLICY IF EXISTS "Public can UPDATE survey facts" ON public.athlete_fact;

-- Create new policies that check for valid survey tokens
CREATE POLICY "Survey token holders can SELECT their athlete facts"
  ON public.athlete_fact
  FOR SELECT
  TO public
  USING (
    source = 'survey'
    AND data_type_id IN (
      1, 2, 3, 8, 10, 13, 14, 15, 16, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 77, 78, 79, 230, 231, 234, 246, 247, 248, 251, 570, 571
    )
    AND (
      -- Allow if there's a valid survey token for this athlete
      EXISTS (
        SELECT 1 FROM survey_tokens 
        WHERE survey_tokens.athlete_id = athlete_fact.athlete_id
        AND survey_tokens.is_active = TRUE
        AND survey_tokens.expires_at > NOW()
        AND survey_tokens.used_at IS NULL
      )
      OR
      -- Allow authenticated users (existing functionality)
      auth.role() = 'authenticated'
    )
  );

CREATE POLICY "Survey token holders can INSERT their athlete facts"
  ON public.athlete_fact
  FOR INSERT
  TO public
  WITH CHECK (
    source = 'survey'
    AND data_type_id IN (
      1, 2, 3, 8, 10, 13, 14, 15, 16, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 77, 78, 79, 230, 231, 234, 246, 247, 248, 251, 570, 571
    )
    AND (
      -- Allow if there's a valid survey token for this athlete
      EXISTS (
        SELECT 1 FROM survey_tokens 
        WHERE survey_tokens.athlete_id = athlete_fact.athlete_id
        AND survey_tokens.is_active = TRUE
        AND survey_tokens.expires_at > NOW()
        AND survey_tokens.used_at IS NULL
      )
      OR
      -- Allow authenticated users (existing functionality)
      auth.role() = 'authenticated'
    )
  );

CREATE POLICY "Survey token holders can UPDATE their athlete facts"
  ON public.athlete_fact
  FOR UPDATE
  TO public
  USING (
    source = 'survey'
    AND data_type_id IN (
      1, 2, 3, 8, 10, 13, 14, 15, 16, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 77, 78, 79, 230, 231, 234, 246, 247, 248, 251, 570, 571
    )
    AND (
      -- Allow if there's a valid survey token for this athlete
      EXISTS (
        SELECT 1 FROM survey_tokens 
        WHERE survey_tokens.athlete_id = athlete_fact.athlete_id
        AND survey_tokens.is_active = TRUE
        AND survey_tokens.expires_at > NOW()
        AND survey_tokens.used_at IS NULL
      )
      OR
      -- Allow authenticated users (existing functionality)
      auth.role() = 'authenticated'
    )
  )
  WITH CHECK (
    source = 'survey'
    AND data_type_id IN (
      1, 2, 3, 8, 10, 13, 14, 15, 16, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 77, 78, 79, 230, 231, 234, 246, 247, 248, 251, 570, 571
    )
    AND (
      -- Allow if there's a valid survey token for this athlete
      EXISTS (
        SELECT 1 FROM survey_tokens 
        WHERE survey_tokens.athlete_id = athlete_fact.athlete_id
        AND survey_tokens.is_active = TRUE
        AND survey_tokens.expires_at > NOW()
        AND survey_tokens.used_at IS NULL
      )
      OR
      -- Allow authenticated users (existing functionality)
      auth.role() = 'authenticated'
    )
  );

-- Update athlete table RLS to allow survey token access
-- Ensure RLS is enabled on athlete table
ALTER TABLE public.athlete ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Public can access athletes with survey access" ON public.athlete;

-- Create new policy that allows access with valid survey tokens
CREATE POLICY "Survey token holders can access their athlete data"
  ON public.athlete
  FOR SELECT
  TO public
  USING (
    -- Allow if there's a valid survey token for this athlete
    EXISTS (
      SELECT 1 FROM survey_tokens 
      WHERE survey_tokens.athlete_id = athlete.id
      AND survey_tokens.is_active = TRUE
      AND survey_tokens.expires_at > NOW()
      AND survey_tokens.used_at IS NULL
    )
    OR
    -- Allow authenticated users (existing functionality)
    auth.role() = 'authenticated'
  );

-- Update offer table RLS to allow survey token access
-- Ensure RLS is enabled on offer table
ALTER TABLE public.offer ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Public can access offers with survey access" ON public.offer;

-- Create new policy that allows access with valid survey tokens
CREATE POLICY "Survey token holders can access their offers"
  ON public.offer
  FOR SELECT
  TO public
  USING (
    source = 'survey'
    AND (
      -- Allow if there's a valid survey token for this athlete
      EXISTS (
        SELECT 1 FROM survey_tokens 
        WHERE survey_tokens.athlete_id = offer.athlete_id
        AND survey_tokens.is_active = TRUE
        AND survey_tokens.expires_at > NOW()
        AND survey_tokens.used_at IS NULL
      )
      OR
      -- Allow authenticated users (existing functionality)
      auth.role() = 'authenticated'
    )
  );

CREATE POLICY "Survey token holders can INSERT their offers"
  ON public.offer
  FOR INSERT
  TO public
  WITH CHECK (
    source = 'survey'
    AND (
      -- Allow if there's a valid survey token for this athlete
      EXISTS (
        SELECT 1 FROM survey_tokens 
        WHERE survey_tokens.athlete_id = offer.athlete_id
        AND survey_tokens.is_active = TRUE
        AND survey_tokens.expires_at > NOW()
        AND survey_tokens.used_at IS NULL
      )
      OR
      -- Allow authenticated users (existing functionality)
      auth.role() = 'authenticated'
    )
  );

-- Add UPDATE policy for offers (in case updates are needed)
CREATE POLICY "Survey token holders can UPDATE their offers"
  ON public.offer
  FOR UPDATE
  TO public
  USING (
    source = 'survey'
    AND (
      -- Allow if there's a valid survey token for this athlete
      EXISTS (
        SELECT 1 FROM survey_tokens 
        WHERE survey_tokens.athlete_id = offer.athlete_id
        AND survey_tokens.is_active = TRUE
        AND survey_tokens.expires_at > NOW()
        AND survey_tokens.used_at IS NULL
      )
      OR
      -- Allow authenticated users (existing functionality)
      auth.role() = 'authenticated'
    )
  )
  WITH CHECK (
    source = 'survey'
    AND (
      -- Allow if there's a valid survey token for this athlete
      EXISTS (
        SELECT 1 FROM survey_tokens 
        WHERE survey_tokens.athlete_id = offer.athlete_id
        AND survey_tokens.is_active = TRUE
        AND survey_tokens.expires_at > NOW()
        AND survey_tokens.used_at IS NULL
      )
      OR
      -- Allow authenticated users (existing functionality)
      auth.role() = 'authenticated'
    )
  );
