const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Performance indexes SQL
const performanceIndexesSQL = `
-- Add performance indexes for athlete data queries

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
`;

async function applyPerformanceIndexes() {
  console.log('🚀 Starting to apply performance indexes...');
  console.log('This may take several minutes for large tables...\n');

  try {
    // Split the SQL into individual statements
    const statements = performanceIndexesSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;

      try {
        console.log(`[${i + 1}/${statements.length}] Applying index...`);
        console.log(`Statement: ${statement.substring(0, 80)}...`);
        
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          console.error(`❌ Error applying index:`, error.message);
          errorCount++;
        } else {
          console.log(`✅ Index applied successfully`);
          successCount++;
        }
        
        // Add a small delay between statements to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Exception applying index:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Successfully applied: ${successCount} indexes`);
    console.log(`❌ Failed to apply: ${errorCount} indexes`);
    
    if (errorCount === 0) {
      console.log('\n🎉 All performance indexes have been applied successfully!');
      console.log('The athlete queries should now be much faster.');
    } else {
      console.log('\n⚠️  Some indexes failed to apply. Check the errors above.');
      console.log('You may need to run this script again or apply them manually.');
    }

  } catch (error) {
    console.error('❌ Fatal error applying performance indexes:', error);
    process.exit(1);
  }
}

// Alternative approach using direct SQL execution
async function applyPerformanceIndexesAlternative() {
  console.log('🚀 Applying performance indexes using alternative method...');
  
  try {
    // Execute the entire SQL script at once
    const { error } = await supabase.rpc('exec_sql', { sql: performanceIndexesSQL });
    
    if (error) {
      console.error('❌ Error applying performance indexes:', error);
      throw error;
    }
    
    console.log('✅ Performance indexes applied successfully!');
    
  } catch (error) {
    console.error('❌ Failed to apply performance indexes:', error);
    console.log('\n💡 Alternative: You can apply these indexes manually in the Supabase dashboard:');
    console.log('1. Go to your Supabase project dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of supabase/migrations/20240323000000_add_performance_indexes.sql');
    console.log('4. Execute the script');
  }
}

// Check if the exec_sql function exists
async function checkExecSqlFunction() {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1' });
    return !error;
  } catch (error) {
    return false;
  }
}

// Main execution
async function main() {
  console.log('🔍 Checking database connection and capabilities...');
  
  const hasExecSql = await checkExecSqlFunction();
  
  if (hasExecSql) {
    console.log('✅ exec_sql function available, using direct SQL execution...');
    await applyPerformanceIndexesAlternative();
  } else {
    console.log('⚠️  exec_sql function not available, using statement-by-statement approach...');
    await applyPerformanceIndexes();
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { applyPerformanceIndexes, applyPerformanceIndexesAlternative }; 