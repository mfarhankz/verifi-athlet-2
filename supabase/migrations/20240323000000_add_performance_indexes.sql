-- Add performance indexes for athlete data queries
-- This migration adds indexes to optimize the slow athlete_with_tp_page_details view and related queries

-- Indexes for athlete_fact table (already optimized in queries, but adding indexes for even better performance)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_athlete_fact_athlete_data_type 
ON athlete_fact(athlete_id, data_type_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_athlete_fact_data_type 
ON athlete_fact(data_type_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_athlete_fact_athlete_id 
ON athlete_fact(athlete_id);

-- Indexes for stat table (already optimized in queries, but adding indexes for even better performance)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stat_athlete_data_type 
ON stat(athlete_id, data_type_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stat_data_type 
ON stat(data_type_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stat_athlete_id 
ON stat(athlete_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stat_season 
ON stat(season);

-- Indexes for school_fact table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_school_fact_school_data_type 
ON school_fact(school_id, data_type_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_school_fact_data_type 
ON school_fact(data_type_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_school_fact_school_id 
ON school_fact(school_id);

-- Indexes for main_tp_page table (part of the view)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_main_tp_page_athlete_id 
ON main_tp_page(athlete_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_main_tp_page_initiated_date 
ON main_tp_page(initiated_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_main_tp_page_status 
ON main_tp_page(status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_main_tp_page_school_id 
ON main_tp_page(school_id);

-- Indexes for details_tp_page table (part of the view)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_details_tp_page_athlete_id 
ON details_tp_page(athlete_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_details_tp_page_athletic_aid 
ON details_tp_page(is_receiving_athletic_aid);

-- Indexes for athlete table (base table)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_athlete_id 
ON athlete(id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_athlete_sport_id 
ON athlete(sport_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_athlete_first_name 
ON athlete(first_name);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_athlete_last_name 
ON athlete(last_name);

-- Composite index for name searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_athlete_name_search 
ON athlete(first_name, last_name);

-- Indexes for school table (part of the view)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_school_id 
ON school(id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_school_name 
ON school(name);

-- Indexes for recruiting_board table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recruiting_board_user_id 
ON recruiting_board(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recruiting_board_athlete_id 
ON recruiting_board(athlete_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recruiting_board_customer_id 
ON recruiting_board(customer_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recruiting_board_created_at 
ON recruiting_board(created_at);

-- Indexes for comment table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comment_athlete_id 
ON comment(athlete_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comment_user_id 
ON comment(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comment_customer_id 
ON comment(customer_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comment_created_at 
ON comment(created_at);

-- Indexes for athlete_rating table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_athlete_rating_athlete_id 
ON athlete_rating(athlete_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_athlete_rating_customer_id 
ON athlete_rating(customer_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_athlete_rating_scale_id 
ON athlete_rating(customer_rating_scale_id);

-- Indexes for sport_stat_config table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sport_stat_config_sport_id 
ON sport_stat_config(sport_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sport_stat_config_data_type_id 
ON sport_stat_config(data_type_id);

-- Composite index for sport_stat_config lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sport_stat_config_sport_data_type 
ON sport_stat_config(sport_id, data_type_id);

-- Add comments for documentation
COMMENT ON INDEX idx_athlete_fact_athlete_data_type IS 'Optimizes athlete_fact queries by athlete_id and data_type_id combination';
COMMENT ON INDEX idx_stat_athlete_data_type IS 'Optimizes stat queries by athlete_id and data_type_id combination';
COMMENT ON INDEX idx_school_fact_school_data_type IS 'Optimizes school_fact queries by school_id and data_type_id combination';
COMMENT ON INDEX idx_main_tp_page_athlete_id IS 'Optimizes main_tp_page lookups by athlete_id';
COMMENT ON INDEX idx_main_tp_page_initiated_date IS 'Optimizes main_tp_page ordering by initiated_date';
COMMENT ON INDEX idx_athlete_name_search IS 'Optimizes athlete name searches';
COMMENT ON INDEX idx_recruiting_board_customer_id IS 'Optimizes recruiting board queries by customer_id';
COMMENT ON INDEX idx_comment_athlete_id IS 'Optimizes comment count queries by athlete_id';
COMMENT ON INDEX idx_athlete_rating_athlete_id IS 'Optimizes athlete rating queries by athlete_id';
COMMENT ON INDEX idx_sport_stat_config_sport_data_type IS 'Optimizes sport_stat_config lookups by sport_id and data_type_id'; 