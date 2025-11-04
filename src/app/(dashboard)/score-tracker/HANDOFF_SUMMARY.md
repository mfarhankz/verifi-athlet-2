# Score Tracker - Handoff Summary for PM

## What's Built

The Score Tracker page is mostly complete from a UI/UX standpoint. The frontend structure is in place with:
- ✅ Three view types implemented (Player, Grid, Date Range)
- ✅ Add/Remove Players side drawer with search
- ✅ Column Options side drawer with column selection
- ✅ View switching buttons
- ✅ Export button (UI ready)
- ✅ Set Email Sort button (UI ready)
- ✅ Custom Views button (UI ready)
- ✅ Navigation link in sidebar

## What Needs Database Integration

The page is currently using **mock data** and needs these database connections:

### 1. **Player and Game Data**
**File:** `src/app/(dashboard)/score-tracker/page.tsx`  
**Lines:** 41-128 (mock data arrays)  
**Action:** Replace mock data with database queries

**What you need to know:**
- The page expects data in `Player` and `GameResult` formats (defined in `types.ts`)
- Query needs to join: players, games, teams tables
- Look for the `TODO: DATABASE INTEGRATION` comments

### 2. **Add/Remove Players Functionality**
**File:** `src/app/(dashboard)/score-tracker/_components/AddPlayersDrawer.tsx`  
**Functions:** `handleAddPlayer`, `handleRemovePlayer`  
**Action:** Connect to database for player management

**What you need to know:**
- Currently stores in component state only
- Need database table to track which players are in each staff member's view
- Warning message shows this affects all staff - implement staff-wide updates

### 3. **Column Configuration**
**File:** `src/app/(dashboard)/score-tracker/_components/ColumnOptionsDrawer.tsx`  
**Action:** Save column configurations to database

**What you need to know:**
- Column configurations stored locally in component state
- Need to persist column visibility and ordering
- Drag-and-drop reordering not yet implemented (can be added if needed)

### 4. **Set Email Sort**
**File:** `src/app/(dashboard)/score-tracker/page.tsx`  
**Function:** `handleSetEmailSort` (lines 140-145)  
**Action:** Save current view as email preference

**What you need to know:**
- Button is wired up but needs database integration
- Should save current view type, selected players, and column config
- Links to user's email preferences elsewhere in system

### 5. **Custom Views / Saved Filters**
**File:** `src/app/(dashboard)/score-tracker/page.tsx`  
**Action:** Implement saved view management

**What you need to know:**
- Custom Views button is wired up
- Need dropdown menu to load saved views
- Currently no saved view functionality

### 6. **Export Functionality**
**File:** `src/app/(dashboard)/score-tracker/page.tsx`  
**Function:** `handleExport` (lines 150-153)  
**Action:** Export filtered data to CSV/Excel

**What you need to know:**
- Button is wired up, just needs export logic
- Export current filtered view (based on selected view type)

## Database Tables Needed

1. **Players Table** (main data source)
   - Fields: id, name, recruiting_coach, position, record, high_school, state, year, phone, rating
   - Links to game_results table

2. **Game Results Table** (game data)
   - Fields: player_id, opponent, home_away, result, score, date, game_summary, source
   - Links to players table

3. **Score Tracker Selections Table** (tracks which players each user/staff sees)
   - Fields: id, user_id, player_id, customer_id
   - Links to players and users tables

4. **Column Preferences Table** (optional, can reuse existing)
   - Fields: id, user_id, table_name, columns (JSONB), updated_at
   - Store column configuration per user

5. **Saved Views Table** (optional, can reuse existing or create new)
   - Fields: id, user_id, name, view_config (JSONB), created_at
   - Store complete view configurations (view type, filters, columns)

## Key Files to Modify

1. `src/app/(dashboard)/score-tracker/page.tsx` - Main page
2. `src/app/(dashboard)/score-tracker/_components/ScoreTrackerTable.tsx` - Table component
3. `src/app/(dashboard)/score-tracker/_components/AddPlayersDrawer.tsx` - Add players drawer
4. `src/app/(dashboard)/score-tracker/_components/ColumnOptionsDrawer.tsx` - Column config drawer
5. `src/app/(dashboard)/score-tracker/types.ts` - Type definitions

## What Works Now

The user can:
- ✅ Navigate to Score Tracker from sidebar
- ✅ Switch between three view types (Player, Grid, Date Range)
- ✅ Select a player in Player View
- ✅ Open Add Players drawer
- ✅ Open Column Options drawer
- ✅ See mock data in table
- ✅ See all UI elements

The user CANNOT:
- ❌ Apply real filters (needs database)
- ❌ Add/remove players with database persistence (needs database)
- ❌ Save column configurations (needs database)
- ❌ Save views as email preferences (needs database)
- ❌ Load saved views (needs database)
- ❌ Export data (needs implementation)

## Outstanding Features to Implement

1. **Drag-and-drop column reordering** (optional enhancement)
   - Can use @dnd-kit library already in project
   - Currently columns are manually configured

2. **Column Freeze functionality**
   - UI is in place but not wired up
   - Should freeze certain columns when scrolling horizontally

3. **Date Range Picker**
   - The date range dropdown is in place
   - Needs actual date picker calendar component
   - See lines 192-199 in page.tsx

4. **Grid View Weekly Columns**
   - Currently shows mock weekly columns
   - Need to generate based on actual date ranges from database

5. **Custom Views Dropdown**
   - Button exists but no dropdown menu
   - Need to implement dropdown with saved view options

## Integration Checklist

- [ ] Create/find `players` table in database
- [ ] Create/find `game_results` table in database
- [ ] Map database columns to `Player` interface
- [ ] Map database columns to `GameResult` interface
- [ ] Replace mock data with database queries
- [ ] Implement Add/Remove Players with database persistence
- [ ] Implement Column Configuration with database persistence
- [ ] Implement Set Email Sort functionality
- [ ] Implement Custom Views / Saved Filters
- [ ] Implement Export functionality
- [ ] Implement Date Range picker
- [ ] Test all three view types with real data
- [ ] Add staff-wide player selection updates
- [ ] Implement weekly column generation for Grid View

## Notes

- All UI components are complete and styled
- View switching works properly
- Mock data structure shows exactly what fields are needed
- Type definitions in `types.ts` provide complete structure
- Component structure follows existing patterns
- Database integration comments are throughout codebase

