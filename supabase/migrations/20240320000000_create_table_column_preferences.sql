-- Create table_column_preferences table
CREATE TABLE IF NOT EXISTS table_column_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    table_name TEXT NOT NULL,
    view_name TEXT,
    columns JSONB NOT NULL DEFAULT '{"order": [], "hidden": []}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, table_name)
);

-- Add RLS policies
ALTER TABLE table_column_preferences ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view their own preferences
CREATE POLICY "Users can view their own preferences"
    ON table_column_preferences
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy to allow users to insert their own preferences
CREATE POLICY "Users can insert their own preferences"
    ON table_column_preferences
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to update their own preferences
CREATE POLICY "Users can update their own preferences"
    ON table_column_preferences
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to delete their own preferences
CREATE POLICY "Users can delete their own preferences"
    ON table_column_preferences
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_table_column_preferences_updated_at
    BEFORE UPDATE ON table_column_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 