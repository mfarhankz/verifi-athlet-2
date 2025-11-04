# Activity Feed Database Views

The activity feed integration requires three database views to be created based on customer packages:

## Required Views

### 1. `vw_activity_feed_fb_platinum`
For elite/ultra packages - provides the most comprehensive data access.

### 2. `vw_activity_feed_fb_gold` 
For gold packages - provides gold-tier data access.

### 3. `vw_activity_feed_fb_silver_plus`
For silver packages - provides silver-plus tier data access.

## Expected View Structure

Each view should return columns that map to the `ActivityEvent` interface:

```sql
-- Example structure based on actual database schema
SELECT 
  offer_id,
  afw_athlete_id,         -- athlete identifier
  first_name,             -- athlete first name
  last_name,              -- athlete last name
  afw_image_url,          -- athlete image
  afw_height_feet,        -- height feet
  afw_height_inch,        -- height inches
  afw_weight,             -- weight
  afw_high_school,        -- high school name
  ath_school_city,        -- high school city
  ath_school_state,       -- high school state
  hs_county,              -- high school county (for county filtering)
  address_latitude,       -- high school latitude (for radius filtering)
  address_longitude,      -- high school longitude (for radius filtering)
  afw_grad_year,          -- graduation year
  sfw_school_id,          -- college school ID (for logo fetching)
  sfw_school_name,        -- college name
  offer_date,             -- offer date
  type,                   -- offer type
  offer_created_at        -- created timestamp
FROM your_offers_table
-- Add appropriate joins and RLS policies
```

## Package Mapping (Restrictive Access)

The system automatically selects the correct view based on customer package in priority order:

- **elite/ultra packages** → `vw_activity_feed_fb_platinum`
- **gold packages** (including old gold and naia gold) → `vw_activity_feed_fb_gold`  
- **silver packages** (including naia silver plus) → `vw_activity_feed_fb_silver_plus`
- **All other packages** → No access (empty results)

**Important**: If a customer doesn't have one of the three qualifying package types, they will see no data and get a "No activity feed access with your current package" message.

## Implementation Notes

1. **RLS Policies**: Each view should respect Row Level Security policies for the appropriate package tier
2. **Data Filtering**: Views should only return data that the package tier is authorized to see
3. **Performance**: Consider adding appropriate indexes on frequently filtered columns
4. **Fallback**: If a view doesn't exist, the system will show an empty state with a warning
5. **Athlete Names**: Currently using `afw_athlete_id` as name placeholder - may need to join with athlete names table if available
6. **Column Mappings**: 
   - Height: Combines `afw_height_feet` + `afw_height_inch`
   - Weight: Adds "lbs" suffix to `afw_weight`
   - Location: Uses `afw_address_state` for high school location
   - Graduation: Uses `afw_grad_year`
   - Event Type: Uses `type` field

## Testing

Once the views are created, the activity feed will automatically:
- Load data based on the user's customer package
- Apply filters correctly
- Handle search functionality
- Export data to CSV

The integration is complete and ready to work as soon as the database views are available.
