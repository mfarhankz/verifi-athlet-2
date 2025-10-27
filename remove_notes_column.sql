-- First verify that all notes have been migrated
DO $$
BEGIN
  -- Check if there are any non-empty notes that haven't been migrated
  IF EXISTS (
    SELECT 1
    FROM athletes a
    WHERE a.notes IS NOT NULL 
    AND a.notes != ''
    AND NOT EXISTS (
      SELECT 1 
      FROM comment c 
      WHERE c.athlete_id = a.id
      AND c.content = a.notes
    )
  ) THEN
    RAISE EXCEPTION 'There are still notes that have not been migrated to the comment table';
  END IF;
END $$;

-- If the above check passes, remove the notes column
ALTER TABLE athletes DROP COLUMN notes;
