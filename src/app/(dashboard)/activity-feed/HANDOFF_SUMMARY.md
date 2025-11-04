# Activity Feed - Handoff Summary for PM

## What's Built

The Activity Feed page is complete from a UI/UX standpoint. The frontend structure is in place with:
- ✅ Filter drawer with all inputs wired up
- ✅ Event timeline table display
- ✅ Search functionality (UI ready)
- ✅ Export button (UI ready)
- ✅ Save filter functionality (UI ready)
- ✅ All styling and interactions complete

## What Needs Database Integration

The page is currently using **mock data** and needs these database connections:

### 1. **Activity Events List** (Main Table Display)
**File:** `src/app/(dashboard)/activity-feed/page.tsx`  
**Lines:** 34-98 (mockEvents array)  
**Action:** Replace the mockEvents with a database query

**What you need to know:**
- The page expects data in the `ActivityEvent` format (defined in `types.ts`)
- Mock data structure shows exactly what fields are needed
- The query needs to join: `athletes`, `high_schools`, and `colleges` tables
- Look for the `TODO: DATABASE INTEGRATION` comments in the code

### 2. **Filter Application**
**File:** `src/app/(dashboard)/activity-feed/page.tsx`  
**Function:** `handleApplyFilters` (lines 141-146)  
**Action:** Build Supabase query using filter parameters

**What you need to know:**
- Filter structure is defined in `FilterConfig` interface (types.ts)
- All filter inputs are already wired up - you just need to translate them to SQL
- The function receives a complete filter object with all selections
- Example filter structure is in the code comments

### 3. **Saved Filters Persistence**
**File:** `src/app/(dashboard)/activity-feed/_components/ActivityFeedFilters.tsx`  
**Function:** `onSaveFilter` callback  
**Action:** Create database table and save filter configs

**What you need to know:**
- Need to create a `saved_filters` table
- Store the entire `FilterConfig` object as JSONB
- Associate with `user_id` for multi-user support
- See `DATABASE_INTEGRATION.md` for table schema

### 4. **Export Function**
**File:** `src/app/(dashboard)/activity-feed/page.tsx`  
**Function:** `handleExport` (lines 153-156)  
**Action:** Export filtered events to CSV/Excel

**What you need to know:**
- Button is already wired up, just needs the export logic
- Use the `events` state variable which contains filtered data
- Consider using a library like `xlsx` or `csv-writer`

## Documentation Provided

1. **`DATABASE_INTEGRATION.md`** - Complete database integration guide with:
   - Table schemas
   - Example SQL queries
   - Data mapping tables
   - Implementation checklist

2. **Inline Code Comments** - Every file has detailed comments marking:
   - Where mock data lives
   - Where database queries should go
   - What data structure is expected
   - Example implementation patterns

## Key Files to Modify

1. `src/app/(dashboard)/activity-feed/page.tsx` - Main page with event display
2. `src/app/(dashboard)/activity-feed/_components/ActivityFeedFilters.tsx` - Filter drawer
3. `src/app/(dashboard)/activity-feed/types.ts` - Type definitions (reference)

## Database Tables Needed

1. **Activity Events Table** (main data source)
   - Links: athletes, high_schools, colleges
   - Fields: event_type, event_date, athlete_id, etc.

2. **Saved Filters Table** (new table to create)
   - Fields: id, user_id, name, filter_config (JSONB), created_at
   - See `DATABASE_INTEGRATION.md` for full schema

## What Works Now

The user can:
- ✅ See the Activity Feed page
- ✅ Open the filter drawer
- ✅ Interact with all filter inputs
- ✅ See the mock event timeline
- ❌ Apply real filters (needs database)
- ❌ Save filters (needs database)
- ❌ Export data (needs implementation)

## Questions to Answer First

Before starting integration, you might want to confirm:

1. What's the actual table name for activity events? (is it `activity_events`?)
2. What are the exact column names in your database?
3. Do you want to use RLS (Row Level Security) for this data?
4. Should saved filters be per-user or shared across the organization?

## Support

All code is heavily commented with `TODO:` markers where you need to add database logic. The structure is intentionally simple and follows the existing patterns in your codebase.

