-- Add missing survey data type IDs to existing RLS policies
-- This adds the IDs that are missing from your current policies

-- Update the SELECT policy to include missing IDs
ALTER POLICY "Public can SELECT survey facts"
  ON public.athlete_fact
  USING (
    source = 'survey'
    AND data_type_id IN (
      1, 2, 3, 8, 10, 13, 14, 15, 16,
      24, 25, 26, 27, 28, 29, 30, 31,
      32, 33, 34, 35, 36, 37, 39, 40, 41,
      42, 43, 44, 45, 46, 47, 48, 49,
      50, 51, 52, 53, 54, 55, 56, 57,
      58, 59, 60, 61, 62, 63, 64, 65,
      66, 67, 68, 69, 70, 77, 78, 79,
      230, 231, 234, 246, 247, 248, 251,
      570, 571
    )
  );

-- Update the INSERT policy to include missing IDs
ALTER POLICY "Public can INSERT survey facts"
  ON public.athlete_fact
  WITH CHECK (
    source = 'survey'
    AND data_type_id IN (
      1, 2, 3, 8, 10, 13, 14, 15, 16,
      24, 25, 26, 27, 28, 29, 30, 31,
      32, 33, 34, 35, 36, 37, 39, 40, 41,
      42, 43, 44, 45, 46, 47, 48, 49,
      50, 51, 52, 53, 54, 55, 56, 57,
      58, 59, 60, 61, 62, 63, 64, 65,
      66, 67, 68, 69, 70, 77, 78, 79,
      230, 231, 234, 246, 247, 248, 251,
      570, 571
    )
  ); 