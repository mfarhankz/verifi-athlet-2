# Database Timeout Issue - Performance Fix

## 🚨 Problem
The athlete queries are timing out with the error:
```
canceling statement due to statement timeout
```

This happens because the `athlete_with_tp_page_details` view is complex and lacks proper database indexes.

## 🔧 Solution

### Option 1: Apply Performance Indexes (Recommended)

The performance indexes migration has already been created but needs to be applied to your database.

#### Using the provided script:
```bash
# Install dependencies if needed
npm install @supabase/supabase-js dotenv

# Run the performance index script
node apply-performance-indexes.js
```

#### Manual Application via Supabase Dashboard:
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/migrations/20240323000000_add_performance_indexes.sql`
4. Execute the script

### Option 2: Use Supabase CLI
```bash
# Apply the migration
supabase db push

# Or reset the database (⚠️ This will clear all data)
supabase db reset
```

## 📊 Expected Performance Improvements

After applying the indexes:
- **Main Query**: 7.7s → 1-3s (50-80% improvement)
- **Total Load Time**: 9.3s → 4-6s (35-50% improvement)

## 🛡️ Code Improvements Already Applied

The `fetchAthleteData` function has been optimized with:

1. **Reduced timeout**: 30s → 15s to fail faster
2. **Better retry logic**: Exponential backoff with 3 attempts
3. **Fallback query**: If main query fails, uses simpler approach
4. **Early returns**: Exit early if no data found
5. **Optimized ordering**: Removed secondary ordering to reduce complexity

## 🔍 Monitoring

After applying indexes, look for these performance logs:
```
[PERF] Main query completed in XXXXms
[PERF] Athlete facts query completed in XXXXms  
[PERF] Stats query completed in XXXXms
[PERF] School facts query completed in XXXXms
```

## 🚀 Quick Test

To test if the fix worked:

1. Apply the performance indexes
2. Navigate to the transfers page
3. Check browser console for performance logs
4. Verify queries complete in under 5 seconds

## ⚠️ Important Notes

- Index creation may take several minutes for large tables
- The `CREATE INDEX CONCURRENTLY` approach prevents table locking
- Storage usage will increase by ~10-20%
- If indexes fail to apply, the fallback query will still work

## 🆘 Troubleshooting

If you still experience timeouts:

1. **Check if indexes were created**:
   ```sql
   SELECT indexname, tablename FROM pg_indexes 
   WHERE indexname LIKE 'idx_%' 
   ORDER BY tablename, indexname;
   ```

2. **Verify the view exists**:
   ```sql
   SELECT * FROM athlete_with_tp_page_details LIMIT 1;
   ```

3. **Check database performance**:
   ```sql
   EXPLAIN (ANALYZE, BUFFERS) 
   SELECT * FROM athlete_with_tp_page_details 
   ORDER BY initiated_date DESC LIMIT 25;
   ```

## 📞 Support

If the issue persists after applying these fixes, the problem may be:
- Database resource constraints
- Complex view definition that needs optimization
- Network connectivity issues

Consider contacting your database administrator or Supabase support. 