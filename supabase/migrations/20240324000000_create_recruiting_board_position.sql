-- Create recruiting_board_position table for managing position order in recruiting board
CREATE TABLE IF NOT EXISTS recruiting_board_position (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL,
    position_name TEXT NOT NULL,
    display_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    ended_at TIMESTAMPTZ NULL,
    UNIQUE(customer_id, position_name)
);

-- Add RLS policies
ALTER TABLE recruiting_board_position ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view their own position configs
CREATE POLICY "Users can view their own position configs"
    ON recruiting_board_position
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_customer_map 
            WHERE user_customer_map.user_id = auth.uid()
            AND user_customer_map.customer_id = recruiting_board_position.customer_id
        )
    );

-- Policy to allow users to insert their own position configs
CREATE POLICY "Users can insert their own position configs"
    ON recruiting_board_position
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_customer_map 
            WHERE user_customer_map.user_id = auth.uid()
            AND user_customer_map.customer_id = recruiting_board_position.customer_id
        )
    );

-- Policy to allow users to update their own position configs
CREATE POLICY "Users can update their own position configs"
    ON recruiting_board_position
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_customer_map 
            WHERE user_customer_map.user_id = auth.uid()
            AND user_customer_map.customer_id = recruiting_board_position.customer_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_customer_map 
            WHERE user_customer_map.user_id = auth.uid()
            AND user_customer_map.customer_id = recruiting_board_position.customer_id
        )
    );

-- Policy to allow users to delete their own position configs
CREATE POLICY "Users can delete their own position configs"
    ON recruiting_board_position
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_customer_map 
            WHERE user_customer_map.user_id = auth.uid()
            AND user_customer_map.customer_id = recruiting_board_position.customer_id
        )
    );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_recruiting_board_position_customer_id ON recruiting_board_position(customer_id);
CREATE INDEX IF NOT EXISTS idx_recruiting_board_position_display_order ON recruiting_board_position(display_order);
CREATE INDEX IF NOT EXISTS idx_recruiting_board_position_ended_at ON recruiting_board_position(ended_at);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_recruiting_board_position_updated_at
    BEFORE UPDATE ON recruiting_board_position
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Migrate existing positions from recruiting_board table
-- This creates position entries for all existing unique positions per customer
INSERT INTO recruiting_board_position (customer_id, position_name, display_order)
SELECT DISTINCT 
    rb.customer_id,
    rb.position,
    ROW_NUMBER() OVER (PARTITION BY rb.customer_id ORDER BY rb.position) as display_order
FROM recruiting_board rb
WHERE rb.position IS NOT NULL 
    AND rb.position != ''
    AND rb.ended_at IS NULL
    AND rb.customer_id IS NOT NULL
ON CONFLICT (customer_id, position_name) DO NOTHING;
