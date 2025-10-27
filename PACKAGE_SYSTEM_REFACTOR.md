# Package System Refactor

## Overview
This document describes the complete refactor of the package management system to use a single unified source of truth for all package definitions.

## What Changed

### 1. **New Unified Package Definition System** (`src/lib/queries.ts`)

#### Before:
- Multiple scattered objects: `NAIA_PACKAGES`, `ELITE_PACKAGES`, `STARTER_PACKAGES`, `JUCO_PACKAGES`, `GOLD_PACKAGES`, `SILVER_PACKAGES`, `ULTRA_PACKAGES`
- Special case handling for football packages
- Difficult to maintain and extend

#### After:
- **Single source of truth**: `PACKAGE_DEFINITIONS` array
- Each package definition includes:
  - `sport`: Sport abbreviation (fb, bsb, sb, etc.)
  - `package_id`: Package ID number
  - `package_type`: Package type (elite, starter, gold, silver, naia, juco, ultra, etc.)
  - `is_naia`: Boolean flag for NAIA packages
  - `is_juco`: Boolean flag for JUCO packages
  - `view_suffix`: View suffix for database queries (e.g., '', '_gold', '_silver', '_naia', '_starter')
  - `description`: Human-readable description

### 2. **New Helper Functions**

All of these are exported from `src/lib/queries.ts`:

```typescript
// Get package definition by ID
getPackageById(packageId: number): PackageDefinition | undefined

// Get all packages for a specific sport
getPackagesBySport(sport: string): PackageDefinition[]

// Get user's packages for a specific sport
getUserPackagesForSport(sport: string, userPackageIds: number[]): PackageDefinition[]

// Get the best package for a sport (highest tier)
getBestPackageForSport(sport: string, userPackageIds: number[]): PackageDefinition | null

// Get all NAIA package IDs
getNaiaPackageIds(): number[]

// Get all JUCO package IDs
getJucoPackageIds(): number[]

// Get all package IDs for a specific sport
getPackageIdsBySport(sport: string): number[]

// Get all package IDs of a specific type
getPackageIdsByType(packageType: string): number[]

// Check if a package ID is NAIA
isNaiaPackage(packageId: number): boolean

// Check if a package ID is JUCO
isJucoPackage(packageId: number): boolean

// Get the view suffix for database queries
getViewSuffixForSport(sport: string, userPackageIds: number[]): string
```

### 3. **Updated Functions**

#### `determinePackageTier()`
- **Before**: Complex logic with multiple if statements checking various package maps
- **After**: Simple function that calls `getBestPackageForSport()` and returns the package type

#### `fetchAthleteData()`
- **Before**: Special case for football with `resolveFootballTpSuffix()`, complex mapping logic
- **After**: Uses `getViewSuffixForSport()` to get the view suffix directly, unified handling for all sports

#### Other functions updated:
- `fetchSingleAthleteDetails()` - now uses new system
- `fetchRecruitingBoardData()` - now uses new system

### 4. **Files Updated**

#### `src/lib/queries.ts`
- Added `PACKAGE_DEFINITIONS` array with all 164+ package definitions
- Added helper functions for querying packages
- Simplified all package tier determination logic
- Removed old constants: `NAIA_PACKAGES`, `ELITE_PACKAGES`, `STARTER_PACKAGES`, `JUCO_PACKAGES`, `GOLD_PACKAGES`, `SILVER_PACKAGES`, `ULTRA_PACKAGES`
- Removed old function: `resolveFootballTpSuffix()`

#### `src/utils/navigationUtils.ts`
- Now imports and uses helper functions from `queries.ts`
- Package arrays are now dynamically generated from `PACKAGE_DEFINITIONS`
- No more hard-coded package ID arrays

#### `src/app/(dashboard)/admin/page.tsx`
- `SPORT_PACKAGES` now uses `getPackageIdsBySport()` for each sport
- More maintainable and guaranteed to stay in sync

#### `src/app/(dashboard)/_components/TableSearchContent.tsx`
- Replaced all `NAIA_PACKAGES` lookups with `getUserPackagesForSport()` helper
- Now checks for NAIA packages using the new unified system
- Three locations updated:
  1. Transfer Odds column visibility logic (line ~569)
  2. Display columns configuration (line ~973)
  3. Extension inactive alert visibility (line ~1991)

## Package Priority System

The system determines the "best" package using this priority order (higher = better):

1. **elite** / **ultra** (highest access - base view)
2. **gold** (football-specific tier)
3. **silver** (football-specific tier)
4. **starter**
5. **naia**
6. **juco**
7. **camp_data** (lowest priority)

## Football Package Handling

Football now works the same as other sports:

| Package ID | Type | View |
|------------|------|------|
| 1 | elite (Platinum) | `vw_tp_athletes_wide_fb` |
| 97 | gold | `vw_tp_athletes_wide_fb_gold` |
| 98 | elite (Old Gold) | `vw_tp_athletes_wide_fb` |
| 99 | silver (Silver Plus) | `vw_tp_athletes_wide_fb_silver` |
| 100 | silver | `vw_tp_athletes_wide_fb_silver` |
| 101 | naia (NAIA Silver) | `vw_tp_athletes_wide_fb_naia` |
| 102 | camp_data | `vw_tp_athletes_wide_fb` |
| 103 | naia (NAIA Silver Plus) | `vw_tp_athletes_wide_fb_naia` |
| 104 | gold (PG Gold) | `vw_tp_athletes_wide_fb_gold` |
| 105 | silver (PG Silver) | `vw_tp_athletes_wide_fb_silver` |

## Benefits of This Refactor

1. **Single Source of Truth**: All package definitions in one place
2. **Easy to Maintain**: Add new packages by adding one entry to the array
3. **Type Safety**: TypeScript interface ensures consistency
4. **Self-Documenting**: Each package has a description
5. **Queryable**: Can filter packages by sport, type, NAIA status, JUCO status, etc.
6. **Uniform Handling**: Football and other sports use the same logic
7. **Backward Compatible**: Exports like `NAIA_PACKAGE_IDS` still work
8. **Extensible**: Easy to add new fields or filtering capabilities

## How to Add a New Package

To add a new package, simply add an entry to the `PACKAGE_DEFINITIONS` array:

```typescript
{
  sport: 'fb',
  package_id: 106,
  package_type: 'bronze',
  is_naia: false,
  is_juco: false,
  view_suffix: '_bronze',
  description: 'Football Bronze'
},
```

That's it! The rest of the system will automatically pick it up.

## Migration Notes

- All existing functionality is preserved
- No database changes required
- No API changes required
- All tests should pass without modification

