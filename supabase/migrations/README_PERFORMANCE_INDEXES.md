# Performance Indexes Migration

This migration adds comprehensive database indexes to optimize the slow queries in the transfers page, particularly the `athlete_with_tp_page_details` view and related tables.

## 🚀 Performance Impact

These indexes are expected to provide significant performance improvements:

- **Main Query**: Expected 50-80% improvement (from 7.7s to 1-3s)
- **Athlete Facts Query**: Already optimized, but indexes will provide additional 10-20% improvement
- **Stats Query**: Already optimized, but indexes will provide additional 10-20% improvement
- **School Facts Query**: Already optimized, but indexes will provide additional 10-20% improvement

## 📋 Indexes Added

### Core Tables (High Impact)
- **athlete_fact**: Composite indexes for athlete_id + data_type_id lookups
- **stat**: Composite indexes for athlete_id + data_type_id lookups  
- **school_fact**: Composite indexes for school_id + data_type_id lookups

### View Component Tables (High Impact)
- **main_tp_page**: Indexes for athlete_id, initiated_date, status, school_id
- **details_tp_page**: Indexes for athlete_id, athletic_aid status
- **athlete**: Indexes for id, sport_id, name searches
- **school**: Indexes for id, name

### Supporting Tables (Medium Impact)
- **recruiting_board**: Indexes for user_id, athlete_id, customer_id, created_at
- **comment**: Indexes for athlete_id, user_id, customer_id, created_at
- **athlete_rating**: Indexes for athlete_id, customer_id, rating_scale_id
- **sport_stat_config**: Composite indexes for sport_id + data_type_id

## 🔧 How to Apply

### Option 1: Using Supabase CLI (Recommended)
```bash
# Apply the migration
supabase db push

# Or if you want to run it manually
supabase db reset
```

### Option 2: Manual Application
```bash
# Connect to your Supabase database and run:
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Then run the migration file
\i supabase/migrations/20240323000000_add_performance_indexes.sql
```

### Option 3: Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `20240323000000_add_performance_indexes.sql`
4. Execute the script

## ⚠️ Important Notes

1. **CONCURRENTLY**: All indexes use `CREATE INDEX CONCURRENTLY` to avoid locking tables during creation
2. **IF NOT EXISTS**: Indexes won't be recreated if they already exist
3. **Build Time**: Large tables may take several minutes to build indexes
4. **Storage**: Indexes will increase database storage usage by ~10-20%

## 📊 Expected Results

After applying these indexes, you should see:

- **Main Query**: 7.7s → 1-3s (50-80% improvement)
- **Athlete Facts**: 291ms → 200-250ms (10-20% improvement)
- **Stats Query**: 301ms → 200-250ms (10-20% improvement)
- **School Facts**: 129ms → 100-120ms (10-20% improvement)
- **Total Load Time**: 9.3s → 4-6s (35-50% improvement)

## 🔍 Monitoring

After applying indexes, monitor the performance logs to verify improvements:

```javascript
// Look for these log messages in your browser console:
[PERF] Main query completed in XXXXms
[PERF] Athlete facts query completed in XXXXms  
[PERF] Stats query completed in XXXXms
[PERF] School facts query completed in XXXXms
```

## 🛠️ Troubleshooting

If indexes don't provide expected improvements:

1. **Check if indexes were created**:
   ```sql
   SELECT indexname, tablename FROM pg_indexes 
   WHERE indexname LIKE 'idx_%' 
   ORDER BY tablename, indexname;
   ```

2. **Verify query plans**:
   ```sql
   EXPLAIN (ANALYZE, BUFFERS) 
   SELECT * FROM athlete_with_tp_page_details 
   ORDER BY initiated_date DESC LIMIT 25;
   ```

3. **Check for table statistics**:
   ```sql
   ANALYZE athlete_fact;
   ANALYZE stat;
   ANALYZE school_fact;
   ANALYZE main_tp_page;
   ANALYZE details_tp_page;
   ANALYZE athlete;
   ANALYZE school;
   ```

## 📈 Next Steps

After applying indexes, consider:

1. **Materialized Views**: For frequently accessed data
2. **Query Optimization**: Further optimize the view definition
3. **Caching**: Implement application-level caching
4. **Pagination**: Optimize pagination strategies 