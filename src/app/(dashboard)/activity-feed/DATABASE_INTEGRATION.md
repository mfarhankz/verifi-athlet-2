# Activity Feed - Database Integration Guide

## Overview
This page displays a timeline of activity events for athletes. It's currently using mock data and needs to be connected to your database.

## Files Structure
- `page.tsx` - Main page component
- `_components/ActivityFeedFilters.tsx` - Filter drawer component
- `types.ts` - TypeScript type definitions
- `_activityFeed.scss` - Component styling

## Database Integration Tasks

### 1. Activity Events Data (`page.tsx`)

**Current State:**
- Using `mockEvents` array (lines 34-98)
- Mock data structure defined in `types.ts` as `ActivityEvent`

**What to do:**
1. Create a database query to fetch activity events
2. Map database columns to `ActivityEvent` interface:
   - `athlete_name`, `athlete_image`, `height`, `weight`
   - `high_school_name`, `high_school_location`
   - `graduation_year`
   - `college_name`, `college_logo`
   - `event_date`, `event_type`

**Example Query Structure:**
```sql
SELECT 
  ae.*,
  a.name as athlete_name,
  a.image_url as athlete_image,
  h.name as high_school_name,
  h.location as high_school_location,
  c.name as college_name
FROM activity_events ae
JOIN athletes a ON ae.athlete_id = a.id
JOIN schools h ON ae.high_school_id = h.id
LEFT JOIN colleges c ON ae.college_id = c.id
```

### 2. Filter Functionality (`handleApplyFilters`)

**Current State:**
- Lines 141-146 in `page.tsx`
- Console logs filter parameters but doesn't query database

**What to do:**
1. Build a dynamic Supabase query using `FilterConfig` parameters
2. Apply filters based on:
   - `eventParameters.eventDate` - filter by date range
   - `eventParameters.eventType` - filter by event types
   - `schoolInfo.location` - filter by school location
   - `schoolInfo.conference` - filter by conference
   - `schoolInfo.level` - filter by school level
   - `studentInfo.graduationYear` - filter by graduation year

**Example Implementation:**
```typescript
const handleApplyFilters = async (filters: FilterConfig) => {
  let query = supabase.from('activity_events').select('*');
  
  if (filters.eventParameters?.eventType) {
    query = query.in('event_type', filters.eventParameters.eventType);
  }
  if (filters.eventParameters?.eventDate) {
    query = query.gte('event_date', filters.eventParameters.eventDate[0]);
  }
  // ... add more filter conditions
  
  const { data } = await query;
  setEvents(data || []);
};
```

### 3. Saved Filters (`ActivityFeedFilters.tsx`)

**Current State:**
- Saved filters are stored in component state (local only)
- No database persistence

**What to do:**
1. Create a database table for saved filters:
```sql
CREATE TABLE saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  filter_config JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT false
);
```

2. Update `onSaveFilter` callback to insert into database
3. Load saved filters on component mount from database
4. Update `selectedFilters` to sync with database

### 4. Export Functionality (`handleExport`)

**Current State:**
- Lines 153-156 in `page.tsx`
- Not implemented

**What to do:**
1. Export current filtered events to CSV/Excel
2. Use library like `xlsx` or `csv-writer`
3. Export the `events` state which contains filtered data

## Data Mapping

### ActivityEvent Interface → Database Columns

| Interface Field | Database Column (Example) |
|----------------|---------------------------|
| `athlete.name` | `athletes.name` or `athletes.first_name + last_name` |
| `athlete.image` | `athletes.image_url` |
| `athlete.height` | `athletes.height_feet + height_inch` |
| `athlete.weight` | `athletes.weight` |
| `highSchool.name` | `schools.name` |
| `highSchool.location` | `schools.location` or `schools.city + state` |
| `graduation` | `athletes.graduation_year` or calculated field |
| `college.name` | `colleges.name` or `activity_events.college_name` |
| `college.logo` | `colleges.logo_url` |
| `eventDate` | `activity_events.event_date` |
| `type` | `activity_events.event_type` |
| `typeIcon` | Calculated field based on `event_type` |

## Integration Checklist

- [ ] Create/find `activity_events` table in database
- [ ] Map database columns to `ActivityEvent` interface
- [ ] Replace mock data with database query
- [ ] Implement `handleApplyFilters` with database query
- [ ] Create `saved_filters` table in database
- [ ] Implement saving filters to database
- [ ] Implement loading saved filters from database
- [ ] Implement export functionality
- [ ] Test all filter combinations
- [ ] Test with real data

## Notes

- All filter inputs are ready and wired up
- Filter UI matches existing codebase patterns
- Type definitions are complete and documented
- Styling is complete and matches design
- Component structure follows existing patterns

