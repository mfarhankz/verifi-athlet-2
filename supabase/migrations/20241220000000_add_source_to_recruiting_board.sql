-- Add source column to recruiting_board table
-- This column will track whether the athlete came from juco, pre-portal, or portal

-- Add the source column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'recruiting_board' 
        AND column_name = 'source'
    ) THEN
        ALTER TABLE recruiting_board 
        ADD COLUMN source TEXT CHECK (source IN ('juco', 'pre-portal', 'portal') OR source IS NULL);
    END IF;
END $$;

-- Add an index for better query performance
CREATE INDEX IF NOT EXISTS idx_recruiting_board_source ON recruiting_board(source);

-- Add a comment to document the column
COMMENT ON COLUMN recruiting_board.source IS 'Source of the athlete: juco, pre-portal, or portal';
