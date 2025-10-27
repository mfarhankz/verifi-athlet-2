-- Enable height column for football athletes (sport_id 21)
-- This script adds or updates the height column configuration for football in the sport_stat_config table

-- First, check if the height column already exists for football
SELECT 
    ssc.id,
    ssc.sport_id,
    ssc.data_type_id,
    ssc.display_name,
    ssc.search_column_display,
    ssc.display_order,
    ssc.stat_category
FROM sport_stat_config ssc
WHERE ssc.sport_id = '21' 
  AND ssc.data_type_id = 304;

-- If the record doesn't exist, insert it
-- If it exists but search_column_display is null, update it
INSERT INTO sport_stat_config (
    sport_id,
    data_type_id,
    display_name,
    display_order,
    stat_category,
    search_column_display
) VALUES (
    '21',  -- football sport_id
    304,   -- height data_type_id
    'Height',
    10,    -- display order (adjust as needed)
    'Physical',  -- stat category
    10     -- search_column_display order (adjust as needed)
)
ON CONFLICT (sport_id, data_type_id) 
DO UPDATE SET 
    search_column_display = EXCLUDED.search_column_display,
    display_name = EXCLUDED.display_name,
    display_order = EXCLUDED.display_order,
    stat_category = EXCLUDED.stat_category;

-- Verify the update
SELECT 
    ssc.id,
    ssc.sport_id,
    ssc.data_type_id,
    ssc.display_name,
    ssc.search_column_display,
    ssc.display_order,
    ssc.stat_category
FROM sport_stat_config ssc
WHERE ssc.sport_id = '21' 
  AND ssc.data_type_id = 304;

