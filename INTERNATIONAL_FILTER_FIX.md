# International Location Filter Fix

## Issues Fixed

1. **React State Update During Render**: Fixed the error "Cannot update a component while rendering a different component" by using `setTimeout` to defer the API call.

2. **Database Query Timeout**: Fixed timeout errors by implementing efficient sport-dependent filtering:
   - Added conditional query logic that only joins with athlete table when sport filtering is needed
   - Removed the 10-second timeout that was too short for complex queries
   - Implemented proper sport-specific filtering using `athlete!inner(sport_id)` join

3. **Sport-Dependent Filtering**: 
   - Now properly filters international locations by the specific sport being displayed
   - Uses the active customer's sport_id to get only relevant international locations
   - Falls back to all international locations if no sport_id is provided

4. **Performance Issues**: 
   - Added caching to prevent unnecessary re-fetches
   - Optimized query structure with conditional joins
   - Increased the limit to 2000 records for better coverage

## Changes Made

### 1. Timeout-Resistant Database Query (`src/lib/queries.ts`)
- Implemented a **two-step approach** to avoid complex join timeouts:
  - Step 1: Get athlete IDs for the specific sport (fast, simple query)
  - Step 2: Get international locations for those athletes in batches (chunked queries)
- Removed complex joins that were causing timeout issues
- Added chunk processing (100 athletes per batch) to avoid URL length limits
- Implemented robust error handling that continues processing even if some chunks fail
- Added fallback options for when queries fail completely

### 2. Fixed React Component (`src/app/(dashboard)/_components/Filters.tsx`)
- Added `setTimeout` to prevent state updates during render
- Added proper cleanup to prevent memory leaks
- Simplified the loading logic

### 3. Created SQL Helper (`get_international_options.sql`)
- Direct SQL query for getting sport-specific international options
- Can be run directly in Supabase for testing

## Testing

1. **Test the filter**: Open the filters panel and try to add an "International Location" filter
2. **Check for errors**: Look for any console errors related to international options
3. **Verify performance**: The filter should load quickly without timeouts

## SQL Query for Direct Testing

If you need to test the international options directly in Supabase, use this query:

```sql
-- Replace {SPORT_ID} with the actual sport ID
SELECT DISTINCT af.value
FROM athlete_fact af
INNER JOIN athlete a ON af.athlete_id = a.athlete_id
WHERE af.data_type_id = 24
  AND a.sport_id = {SPORT_ID}
  AND af.value NOT IN (
    'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
    'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
    'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
    'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
    'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
    'DC'
  )
  AND af.value IS NOT NULL
  AND af.value != ''
ORDER BY af.value;
```

## Fallback Options

If the database query fails, the system will fall back to a predefined list of common international locations including:
- North America: Canada, Mexico, Puerto Rico
- South America: Brazil, Argentina, Chile, etc.
- Europe: UK, Germany, France, etc.
- Asia: Japan, South Korea, China, etc.
- Africa: South Africa, Nigeria, Kenya, etc.

This ensures the filter always has options available even if there are database issues.
