# Depth Chart Implementation

This document describes the implementation of the depth chart system that allows coaches to assign athletes to depth chart positions with comprehensive data inheritance logic.

## Features Implemented

### 1. Database Schema
- **Table**: `depth_chart_assignments`
- **Location**: `supabase/migrations/20240401000000_create_depth_chart_assignments.sql`
- **Key Features**:
  - Links athletes to sub-positions with rankings
  - Supports year, scenario, and month dimensions
  - Automatic ranking conflict resolution
  - Row Level Security (RLS) for multi-tenancy
  - Data inheritance functions

### 2. Data Inheritance Logic
The system implements sophisticated data inheritance rules:

#### Year Isolation
- Each year starts fresh with no data carry-over
- Athletes must be explicitly assigned for each year

#### Month Inheritance
- January data carries forward to other months unless overridden
- Later month assignments take precedence over earlier ones
- Example: January assignment carries to March unless March has explicit assignment

#### Scenario Inheritance
- Base scenario data carries forward to other scenarios unless overridden
- Scenario-specific assignments take precedence over base scenario
- Example: Base scenario assignment carries to "Scenario 1" unless explicitly overridden

#### Priority Order (Highest to Lowest)
1. Exact match (same scenario, same month)
2. Same scenario, earlier month (month inheritance)
3. Base scenario, same month (scenario inheritance)
4. Base scenario, earlier month (both inheritances)

### 3. Database Functions

#### `get_effective_depth_chart_assignments()`
Returns the effective assignments considering all inheritance rules:
```sql
SELECT * FROM get_effective_depth_chart_assignments(
  'customer-id', 
  2025, 
  'scenario1', 
  3  -- March
);
```

#### Automatic Ranking Management
- `handle_ranking_conflicts()`: Automatically adjusts rankings when new assignments are added
- `cleanup_rankings_after_delete()`: Normalizes rankings after deletions

### 4. TypeScript Types
**Location**: `src/types/depthChart.ts`

Key interfaces:
- `DepthChartAssignment`: Base assignment record
- `EffectiveDepthChartAssignment`: Assignment with inheritance metadata
- `DepthChartAssignmentWithAthlete`: Assignment joined with athlete details

### 5. Utility Functions
**Location**: `src/utils/depthChartUtils.ts`

Key functions:
- `getEffectiveDepthChartAssignments()`: Get assignments with inheritance
- `assignAthleteToDepthChart()`: Assign athlete to position
- `removeAthleteFromDepthChart()`: Remove athlete assignment
- `moveAthleteRanking()`: Change athlete ranking
- `getAvailableAthletes()`: Get athletes available for assignment

### 6. React Components

#### AthleteSelector
**Location**: `src/components/depth-chart/AthleteSelector.tsx`
- Modal interface for selecting athletes
- Search by name functionality
- Filter by position functionality
- Shows PlayerCard components for athletes
- Indicates already assigned athletes

#### DraggableAthleteCard
**Location**: `src/components/depth-chart/DraggableAthleteCard.tsx`
- Displays athlete information in depth chart
- Supports drag and drop functionality
- Shows ranking and tied players
- Move up/down and remove controls
- Inheritance indicators

#### DepthChartDropZone
**Location**: `src/components/depth-chart/DepthChartDropZone.tsx`
- Drop zone for each sub-position
- Handles tied players (side-by-side display)
- Visual feedback for drag operations
- Add athlete buttons

#### EnhancedDepthChart
**Location**: `src/components/depth-chart/EnhancedDepthChart.tsx`
- Main depth chart interface
- Year/month/scenario selection
- Formation management integration
- Drag and drop coordination

### 7. Usage Example

```typescript
// Get depth chart for March 2025, Scenario 1
const assignments = await getDepthChartAssignmentsWithAthletes(
  'customer-id',
  2025,      // year
  'scenario1', // scenario
  3          // March
);

// Assign athlete to quarterback position, rank 2
await assignAthleteToDepthChart(
  'athlete-id',
  'qb-subposition-id',
  'customer-id',
  2025,
  2,         // ranking
  'scenario1',
  3          // March
);
```

## Database Setup

To set up the depth chart system:

1. Run the migration file:
```sql
-- Execute the contents of:
-- supabase/migrations/20240401000000_create_depth_chart_assignments.sql
```

2. Ensure you have the required tables:
- `athletes` table with athlete information
- `depth_chart_formation` table for formations
- `depth_chart_sub_position` table for positions
- `user_customer_access` table for RLS

## Component Integration

To use the depth chart in your app:

```tsx
import EnhancedDepthChart from '@/components/depth-chart/EnhancedDepthChart';
import { ZoomProvider } from '@/contexts/ZoomContext';

function MyDepthChartPage() {
  return (
    <ZoomProvider>
      <EnhancedDepthChart 
        selectedYear={2025}
        selectedMonth={1}
        selectedScenario="base"
      />
    </ZoomProvider>
  );
}
```

## Data Flow

1. **Page Load**: Fetch formations → Select formation → Load sub-positions → Load assignments
2. **Athlete Selection**: Open modal → Search/filter → Select athlete → Assign to position
3. **Drag & Drop**: Drag athlete card → Drop on position → Update assignment → Reload data
4. **Ranking Changes**: Click up/down arrows → Update database → Reload data

## Security

- All database operations use Row Level Security (RLS)
- Users can only access their own customer's data
- Authentication required for all operations
- Proper input validation and sanitization

## Performance Considerations

- Database indexes on frequently queried fields
- Efficient data inheritance function using CTEs
- Optimized React rendering with proper dependencies
- Lazy loading of athlete data

## Future Enhancements

1. **Bulk Operations**: Assign multiple athletes at once
2. **Templates**: Save and apply depth chart templates
3. **History**: Track depth chart changes over time
4. **Analytics**: Depth chart utilization reporting
5. **Import/Export**: CSV import/export functionality
