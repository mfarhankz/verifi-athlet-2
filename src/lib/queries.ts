import { supabase } from './supabaseClient';
import { AthleteData, RecruitingBoardData, SportStatConfig, RecruitingBoardPosition, AthleteVideo, RecruitingBoardBoard, RecruitingBoardColumn } from '../types/database';
import { FilterState } from '../types/filters';
import { fetchUserDetails } from '../utils/utils';
import { US_STATE_ABBREVIATIONS } from '@/utils/constants';

// ============================================================================
// UNIFIED PACKAGE DEFINITION SYSTEM
// ============================================================================
// This is the single source of truth for all package definitions
// Each package includes: sport, package_id, tier type, NAIA/JUCO status, and view suffix

export interface PackageDefinition {
  sport: string;              // Sport abbreviation (fb, bsb, sb, etc.)
  package_id: number;         // Package ID number
  package_type: string;       // Package type name (elite, starter, gold, silver, naia, juco, ultra, etc.)
  is_naia: boolean;          // Whether this is a NAIA package
  is_juco: boolean;          // Whether this is a JUCO package
  transfers_suffix: string;  // Suffix for vw_tp_athletes_wide view (e.g., '', '_gold', '_silver', '_naia', '_starter')
  hs_suffix: string;         // Which view to use for high school prospects (platinum, gold, silver_plus, silver, naia)
  description?: string;      // Optional description
}

export const PACKAGE_DEFINITIONS: PackageDefinition[] = [
  // ========== FOOTBALL PACKAGES ==========
  { sport: 'fb', package_id: 1, package_type: 'platinum', is_naia: false, is_juco: false, transfers_suffix: '', hs_suffix: 'platinum', description: 'Football Platinum' },
  { sport: 'fb', package_id: 97, package_type: 'gold', is_naia: false, is_juco: false, transfers_suffix: '_gold', hs_suffix: 'gold', description: 'Football Gold' },
  { sport: 'fb', package_id: 98, package_type: 'gold', is_naia: false, is_juco: false, transfers_suffix: '', hs_suffix: 'platinum', description: 'Football Old Gold' },
  { sport: 'fb', package_id: 99, package_type: 'silver_plus', is_naia: false, is_juco: false, transfers_suffix: '_silver', hs_suffix: 'silver_plus', description: 'Football Silver Plus' },
  { sport: 'fb', package_id: 100, package_type: 'silver', is_naia: false, is_juco: false, transfers_suffix: '_silver', hs_suffix: 'silver', description: 'Football Silver' },
  { sport: 'fb', package_id: 101, package_type: 'naia', is_naia: true, is_juco: false, transfers_suffix: '_naia', hs_suffix: 'silver', description: 'Football NAIA Silver' },
  { sport: 'fb', package_id: 102, package_type: 'camp_data', is_naia: false, is_juco: false, transfers_suffix: '', hs_suffix: 'platinum', description: 'Football Camp Data' },
  { sport: 'fb', package_id: 103, package_type: 'naia_silver_plus', is_naia: true, is_juco: false, transfers_suffix: '_naia', hs_suffix: 'silver_plus', description: 'Football NAIA Silver Plus' },
  { sport: 'fb', package_id: 104, package_type: 'pg_gold', is_naia: false, is_juco: false, transfers_suffix: '', hs_suffix: 'platinum', description: 'Football PG Gold' },
  { sport: 'fb', package_id: 105, package_type: 'pg_silver', is_naia: false, is_juco: false, transfers_suffix: '', hs_suffix: 'platinum', description: 'Football PG Silver' },
  
  // ========== BASEBALL (bsb) PACKAGES ==========
  { sport: 'bsb', package_id: 7, package_type: 'elite', is_naia: false, is_juco: false, transfers_suffix: '', hs_suffix: '', description: 'Baseball Elite' },
  { sport: 'bsb', package_id: 8, package_type: 'starter', is_naia: false, is_juco: false, transfers_suffix: '_starter', hs_suffix: '', description: 'Baseball Starter' },
  { sport: 'bsb', package_id: 9, package_type: 'juco', is_naia: false, is_juco: true, transfers_suffix: '', hs_suffix: '', description: 'Baseball JUCO' },
  { sport: 'bsb', package_id: 10, package_type: 'naia', is_naia: true, is_juco: false, transfers_suffix: '_naia', hs_suffix: '', description: 'Baseball NAIA' },
  { sport: 'bsb', package_id: 80, package_type: 'ultra', is_naia: false, is_juco: false, transfers_suffix: '', hs_suffix: '', description: 'Baseball Ultra' },
  
  // ========== SOFTBALL (sb) PACKAGES ==========
  { sport: 'sb', package_id: 11, package_type: 'starter', is_naia: false, is_juco: false, transfers_suffix: '_starter', hs_suffix: '', description: 'Softball Starter' },
  { sport: 'sb', package_id: 12, package_type: 'elite', is_naia: false, is_juco: false, transfers_suffix: '', hs_suffix: '', description: 'Softball Elite' },
  { sport: 'sb', package_id: 13, package_type: 'juco', is_naia: false, is_juco: true, transfers_suffix: '', hs_suffix: '', description: 'Softball JUCO' },
  { sport: 'sb', package_id: 14, package_type: 'naia', is_naia: true, is_juco: false, transfers_suffix: '_naia', hs_suffix: '', description: 'Softball NAIA' },
  { sport: 'sb', package_id: 81, package_type: 'ultra', is_naia: false, is_juco: false, transfers_suffix: '', hs_suffix: '', description: 'Softball Ultra' },
  
  // ========== WOMEN'S BASKETBALL (wbb) PACKAGES ==========
  { sport: 'wbb', package_id: 15, package_type: 'starter', is_naia: false, is_juco: false, transfers_suffix: '_starter', hs_suffix: 'silver', description: 'Women\'s Basketball Starter' },
  { sport: 'wbb', package_id: 16, package_type: 'elite', is_naia: false, is_juco: false, transfers_suffix: '', hs_suffix: 'platinum', description: 'Women\'s Basketball Elite' },
  { sport: 'wbb', package_id: 17, package_type: 'juco', is_naia: false, is_juco: true, transfers_suffix: '', hs_suffix: 'platinum', description: 'Women\'s Basketball JUCO' },
  { sport: 'wbb', package_id: 18, package_type: 'naia', is_naia: true, is_juco: false, transfers_suffix: '_naia', hs_suffix: 'silver', description: 'Women\'s Basketball NAIA' },
  { sport: 'wbb', package_id: 82, package_type: 'ultra', is_naia: false, is_juco: false, transfers_suffix: '', hs_suffix: 'platinum', description: 'Women\'s Basketball Ultra' },
  
  // ========== MEN'S BASKETBALL (mbb) PACKAGES ==========
  { sport: 'mbb', package_id: 19, package_type: 'starter', is_naia: false, is_juco: false, transfers_suffix: '_starter', hs_suffix: 'silver', description: 'Men\'s Basketball Starter' },
  { sport: 'mbb', package_id: 20, package_type: 'elite', is_naia: false, is_juco: false, transfers_suffix: '', hs_suffix: 'platinum', description: 'Men\'s Basketball Elite' },
  { sport: 'mbb', package_id: 21, package_type: 'juco', is_naia: false, is_juco: true, transfers_suffix: '', hs_suffix: 'platinum', description: 'Men\'s Basketball JUCO' },
  { sport: 'mbb', package_id: 22, package_type: 'naia', is_naia: true, is_juco: false, transfers_suffix: '_naia', hs_suffix: 'silver', description: 'Men\'s Basketball NAIA' },
  { sport: 'mbb', package_id: 83, package_type: 'ultra', is_naia: false, is_juco: false, transfers_suffix: '', hs_suffix: 'platinum', description: 'Men\'s Basketball Ultra' },
  
  // ========== WOMEN'S VOLLEYBALL (wvol) PACKAGES ==========
  { sport: 'wvol', package_id: 23, package_type: 'starter', is_naia: false, is_juco: false, transfers_suffix: '_starter', hs_suffix: '', description: 'Women\'s Volleyball Starter' },
  { sport: 'wvol', package_id: 24, package_type: 'elite', is_naia: false, is_juco: false, transfers_suffix: '', hs_suffix: '', description: 'Women\'s Volleyball Elite' },
  { sport: 'wvol', package_id: 25, package_type: 'juco', is_naia: false, is_juco: true, transfers_suffix: '', hs_suffix: '', description: 'Women\'s Volleyball JUCO' },
  { sport: 'wvol', package_id: 26, package_type: 'naia', is_naia: true, is_juco: false, transfers_suffix: '_naia', hs_suffix: '', description: 'Women\'s Volleyball NAIA' },
  { sport: 'wvol', package_id: 84, package_type: 'ultra', is_naia: false, is_juco: false, transfers_suffix: '', hs_suffix: '', description: 'Women\'s Volleyball Ultra' },
  
  // ========== MEN'S LACROSSE (mlax) PACKAGES ==========
  { sport: 'mlax', package_id: 27, package_type: 'starter', is_naia: false, is_juco: false, transfers_suffix: '_starter', hs_suffix: '', description: 'Men\'s Lacrosse Starter' },
  { sport: 'mlax', package_id: 28, package_type: 'elite', is_naia: false, is_juco: false, transfers_suffix: '', hs_suffix: '', description: 'Men\'s Lacrosse Elite' },
  { sport: 'mlax', package_id: 29, package_type: 'juco', is_naia: false, is_juco: true, transfers_suffix: '', hs_suffix: '', description: 'Men\'s Lacrosse JUCO' },
  { sport: 'mlax', package_id: 30, package_type: 'naia', is_naia: true, is_juco: false, transfers_suffix: '_naia', hs_suffix: '', description: 'Men\'s Lacrosse NAIA' },
  { sport: 'mlax', package_id: 85, package_type: 'ultra', is_naia: false, is_juco: false, transfers_suffix: '', hs_suffix: '', description: 'Men\'s Lacrosse Ultra' },
  
  // ========== WOMEN'S LACROSSE (wlax) PACKAGES ==========
  { sport: 'wlax', package_id: 31, package_type: 'starter', is_naia: false, is_juco: false, transfers_suffix: '_starter', hs_suffix: '', description: 'Women\'s Lacrosse Starter' },
  { sport: 'wlax', package_id: 32, package_type: 'elite', is_naia: false, is_juco: false, transfers_suffix: '', hs_suffix: '', description: 'Women\'s Lacrosse Elite' },
  { sport: 'wlax', package_id: 33, package_type: 'juco', is_naia: false, is_juco: true, transfers_suffix: '', hs_suffix: '', description: 'Women\'s Lacrosse JUCO' },
  { sport: 'wlax', package_id: 34, package_type: 'naia', is_naia: true, is_juco: false, transfers_suffix: '_naia', hs_suffix: '', description: 'Women\'s Lacrosse NAIA' },
  { sport: 'wlax', package_id: 86, package_type: 'ultra', is_naia: false, is_juco: false, transfers_suffix: '', hs_suffix: '', description: 'Women\'s Lacrosse Ultra' },
  
  // ========== MEN'S TENNIS (mten) PACKAGES ==========
  { sport: 'mten', package_id: 35, package_type: 'starter', is_naia: false, is_juco: false, transfers_suffix: '_starter', hs_suffix: '', description: 'Men\'s Tennis Starter' },
  { sport: 'mten', package_id: 36, package_type: 'elite', is_naia: false, is_juco: false, transfers_suffix: '', hs_suffix: '', description: 'Men\'s Tennis Elite' },
  { sport: 'mten', package_id: 37, package_type: 'juco', is_naia: false, is_juco: true, transfers_suffix: '', hs_suffix: '', description: 'Men\'s Tennis JUCO' },
  { sport: 'mten', package_id: 38, package_type: 'naia', is_naia: true, is_juco: false, transfers_suffix: '_naia', hs_suffix: '', description: 'Men\'s Tennis NAIA' },
  { sport: 'mten', package_id: 87, package_type: 'ultra', is_naia: false, is_juco: false, transfers_suffix: '', hs_suffix: '', description: 'Men\'s Tennis Ultra' },
  
  // ========== WOMEN'S TENNIS (wten) PACKAGES ==========
  { sport: 'wten', package_id: 39, package_type: 'starter', is_naia: false, is_juco: false, transfers_suffix: '_starter', hs_suffix: '', description: 'Women\'s Tennis Starter' },
  { sport: 'wten', package_id: 40, package_type: 'elite', is_naia: false, is_juco: false, transfers_suffix: '', hs_suffix: '', description: 'Women\'s Tennis Elite' },
  { sport: 'wten', package_id: 41, package_type: 'juco', is_naia: false, is_juco: true, transfers_suffix: '', hs_suffix: '', description: 'Women\'s Tennis JUCO' },
  { sport: 'wten', package_id: 42, package_type: 'naia', is_naia: true, is_juco: false, transfers_suffix: '_naia', hs_suffix: '', description: 'Women\'s Tennis NAIA' },
  { sport: 'wten', package_id: 88, package_type: 'ultra', is_naia: false, is_juco: false, transfers_suffix: '', hs_suffix: '', description: 'Women\'s Tennis Ultra' },
  
  // ========== MEN'S GOLF (mglf) PACKAGES ==========
  { sport: 'mglf', package_id: 43, package_type: 'starter', is_naia: false, is_juco: false, transfers_suffix: '_starter', hs_suffix: '', description: 'Men\'s Golf Starter' },
  { sport: 'mglf', package_id: 44, package_type: 'elite', is_naia: false, is_juco: false, transfers_suffix: '', hs_suffix: '', description: 'Men\'s Golf Elite' },
  { sport: 'mglf', package_id: 45, package_type: 'juco', is_naia: false, is_juco: true, transfers_suffix: '', hs_suffix: '', description: 'Men\'s Golf JUCO' },
  { sport: 'mglf', package_id: 46, package_type: 'naia', is_naia: true, is_juco: false, transfers_suffix: '_naia', hs_suffix: '', description: 'Men\'s Golf NAIA' },
  { sport: 'mglf', package_id: 89, package_type: 'ultra', is_naia: false, is_juco: false, transfers_suffix: '', hs_suffix: '', description: 'Men\'s Golf Ultra' },
  
  // ========== WOMEN'S GOLF (wglf) PACKAGES ==========
  { sport: 'wglf', package_id: 47, package_type: 'starter', is_naia: false, is_juco: false, transfers_suffix: '_starter', hs_suffix: '', description: 'Women\'s Golf Starter' },
  { sport: 'wglf', package_id: 48, package_type: 'elite', is_naia: false, is_juco: false, transfers_suffix: '', hs_suffix: '', description: 'Women\'s Golf Elite' },
  { sport: 'wglf', package_id: 49, package_type: 'juco', is_naia: false, is_juco: true, transfers_suffix: '', hs_suffix: '', description: 'Women\'s Golf JUCO' },
  { sport: 'wglf', package_id: 50, package_type: 'naia', is_naia: true, is_juco: false, transfers_suffix: '_naia', hs_suffix: '', description: 'Women\'s Golf NAIA' },
  { sport: 'wglf', package_id: 90, package_type: 'ultra', is_naia: false, is_juco: false, transfers_suffix: '', hs_suffix: '', description: 'Women\'s Golf Ultra' },
  
  // ========== MEN'S TRACK & FIELD (mtaf) PACKAGES ==========
  { sport: 'mtaf', package_id: 51, package_type: 'starter', is_naia: false, is_juco: false, transfers_suffix: '_starter', hs_suffix: '', description: 'Men\'s Track & Field Starter' },
  { sport: 'mtaf', package_id: 52, package_type: 'elite', is_naia: false, is_juco: false, transfers_suffix: '', hs_suffix: '', description: 'Men\'s Track & Field Elite' },
  { sport: 'mtaf', package_id: 53, package_type: 'juco', is_naia: false, is_juco: true, transfers_suffix: '', hs_suffix: '', description: 'Men\'s Track & Field JUCO' },
  { sport: 'mtaf', package_id: 54, package_type: 'naia', is_naia: true, is_juco: false, transfers_suffix: '_naia', hs_suffix: '', description: 'Men\'s Track & Field NAIA' },
  { sport: 'mtaf', package_id: 91, package_type: 'ultra', is_naia: false, is_juco: false, transfers_suffix: '', hs_suffix: '', description: 'Men\'s Track & Field Ultra' },
  
  // ========== WOMEN'S TRACK & FIELD (wtaf) PACKAGES ==========
  { sport: 'wtaf', package_id: 55, package_type: 'starter', is_naia: false, is_juco: false, transfers_suffix: '_starter', hs_suffix: '', description: 'Women\'s Track & Field Starter' },
  { sport: 'wtaf', package_id: 56, package_type: 'elite', is_naia: false, is_juco: false, transfers_suffix: '', hs_suffix: '', description: 'Women\'s Track & Field Elite' },
  { sport: 'wtaf', package_id: 57, package_type: 'juco', is_naia: false, is_juco: true, transfers_suffix: '', hs_suffix: '', description: 'Women\'s Track & Field JUCO' },
  { sport: 'wtaf', package_id: 58, package_type: 'naia', is_naia: true, is_juco: false, transfers_suffix: '_naia', hs_suffix: '', description: 'Women\'s Track & Field NAIA' },
  { sport: 'wtaf', package_id: 92, package_type: 'ultra', is_naia: false, is_juco: false, transfers_suffix: '', hs_suffix: '', description: 'Women\'s Track & Field Ultra' },
  
  // ========== MEN'S SWIMMING (mswm) PACKAGES ==========
  { sport: 'mswm', package_id: 59, package_type: 'starter', is_naia: false, is_juco: false, transfers_suffix: '_starter', hs_suffix: '', description: 'Men\'s Swimming Starter' },
  { sport: 'mswm', package_id: 60, package_type: 'elite', is_naia: false, is_juco: false, transfers_suffix: '', hs_suffix: '', description: 'Men\'s Swimming Elite' },
  { sport: 'mswm', package_id: 61, package_type: 'juco', is_naia: false, is_juco: true, transfers_suffix: '', hs_suffix: '', description: 'Men\'s Swimming JUCO' },
  { sport: 'mswm', package_id: 62, package_type: 'naia', is_naia: true, is_juco: false, transfers_suffix: '_naia', hs_suffix: '', description: 'Men\'s Swimming NAIA' },
  { sport: 'mswm', package_id: 93, package_type: 'ultra', is_naia: false, is_juco: false, transfers_suffix: '', hs_suffix: '', description: 'Men\'s Swimming Ultra' },
  
  // ========== WOMEN'S SWIMMING (wswm) PACKAGES ==========
  { sport: 'wswm', package_id: 63, package_type: 'starter', is_naia: false, is_juco: false, transfers_suffix: '_starter', hs_suffix: '', description: 'Women\'s Swimming Starter' },
  { sport: 'wswm', package_id: 64, package_type: 'elite', is_naia: false, is_juco: false, transfers_suffix: '', hs_suffix: '', description: 'Women\'s Swimming Elite' },
  { sport: 'wswm', package_id: 65, package_type: 'juco', is_naia: false, is_juco: true, transfers_suffix: '', hs_suffix: '', description: 'Women\'s Swimming JUCO' },
  { sport: 'wswm', package_id: 66, package_type: 'naia', is_naia: true, is_juco: false, transfers_suffix: '_naia', hs_suffix: '', description: 'Women\'s Swimming NAIA' },
  { sport: 'wswm', package_id: 94, package_type: 'ultra', is_naia: false, is_juco: false, transfers_suffix: '', hs_suffix: '', description: 'Women\'s Swimming Ultra' },
  
  // ========== MEN'S WRESTLING (mwre) PACKAGES ==========
  { sport: 'mwre', package_id: 67, package_type: 'starter', is_naia: false, is_juco: false, transfers_suffix: '_starter', hs_suffix: '', description: 'Men\'s Wrestling Starter' },
  { sport: 'mwre', package_id: 68, package_type: 'elite', is_naia: false, is_juco: false, transfers_suffix: '', hs_suffix: '', description: 'Men\'s Wrestling Elite' },
  { sport: 'mwre', package_id: 69, package_type: 'juco', is_naia: false, is_juco: true, transfers_suffix: '', hs_suffix: '', description: 'Men\'s Wrestling JUCO' },
  { sport: 'mwre', package_id: 70, package_type: 'naia', is_naia: true, is_juco: false, transfers_suffix: '_naia', hs_suffix: '', description: 'Men\'s Wrestling NAIA' },
  { sport: 'mwre', package_id: 95, package_type: 'ultra', is_naia: false, is_juco: false, transfers_suffix: '', hs_suffix: '', description: 'Men\'s Wrestling Ultra' },
  
  // ========== MEN'S SOCCER (msoc) PACKAGES ==========
  { sport: 'msoc', package_id: 2, package_type: 'elite', is_naia: false, is_juco: false, transfers_suffix: '', hs_suffix: '', description: 'Men\'s Soccer Elite' },
  { sport: 'msoc', package_id: 71, package_type: 'starter', is_naia: false, is_juco: false, transfers_suffix: '_starter', hs_suffix: '', description: 'Men\'s Soccer Starter' },
  { sport: 'msoc', package_id: 72, package_type: 'juco', is_naia: false, is_juco: true, transfers_suffix: '', hs_suffix: '', description: 'Men\'s Soccer JUCO' },
  { sport: 'msoc', package_id: 73, package_type: 'naia', is_naia: true, is_juco: false, transfers_suffix: '_naia', hs_suffix: '', description: 'Men\'s Soccer NAIA' },
  { sport: 'msoc', package_id: 79, package_type: 'ultra', is_naia: false, is_juco: false, transfers_suffix: '', hs_suffix: '', description: 'Men\'s Soccer Ultra' },
  
  // ========== WOMEN'S SOCCER (wsoc) PACKAGES ==========
  { sport: 'wsoc', package_id: 74, package_type: 'elite', is_naia: false, is_juco: false, transfers_suffix: '', hs_suffix: '', description: 'Women\'s Soccer Elite' },
  { sport: 'wsoc', package_id: 75, package_type: 'starter', is_naia: false, is_juco: false, transfers_suffix: '_starter', hs_suffix: '', description: 'Women\'s Soccer Starter' },
  { sport: 'wsoc', package_id: 76, package_type: 'juco', is_naia: false, is_juco: true, transfers_suffix: '', hs_suffix: '', description: 'Women\'s Soccer JUCO' },
  { sport: 'wsoc', package_id: 77, package_type: 'naia', is_naia: true, is_juco: false, transfers_suffix: '_naia', hs_suffix: '', description: 'Women\'s Soccer NAIA' },
  { sport: 'wsoc', package_id: 96, package_type: 'ultra', is_naia: false, is_juco: false, transfers_suffix: '', hs_suffix: '', description: 'Women\'s Soccer Ultra' },
  
  // ========== ADMIN PACKAGE ==========
  { sport: 'admin', package_id: 3, package_type: 'admin', is_naia: false, is_juco: false, transfers_suffix: '', hs_suffix: '', description: 'Admin Package' },
];

// ============================================================================
// HELPER FUNCTIONS TO QUERY PACKAGE DEFINITIONS
// ============================================================================

/**
 * Get package definition by package ID
 */
export function getPackageById(packageId: number): PackageDefinition | undefined {
  return PACKAGE_DEFINITIONS.find(pkg => pkg.package_id === packageId);
}

/**
 * Get all packages for a specific sport
 */
export function getPackagesBySport(sport: string): PackageDefinition[] {
  return PACKAGE_DEFINITIONS.filter(pkg => pkg.sport === sport);
}

/**
 * Get packages by sport and user's package IDs
 */
export function getUserPackagesForSport(sport: string, userPackageIds: number[]): PackageDefinition[] {
  return PACKAGE_DEFINITIONS.filter(
    pkg => pkg.sport === sport && userPackageIds.includes(pkg.package_id)
  );
}

/**
 * Get the best (least restrictive) package for a sport from user's packages
 * Priority: elite/ultra > gold > silver > starter > naia > juco
 */
export function getBestPackageForSport(sport: string, userPackageIds: number[]): PackageDefinition | null {
  const userPackages = getUserPackagesForSport(sport, userPackageIds);
  
  if (userPackages.length === 0) return null;
  
  // Define priority order (lower number = higher priority)
  const priorityMap: Record<string, number> = {
    'elite': 1,
    'ultra': 1,
    'gold': 2,
    'silver': 3,
    'starter': 4,
    'naia': 5,
    'juco': 6,
    'camp_data': 7,
  };
  
  // Sort by priority and return the best one
  userPackages.sort((a, b) => {
    const priorityA = priorityMap[a.package_type] || 99;
    const priorityB = priorityMap[b.package_type] || 99;
    return priorityA - priorityB;
  });
  
  return userPackages[0];
}

/**
 * Get all NAIA package IDs
 */
export function getNaiaPackageIds(): number[] {
  return PACKAGE_DEFINITIONS.filter(pkg => pkg.is_naia).map(pkg => pkg.package_id);
}

/**
 * Get all JUCO package IDs
 */
export function getJucoPackageIds(): number[] {
  return PACKAGE_DEFINITIONS.filter(pkg => pkg.is_juco).map(pkg => pkg.package_id);
}

/**
 * Get all package IDs for a specific sport
 */
export function getPackageIdsBySport(sport: string): number[] {
  return PACKAGE_DEFINITIONS.filter(pkg => pkg.sport === sport).map(pkg => pkg.package_id);
}

/**
 * Get all package IDs of a specific type (e.g., 'ultra', 'elite', etc.)
 */
export function getPackageIdsByType(packageType: string): number[] {
  return PACKAGE_DEFINITIONS.filter(pkg => pkg.package_type === packageType).map(pkg => pkg.package_id);
}

/**
 * Check if a package ID is a NAIA package
 */
export function isNaiaPackage(packageId: number): boolean {
  const pkg = getPackageById(packageId);
  return pkg?.is_naia || false;
}

/**
 * Check if a package ID is a JUCO package
 */
export function isJucoPackage(packageId: number): boolean {
  const pkg = getPackageById(packageId);
  return pkg?.is_juco || false;
}

// ============================================================================
// BACKWARD COMPATIBILITY EXPORTS
// ============================================================================
// These maintain compatibility with existing code that uses the old constants

export const NAIA_PACKAGE_IDS = getNaiaPackageIds();

// Cache for sport column config to prevent repeated calls
const sportColumnConfigCache = new Map<string, SportStatConfig[]>();

// Custom sort order for athletic projection
const ATHLETIC_PROJECTION_SORT_ORDER = {
  'FBS P4 - Top half': 1,
  'FBS P4': 2,
  'FBS G5 - Top half': 3,
  'FBS G5': 4,
  'FCS - Full Scholarship': 5,
  'FCS': 6,
  'D2 - Top half': 7,
  'D2': 8,
  'D3 - Top half': 9,
  'D3': 10,
  'D3 Walk-on': 11
} as const;

// Helper function to get sort order for athletic projection
function getAthleticProjectionSortOrder(projection: string | null | undefined): number {
  if (!projection) return 999; // Put null/undefined values at the end
  return ATHLETIC_PROJECTION_SORT_ORDER[projection as keyof typeof ATHLETIC_PROJECTION_SORT_ORDER] || 999;
}

// Helper function to determine athletic aid value with override logic


/**
 * Helper function to determine package tier based on user packages and sport abbreviation
 * Returns the package type (view suffix) for the best package the user has for this sport
 */
function determinePackageTier(userPackages: string[], sportAbbrev: string): string | null {
  const userPackageNumbers = userPackages.map(pkg => parseInt(pkg, 10));
  const bestPackage = getBestPackageForSport(sportAbbrev, userPackageNumbers);
  
  if (!bestPackage) return null;
  
  // Return the package type (which matches the view suffix logic)
  return bestPackage.package_type;
}

/**
 * Get the view suffix for a sport based on user packages
 * This directly returns the suffix to use for vw_tp_athletes_wide_<sport><suffix>
 */
function getViewSuffixForSport(sport: string, userPackageIds: number[]): string {
  const bestPackage = getBestPackageForSport(sport, userPackageIds);
  return bestPackage?.transfers_suffix || '';
}

/**
 * Get the high school view suffix for a sport based on user packages
 * This returns the suffix to use for vw_hs_athletes_wide_<sport><suffix>
 */
function getHsViewSuffixForSport(sport: string, userPackageIds: number[]): string {
  const bestPackage = getBestPackageForSport(sport, userPackageIds);
  return bestPackage?.hs_suffix || '';
}

/**
 * Fetch customer package details from the database
 * Returns the package information for a specific customer
 */
export async function fetchCustomerPackageDetails(customerId: string): Promise<PackageDefinition | null> {
  try {
    // Get the customer's package information
    const { data: customerPackages, error: packageError } = await supabase
      .from('customer_package_map')
      .select(`
        customer_package_id,
        customer_package!inner (
          id,
          package_name
        )
      `)
      .eq('customer_id', customerId)
      .is('access_end', null);

    if (packageError) {
      console.error('Error fetching customer package details:', packageError);
      return null;
    }

    if (!customerPackages || customerPackages.length === 0) {
      return null;
    }

    // Get the package ID from the first active package
    const packageId = customerPackages[0].customer_package.id;
    
    // Find the package definition
    const packageDefinition = getPackageById(packageId);
    return packageDefinition || null;
  } catch (error) {
    console.error('Error in fetchCustomerPackageDetails:', error);
    return null;
  }
}

/**
 * Get the appropriate high school view for a customer based on their package
 * Returns the view name (e.g., 'vw_hs_athletes_wide_platinum', 'vw_hs_athletes_wide_gold', etc.)
 */
export async function getCustomerHsView(customerId: string, sport: string): Promise<string> {
  try {
    // Debug log removed('Fetching package details for customer:', customerId);
    const packageDetails = await fetchCustomerPackageDetails(customerId);
    // Debug log removed('Package details:', packageDetails);
    
    if (!packageDetails) {
      // Debug log removed('No package details found, defaulting to platinum view');
      // Default to platinum view if no package found
      return `vw_hs_athletes_wide_${sport}_platinum`;
    }

    const hsSuffix = packageDetails.hs_suffix;
    // Debug log removed('HS suffix from package:', hsSuffix);
    
    if (!hsSuffix) {
      // Debug log removed('No hs_suffix found, defaulting to platinum view');
      // For non-football sports or packages without hs_suffix, default to platinum
      return `vw_hs_athletes_wide_${sport}_platinum`;
    }

    const viewName = `vw_hs_athletes_wide_${sport}_${hsSuffix}`;
    // Debug log removed('Final view name:', viewName);
    return viewName;
  } catch (error) {
    console.error('Error in getCustomerHsView:', error);
    // Default to platinum view on error
    return `vw_hs_athletes_wide_${sport}_platinum`;
  }
}

/**
 * Fetch high school athlete prospects for a specific school
 * Uses the appropriate high school view based on customer's package
 */
export async function fetchHighSchoolAthletes(
  schoolId: string,
  sport: string,
  customerId?: string,
  options?: {
    page?: number;
    limit?: number;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
  }
): Promise<{ data: any[]; hasMore: boolean; totalCount?: number }> {
  try {
    const page = options?.page || 1;
    const limit = options?.limit || 25;
    const offset = (page - 1) * limit;

    // Get the appropriate view based on customer's package
    let viewName: string;
    if (customerId) {
      // Debug log removed('Getting view for customer:', customerId, 'sport:', sport);
      viewName = await getCustomerHsView(customerId, sport);
      // Debug log removed('Customer view determined:', viewName);
    } else {
      // Default to platinum view if no customer ID provided
      viewName = `vw_hs_athletes_wide_${sport}_platinum`;
      // Debug log removed('No customer ID provided, using default view:', viewName);
    }

    // Debug log removed('Fetching high school athletes from view:', viewName);

    // Build the query
    let query = supabase
      .from(viewName)
      .select(`
        athlete_id,
        athlete_first_name,
        athlete_last_name,
        school_id,
        school_name,
        primary_position,
        height_feet,
        height_inch,
        weight,
        gpa,
        grad_year,
        athletic_projection,
        best_offer,
        hs_highlight,
        image_url
      `, { count: 'exact' })
      .eq('school_id', schoolId)
      .limit(limit)
      .range(offset, offset + limit - 1);

    // Apply sorting if provided
    if (options?.sortField && options?.sortOrder) {
      query = query.order(options.sortField, { ascending: options.sortOrder === 'asc' });
    } else {
      // Default sorting by grad_year ascending, then athletic_projection using custom hierarchy
      query = query.order('grad_year', { ascending: true });
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching high school athletes:', error);
      throw error;
    }

    // Transform the data to match the expected format
    const transformedData = (data || []).map((athlete: any) => ({
      key: athlete.athlete_id,
      name: `${athlete.athlete_first_name} ${athlete.athlete_last_name}`,
      gradYear: athlete.grad_year?.toString() || '',
      athleticProjection: athlete.athletic_projection || 0, // Raw athletic projection value
      bestOffer: athlete.best_offer || 'No Offer', // Direct field from database
      gpa: athlete.gpa?.toString() || '',
      position: athlete.primary_position || '',
      height: (athlete.height_feet && athlete.height_inch) ? formatHeightWithFractions(athlete.height_feet, athlete.height_inch) : '',
      weight: athlete.weight?.toString() || '',
      score: athlete.athletic_projection || 0,
      initials: getInitials(athlete.athlete_first_name, athlete.athlete_last_name),
      athlete_id: athlete.athlete_id,
      highlight: athlete.hs_highlight,
      image_url: athlete.image_url
    }));

    // Apply custom sorting for default order (grad_year ascending, then athletic_projection hierarchy)
    if (!options?.sortField || !options?.sortOrder) {
      const projectionOrder = [
        'FBS P4 - Top half',
        'FBS P4',
        'FBS G5 - Top half',
        'FBS G5',
        'FCS - Full Scholarship',
        'FCS',
        'D2 - Top half',
        'D2',
        'D3 - Top half',
        'D3',
        'D3 Walk-on'
      ];

      transformedData.sort((a: any, b: any) => {
        // Primary sort by grad year
        const yearA = parseInt(a.gradYear) || 0;
        const yearB = parseInt(b.gradYear) || 0;
        
        if (yearA !== yearB) {
          return yearA - yearB;
        }

        // Secondary sort by athletic projection hierarchy
        // Handle both numeric 0 and string values
        const projectionA = a.athleticProjection === 0 || a.athleticProjection === '0' || !a.athleticProjection ? '' : a.athleticProjection;
        const projectionB = b.athleticProjection === 0 || b.athleticProjection === '0' || !b.athleticProjection ? '' : b.athleticProjection;
        
        const indexA = projectionOrder.indexOf(projectionA);
        const indexB = projectionOrder.indexOf(projectionB);
        
        // If both are in the order array, sort by their position
        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB;
        }
        // If only one is in the order array, prioritize it
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        // If neither is in the order array, sort alphabetically
        return projectionA.localeCompare(projectionB);
      });
    }

    return {
      data: transformedData,
      hasMore: count ? offset + limit < count : false,
      totalCount: count || 0
    };
  } catch (error) {
    console.error('Error in fetchHighSchoolAthletes:', error);
    throw error;
  }
}

// Helper functions for data transformation
function formatHeightWithFractions(feet: number, inches: number): string {
  if (!feet && !inches) return '';
  
  // Round to nearest 1/8 (0.125)
  const roundedInches = Math.round(inches * 8) / 8;
  
  // Extract whole inches and fractional part
  const wholeInches = Math.floor(roundedInches);
  const fractionalPart = roundedInches - wholeInches;
  
  // Convert fractional part to fraction string
  let fractionStr = '';
  if (fractionalPart > 0) {
    const numerator = Math.round(fractionalPart * 8);
    if (numerator === 1) fractionStr = ' ⅛';
    else if (numerator === 2) fractionStr = ' ¼';
    else if (numerator === 3) fractionStr = ' ⅜';
    else if (numerator === 4) fractionStr = ' ½';
    else if (numerator === 5) fractionStr = ' ⅝';
    else if (numerator === 6) fractionStr = ' ¾';
    else if (numerator === 7) fractionStr = ' ⅞';
  }
  
  return `${feet}' ${wholeInches}${fractionStr}"`;
}

function getInitials(firstName: string, lastName: string): string {
  const first = firstName?.charAt(0)?.toUpperCase() || '';
  const last = lastName?.charAt(0)?.toUpperCase() || '';
  return first + last;
}

/**
 * Fetch athlete ratings from the athlete_rating table
 * Returns a map of athlete_id to rating data (name and color)
 */
export async function fetchAthleteRatings(
  athleteIds: string[], 
  customerId?: string
): Promise<Record<string, { name: string; color: string }>> {
  if (!athleteIds.length || !customerId) {
    return {};
  }

  try {
    const { data: ratingData, error } = await supabase
      .from('athlete_rating')
      .select(`
        athlete_id,
        customer_rating_scale_id,
        customer_rating_scale:customer_rating_scale_id(name, color)
      `)
      .in('athlete_id', athleteIds);

    if (error) {
      console.error('Error fetching athlete ratings:', error);
      return {};
    }

    const ratingsMap: Record<string, { name: string; color: string }> = {};
    ratingData?.forEach((rating: any) => {
      const ratingScale = rating.customer_rating_scale as unknown as { name: string; color: string } | null;
      if (ratingScale) {
        ratingsMap[rating.athlete_id] = {
          name: ratingScale.name,
          color: ratingScale.color
        };
      }
    });

    return ratingsMap;
  } catch (error) {
    console.error('Error in fetchAthleteRatings:', error);
    return {};
  }
}
/**
 * Fetch school facts data for a specific school
 * Returns all school_fact records for the given school_id
 */
export async function fetchSchoolFacts(schoolId: string): Promise<any[]> {
  try {
    // Debug log removed('Fetching school facts for schoolId:', schoolId);
    
    // First, get the basic school facts with data_type information
    // We need to get the most recent record for each data_type
    const { data: factsData, error: factsError } = await supabase
      .from('school_fact')
      .select(`
        id,
        school_id,
        data_type_id,
        value,
        created_at,
        data_type:data_type_id (
          id,
          name
        )
      `)
      .eq('school_id', schoolId)
      .is('inactive', null)
      .order('data_type_id', { ascending: true })
      .order('created_at', { ascending: false });

    if (factsError) {
      console.error('Error fetching school facts:', factsError);
      throw factsError;
    }

    if (!factsData || factsData.length === 0) {
      return [];
    }

    // Get only the most recent record for each data_type
    const latestFactsMap = new Map();
    factsData.forEach((fact: any) => {
      const dataTypeId = fact.data_type_id;
      if (!latestFactsMap.has(dataTypeId) || 
          new Date(fact.created_at) > new Date(latestFactsMap.get(dataTypeId).created_at)) {
        latestFactsMap.set(dataTypeId, fact);
      }
    });
    
    const latestFacts = Array.from(latestFactsMap.values());

    // Separate facts by type for additional lookups
    const stateFacts = latestFacts.filter((fact: any) => fact.data_type?.name === 'state_id');
    const countyFacts = latestFacts.filter((fact: any) => fact.data_type?.name === 'county_id');
    
    const enrichedFacts = [...latestFacts];

    // Fetch state information for state_id facts
    if (stateFacts.length > 0) {
      const stateIds = stateFacts.map((fact: any) => parseInt(fact.value)).filter((id: any) => !isNaN(id));
      // Debug log removed('State facts found:', stateFacts);
      // Debug log removed('State IDs to fetch:', stateIds);
      if (stateIds.length > 0) {
        const { data: statesData } = await supabase
          .from('state')
          .select('id, name, abbrev')
          .in('id', stateIds);
        // Debug log removed('States data fetched:', statesData);

        // Add state info to the facts
        enrichedFacts.forEach(fact => {
          if (fact.data_type?.name === 'state_id' && statesData) {
            const stateInfo = statesData.find((state: any) => 
              state.id === parseInt(fact.value)
            );
            if (stateInfo) {
              fact.state = stateInfo;
            }
          }
        });
      }
    }

    // Fetch county information for county_id facts
    if (countyFacts.length > 0) {
      const countyIds = countyFacts.map((fact: any) => parseInt(fact.value)).filter((id: any) => !isNaN(id));
      // Debug log removed('County facts found:', countyFacts);
      // Debug log removed('County IDs to fetch:', countyIds);
      if (countyIds.length > 0) {
        const { data: countiesData } = await supabase
          .from('county')
          .select('id, name')
          .in('id', countyIds);
        // Debug log removed('Counties data fetched:', countiesData);

        // Add county info to the facts
        enrichedFacts.forEach(fact => {
          if (fact.data_type?.name === 'county_id' && countiesData) {
            const countyInfo = countiesData.find((county: any) => 
              county.id === parseInt(fact.value)
            );
            if (countyInfo) {
              fact.county = countyInfo;
            }
          }
        });
      }
    }

    // Debug log removed('Fetched school facts with enriched data:', enrichedFacts);
    return enrichedFacts;
  } catch (error) {
    console.error('Error in fetchSchoolFacts:', error);
    throw error;
  }
}

export async function fetchCoachInfo(schoolId: string): Promise<any> {
  try {
    // Debug log removed('Fetching coach info for schoolId:', schoolId);
    
    // First, get the coach_school relationship
    const { data: coachSchoolData, error: coachSchoolError } = await supabase
      .from('coach_school')
      .select(`
        coach_id,
        school_id,
        sport_id,
        start_date,
        end_date,
        coach:coach_id (
          id,
          first_name,
          last_name
        )
      `)
      .eq('school_id', schoolId)
      .eq('sport_id', 21)
      .is('end_date', null); // Only active coaches

    if (coachSchoolError) {
      console.error('Error fetching coach school data:', coachSchoolError);
      throw coachSchoolError;
    }

    if (!coachSchoolData || coachSchoolData.length === 0) {
      // Debug log removed('No coach school data found');
      return null;
    }

   

    // Get coach facts for this coach
    const { data: coachFactsData, error: coachFactsError } = await supabase
      .from('coach_fact')
      .select(`
        id,
        coach_id,
        data_type_id,
        value,
        created_at,
        data_type:data_type_id (
          id,
          name
        )
      `)
      .eq('coach_id', coachSchoolData[0].coach_id)
      .is('inactive', null)
      .order('data_type_id', { ascending: true })
      .order('created_at', { ascending: false });

    if (coachFactsError) {
      console.error('Error fetching coach facts:', coachFactsError);
      // Don't throw here, just continue without facts
    }

    // Get the most recent fact for each data type
    const latestFactsMap = new Map();
    if (coachFactsData && coachFactsData.length > 0) {
      coachFactsData.forEach((fact: any) => {
        const dataTypeId = fact.data_type_id;
        if (!latestFactsMap.has(dataTypeId) || 
            new Date(fact.created_at) > new Date(latestFactsMap.get(dataTypeId).created_at)) {
          latestFactsMap.set(dataTypeId, fact);
        }
      });
    }

    const latestFacts = Array.from(latestFactsMap.values());
    // Debug log removed('Latest facts:', latestFacts);
    
    // Helper function to get value by data_type_id
    const getFactValue = (dataTypeId: number): string | null => {
      const fact = latestFacts.find((f: any) => f.data_type_id === dataTypeId);
      return fact ? fact.value : null;
    };
    
    // Build the coach info object
    const coachInfo = {
      id: coachSchoolData[0].coach_id,
      firstName: coachSchoolData[0].coach.first_name,
      lastName: coachSchoolData[0].coach.last_name,
      email: getFactValue(571), // Based on your data, this is the email data_type_id
      phone: getFactValue(27), // Based on your data, this is the phone data_type_id
      twitterHandle: getFactValue(13), // Based on your data, this appears to be the Twitter handle
      best_phone: getFactValue(28), // Based on your data, this should be the best_phone data_type_id
      hc_update_date: getFactValue(29), // Based on your data, this should be the hc_update_date data_type_id
      facts: latestFacts
    };

    // Debug log removed('Fetched coach info:', coachInfo);
    return coachInfo;
  } catch (error) {
    console.error('Error in fetchCoachInfo:', error);
    throw error;
  }
}


// Helper function to determine which columns to select based on filters and display columns
function getColumnsToSelect(filters?: FilterState, displayColumns?: string[], dataSource?: 'transfer_portal' | 'all_athletes' | 'juco' | 'hs_athletes', dynamicColumns?: SportStatConfig[], sportAbbrev?: string): string[] {
  const columns = new Set<string>();
  
  // Always include basic columns
  columns.add('athlete_id');
  
  // Use different column names based on data source
  if (dataSource === 'transfer_portal') {
    columns.add('m_first_name');
    columns.add('m_last_name');
  } else {
    columns.add('athlete_first_name');
    columns.add('athlete_last_name');
  }
  
  columns.add('initiated_date');
  columns.add('school_name');
  columns.add('school_id'); // Add school_id for logo fetching
  columns.add('is_receiving_athletic_aid');
  columns.add('commit_school_name');
  columns.add('commit_school_id'); // Add commit_school_id for logo fetching
  columns.add('commit_date'); // Add commit_date for display
  
  // Add m_status for all_athletes data source to support Status column
  if (dataSource === 'all_athletes') {
    columns.add('m_status');
  }
  
  // Add columns based on filters
  if (filters) {
    if (filters.years?.length) {
      columns.add('year');
    }
    if (filters.divisions?.length) {
      columns.add('division');
    }
    if (filters.states?.length) {
      columns.add('address_state');
    }
    if (filters.international?.length) {
      columns.add('address_state');
    }
    // Handle unified location filter
    if (filters.location?.values?.length) {
      if (filters.location.type === 'hometown_state' || filters.location.type === 'international') {
        columns.add('address_state');
      } else if (filters.location.type === 'school_state') {
        columns.add('school_state');
      } else if (filters.location.type === 'county') {
        columns.add('hs_county');
      } else if (filters.location.type === 'radius') {
        columns.add('address_latitude');
        columns.add('address_longitude');
      }
    }
    if (filters.status?.length) {
      columns.add('m_status');
    }
    if (filters.position?.length) {
      columns.add('primary_position');
    }
    if (filters.status?.length) {
      columns.add('m_status');
    }
    if (filters.position?.length) {
      columns.add('primary_position');
    }

    // JUCO-specific filter columns
    if (filters.athleticAssociation?.length) {
      columns.add('athletic_association');
    }
    if (filters.jucoRegion?.length) {
      columns.add('juco_region');
    }
    if (filters.jucoDivision?.length) {
      columns.add('juco_division');
    }
    if (filters.schoolState?.length) {
      columns.add('school_state');
    }

    // athletic_aid_override is no longer needed since processing is done upstream
    if (filters.gamesPlayed) {
      columns.add('gp'); // GP
    }

    if (filters.dateRange) {
      columns.add('initiated_date');
    }
    
    // Add dynamic stat columns that are being filtered
    Object.keys(filters).forEach(filterKey => {
      if (filterKey.startsWith('stat_')) {
        const dataTypeId = filterKey.replace('stat_', '');
        const column = dynamicColumns?.find(col => col.data_type_id.toString() === dataTypeId);
        if (column?.sanitized_column_name) {
          columns.add(column.sanitized_column_name);
        }
      }
    });

    if (typeof filters.survey_completed === 'boolean') {
      columns.add('survey_completed');
    }
    
    // Add grad student column if filter is used
    if (filters.gradStudent !== undefined) {
      columns.add('is_transfer_graduate_student');
    }
    
    // Add best_honor column if honors filter is used
    if (filters.honors?.length) {
      columns.add('best_honor');
    }
    
    // Add transfer_odds column if transfer odds filter is used
    if (filters.transfer_odds) {
      columns.add('transfer_odds');
    }
    
    // Add m_designated_student_athlete column if designated student athlete filter is used
    if (filters.designatedStudentAthlete !== undefined) {
      columns.add('m_designated_student_athlete');
    }
    
    // Add GPA column if GPA filter is used
    if (filters.gpa) {
      columns.add('gpa');
    }
    
    // Add GPA type column if GPA type filter is used
    if (filters.gpa_type?.length) {
      columns.add('gpa_type');
    }
    
    // Add major column if major filter is used
    if (filters.major) {
      columns.add('major');
    }
    
    // Add SAT column if SAT filter is used
    if (filters.sat) {
      columns.add('sat');
    }
    
    // Add ACT column if ACT filter is used
    if (filters.act) {
      columns.add('act');
    }
    
    // Add income category column if income filter is used
    if (filters.income_category?.length) {
      columns.add('income_category');
    }
    
    // Add date added column if date added filter is used
    if (filters.added_date) {
      columns.add('added_date');
    }
    
    // Add last major change column if last major change filter is used
    if (filters.last_major_change) {
      columns.add('last_major_change');
    }
    
    // Add recruiting service rating columns if filters are used
    if (filters.on3_consensus_stars) {
      columns.add('on3_consensus_stars');
    }
    if (filters.rivals_rating) {
      columns.add('rivals_rating');
    }
    if (filters.on3_rating) {
      columns.add('on3_rating');
    }
    if (filters._247_rating) {
      columns.add('_247_rating');
    }
    if (filters.espn_rating) {
      columns.add('espn_rating');
    }
    if (filters.on3_stars) {
      columns.add('on3_stars');
    }
    if (filters._247_stars) {
      columns.add('_247_stars');
    }
    if (filters.espn_stars) {
      columns.add('espn_stars');
    }
    
    // Add conference column if filter is used
    if (filters.conference?.length && sportAbbrev) {
      const sportToConferenceColumn: Record<string, string> = {
        'fb': 'conference',
        'bsb': 'bsb_conference', 
        'sb': 'sb_conference',
        'wbb': 'wbb_conference',
        'mbb': 'mbb_conference',
        'msoc': 'msoc_conference',
        'wsoc': 'wsoc_conference',
        'wvol': 'wvol_conference',
        'mlax': 'mlax_conference',
        'wlax': 'wlax_conference',
        'mten': 'mten_conference',
        'wten': 'wten_conference',
        'mglf': 'mglf_conference',
        'wglf': 'wglf_conference',
        'mtaf': 'mtaf_conference',
        'wtaf': 'wtaf_conference',
        'mswm': 'mswm_conference',
        'wswm': 'wswm_conference',
        'mwre': 'mwre_conference'
      };
      
      const conferenceColumn = sportToConferenceColumn[sportAbbrev];
      if (conferenceColumn) {
        columns.add(conferenceColumn);
      }
    }
  }
  
  // Add columns from display columns
  if (displayColumns) {
    displayColumns.forEach(col => {
      // Map display column names to view column names
      if (col === 'date') {
        columns.add('initiated_date');
      } else if (col === 'athletic_aid') {
        columns.add('is_receiving_athletic_aid');
      } else if (col === 'position') {
        columns.add('primary_position');
      } else if (col === 'high_name') {
        columns.add('high_school');
      } else if (col === 'state') {
        columns.add('address_state');
      } else if (col === 'athletic_projection') {
        // Add both athletic_projection and athletic_projection_number for sorting
        columns.add('athletic_projection');
        columns.add('athletic_projection_number');
      } else if (col === 'true_score') {
        // Skip true_score as it's calculated, not a column
        return;
      } else if (col === 'id') {
        // Skip id as it's mapped to athlete_id
        return;
      } else if (col.startsWith('stat_')) {
        // Skip numbered stat columns as they don't exist in the view
        return;
      } else {
        columns.add(col);
      }
    });
  }
  
  // Always include essential columns for the frontend
  columns.add('high_school');
  columns.add('primary_position');
  columns.add('division'); // Always include division for name column display
  columns.add('year'); // Always include year for name column display
  // Add image_url column for profile pictures
  columns.add('image_url');
  
  // Add height data if data_type_id 304 is in dynamic columns
  if (dynamicColumns?.some(col => col.data_type_id === 304)) {
    columns.add('height_feet');
    columns.add('height_inch');
  }
  
  // Add highlight field for video icon display
  columns.add('highlight');
  
  // Add stat columns needed for true score calculation
  // columns.add('woba'); // woba_score
  // columns.add('fip'); // fip_score
  
  return Array.from(columns);
}
export async function fetchAthleteData(
  sport: string,
  options?: {
    page?: number;
    limit?: number;
    filters?: FilterState;
    search?: string;
    sportId?: string;
    dataSource?: 'transfer_portal' | 'all_athletes' | 'juco' | 'hs_athletes';
    displayColumns?: string[];
    sportAbbrev?: string; // Add sportAbbrev as an optional parameter
    userPackages?: string[]; // Add userPackages as an optional parameter
    dynamicColumns?: SportStatConfig[]; // Add dynamicColumns for stat filtering
    sortField?: string | null; // Add sortField parameter
    sortOrder?: 'ascend' | 'descend' | null; // Add sortOrder parameter
    userSchoolId?: string; // Add userSchoolId parameter for filtering out user's own school
  }
): Promise<{ data: AthleteData[]; hasMore: boolean; totalCount?: number }> {
  try {
    
    const page = options?.page || 1;
    const limit = options?.limit || 25;
    const offset = (page - 1) * limit;
    const dataSource = options?.dataSource || 'transfer_portal';

    // Get sport abbreviation for the view name - use provided value or fallback to API call
    const sportAbbrev = options?.sportAbbrev;
    
    // Get user packages - either from options or fetch from user details
    let userPackages = options?.userPackages;
    if (!userPackages) {
      const userDetails = await fetchUserDetails();
      userPackages = userDetails?.packages || [];
    }
    
    // Determine package tier and view suffix based on user packages and sport abbreviation
    if (!sportAbbrev) {
      throw new Error('Sport abbreviation is required to determine package tier');
    }
    
    const userPackageNumbers = (userPackages || []).map(pkg => parseInt(pkg, 10));
    const viewSuffix = getViewSuffixForSport(sportAbbrev, userPackageNumbers);
    
    // Verify user has access to this sport
    const bestPackage = getBestPackageForSport(sportAbbrev, userPackageNumbers);
    if (!bestPackage) {
      throw new Error(`No access package found for sport abbreviation: ${sportAbbrev}. Available packages: ${(userPackages || []).join(', ')}`);
    }
    
    // Build view name based on data source and view suffix
    let viewName = '';
    if (dataSource === 'transfer_portal') {
      viewName = `vw_tp_athletes_wide_${sportAbbrev}${viewSuffix}`;
    } else if (dataSource === 'juco') {
      viewName = `vw_juco_athletes_wide_${sportAbbrev}`;
    } else if (dataSource === 'hs_athletes') {
      const hsSuffix = getHsViewSuffixForSport(sportAbbrev, userPackageNumbers);
      viewName = `vw_hs_athletes_wide_${sportAbbrev}_${hsSuffix}`;
    } else {
      viewName = `vw_athletes_wide_${sportAbbrev}`;
    }
    // Debug log removed('viewName', viewName);
    // Determine which columns to select
    const columnsToSelect = getColumnsToSelect(options?.filters, options?.displayColumns, dataSource, options?.dynamicColumns, sportAbbrev);
    const selectString = columnsToSelect.join(', ');
    
    // Build the base query using the new wide view
    let query = supabase
      .from(viewName)
      .select(selectString, { count: 'exact' })
      .limit(limit);
    

    // Apply filters if provided
    if (options?.filters) {
      if (options.filters.years?.length) {
        query = query.in('year', options.filters.years);
      }
      if (options.filters.divisions?.length) {
        query = query.in('division', options.filters.divisions);
      }
      // Handle location filters (states and international) with OR logic
      if (options.filters.states?.length || options.filters.international?.length) {
        const locationConditions = [];
        
        // Add US states condition
        if (options.filters.states?.length) {
          locationConditions.push(`address_state.in.(${options.filters.states.map(state => `"${state}"`).join(',')})`);
        }
        
        // Add international condition
        if (options.filters.international?.length) {
          if (options.filters.international.includes('ALL_INTERNATIONAL')) {
            // Filter out US states - show all international players
            locationConditions.push(`and(address_state.not.in.(${US_STATE_ABBREVIATIONS.map(state => `"${state}"`).join(',')}),address_state.not.is.null,address_state.neq."")`);
          } else {
            // Filter by specific international locations
            locationConditions.push(`address_state.in.(${options.filters.international.map(loc => `"${loc}"`).join(',')})`);
          }
        }
        
        // Combine conditions with OR logic
        if (locationConditions.length > 0) {
          query = query.or(locationConditions.join(','));
        }
      }
      
      // Handle unified location filter
      if (options?.filters?.location?.type) {
        const { type } = options.filters.location;
        // Handle radius filter (doesn't use values array)
        if (type === 'radius') {
          const radiusData = options.filters.location.radius;
          
          if (radiusData?.center && radiusData?.distance) {
            try {
              // Geocode the center location to get coordinates
              const { geocodeLocation, getBoundingBox } = await import('@/utils/geocoding');
              const centerLocation = await geocodeLocation(radiusData.center);
              
              if (centerLocation) {
                // Get bounding box coordinates for the radius
                const boundingBox = getBoundingBox(centerLocation.lat, centerLocation.lng, radiusData.distance);
                
                // Add latitude/longitude range filters to the query
                query = query
                  .gte('address_latitude', boundingBox.minLat)
                  .lte('address_latitude', boundingBox.maxLat)
                  .gte('address_longitude', boundingBox.minLng)
                  .lte('address_longitude', boundingBox.maxLng);
              }
            } catch (error) {
              console.error('Error setting up radius bounding box:', error);
              // If geocoding fails, don't apply any location filters
            }
          }
        }
        // Handle recruiting area filter (doesn't use values array)
        if (type === 'recruiting_area') {
          const recruitingAreaData = options?.filters?.location?.recruitingArea;
          
          if (recruitingAreaData?.coachId) {
            try {
              const recruitingAreas = await fetchRecruitingAreasForCoach(recruitingAreaData.coachId);
              
              const orConditions = [];
              
              // Add state conditions (convert state IDs to abbreviations and search school_state)
              if (recruitingAreas.stateIds.length > 0) {
                const stateAbbrevs = await convertStateIdsToAbbrevs(recruitingAreas.stateIds);
                if (stateAbbrevs.length > 0) {
                  orConditions.push(`school_state.in.(${stateAbbrevs.map(s => `"${s}"`).join(',')})`);
                }
              }
              
              // Add county conditions (convert county IDs to county names)
              if (recruitingAreas.countyIds.length > 0) {
                const countyNames = await convertCountyIdsToNames(recruitingAreas.countyIds);
                if (countyNames.length > 0) {
                  orConditions.push(`hs_county.in.(${countyNames.map(c => `"${c}"`).join(',')})`);
                }
              }
              
              // Add school conditions
              if (recruitingAreas.schoolIds.length > 0) {
                orConditions.push(`school_id.in.(${recruitingAreas.schoolIds.join(',')})`);
              }
              
              // Apply OR conditions if any exist
              if (orConditions.length > 0) {
                query = query.or(orConditions.join(','));
              } 
            } catch (error) {
              console.error('❌ Error applying recruiting area filter:', error);
            }
          }
        }
        // Handle other location types that use values array
        if (options?.filters?.location?.values?.length) {
          const { values } = options.filters.location;
        
        if (type === 'hometown_state') {
          query = query.in('address_state', values);
        } else if (type === 'international') {
          if (values.includes('ALL_INTERNATIONAL')) {
            // Filter out US states - show all international players
            query = query.not('address_state', 'in', `(${US_STATE_ABBREVIATIONS.map(state => `"${state}"`).join(',')})`);
            query = query.not('address_state', 'is', null);
            query = query.not('address_state', 'eq', '');
          } else {
            // Filter by specific international locations
            query = query.in('address_state', values);
          }
        } else if (type === 'school_state') {
          query = query.in('school_state', values);
        } else if (type === 'county') {
          query = query.in('hs_county', values);
        }
        // Note: recruiting_area implementation completed
      }
      }
      if (options.filters.athleticAid?.length) {
        // Athletic aid filtering now uses the processed value from the database
        query = query.in('is_receiving_athletic_aid', options.filters.athleticAid);
      }
      if (options.filters.status?.length) {
        // Separate null and non-null status values
        const hasNullFilter = options.filters.status.includes('null');
        const nonNullStatuses = options.filters.status.filter(s => s !== 'null');
        
        if (hasNullFilter && nonNullStatuses.length > 0) {
          // If both null and other statuses are selected, use OR condition
          // Quote string values for PostgREST syntax
          const quotedStatuses = nonNullStatuses.map(s => `"${s}"`).join(',');
          query = query.or(`m_status.is.null,m_status.in.(${quotedStatuses})`);
        } else if (hasNullFilter) {
          // Only null status selected
          query = query.is('m_status', null);
        } else if (nonNullStatuses.length > 0) {
          // Only non-null statuses selected
          query = query.in('m_status', nonNullStatuses);
        }
      }
      if (options.filters.position?.length) {
        // Get all positions for the sport to expand position filters
        const allPositions = await fetchPositionsBySportId(options.sportId || '');
        
        // Expand position filters based on other_filter and include_filter logic
        const expandedPositions = await expandPositionFilters(options.filters.position, allPositions);
        
        query = query.in('primary_position', expandedPositions);
      }
      if (options.filters.schools?.length) {
        query = query.in('school_id', options.filters.schools);
      }
      
      // Conference filter - sport-dependent column
      if (options.filters.conference?.length && options.sportAbbrev) {
        const sportToConferenceColumn: Record<string, string> = {
          'fb': 'conference',
          'bsb': 'bsb_conference', 
          'sb': 'sb_conference',
          'wbb': 'wbb_conference',
          'mbb': 'mbb_conference',
          'msoc': 'msoc_conference',
          'wsoc': 'wsoc_conference',
          'wvol': 'wvol_conference',
          'mlax': 'mlax_conference',
          'wlax': 'wlax_conference',
          'mten': 'mten_conference',
          'wten': 'wten_conference',
          'mglf': 'mglf_conference',
          'wglf': 'wglf_conference',
          'mtaf': 'mtaf_conference',
          'wtaf': 'wtaf_conference',
          'mswm': 'mswm_conference',
          'wswm': 'wswm_conference',
          'mwre': 'mwre_conference'
        };
        
        const conferenceColumn = sportToConferenceColumn[options.sportAbbrev];
        if (conferenceColumn) {
          try {
            query = query.in(conferenceColumn, options.filters.conference);
          } catch (error) {
            console.warn(`Conference column ${conferenceColumn} may not exist in view for sport ${options.sportAbbrev}:`, error);
            // Continue without conference filter if column doesn't exist
          }
        }
      }

      // JUCO-specific filters
      if (options.filters.athleticAssociation?.length) {
        query = query.in('athletic_association', options.filters.athleticAssociation);
      }
      if (options.filters.jucoRegion?.length) {
        query = query.in('juco_region', options.filters.jucoRegion);
      }
      if (options.filters.jucoDivision?.length) {
        query = query.in('juco_division', options.filters.jucoDivision);
      }
      if (options.filters.schoolState?.length) {
        query = query.in('school_state', options.filters.schoolState);
      }

      if (options.filters.dateRange) {
        const { startDate, endDate } = options.filters.dateRange;
        query = query.gte('initiated_date', startDate).lte('initiated_date', endDate);
      }
      
      // Athletic projection filter for high school athletes
      if (options.filters.athletic_projection?.length) {
        query = query.in('athletic_projection', options.filters.athletic_projection);
      }
      
      // Graduation year filter
      if (options.filters.grad_year) {
        const gradYearFilter = options.filters.grad_year;
        
        if (gradYearFilter.comparison === 'between' && gradYearFilter.minValue !== undefined && gradYearFilter.maxValue !== undefined) {
          query = query.gte('grad_year', gradYearFilter.minValue).lte('grad_year', gradYearFilter.maxValue);
        } else if (gradYearFilter.comparison === 'min' && gradYearFilter.value !== undefined) {
          query = query.gte('grad_year', gradYearFilter.value);
        } else if (gradYearFilter.comparison === 'max' && gradYearFilter.value !== undefined) {
          query = query.lte('grad_year', gradYearFilter.value);
        }
      }
      
      // Weight filter
      if (options.filters.weight) {
        const weightFilter = options.filters.weight;
        
        if (weightFilter.comparison === 'between' && weightFilter.minValue !== undefined && weightFilter.maxValue !== undefined) {
          query = query.gte('weight', weightFilter.minValue).lte('weight', weightFilter.maxValue);
        } else if (weightFilter.comparison === 'min' && weightFilter.value !== undefined) {
          query = query.gte('weight', weightFilter.value);
        } else if (weightFilter.comparison === 'max' && weightFilter.value !== undefined) {
          query = query.lte('weight', weightFilter.value);
        }
      }
      
      // Best Offer filter for high school athletes
      if (options.filters.best_offer?.length) {
        query = query.in('best_offer', options.filters.best_offer);
      }
      
      // Committed filter for high school athletes
      if (options.filters.committed?.length) {
        const committedValues = options.filters.committed;
        if (committedValues.includes('Committed') && committedValues.includes('Uncommitted')) {
          // Both selected, no filter needed
        } else if (committedValues.includes('Committed')) {
          // Only Committed selected - filter for non-null commit_school_name
          query = query.not('commit_school_name', 'is', null);
        } else if (committedValues.includes('Uncommitted')) {
          // Only Uncommitted selected - filter for null commit_school_name
          query = query.is('commit_school_name', null);
        }
      }
      
      // Signed filter for high school athletes
      if (options.filters.signed?.length) {
        const signedValues = options.filters.signed;
        if (signedValues.includes('Signed') && signedValues.includes('Unsigned')) {
          // Both selected, no filter needed
        } else if (signedValues.includes('Signed')) {
          // Only Signed selected - filter for non-null sign_school_name
          query = query.not('sign_school_name', 'is', null);
        } else if (signedValues.includes('Unsigned')) {
          // Only Unsigned selected - filter for null sign_school_name
          query = query.is('sign_school_name', null);
        }
      }
      
      // GPA filter for high school athletes
      if (options.filters.gpa && dataSource === 'hs_athletes') {
        const gpaFilter = options.filters.gpa;
        console.log('GPA Filter Debug:', {
          gpaFilter,
          dataSource,
          hasGpaFilter: !!options.filters.gpa,
          comparison: gpaFilter.comparison,
          value: gpaFilter.value,
          minValue: gpaFilter.minValue,
          maxValue: gpaFilter.maxValue
        });
        
        if (gpaFilter.comparison === 'between' && gpaFilter.minValue !== undefined && gpaFilter.maxValue !== undefined) {
          console.log('Applying GPA between filter:', gpaFilter.minValue, 'to', gpaFilter.maxValue);
          query = query.gte('gpa', gpaFilter.minValue).lte('gpa', gpaFilter.maxValue);
        } else if (gpaFilter.comparison === 'min' && gpaFilter.value !== undefined) {
          console.log('Applying GPA min filter:', gpaFilter.value);
          query = query.gte('gpa', gpaFilter.value);
        } else if (gpaFilter.comparison === 'max' && gpaFilter.value !== undefined) {
          console.log('Applying GPA max filter:', gpaFilter.value);
          query = query.lte('gpa', gpaFilter.value);
        } else {
          console.log('GPA filter not applied - missing required values:', {
            comparison: gpaFilter.comparison,
            value: gpaFilter.value,
            minValue: gpaFilter.minValue,
            maxValue: gpaFilter.maxValue
          });
        }
      }
      
      // GPA Source filter for high school athletes
      if (options.filters.gpa_type?.length) {
        query = query.in('gpa_type', options.filters.gpa_type);
      }
      
      // Major filter for high school athletes (case-insensitive search)
      if (options.filters.major) {
        query = query.ilike('major', `%${options.filters.major}%`);
      }
      
      // SAT filter for high school athletes
      if (options.filters.sat) {
        const satFilter = options.filters.sat;
        if (satFilter.comparison === 'between' && satFilter.minValue !== undefined && satFilter.maxValue !== undefined) {
          query = query.gte('sat', satFilter.minValue).lte('sat', satFilter.maxValue);
        } else if (satFilter.comparison === 'min' && satFilter.value !== undefined) {
          query = query.gte('sat', satFilter.value);
        } else if (satFilter.comparison === 'max' && satFilter.value !== undefined) {
          query = query.lte('sat', satFilter.value);
        }
      }
      
      // ACT filter for high school athletes
      if (options.filters.act) {
        const actFilter = options.filters.act;
        if (actFilter.comparison === 'between' && actFilter.minValue !== undefined && actFilter.maxValue !== undefined) {
          query = query.gte('act', actFilter.minValue).lte('act', actFilter.maxValue);
        } else if (actFilter.comparison === 'min' && actFilter.value !== undefined) {
          query = query.gte('act', actFilter.value);
        } else if (actFilter.comparison === 'max' && actFilter.value !== undefined) {
          query = query.lte('act', actFilter.value);
        }
      }
      
      // Income Category filter for high school athletes
      if (options.filters.income_category?.length) {
        query = query.in('income_category', options.filters.income_category);
      }
      
      // Date Added filter for high school athletes
      if (options.filters.added_date?.startDate || options.filters.added_date?.endDate) {
        if (options.filters.added_date.startDate) {
          query = query.gte('added_date', options.filters.added_date.startDate);
        }
        if (options.filters.added_date.endDate) {
          query = query.lte('added_date', options.filters.added_date.endDate);
        }
      }
      
      // Last Major Change filter for high school athletes
      if (options.filters.last_major_change?.startDate || options.filters.last_major_change?.endDate) {
        if (options.filters.last_major_change.startDate) {
          query = query.gte('last_major_change', options.filters.last_major_change.startDate);
        }
        if (options.filters.last_major_change.endDate) {
          query = query.lte('last_major_change', options.filters.last_major_change.endDate);
        }
      }
      
      // On3 Consensus Stars filter for high school athletes
      if (options.filters.on3_consensus_stars && options.filters.on3_consensus_stars.length > 0) {
        const starValues = options.filters.on3_consensus_stars;
        const hasNone = starValues.includes('None');
        const numericStars = starValues.filter(star => star !== 'None').map(star => parseInt(star));
        
        if (hasNone && numericStars.length > 0) {
          // If both None and numeric values are selected, use OR condition
          query = query.or(`on3_consensus_stars.is.null,on3_consensus_stars.in.(${numericStars.join(',')})`);
        } else if (hasNone) {
          // Only None selected
          query = query.is('on3_consensus_stars', null);
        } else {
          // Only numeric values selected
          query = query.in('on3_consensus_stars', numericStars);
        }
      }
      
      // Rivals Rating filter for high school athletes
      if (options.filters.rivals_rating) {
        const rivalsFilter = options.filters.rivals_rating;
        if (rivalsFilter.comparison === 'between' && rivalsFilter.minValue !== undefined && rivalsFilter.maxValue !== undefined) {
          query = query.gte('rivals_rating', rivalsFilter.minValue).lte('rivals_rating', rivalsFilter.maxValue);
        } else if (rivalsFilter.comparison === 'min' && rivalsFilter.value !== undefined) {
          query = query.gte('rivals_rating', rivalsFilter.value);
        } else if (rivalsFilter.comparison === 'max' && rivalsFilter.value !== undefined) {
          query = query.lte('rivals_rating', rivalsFilter.value);
        }
      }
      
      // On3 Rating filter for high school athletes
      if (options.filters.on3_rating) {
        const on3RatingFilter = options.filters.on3_rating;
        if (on3RatingFilter.comparison === 'between' && on3RatingFilter.minValue !== undefined && on3RatingFilter.maxValue !== undefined) {
          query = query.gte('on3_rating', on3RatingFilter.minValue).lte('on3_rating', on3RatingFilter.maxValue);
        } else if (on3RatingFilter.comparison === 'min' && on3RatingFilter.value !== undefined) {
          query = query.gte('on3_rating', on3RatingFilter.value);
        } else if (on3RatingFilter.comparison === 'max' && on3RatingFilter.value !== undefined) {
          query = query.lte('on3_rating', on3RatingFilter.value);
        }
      }
      
      // 247 Rating filter for high school athletes
      if (options.filters._247_rating) {
        const _247RatingFilter = options.filters._247_rating;
        if (_247RatingFilter.comparison === 'between' && _247RatingFilter.minValue !== undefined && _247RatingFilter.maxValue !== undefined) {
          query = query.gte('_247_rating', _247RatingFilter.minValue).lte('_247_rating', _247RatingFilter.maxValue);
        } else if (_247RatingFilter.comparison === 'min' && _247RatingFilter.value !== undefined) {
          query = query.gte('_247_rating', _247RatingFilter.value);
        } else if (_247RatingFilter.comparison === 'max' && _247RatingFilter.value !== undefined) {
          query = query.lte('_247_rating', _247RatingFilter.value);
        }
      }
      
      // ESPN Rating filter for high school athletes
      if (options.filters.espn_rating) {
        const espnRatingFilter = options.filters.espn_rating;
        if (espnRatingFilter.comparison === 'between' && espnRatingFilter.minValue !== undefined && espnRatingFilter.maxValue !== undefined) {
          query = query.gte('espn_rating', espnRatingFilter.minValue).lte('espn_rating', espnRatingFilter.maxValue);
        } else if (espnRatingFilter.comparison === 'min' && espnRatingFilter.value !== undefined) {
          query = query.gte('espn_rating', espnRatingFilter.value);
        } else if (espnRatingFilter.comparison === 'max' && espnRatingFilter.value !== undefined) {
          query = query.lte('espn_rating', espnRatingFilter.value);
        }
      }
      
      // On3 Stars filter for high school athletes
      if (options.filters.on3_stars && options.filters.on3_stars.length > 0) {
        const starValues = options.filters.on3_stars;
        const hasNone = starValues.includes('None');
        const numericStars = starValues.filter(star => star !== 'None').map(star => parseInt(star));
        
        if (hasNone && numericStars.length > 0) {
          query = query.or(`on3_stars.is.null,on3_stars.in.(${numericStars.join(',')})`);
        } else if (hasNone) {
          query = query.is('on3_stars', null);
        } else {
          query = query.in('on3_stars', numericStars);
        }
      }
      
      // 247 Stars filter for high school athletes
      if (options.filters._247_stars && options.filters._247_stars.length > 0) {
        const starValues = options.filters._247_stars;
        const hasNone = starValues.includes('None');
        const numericStars = starValues.filter(star => star !== 'None').map(star => parseInt(star));
        
        if (hasNone && numericStars.length > 0) {
          query = query.or(`_247_stars.is.null,_247_stars.in.(${numericStars.join(',')})`);
        } else if (hasNone) {
          query = query.is('_247_stars', null);
        } else {
          query = query.in('_247_stars', numericStars);
        }
      }
      
      // ESPN Stars filter for high school athletes
      if (options.filters.espn_stars && options.filters.espn_stars.length > 0) {
        const starValues = options.filters.espn_stars;
        const hasNone = starValues.includes('None');
        const numericStars = starValues.filter(star => star !== 'None').map(star => parseInt(star));
        
        if (hasNone && numericStars.length > 0) {
          query = query.or(`espn_stars.is.null,espn_stars.in.(${numericStars.join(',')})`);
        } else if (hasNone) {
          query = query.is('espn_stars', null);
        } else {
          query = query.in('espn_stars', numericStars);
        }
      }
      
      // Show Archived filter for high school athletes (currently disabled - coming soon)
      // Note: This filter is disabled in the UI but the logic is prepared for future implementation
      if (options.filters.show_archived !== undefined) {
        // Future implementation: query = query.eq('is_archived', options.filters.show_archived);
        // For now, this filter is disabled and doesn't affect the query
      }
      
    // Handle dynamic stat filters - optimized version with column caching
    const statFilters = Object.keys(options.filters || {}).filter(key => key.startsWith('stat_'));
    if (statFilters.length > 0) {
      // Cache column lookups to avoid repeated array searches
      const columnCache = new Map<string, SportStatConfig>();
      options.dynamicColumns?.forEach(col => {
        columnCache.set(col.data_type_id.toString(), col);
      });
      
      statFilters.forEach(filterKey => {
        const dataTypeId = filterKey.replace('stat_', '');
        const filterValue = options.filters![filterKey];
        
        if (filterValue && typeof filterValue === 'object' && 'comparison' in filterValue) {
          // Use cached column lookup
          const column = columnCache.get(dataTypeId);
          
          if (column?.sanitized_column_name) {
            const { comparison } = filterValue;
            const columnName = column.sanitized_column_name;

            // Detect GP/GS by heading or known ids to optionally treat null as 0
            const nameLower = (column.data_type_name || column.display_name || columnName || '').toLowerCase();
            const isGpGsByHeading = ['gp','gs','games played','games started','games_played','games_started'].includes(nameLower);
            const isGpGsColumn = isGpGsByHeading || [98, 83].includes(column.data_type_id);
            
            if (comparison === 'between' && 'minValue' in filterValue && 'maxValue' in filterValue) {
              // Handle between comparison with min and max values
              query = query.gte(columnName, filterValue.minValue)
                        .lte(columnName, filterValue.maxValue);
            } else if ('value' in filterValue) {
              // Handle other comparisons (greater, less, equal, min, max)
              const { value } = filterValue;
              if (comparison === 'greater' || comparison === 'min') {
                query = query.gte(columnName, value);
              } else if (comparison === 'less' || comparison === 'max') {
                // For GP/GS Max filter, include nulls (treat null as 0)
                if (isGpGsColumn) {
                  query = query.or(`${columnName}.lte.${value},${columnName}.is.null`);
                } else {
                  query = query.lte(columnName, value);
                }
              } else if (comparison === 'equal') {
                // Special-case: For GP/GS filters where value is 0, treat null as 0
                if (isGpGsColumn && (value === 0 || value === '0')) {
                  query = query.or(`${columnName}.eq.0,${columnName}.is.null`);
                } else {
                  query = query.eq(columnName, value);
                }
              }
            }
          }
        }
      });
    }
    

      if (Array.isArray(options.filters.survey_completed)) {
        const values = options.filters.survey_completed;
        if (values.length === 1) {
          if (values[0] === true) {
            query = query.eq('survey_completed', 'true');
          } else if (values[0] === false) {
            query = query.or("survey_completed.is.null,survey_completed.eq.'',survey_completed.eq.'false'");
          }
        }
        // If both Yes and No are selected, do not filter
      } else if (typeof options.filters.survey_completed === 'boolean') {
        if (options.filters.survey_completed === true) {
          query = query.eq('survey_completed', 'true');
        } else {
          query = query.or("survey_completed.is.null,survey_completed.eq.'',survey_completed.eq.'false'");
        }
      }
    }
    // Apply grad student filter if provided
    if (options.filters?.gradStudent !== undefined) {
      if (Array.isArray(options.filters.gradStudent)) {
        const values = options.filters.gradStudent;
        if (values.length === 1) {
          if (values[0] === true) {
            query = query.eq('is_transfer_graduate_student', true);
          } else if (values[0] === false) {
            query = query.or("is_transfer_graduate_student.is.null,is_transfer_graduate_student.eq.false");
          }
        }
        // If both Yes and No are selected, do not filter
      }
    }

    // Apply honors filter if provided - use best_honor column
    if (options.filters?.honors?.length) {
      const selectedHonors = options.filters.honors;
      const honorValues: string[] = [];
      
      for (const honor of selectedHonors) {
        if (honor === 'All Conference') {
          // Include All Conference, All Region, and All American
          honorValues.push('All Conference', 'All Region', 'All American');
        } else if (honor === 'All Region') {
          // Include All Region and All American only
          honorValues.push('All Region', 'All American');
        } else if (honor === 'All American') {
          // Include All American only
          honorValues.push('All American');
        }
      }
      
      if (honorValues.length > 0) {
        // Remove duplicates and filter using exact matches
        const uniqueValues = [...new Set(honorValues)];
        query = query.in('best_honor', uniqueValues);
      }
    }

    // Apply designated student athlete filter if provided
    if (options.filters?.designatedStudentAthlete !== undefined) {
      if (Array.isArray(options.filters.designatedStudentAthlete)) {
        const values = options.filters.designatedStudentAthlete;
        if (values.length === 1 && values[0] === true) {
          // Create sport abbreviation to designated student athlete phrase mapping
          const sportToDesignatedPhrase: Record<string, string> = {
            'bsb': 'Yes - Baseball',
            'fb': 'Yes - Football',
            'mbb': 'Yes - Men\'s Basketball',
            'mcc': 'Yes - Men\'s Cross Country',
            'mglf': 'Yes - Men\'s Golf',
            'mlax': 'Yes - Men\'s Lacrosse',
            'msoc': 'Yes - Men\'s Soccer',
            'mswm': 'Yes - Men\'s Swimming and Diving',
            'mten': 'Yes - Men\'s Tennis',
            'mtaf': 'Yes - Men\'s Track',
            'mwre': 'Yes - Men\'s Wrestling',
            'sb': 'Yes - Softball',
            'wbb': 'Yes - Women\'s Basketball',
            'wvol': 'Yes - Women\'s Volleyball', // Note: Covers both Volleyball and Beach Volleyball
            'wcc': 'Yes - Women\'s Cross Country',
            'wglf': 'Yes - Women\'s Golf',
            'wlax': 'Yes - Women\'s Lacrosse',
            'wsoc': 'Yes - Women\'s Soccer',
            'wswm': 'Yes - Women\'s Swimming and Diving',
            'wten': 'Yes - Women\'s Tennis',
            'wtaf': 'Yes - Women\'s Track'
          };
          
          // Get the sport-specific phrase based on the current sport
          const currentSportPhrase = options?.sportAbbrev ? sportToDesignatedPhrase[options.sportAbbrev] : null;
          
          if (currentSportPhrase) {
            // Special case for women's volleyball - check for both "Yes - Women's Volleyball" and "Yes - Women's Beach Volleyball"
            if (options.sportAbbrev === 'wvol') {
              query = query.or('m_designated_student_athlete.ilike.%Yes - Women\'s Volleyball%,m_designated_student_athlete.ilike.%Yes - Women\'s Beach Volleyball%');
            } else {
              // Only search for the specific sport phrase
              query = query.ilike('m_designated_student_athlete', `%${currentSportPhrase}%`);
            }
          }
          // If no matching sport phrase is found, don't apply any filter (no results will be hidden)
        }
        // If both Yes and No are selected or empty array, do not filter
      }
    }

    // Apply height filter if provided
    if (options?.filters?.height) {
      const heightFilter = options.filters.height;
      
      if (heightFilter.comparison === 'min') {
        query = query.or(
          `height_feet.gt.${heightFilter.feet},and(height_feet.eq.${heightFilter.feet},height_inch.gte.${heightFilter.inches})`
        );
      } else if (heightFilter.comparison === 'max') {
        query = query.or(
          `height_feet.lt.${heightFilter.feet},and(height_feet.eq.${heightFilter.feet},height_inch.lte.${heightFilter.inches})`
        );
      } else if (heightFilter.comparison === 'between') {
        // For the minimum height
        const minCondition = `(height_feet.gt.${heightFilter.minFeet},and(height_feet.eq.${heightFilter.minFeet},height_inch.gte.${heightFilter.minInches}))`;
        // For the maximum height
        const maxCondition = `(height_feet.lt.${heightFilter.maxFeet},and(height_feet.eq.${heightFilter.maxFeet},height_inch.lte.${heightFilter.maxInches}))`;
        query = query.and(`or(${minCondition}),or(${maxCondition})`);
      }
    }

    // Apply transfer odds filter if provided
    if (options?.filters?.transfer_odds) {
      const transferOddsFilter = options.filters.transfer_odds;
      
      if (transferOddsFilter.comparison === 'min') {
        // Min filter - show athletes with transfer_odds >= value
        query = query.gte('transfer_odds', transferOddsFilter.value);
      } else if (transferOddsFilter.comparison === 'max') {
        // Max filter - show athletes with transfer_odds <= value
        query = query.lte('transfer_odds', transferOddsFilter.value);
      }
    }

    // Apply search if provided
    if (options?.search) {
      const searchTerms = options.search.toLowerCase().trim().split(/\s+/).filter(term => term.length > 0);
      
      if (searchTerms.length > 0) {
        if (dataSource === 'transfer_portal') {
          if (searchTerms.length === 1) {
            // Single word: search in first name, last name, and college names (excluding high school)
            const term = searchTerms[0];
            query = query.or(`m_first_name.ilike.%${term}%,m_last_name.ilike.%${term}%,school_name.ilike.%${term}%,commit_school_name.ilike.%${term}%`);
          } else if (searchTerms.length === 2) {
            // Two words: most likely first name and last name
            const [firstTerm, secondTerm] = searchTerms;
            
            // Create a complex OR condition that includes multiple AND scenarios
            // This builds: (first_name LIKE 'john%' AND last_name LIKE 'smith%') OR (first_name LIKE 'smith%' AND last_name LIKE 'john%') OR (first_name LIKE 'john smith%') OR (last_name LIKE 'john smith%')
            const conditions = [
              // Exact order: first term in first name AND second term in last name
              `and(m_first_name.ilike.%${firstTerm}%,m_last_name.ilike.%${secondTerm}%)`,
              // Reverse order: second term in first name AND first term in last name  
              `and(m_first_name.ilike.%${secondTerm}%,m_last_name.ilike.%${firstTerm}%)`,
              // Full search term in first name only
              `m_first_name.ilike.%${firstTerm} ${secondTerm}%`,
              // Full search term in last name only
              `m_last_name.ilike.%${firstTerm} ${secondTerm}%`,
              // Full search term in reverse order in first name
              `m_first_name.ilike.%${secondTerm} ${firstTerm}%`,
              // Full search term in reverse order in last name  
              `m_last_name.ilike.%${secondTerm} ${firstTerm}%`,
              // College name searches (excluding high school)
              `school_name.ilike.%${firstTerm} ${secondTerm}%`,
              `school_name.ilike.%${secondTerm} ${firstTerm}%`,
              `commit_school_name.ilike.%${firstTerm} ${secondTerm}%`,
              `commit_school_name.ilike.%${secondTerm} ${firstTerm}%`
            ];
            
            query = query.or(conditions.join(','));
          } else {
            // More than 2 words: try different combinations
            const fullSearchTerm = searchTerms.join(' ');
            const firstTerm = searchTerms[0];
            const lastTerm = searchTerms[searchTerms.length - 1];
            const middleTerms = searchTerms.slice(1, -1).join(' ');
            
            const conditions = [
              // First word in first name, rest in last name
              `and(m_first_name.ilike.%${firstTerm}%,m_last_name.ilike.%${searchTerms.slice(1).join(' ')}%)`,
              // All but last word in first name, last word in last name
              `and(m_first_name.ilike.%${searchTerms.slice(0, -1).join(' ')}%,m_last_name.ilike.%${lastTerm}%)`,
              // Full term in first name
              `m_first_name.ilike.%${fullSearchTerm}%`,
              // Full term in last name
              `m_last_name.ilike.%${fullSearchTerm}%`,
              // Full term in college names (excluding high school)
              `school_name.ilike.%${fullSearchTerm}%`,
              `commit_school_name.ilike.%${fullSearchTerm}%`
            ];
            
            query = query.or(conditions.join(','));
          }
        } else {
          if (searchTerms.length === 1) {
            // Single word: search in first name, last name, and college names (excluding high school)
            const term = searchTerms[0];
            query = query.or(`athlete_first_name.ilike.%${term}%,athlete_last_name.ilike.%${term}%,school_name.ilike.%${term}%,commit_school_name.ilike.%${term}%`);
          } else if (searchTerms.length === 2) {
            // Two words: most likely first name and last name
            const [firstTerm, secondTerm] = searchTerms;
            
            const conditions = [
              // Exact order: first term in first name AND second term in last name
              `and(athlete_first_name.ilike.%${firstTerm}%,athlete_last_name.ilike.%${secondTerm}%)`,
              // Reverse order: second term in first name AND first term in last name  
              `and(athlete_first_name.ilike.%${secondTerm}%,athlete_last_name.ilike.%${firstTerm}%)`,
              // Full search term in first name only
              `athlete_first_name.ilike.%${firstTerm} ${secondTerm}%`,
              // Full search term in last name only
              `athlete_last_name.ilike.%${firstTerm} ${secondTerm}%`,
              // Full search term in reverse order in first name
              `athlete_first_name.ilike.%${secondTerm} ${firstTerm}%`,
              // Full search term in reverse order in last name  
              `athlete_last_name.ilike.%${secondTerm} ${firstTerm}%`,
              // College name searches (excluding high school)
              `school_name.ilike.%${firstTerm} ${secondTerm}%`,
              `school_name.ilike.%${secondTerm} ${firstTerm}%`,
              `commit_school_name.ilike.%${firstTerm} ${secondTerm}%`,
              `commit_school_name.ilike.%${secondTerm} ${firstTerm}%`
            ];
            
            query = query.or(conditions.join(','));
          } else {
            // More than 2 words: try different combinations
            const fullSearchTerm = searchTerms.join(' ');
            const firstTerm = searchTerms[0];
            const lastTerm = searchTerms[searchTerms.length - 1];
            
            const conditions = [
              // First word in first name, rest in last name
              `and(athlete_first_name.ilike.%${firstTerm}%,athlete_last_name.ilike.%${searchTerms.slice(1).join(' ')}%)`,
              // All but last word in first name, last word in last name
              `and(athlete_first_name.ilike.%${searchTerms.slice(0, -1).join(' ')}%,athlete_last_name.ilike.%${lastTerm}%)`,
              // Full term in first name
              `athlete_first_name.ilike.%${fullSearchTerm}%`,
              // Full term in last name
              `athlete_last_name.ilike.%${fullSearchTerm}%`,
              // Full term in college names (excluding high school)
              `school_name.ilike.%${fullSearchTerm}%`,
              `commit_school_name.ilike.%${fullSearchTerm}%`
            ];
            
            query = query.or(conditions.join(','));
          }
        }
      }
    }

    // Filter out user's own school for transfer portal data source
    if (dataSource === 'transfer_portal' && options?.userSchoolId) {
      query = query.neq('school_id', options.userSchoolId);
    }

    // For JUCO data source, filter out records where gp (games played) is null
    if (dataSource === 'juco') {
      query = query.not('gp', 'is', null);
    }

    // Apply sorting if provided, otherwise use default ordering
    if (options?.sortField && options?.sortOrder) {
      // Map frontend column names to database column names
      let dbColumnName = options.sortField;
      
      // Handle column name mapping
      
      if (options.sortField === 'date') {
        dbColumnName = 'initiated_date';
      } else if (options.sortField === 'athletic_aid') {
        dbColumnName = 'is_receiving_athletic_aid';
      } else if (options.sortField === 'position') {
        dbColumnName = 'primary_position';
      } else if (options.sortField === 'high_name') {
        dbColumnName = 'high_school';
      } else if (options.sortField === 'state') {
        dbColumnName = 'address_state';
      } else if (options.sortField === 'true_score') {
        // For true_score, we'll sort by woba_score as a proxy since it's calculated
        dbColumnName = 'woba_score';
      } else if (options.sortField === 'last_name') {
        // Map last_name to athlete_last_name for database query
        // Also include first_name as secondary sort for proper name ordering
        dbColumnName = 'athlete_last_name';
      }
      
      // Check if the column exists in the selected columns
      if (columnsToSelect.includes(dbColumnName)) {
        // For base (non-dynamic) columns, detect GP/GS by heading/name as well
        const dynamicSortColumn = options.dynamicColumns?.find(col => 
          col.sanitized_column_name === options.sortField ||
          col.data_type_name?.toLowerCase().replace(/\s+/g, '_') === options.sortField ||
          col.display_name?.toLowerCase().replace(/\s+/g, '_') === options.sortField
        );
        const sortFieldLower = (options.sortField || '').toLowerCase();
        const headingLower = (dynamicSortColumn?.data_type_name || dynamicSortColumn?.display_name || sortFieldLower).toLowerCase();
        const isGpGsByHeading = ['gp','gs','games played','games started','games_played','games_started'].includes(headingLower);

        // Special handling for height column (data_type_id 304)
        if (dynamicSortColumn?.data_type_id === 304) {
          // Filter out null height values when sorting by height
          query = query.not('height_feet', 'is', null);
          
          // For height, we'll sort by height_feet first, then height_inch (treating null inches as 0)
          if (options.sortOrder === 'ascend') {
            query = query.order('height_feet', { ascending: true, nullsFirst: true })
                        .order('height_inch', { ascending: true, nullsFirst: true }); // nullsFirst treats null as 0 for inches
          } else {
            query = query.order('height_feet', { ascending: false, nullsFirst: true })
                        .order('height_inch', { ascending: false, nullsFirst: true }); // nullsFirst treats null as 0 for inches
          }
        } else if (options.sortField === 'athletic_projection') {
          // Special handling for athletic projection with custom sort order
          // Use the computed athletic_projection_number column for proper sorting
          query = query.order('athletic_projection_number', { ascending: options.sortOrder === 'ascend' });
        } else if (options.sortField === 'last_name') {
          // Special handling for last_name to include first_name as secondary sort
          if (options.sortOrder === 'ascend') {
            query = query.order('athlete_last_name', { ascending: true, nullsLast: true })
                        .order('athlete_first_name', { ascending: true, nullsLast: true });
          } else {
            query = query.order('athlete_last_name', { ascending: false, nullsLast: true })
                        .order('athlete_first_name', { ascending: false, nullsLast: true });
          }
        } else if (options.sortOrder === 'ascend') {
          // Ascending: GP/GS -> nulls on top; others -> nulls on bottom
          if (isGpGsByHeading) {
            query = query.order(dbColumnName, { ascending: true, nullsFirst: true });
          } else {
            query = query.order(dbColumnName, { ascending: true, nullsLast: true });
          }
        } else {
          // Descending: nulls at bottom for all, including GP/GS
          if (isGpGsByHeading) {
            query = query.order(dbColumnName, { ascending: false, nullsFirst: false });
          } else {
            query = query.order(dbColumnName, { ascending: false, nullsFirst: false });
          }
        }
      } else {
        // For dynamic columns, check if it's a stat column
        const dynamicColumn = options.dynamicColumns?.find(col => 
          col.sanitized_column_name === options.sortField || 
          col.data_type_name?.toLowerCase().replace(/\s+/g, '_') === options.sortField ||
          col.display_name.toLowerCase().replace(/\s+/g, '_') === options.sortField
        );
        
        
        
        if (dynamicColumn?.sanitized_column_name && columnsToSelect.includes(dynamicColumn.sanitized_column_name)) {
          // Check if this is a GP/GS column by id or heading
          const nameLower = (dynamicColumn.data_type_name || dynamicColumn.display_name || dynamicColumn.sanitized_column_name || '').toLowerCase();
          const isGpGsByHeading = ['gp','gs','games played','games started','games_played','games_started'].includes(nameLower);
          const isGpGsColumn = isGpGsByHeading || [98, 83].includes(dynamicColumn.data_type_id);
          
          // Special handling for height column (data_type_id 304)
          if (dynamicColumn.data_type_id === 304) {
            // For height, we'll sort by height_feet first, then height_inch
            if (options.sortOrder === 'ascend') {
              query = query.order('height_feet', { ascending: true, nullsLast: true })
                          .order('height_inch', { ascending: true, nullsLast: true });
            } else {
              query = query.order('height_feet', { ascending: false, nullsLast: true })
                          .order('height_inch', { ascending: false, nullsLast: true });
            }
          } else if (dynamicColumn.sanitized_column_name === 'athletic_projection' || 
                     dynamicColumn.display_name?.toLowerCase() === 'athletic projection') {
            // Special handling for athletic projection with custom sort order
            // Use the computed athletic_projection_number column for proper sorting
            query = query.order('athletic_projection_number', { ascending: options.sortOrder === 'ascend' });
          } else if (options.sortOrder === 'ascend') {
            // Ascending: GP/GS -> nulls on top (treated as 0); others -> nulls on bottom
            if (isGpGsColumn) {
              query = query.order(dynamicColumn.sanitized_column_name, { ascending: true, nullsFirst: true });
            } else {
              query = query.order(dynamicColumn.sanitized_column_name, { ascending: true, nullsLast: true });
            }
        } else {
            // Descending: nulls at bottom for all, including GP/GS
            if (isGpGsColumn) {
              query = query.order(dynamicColumn.sanitized_column_name, { ascending: false, nullsFirst: false });
            } else {
              query = query.order(dynamicColumn.sanitized_column_name, { ascending: false, nullsFirst: false });
            }
          }
        } else {
          // Fallback to default ordering if column not found
          query = query.order('initiated_date', { ascending: false });
        }
      }
    } else {
      // Default ordering - check for pre_portal_default_sort for all_athletes and juco
      if ((dataSource === 'all_athletes' || dataSource === 'juco') && options?.dynamicColumns) {
        // Find column with pre_portal_default_sort set
        const defaultSortColumn = options.dynamicColumns.find(col => col.pre_portal_default_sort);
        
        if (defaultSortColumn?.sanitized_column_name && columnsToSelect.includes(defaultSortColumn.sanitized_column_name)) {
          // Use the pre_portal_default_sort setting
          const isAscending = defaultSortColumn.pre_portal_default_sort === 'ascending';
          
          // Check if this is a GP/GS column
          const nameLower = (defaultSortColumn.data_type_name || defaultSortColumn.display_name || '').toLowerCase();
          const isGpGsColumn = ['gp','gs','games played','games started'].includes(nameLower) || [98, 83].includes(defaultSortColumn.data_type_id);
          
          // Apply appropriate null handling based on column type
          if (isAscending) {
            if (isGpGsColumn) {
              query = query.order(defaultSortColumn.sanitized_column_name, { ascending: true, nullsFirst: true });
            } else {
              query = query.order(defaultSortColumn.sanitized_column_name, { ascending: true, nullsLast: true });
            }
          } else {
            // Descending
            if (isGpGsColumn) {
              query = query.order(defaultSortColumn.sanitized_column_name, { ascending: false, nullsFirst: false });
            } else {
              query = query.order(defaultSortColumn.sanitized_column_name, { ascending: false, nullsFirst: false });
            }
          }
        } else {
          // No pre_portal_default_sort found or column not in select, use initiated_date
          query = query.order('initiated_date', { ascending: false });
        }
      } else if (dataSource === 'hs_athletes') {
        // For hs_athletes, default to sorting by last_name then first_name alphabetically
        query = query.order('athlete_last_name', { ascending: true, nullsLast: true })
                   .order('athlete_first_name', { ascending: true, nullsLast: true });
      } else {
        // Transfer portal or no dynamic columns - use default initiated_date
        query = query.order('initiated_date', { ascending: false });
      }
    }
    
    
    // Add final sort by created_at with most recent first
    query = query.order('m_created_at', { ascending: false });
    
    // Add final sort by created_at with most recent first
    query = query.order('m_created_at', { ascending: false });
    
    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Add retry logic with exponential backoff and reduced timeout
    let retryCount = 0;
    const maxRetries = 3;
    let athleteData, athleteError, count;
    
    while (retryCount < maxRetries) {
      try {
        // Reduce timeout to 15 seconds to fail faster
        const queryPromise = query;
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Query timeout after 15 seconds')), 15000);
        });
        
        const result = await Promise.race([queryPromise, timeoutPromise]) as any;
        
        athleteData = result.data;
        athleteError = result.error;
        count = result.count;
        break; // Success, exit retry loop
      } catch (error: any) {
        retryCount++;
        console.warn(`Query attempt ${retryCount} failed:`, error.message);
        
        if (retryCount >= maxRetries) {
          // If all retries fail, try a fallback approach with reduced data
          console.warn('All retry attempts failed, trying fallback query...');
          try {
            const fallbackResult = await fetchAthleteDataFallback(sport, options);
            return fallbackResult;
          } catch (fallbackError) {
            throw new Error(`Query failed after ${maxRetries} attempts and fallback: ${error.message}`);
          }
        }
        
        // Wait before retrying (exponential backoff)
        const waitTime = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    if (athleteError) {
      throw new Error(`Failed to fetch athlete data: ${athleteError.message}`);
    }

    // If no data returned, return empty result early
    if (!athleteData || athleteData.length === 0) {
      return {
        data: [],
        hasMore: false
      };
    }

    // No post-processing for radius filter - rely on bounding box from database query
    const filteredAthleteData = athleteData;


    // Collect school IDs for logo fetching (both current and commit schools)
    const schoolIds = filteredAthleteData
      .flatMap((row: any) => [row.school_id, row.commit_school_id])
      .filter((id: string) => id && id.trim() !== '');

    // Fetch school logos
    let schoolLogos: Record<string, string> = {};
    if (schoolIds.length > 0) {
      try {
        schoolLogos = await fetchSchoolLogos(schoolIds);
      } catch (error) {
        console.error('Error fetching school logos:', error);
      }
    }

    // Fetch height data from athlete_fact table if data_type_id 304 is in dynamic columns
    const heightData: Record<string, { height_feet: number | null; height_inch: number | null }> = {};
    if (options?.dynamicColumns?.some(col => col.data_type_id === 304)) {
      const athleteIds = filteredAthleteData.map((row: any) => row.athlete_id);
      if (athleteIds.length > 0) {
        try {
          const { data: factData, error: factError } = await supabase
            .from('athlete_fact')
            .select('athlete_id, data_type_id, value')
            .in('athlete_id', athleteIds)
            .in('data_type_id', [4, 5]) // height_feet and height_inch
            .or('inactive.is.null,inactive.eq.false');

          if (factError) {
            console.error('Error fetching height data:', factError);
          } else if (factData) {
            // Group by athlete_id and extract height data
            factData.forEach((fact: any) => {
              if (!heightData[fact.athlete_id]) {
                heightData[fact.athlete_id] = { height_feet: null, height_inch: null };
              }
              if (fact.data_type_id === 4) {
                heightData[fact.athlete_id].height_feet = parseInt(fact.value);
              } else if (fact.data_type_id === 5) {
                heightData[fact.athlete_id].height_inch = parseInt(fact.value);
              }
            });
          }
        } catch (error) {
          console.error('Error fetching height data:', error);
        }
      }
      
    }

    // Transform the data directly from the view (both data sources use the same logic)
    const transformedData = filteredAthleteData.map((row: any) => {
      // Calculate true score from the stat columns - take highest from woba and fip
      const wobaScore = row.woba_score ? parseFloat(row.woba_score) : 0;
      const fipScore = row.fip_score ? parseFloat(row.fip_score) : 0;
      const trueScore = Math.max(wobaScore, fipScore);

      // Athletic aid is now processed upstream in the database
      const athleticAidValue = row.is_receiving_athletic_aid;

      // Get the correct name columns based on data source
      const firstName = dataSource === 'transfer_portal' ? row.m_first_name : row.athlete_first_name;
      const lastName = dataSource === 'transfer_portal' ? row.m_last_name : row.athlete_last_name;

      // Get the columns to exclude from dynamic stats based on data source
      const excludedColumns = dataSource === 'transfer_portal' 
        ? ['gp', 'athlete_id', 'm_first_name', 'm_last_name', 'initiated_date', 'school_name', 'school_id', 'commit_school_id', 'is_receiving_athletic_aid', 'year', 'division', 'address_state', 'high_school', 'primary_position', 'commit_school_name', 'image_url', 'm_status', 'height_feet', 'height_inch', 'highlight']
        : ['gp', 'athlete_id', 'athlete_first_name', 'athlete_last_name', 'initiated_date', 'school_name', 'school_id', 'commit_school_id', 'is_receiving_athletic_aid', 'year', 'division', 'address_state', 'high_school', 'primary_position', 'commit_school_name', 'image_url', 'height_feet', 'height_inch', 'highlight'];

      return {
        id: row.athlete_id,
        athlete_name: `${firstName} ${lastName}`,
        name_name: row.school_name || '',
        school_id: row.school_id || '',
        school_logo_url: schoolLogos[row.school_id],
        commit_school_id: row.commit_school_id || '',
        commit_school_logo_url: schoolLogos[row.commit_school_id] || '',
        date: row.initiated_date || '',
        division: row.division || '',
        year: row.year || '',
        athletic_aid: athleticAidValue,
        high_name: row.high_school || '',
        state: row.address_state || '',
        position: row.primary_position || '',
        commit_school_name: row.commit_school_name || '',
        status: row.m_status || '',
        image_url: row.image_url || "/blank-user.svg",
        gp: (() => {
          const gpValue = row.gp ? parseInt(row.gp) : null;
          return gpValue;
        })(),
        gs: parseInt(row.gs || '0'),
        goals: parseInt(row.goals || '0'),
        ast: parseInt(row.assists || '0'),
        gk_min: parseInt(row.gk_min || '0'),
        true_score: trueScore,
        // Add height data if available
        height_feet: heightData[row.athlete_id]?.height_feet || (row.height_feet ? parseInt(row.height_feet) : null),
        height_inch: heightData[row.athlete_id]?.height_inch || (row.height_inch ? parseInt(row.height_inch) : null),
        // Add highlight field if available
        highlight: row.highlight || null,
        // Add any additional dynamic stats that were selected
        ...Object.keys(row).reduce((acc: any, key: string) => {
          if (!excludedColumns.includes(key)) {
            // Keep the original value type - preserve null values
            acc[key] = row[key];
          }
          return acc;
        }, {})
      };
    });

    // Calculate hasMore based on database count
    let hasMore = false;
    const totalCount = count || 0;
    
    hasMore = count ? offset + limit < count : false;


    return {
      data: transformedData,
      hasMore,
      totalCount
    };
  } catch (error) {
    console.error('Error in fetchAthleteData:', error);
    
    // Check if this is a "relation does not exist" error
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.toLowerCase().includes('relation') && errorMessage.toLowerCase().includes('does not exist')) {
      // Throw a specific error type that the UI can handle
      throw new Error('MAINTENANCE_MODE: Data views are being updated. Please try again in 2 minutes.');
    }
    
    throw error;
  }
}
// Fallback function for when the main query fails
async function fetchAthleteDataFallback(
  sport: string,
  options?: {
    page?: number;
    limit?: number;
    filters?: FilterState;
    search?: string;
    sportId?: string;
    dataSource?: 'transfer_portal' | 'all_athletes' | 'juco' | 'hs_athletes';
    displayColumns?: string[];
    sportAbbrev?: string; // Add sportAbbrev as an optional parameter
    userPackages?: string[]; // Add userPackages as an optional parameter
    dynamicColumns?: SportStatConfig[]; // Add dynamicColumns for stat filtering
    sortField?: string | null; // Add sortField parameter
    sortOrder?: 'ascend' | 'descend' | null; // Add sortOrder parameter
    userSchoolId?: string; // Add userSchoolId parameter for filtering out user's own school
  }
): Promise<{ data: AthleteData[]; hasMore: boolean; totalCount?: number }> {
  console.warn('Using fallback query approach...');
  
  try {
    const page = options?.page || 1;
    const limit = options?.limit || 25;
    const offset = (page - 1) * limit;

    // Use a simpler query approach - query the base athlete table directly
    let query = supabase
      .from('athlete')
      .select(`
        id,
        first_name,
        last_name,
        sport_id
      `, { count: 'exact' })
      .limit(limit);

    // Apply sport_id filter if provided
    if (options?.sportId) {
      query = query.eq('sport_id', options.sportId);
    }

    // Apply search if provided
    if (options?.search) {
      const searchTerms = options.search.toLowerCase().trim().split(/\s+/).filter(term => term.length > 0);
      
      if (searchTerms.length > 0) {
        if (searchTerms.length === 1) {
          // Single word: search in first name, last name (fallback doesn't have school access)
          const term = searchTerms[0];
          query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%`);
        } else if (searchTerms.length === 2) {
          // Two words: most likely first name and last name
          const [firstTerm, secondTerm] = searchTerms;
          
          const conditions = [
            // Exact order: first term in first name AND second term in last name
            `and(first_name.ilike.%${firstTerm}%,last_name.ilike.%${secondTerm}%)`,
            // Reverse order: second term in first name AND first term in last name  
            `and(first_name.ilike.%${secondTerm}%,last_name.ilike.%${firstTerm}%)`,
            // Full search term in first name only
            `first_name.ilike.%${firstTerm} ${secondTerm}%`,
            // Full search term in last name only
            `last_name.ilike.%${firstTerm} ${secondTerm}%`,
            // Full search term in reverse order in first name
            `first_name.ilike.%${secondTerm} ${firstTerm}%`,
            // Full search term in reverse order in last name  
            `last_name.ilike.%${secondTerm} ${firstTerm}%`
          ];
          
          query = query.or(conditions.join(','));
        } else {
          // More than 2 words: try different combinations
          const fullSearchTerm = searchTerms.join(' ');
          const firstTerm = searchTerms[0];
          const lastTerm = searchTerms[searchTerms.length - 1];
          
          const conditions = [
            // First word in first name, rest in last name
            `and(first_name.ilike.%${firstTerm}%,last_name.ilike.%${searchTerms.slice(1).join(' ')}%)`,
            // All but last word in first name, last word in last name
            `and(first_name.ilike.%${searchTerms.slice(0, -1).join(' ')}%,last_name.ilike.%${lastTerm}%)`,
            // Full term in first name
            `first_name.ilike.%${fullSearchTerm}%`,
            // Full term in last name
            `last_name.ilike.%${fullSearchTerm}%`
          ];
          
          query = query.or(conditions.join(','));
        }
      }
    }

    // Note: Fallback function doesn't have school_id filtering capability
    // as it queries the base athlete table which doesn't have school_id
    // The school filtering will only work with the main query using the wide views

    // Apply sorting if provided, otherwise use default ordering
    if (options?.sortField && options?.sortOrder) {
      // Map frontend column names to database column names for fallback
      let dbColumnName = options.sortField;
      
      // Handle column name mapping for fallback query
      if (options.sortField === 'date') {
        dbColumnName = 'created_at'; // Fallback uses created_at instead of initiated_date
      } else if (options.sortField === 'athletic_aid') {
        // Fallback doesn't have athletic aid data, skip sorting
        dbColumnName = 'id';
      } else if (options.sortField === 'position') {
        // Fallback doesn't have position data, skip sorting
        dbColumnName = 'id';
      } else if (options.sortField === 'high_name') {
        // Fallback doesn't have high school data, skip sorting
        dbColumnName = 'id';
      } else if (options.sortField === 'state') {
        // Fallback doesn't have state data, skip sorting
        dbColumnName = 'id';
      } else if (options.sortField === 'true_score') {
        // Fallback doesn't have true score data, skip sorting
        dbColumnName = 'id';
      } else if (options.sortField === 'athletic_projection') {
        // Fallback doesn't have athletic projection data, skip sorting
        dbColumnName = 'id';
      }
      
      // Note: Fallback function doesn't have access to dynamic columns with data_type_ids
      // So we can't check for GP/GS columns here, but they're handled in the main function
      // For ascending: nulls should come first (treated as 0)
      // For descending: nulls should come last (treated as 0) except for GP/GS
      if (options.sortOrder === 'ascend') {
        // For ascending, use nullsFirst to put nulls at the beginning
        query = query.order(dbColumnName, { ascending: true, nullsFirst: true });
      } else {
        // For descending, use nullsFirst: false to put nulls at the end
        // Note: GP/GS special handling is not available in fallback mode
        query = query.order(dbColumnName, { ascending: false, nullsFirst: false });
      }
    } else {
      // Default ordering for fallback
      if (options?.dataSource === 'hs_athletes') {
        // For hs_athletes, default to sorting by last_name alphabetically
        query = query.order('last_name', { ascending: true, nullsLast: true });
      } else {
        query = query.order('id', { ascending: false });
      }
    }
    
    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: athleteData, error: athleteError, count } = await query;

    if (athleteError) {
      throw new Error(`Fallback query failed: ${athleteError.message}`);
    }

    if (!athleteData || athleteData.length === 0) {
      return {
        data: [],
        hasMore: false
      };
    }

    // Get basic athlete facts for the returned athletes
    const athleteIds = athleteData.map((a: any) => a.id);
    const { data: factData } = await supabase
      .from('athlete_fact')
      .select('athlete_id, data_type_id, value')
      .in('athlete_id', athleteIds)
      .in('data_type_id', [1, 2, 7, 24]) // Basic facts only
      .or('inactive.is.null,inactive.eq.false')
      .limit(100); // Limit to prevent timeouts

    // Create basic transformed data
    const transformedData = athleteData.map((row: any) => {
      const facts = factData?.filter((f: any) => f.athlete_id === row.id) || [];
      const year = facts.find((f: any) => f.data_type_id === 1)?.value || '';
      const position = facts.find((f: any) => f.data_type_id === 2)?.value || '';
      const highName = facts.find((f: any) => f.data_type_id === 7)?.value || '';
      const state = facts.find((f: any) => f.data_type_id === 24)?.value || '';

      return {
        id: row.id,
        athlete_name: `${row.first_name} ${row.last_name}`,
        name_name: '',
        date: '',
        division: '',
        year: year,
        athletic_aid: 'None',
        high_name: highName,
        state: state,
        position: position,
        gp: 0,
        gs: 0,
        goals: 0,
        ast: 0,
        gk_min: 0,
        true_score: 0
      };
    });

    return {
      data: transformedData,
      hasMore: count ? offset + limit < count : false,
      totalCount: count || 0
    };
  } catch (error) {
    console.error('Fallback query also failed:', error);
    throw error;
  }
}

// Function to get athlete_id from main_tp_page_id
export async function getAthleteIdFromMainTpPageId(mainTpPageId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('main_tp_page')
      .select('athlete_id')
      .eq('id', mainTpPageId)
      .single();
    
    if (error) {
      console.error('Error fetching athlete_id from main_tp_page_id:', error);
      return null;
    }
    
    return data?.athlete_id || null;
  } catch (error) {
    console.error('Error in getAthleteIdFromMainTpPageId:', error);
    return null;
  }
}

// Function to get main_tp_page_id from athlete_id
export async function getMainTpPageIdFromAthleteId(athleteId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('main_tp_page')
      .select('id')
      .eq('athlete_id', athleteId)
      .single();
    
    if (error) {
      console.error('Error fetching main_tp_page_id from athlete_id:', error);
      return null;
    }
    
    return data?.id || null;
  } catch (error) {
    console.error('Error in getMainTpPageIdFromAthleteId:', error);
    return null;
  }
}

export async function fetchAthleteById(athleteId: string, userPackages?: string[], dataSource?: 'transfer_portal' | 'all_athletes' | 'juco' | 'hs_athletes' | null): Promise<AthleteData | null> {
  try {
    // First, try to get athlete data from the athlete table directly
    const { data: athleteData, error: athleteError } = await supabase
      .from('athlete')
      .select(`
        id,
        first_name,
        last_name,
        sport_id
      `)
      .eq('id', athleteId)
      .single();
    
    if (athleteError) {
      console.error('Error fetching athlete data:', athleteError);
      return null;
    }
    
    if (!athleteData) {
      console.error('No athlete data found with ID:', athleteId);
      return null;
    }

    // Get the sport abbreviation for the view name
    const sportIdToAbbrev: Record<number, string> = {
      1: 'mbb',
      2: 'wbb',
      3: 'msoc',
      4: 'wsoc',
      5: 'wvol',
      6: 'bsb',
      7: 'sb',
      8: 'mcc',
      9: 'wcc',
      10: 'mglf',
      11: 'wglf',
      12: 'mlax',
      13: 'wlax',
      14: 'mten',
      15: 'wten',
      16: 'mtaf',
      17: 'wtaf',
      18: 'mswm',
      19: 'wswm',
      20: 'mwre',
      21: 'fb',
    };
    const sportAbbrev = sportIdToAbbrev[athleteData.sport_id];
    if (!sportAbbrev) {
      throw new Error(`Unknown sport_id: ${athleteData.sport_id}`);
    }
    
    // Try to get data from the wide view first (this should contain the commit field)
    let wideViewData = null;
    const wideViewError = null;
    
    // Determine the correct view based on user packages
    if (userPackages && userPackages.length > 0) {
      const userPackageNumbers = userPackages.map(pkg => parseInt(pkg, 10));
      const viewSuffix = getViewSuffixForSport(sportAbbrev, userPackageNumbers);
      const bestPackage = getBestPackageForSport(sportAbbrev, userPackageNumbers);
      
      if (bestPackage) {
        const viewName = `vw_tp_athletes_wide_${sportAbbrev}${viewSuffix}`;
        
        const { data: tierViewData, error: tierViewError } = await supabase
          .from(viewName)
          .select('commit_school_name, athlete_id')
          .eq('athlete_id', athleteId)
          .limit(1);
        
        if (!tierViewError && tierViewData && tierViewData.length > 0) {
          wideViewData = tierViewData;
        }
      }
    }
    
    // Fallback: if no user packages or no match, try the base view
    if (!wideViewData) {
              const { data: baseViewData, error: baseViewError } = await supabase
          .from(`vw_tp_athletes_wide_${sportAbbrev}`)
          .select('commit_school_name, athlete_id')
          .eq('athlete_id', athleteId)
          .limit(1);
      
      if (!baseViewError && baseViewData && baseViewData.length > 0) {
        wideViewData = baseViewData;
      }
    }
    
    let wideViewResult = null;
    if (wideViewData && wideViewData.length > 0) {
      wideViewResult = wideViewData[0];
    }

    // Fallback: try to get transfer portal data if the athlete is in the portal
    const { data: tpData, error: tpError } = await supabase
      .from('athlete_with_tp_page_details')
      .select(`
        id,
        first_name,
        last_name,
        initiated_date,
        year,
        school_id,
        school_name,
        is_receiving_athletic_aid
      `)
      .eq('id', athleteId)
      .limit(1);
    
    let transferPortalData = null;
    if (!tpError && tpData && tpData.length > 0) {
      transferPortalData = tpData[0];
    }

    // For all_athletes and juco data sources, fetch current school from athlete_school table
    let currentSchoolData = null;
    if (dataSource === 'all_athletes' || dataSource === 'juco') {
      const { data: athleteSchoolData, error: athleteSchoolError } = await supabase
        .from('athlete_school')
        .select(`
          id,
          athlete_id,
          school_id,
          start_date,
          end_date,
          school (
            id,
            name
          )
        `)
        .eq('athlete_id', athleteId)
        .is('end_date', null) // Only get entries with no end_date (current school)
        .order('start_date', { ascending: false }) // Get the most recent entry
        .limit(1);

      if (!athleteSchoolError && athleteSchoolData && athleteSchoolData.length > 0) {
        currentSchoolData = athleteSchoolData[0];
      } else if (athleteSchoolError) {
        console.error('Error fetching current school from athlete_school:', athleteSchoolError);
      }
    }

    // Get main_tp_page data (both id and status) for this athlete
    const { data: mainTpData, error: mainTpError } = await supabase
      .from('main_tp_page')
      .select(`
        id,
        status,
        designated_student_athlete
      `)
      .eq('athlete_id', athleteId)
      .limit(1);
    
    if (mainTpError) {
      console.error('Error fetching main_tp_page data:', mainTpError);
    }
    
    let detailsTpData = null;
    let detailsTpError = null;
    
    // Only query details_tp_page if there's a main_tp_page entry
    if (!mainTpError && mainTpData && mainTpData.length > 0) {
      const { data: detailsData, error: detailsError } = await supabase
        .from('details_tp_page')
        .select(`
          expected_grad_date,
          comments,
          email,
          ok_to_contact,
          is_four_year_transfer,
          commit,
          is_transfer_graduate_student,
          is_receiving_athletic_aid
        `)
        .eq('main_tp_page_id', mainTpData[0].id)
        .limit(1);
      
      detailsTpData = detailsData;
      detailsTpError = detailsError;
    }
    
    if (detailsTpError) {
      console.error('Error fetching details_tp_page data:', detailsTpError);
    }

    // Get the first result from the arrays
    const mainTpResult = mainTpData && mainTpData.length > 0 ? mainTpData[0] : null;
    const detailsTpResult = detailsTpData && detailsTpData.length > 0 ? detailsTpData[0] : null;

    // Get all relevant athlete facts for survey data and athletic aid override
    const { data: surveyFacts, error: surveyFactsError } = await supabase
      .from('athlete_fact')
      .select(`
        data_type_id,
        value,
        created_at
      `)
      .eq('athlete_id', athleteId)
      .or('inactive.is.null,inactive.eq.false')
      .in('data_type_id', [
        31, // leaving_other
        40,  // leaving_playing_time
        41,  // leaving_higher_level
        42,  // leaving_coaches
        43,  // leaving_eligible_academic
        44,  // leaving_eligible_discipline
        45,  // leaving_eligible_other
        46,  // leaving_better_academics
        47,  // leaving_major
        48,  // leaving_home
        32,  // important
        34,  // walk_on_t25
        36,  // major_importance
        78,  // best_pos
        49,  // ideal_division
        50,  // full_scholarship_only
        51,  // distance_from_home
        52,  // ideal_campus_size
        53,  // campus_location_type
        54,  // cost_vs_acad_rep
        55,  // winning_vs_location
        56,  // playing_vs_championship
        57,  // cost_vs_campus_type
        58,  // playing_vs_size
        59,  // winning_vs_academics
        60,  // championship_vs_location
        61,  // party_vs_academics
        62,  // party_vs_winning
        77,  // type_of_staff_preferred
        63,  // male_to_female
        64,  // hbcu
        65,  // faith_based_name
        66,  // pref_d1_name
        67,  // pref_d2_name
        68,  // pref_d3_name
        69,  // pref_naia_name
        251, // scholarship information from athlete_fact
        571, // email from athlete_fact
        688, // agent contact info
        696, // hc_name
        255, // hc_email
        256, // hc_number
        693, // hs_gpa
        72,  // military_school_yesno
        686, // pell_eligible
        366, // nil_importance
        365, // nil_amount
        679, // facilities_vs_championship
        681, // nfl_vs_facilities
        680, // championship_vs_level
        682, // recent_vs_winning
        // athletic_aid_override is no longer needed since processing is done upstream
      ])
      .order('created_at', { ascending: false });

    if (surveyFactsError) {
      console.error('Error fetching survey facts:', surveyFactsError);
    }

    // Get name names for preferred names
    // const preferrednameIds = surveyFacts
    //   ?.filter((fact: { data_type_id: number; value: string }) => [66, 67, 68, 69].includes(fact.data_type_id))
    //   .map((fact: { data_type_id: number; value: string }) => fact.value)
    //   .filter(Boolean);

    // let nameNames: { [key: string]: string } = {};
    // if (preferrednameIds && preferrednameIds.length > 0) {
    //   const { data: schools, error: schoolsError } = await supabase
    //     .from('school')
    //     .select('id, name')
    //     .in('id', preferrednameIds);

    //   if (schoolsError) {
    //     console.error('Error fetching school names:', schoolsError);
    //   } else if (schools) {
    //     nameNames = schools.reduce((acc: { [key: string]: string }, school: { id: string; name: string }) => ({
    //       ...acc,
    //       [school.id]: school.name
    //     }), {});
    //   }
    // }

    // Helper function to find fact value by data_type_id
    // Since we ordered by created_at DESC, the first occurrence will be the most recent
    const findFactValue = (dataTypeId: number): string | undefined => {
      return surveyFacts?.find((fact: { data_type_id: number; value: string }) => fact.data_type_id === dataTypeId)?.value;
    };

    // Athletic aid override is no longer needed since processing is done upstream

    // Transform survey facts into the expected format
    const surveyData = {
      leaving_other: findFactValue(31),
      leaving_playing_time: findFactValue(40),
      leaving_higher_level: findFactValue(41),
      leaving_coaches: findFactValue(42),
      leaving_eligible_academic: findFactValue(43),
      leaving_eligible_discipline: findFactValue(44),
      leaving_eligible_other: findFactValue(45),
      leaving_better_academics: findFactValue(46),
      leaving_major: findFactValue(47),
      leaving_home: findFactValue(48),
      important: findFactValue(32),
      walk_on_t25: findFactValue(34),
      major_importance: findFactValue(36),
      best_pos: findFactValue(78),
      ideal_division: findFactValue(49),
      full_scholarship_only: findFactValue(50),
      distance_from_home: findFactValue(51),
      ideal_campus_size: findFactValue(52),
      campus_location_type: findFactValue(53),
      cost_vs_acad_rep: findFactValue(54),
      winning_vs_location: findFactValue(55),
      playing_vs_championship: findFactValue(56),
      cost_vs_campus_type: findFactValue(57),
      playing_vs_size: findFactValue(58),
      winning_vs_academics: findFactValue(59),
      championship_vs_location: findFactValue(60),
      party_vs_academics: findFactValue(61),
      party_vs_winning: findFactValue(62),
      type_of_staff_preferred: findFactValue(77),
      male_to_female: findFactValue(63),
      hbcu: findFactValue(64),
      faith_based_name: findFactValue(65),
      pref_d1_name: findFactValue(66),
      pref_d2_name: findFactValue(67),
      pref_d3_name: findFactValue(68),
      pref_naia_name: findFactValue(69),
      scholarship_from_fact: findFactValue(251), // scholarship information from athlete_fact
      email: findFactValue(571), // email from athlete_fact
      agent: findFactValue(688), // Agent contact info
      hc_name: findFactValue(696), // HS Head Coach
      hc_email: findFactValue(255), // HS Head Coach Email
      hc_number: findFactValue(256), // HS HC Cell
      hs_gpa: findFactValue(693), // HS GPA
      military_school_yesno: findFactValue(72), // Would Consider Military School
      pell_eligible: findFactValue(686), // Pell eligible?
      nil_importance: findFactValue(366), // NIL Importance
      nil_amount: findFactValue(365), // NIL expected amount
      facilities_vs_championship: findFactValue(679), // Facilities vs championship
      nfl_vs_facilities: findFactValue(681), // Produce NFL players vs facilities
      championship_vs_level: findFactValue(680), // Championship vs highest level
      recent_vs_winning: findFactValue(682) // Recent winning vs winning tradition
    };
    // Get conference, division, and logo from school_fact table
    let conference: string | undefined = undefined;
    let division: string | undefined = undefined;
    let schoolLogoUrl: string | undefined = undefined;
    let schoolRegion: string | undefined = undefined;
    let schoolDivision: string | undefined = undefined;
    
    // Determine which school_id to use based on data source
    const schoolIdToUse = (dataSource === 'all_athletes' || dataSource === 'juco') 
      ? currentSchoolData?.school_id 
      : transferPortalData?.school_id;
    
    if (schoolIdToUse) {
      // Map sport_id to conference data_type_id
      const sportIdToConferenceDataType: Record<number, number> = {
        1: 244,   // mbb_conference
        2: 260,   // wbb_conference  
        3: 116,   // msoc_conference
        4: 273,   // wsoc_conference
        5: 274,   // wvol_conference (assuming)
        6: 244,   // bsb_conference (assuming same as mbb for now)
        7: 263,   // sb_conference
        8: 262,   // mcc_conference (cross country)
        9: 262,   // wcc_conference (cross country) 
        10: 269,  // mglf_conference (golf)
        11: 270,  // wglf_conference (golf)
        12: 264,  // mlax_conference
        13: 265,  // wlax_conference
        14: 266,  // mten_conference
        15: 267,  // wten_conference
        16: 271,  // mtaf_conference (track and field)
        17: 272,  // wtaf_conference (track and field)
        18: 273,  // mswm_conference (swimming)
        19: 274,  // wswm_conference (swimming)
        20: 275,  // mwre_conference (wrestling)
        21: 259,  // fb_conference (football)
      };
      
      const conferenceDataTypeId = sportIdToConferenceDataType[athleteData.sport_id];
      // For JUCO data source, also fetch region (648) and division (649)
      const dataTypeIds = dataSource === 'juco' 
        ? (conferenceDataTypeId ? [conferenceDataTypeId, 119, 23, 648, 649] : [119, 23, 648, 649])
        : (conferenceDataTypeId ? [conferenceDataTypeId, 119, 23] : [119, 23]); // 119 for division, 23 for logo URL, 648 for region, 649 for division
      
      const { data: schoolFactData, error: schoolFactError } = await supabase
        .from('school_fact')
        .select('data_type_id, value')
        .eq('school_id', schoolIdToUse)
        .in('data_type_id', dataTypeIds)
        .limit(dataSource === 'juco' ? 5 : 3);

      if (schoolFactError) {
        console.error('Error fetching school fact data:', schoolFactError);
      } else if (schoolFactData && schoolFactData.length > 0) {
        schoolFactData.forEach((fact: { data_type_id: number; value: string }) => {
          if (fact.data_type_id === conferenceDataTypeId) {
            conference = fact.value;
          } else if (fact.data_type_id === 119) {
            division = fact.value;
          } else if (fact.data_type_id === 23) {
            schoolLogoUrl = fact.value;
          } else if (fact.data_type_id === 648) {
            schoolRegion = fact.value;
          } else if (fact.data_type_id === 649) {
            schoolDivision = fact.value;
          }
        });
      }
    }
    
    // Get commit school logo if there's a commit school
    let commitSchoolLogoUrl: string | undefined = undefined;
    const commitSchoolName = (wideViewResult as any)?.commit_school_name || (detailsTpResult as any)?.commit_school_name;
    if (commitSchoolName) {
      // First get the school ID from the school table
      const { data: commitSchoolData, error: commitSchoolError } = await supabase
        .from('school')
        .select('id')
        .eq('name', commitSchoolName)
        .limit(1);
      
      if (!commitSchoolError && commitSchoolData && commitSchoolData.length > 0) {
        const commitSchoolId = commitSchoolData[0].id;
        
        // Then get the logo URL from school_fact table
        const { data: commitSchoolFactData, error: commitSchoolFactError } = await supabase
          .from('school_fact')
          .select('value')
          .eq('school_id', commitSchoolId)
          .eq('data_type_id', 23) // Logo URL data type
          .limit(1);
        
        if (!commitSchoolFactError && commitSchoolFactData && commitSchoolFactData.length > 0) {
          commitSchoolLogoUrl = commitSchoolFactData[0].value;
        }
      }
    }
    
    // Get athlete facts for additional details
    const { data: factData, error: factError } = await supabase
      .from('athlete_fact')
      .select('data_type_id, value, created_at')
      .or('inactive.is.null,inactive.eq.false')
      .eq('athlete_id', athleteId)
              .in('data_type_id', [
        1,  // year
        2,  // primary_position
        3,  // secondary_position
        4,  // height_feet
        5,  // height_inch
        6,  // weight
        7,  // high_name
        8,  // previous_name
        10, // major
        11, // roster_link
        13, // twitter
        21, // bio
        23, // image_url
        24, // state
        26, // preferredContactWay
        27, // cellPhone
        28, // when_transfer
        29, // helpingWithDecision
        30, // contactInfo
        35, // gpa
        36, // importance
        37, // highlight
        38, // highnamehighlight
        121, // birthday
        25, // eligibilityRemaining
        16, // hand
        230, // perfect_game
        231, // prep_baseball_report
        33, // game_eval
        233, // club
        234, // summer_league
        246, // address_street
        247, // city (used for address_city)
        248, // state
        571, // email
        639, // stats_link
        925, // address_street2
        1058, // ncaa_id
        1015 // grad_year
      ])
      .order('created_at', { ascending: false });

    if (factError) {
      console.error('Error fetching athlete facts:', factError);
    }
    
    // Get stats for the athlete
    const { data: statsData, error: statsError } = await supabase
      .from('stat')
      .select(`
        data_type_id,
        value,
        season
      `)
      .eq('athlete_id', athleteId)
      .in('data_type_id', [98, 83, 100, 101, 84, 221, 223, 313, 390, 393]) // Added 221 (TGb), 223 (TGp), 313 (TFRRS Link), 390 (UTR), and 393 (WTN)
      .order('season', { ascending: false });

    if (statsError) {
      console.error('Error fetching stats:', statsError);
    }

    // Get athlete names for each season
    // Query athlete_name with school join - Modified to use athlete_fact instead
    const { data: athletenames, error: athletenamesError } = await supabase
      .from('athlete_fact')
      .select(`
        data_type_id,
        value,
        created_at
      `)
      .eq('athlete_id', athleteId)
      .or('inactive.is.null,inactive.eq.false')
      .in('data_type_id', [7, 8]) // Using data_type_id 7 for high school name and 8 for previous school
      .order('created_at', { ascending: false });

    if (athletenamesError) {
      console.error('Error fetching athlete facts:', athletenamesError);
    }

    // Helper function to find name for a given season - Modified to work with athlete_fact
    const findnameForSeason = (season: number) => {
      if (!athletenames || athletenames.length === 0) {
        return null;
      }
      
      // For now, just return the most recent school name
      const schoolName = athletenames.find((fact: { data_type_id: number; value: string }) => fact.data_type_id === 7)?.value;
      return schoolName ? { school: { name: schoolName } } : null;
    };

    // Process stats by season
    const statsBySeason = statsData?.reduce((acc: any, stat: any) => {
      const season = stat.season;
      if (!acc[season]) {
        const nameForSeason = findnameForSeason(season);
        acc[season] = {
          season,
          name: nameForSeason?.school?.name || 'Unknown name',
          stats: {}
        };
      }
      acc[season].stats[stat.data_type_id] = stat.value;
      return acc;
    }, {});

    // Transform stats into the expected format and sort by season
    const transformedStats = Object.values(statsBySeason || {})
      .sort((a: any, b: any) => b.season - a.season)
      .map((seasonData: any) => ({
        season: seasonData.season,
        name: seasonData.name,
        gp: parseInt(seasonData.stats[98] || '0'),
        gs: parseInt(seasonData.stats[83] || '0'),
        goals: parseInt(seasonData.stats[100] || '0'),
        assists: parseInt(seasonData.stats[101] || '0'),
        points: parseInt(seasonData.stats[102] || '0'),
        sh_att: parseInt(seasonData.stats[103] || '0'),
        g_min_played: parseInt(seasonData.stats[84] || '0'),
        saves: parseInt(seasonData.stats[87] || '0')
      }));

    // Get school facts instead of name facts
    const collegeId = (athleteData as any)?.school_id;
    let schoolFactData = null;
    
    if (collegeId) {
      const { data: schoolFacts, error: schoolFactError } = await supabase
        .from('school_fact')
        .select('data_type_id, value')
        .eq('school_id', collegeId);
      
      if (schoolFactError) {
        console.error('Error fetching school facts:', schoolFactError);
      } else {
        schoolFactData = schoolFacts;
      }
    }
    
    // Helper function to find facts
    // Since we ordered by created_at DESC, the first occurrence will be the most recent
    const findFact = (facts: any[] | null, dataTypeId: number): string | null => 
      facts?.find((fact: any) => fact.data_type_id === dataTypeId)?.value || null;
    
    // Parse the values as numbers, defaulting to 0 if invalid
    const parseStatValue = (value: string | null | undefined): number => {
      if (!value) return 0;
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    };

    // Process athlete facts
    const year = findFact(factData, 1);
    const gradYear = findFact(factData, 1015);
    const highname = findFact(factData, 7);
    const state = findFact(factData, 24);
    const address_city = findFact(factData, 247);
    const heightFeet = findFact(factData, 4);
    const heightInch = findFact(factData, 5);
    const weight = findFact(factData, 6);
    const imageUrl = findFact(factData, 23) || "/blank-user.svg";
    const twitter = findFact(factData, 13);
    // Remove @ symbol if it's already present in the Twitter handle
    const cleanTwitter = twitter ? twitter.replace(/^@/, '') : twitter;
    const email = findFact(factData, 571);
    const ncaaId = findFact(factData, 1058);
    const primaryPosition = findFact(factData, 2);
    const secondaryPosition = findFact(factData, 3);
    const highnamehighlight = findFact(factData, 38);
    const highlight = findFact(factData, 37);
    const previous_name = findFact(factData, 8);
    const eligibilityRemaining = findFact(factData, 25);
    const hand = findFact(factData, 16);
    const perfectGame = findFact(factData, 230);
    const prepBaseballReport = findFact(factData, 231);
    const gameEval = findFact(factData, 33);
    const club = findFact(factData, 233);
    const summerLeague = findFact(factData, 234);
    const tfrrsLink = findFact(statsData, 313);
    const utrLink = findFact(statsData, 390);
    const wtnLink = findFact(statsData, 393);

    // Bio tab specific data
    const cellPhone = findFact(factData, 27);
    const birthday = findFact(factData, 121);
    const preferredContactWay = findFact(factData, 26);
    const whenTransfer = findFact(factData, 28);
    const helpingWithDecision = findFact(factData, 29);
    const contactInfo = findFact(factData, 30);
    const gpa = findFact(factData, 35);
    const major = findFact(factData, 10);
    const importance = findFact(factData, 36);
    const bio = findFact(factData, 21);
    const rosterLink = findFact(factData, 11);
    const statsLink = findFact(factData, 639);
    
    // Get remaining stats
    const gp = findFact(statsData, 98);
    const gs = findFact(statsData, 83);
    const goals = findFact(statsData, 100);
    const assists = findFact(statsData, 101);
    const points = findFact(statsData, 102);
    const shotAttempts = findFact(statsData, 103);
    const saves = findFact(statsData, 87);
    const minPlayed = findFact(statsData, 84);
    
    // Get true scores and parse them as numbers
    const tgb = findFact(statsData, 221);
    const tgp = findFact(statsData, 223);
    
    const tgbValue = parseStatValue(tgb);
    const tgpValue = parseStatValue(tgp);
    const trueScore = Math.round(Math.max(tgbValue, tgpValue));
    

    
    // Get athlete honors if there's an athlete_id
    let honorsData = null;
    if (athleteId) {
      const { data: honors, error: honorsError } = await supabase
        .from('athlete_honor')
        .select('id, team, award, award_year')
        .eq('athlete_id', athleteId);
      
      if (honorsError) {
        console.error('Error fetching athlete honors:', honorsError);
      } else {
        honorsData = honors;
      }
    }
    
    // Get athlete videos if there's an athlete_id
    let videosData = null;
    if (athleteId) {
      const { data: videos, error: videosError } = await supabase
        .from('athlete_video')
        .select('*')
        .eq('athlete_id', athleteId)
        .order('created_at', { ascending: false });
      
      if (videosError) {
        console.error('Error fetching athlete videos:', videosError);
      } else {
        videosData = videos;
      }
    }
    
    // Combine all data into the structure expected by the frontend
    const transformedData: AthleteData = {
      id: athleteData.id,
      first_name: athleteData.first_name,
      last_name: athleteData.last_name,
      sport_id: athleteData.sport_id,
      initiated_date: transferPortalData?.initiated_date,
      year: year || undefined,
      grad_year: gradYear || undefined,
      game_eval: gameEval || undefined,
      club: club || undefined,
      summer_league: summerLeague || undefined,
      primary_position: primaryPosition as string | undefined,
      secondary_position: secondaryPosition as string | undefined,
      image_url: imageUrl as string | undefined,
      high_name: highname as string | undefined,
      address_street: findFact(factData, 246) as string | undefined,
      address_street2: findFact(factData, 925) as string | undefined,
      address_city: findFact(factData, 247) as string | undefined,
      address_state: findFact(factData, 24) as string | undefined,
      address_zip: findFact(factData, 248) as string | undefined,
      height_feet: heightFeet ? parseInt(heightFeet) : null,
      height_inch: heightInch ? parseInt(heightInch) : null,
      weight: weight ? parseInt(weight) : null,
      twitter: cleanTwitter as string | undefined,
      email: email as string | undefined,
      ncaa_id: ncaaId as string | undefined,
      roster_link: rosterLink as string | undefined,
      stats_link: statsLink as string | undefined,
      bio: bio as string | undefined,
      major: major as string | undefined,
      hand: hand as string | undefined,
      perfect_game: perfectGame as string | undefined,
      prep_baseball_report: prepBaseballReport as string | undefined,
      tfrrs_link: tfrrsLink as string | undefined,
      wtn_link: wtnLink as string | undefined,
      utr_link: utrLink as string | undefined,
      highlight: highlight as string | undefined,
      highnamehighlight: highnamehighlight as string | undefined,
      gpa: gpa || undefined,
      birthday: birthday || undefined,
      pref_contact: preferredContactWay || undefined,
      when_transfer: whenTransfer || undefined,
      help_decision: helpingWithDecision || undefined,
      contact_info: contactInfo || undefined,
      cell_phone: cellPhone || undefined,
      true_score: trueScore || undefined,
      eligibility_remaining: eligibilityRemaining || undefined,
      school_logo_url: schoolLogoUrl, // Keep using existing logo logic for now since school table structure is unclear
      commit_school_logo_url: commitSchoolLogoUrl,
      school_region: schoolRegion,
      school_division: schoolDivision,
      // Store the school_id used for school_fact queries (for coach info)
      current_school_id: schoolIdToUse,
      athlete_videos: videosData && videosData.length > 0 ? videosData as AthleteVideo[] : undefined,
      school: {
        name: (dataSource === 'all_athletes' || dataSource === 'juco') 
          ? (currentSchoolData?.school?.name || transferPortalData?.school_name)
          : transferPortalData?.school_name,
        conference: (dataSource === 'all_athletes' || dataSource === 'juco') 
          ? conference  // Use existing conference data for all_athletes/juco since school table doesn't have it
          : conference,
        division: (dataSource === 'all_athletes' || dataSource === 'juco') 
          ? division    // Use existing division data for all_athletes/juco since school table doesn't have it
          : division
      },
      details_tp_page: [{
        // Prefer details_tp_page value; normalize booleans/strings to 'Yes' | 'None'
        is_receiving_athletic_aid: (() => {
          const raw = (detailsTpResult as any)?.is_receiving_athletic_aid ?? (transferPortalData as any)?.is_receiving_athletic_aid;
          let normalized: string;
          if (raw === true || raw === 'true' || raw === 'Yes' || raw === 'yes') normalized = 'Yes';
          else if (raw === false || raw === 'false' || raw === 'No' || raw === 'no' || raw === 0) normalized = 'None';
          else if (raw === null || raw === undefined || raw === '') normalized = 'None';
          else normalized = String(raw);
          return normalized;
        })(),
        expected_grad_date: detailsTpResult?.expected_grad_date,
        comments: detailsTpResult?.comments,
        email: detailsTpResult?.email,
        ok_to_contact: detailsTpResult?.ok_to_contact,
        is_four_year_transfer: detailsTpResult?.is_four_year_transfer,
        commit_school_name: (wideViewResult as any)?.commit_school_name || (detailsTpResult as any)?.commit_school_name,
        previous_name: previous_name || undefined,
        is_transfer_graduate_student: detailsTpResult?.is_transfer_graduate_student
      }],
      main_tp_page: [{
        id: mainTpResult?.id,
        initiated_date: transferPortalData?.initiated_date,
        year: year || undefined,
        school_id: transferPortalData?.school_id,
        status: mainTpResult?.status,
        designated_student_athlete: mainTpResult?.designated_student_athlete,
        school: {
          name: (dataSource === 'all_athletes' || dataSource === 'juco') 
            ? (currentSchoolData?.school?.name || transferPortalData?.school_name)
            : transferPortalData?.school_name,
          division: (dataSource === 'all_athletes' || dataSource === 'juco') 
            ? division  // Use existing division data since school table doesn't have it
            : division
        }
      }],
      generic_survey: [{
        ...surveyData,
        hs_highlight: highnamehighlight as string | undefined,
        highlight: highlight as string | undefined
      }],
      athlete_honor: honorsData && honorsData.length > 0 ? honorsData as [{ id: string; team: string; award: string; award_year: string }] : undefined
    };
    
    return transformedData;
  } catch (error) {
    console.error('Unexpected error in fetchAthleteById:', error);
    return null;
  }
}

// Helper function to get or create the "Main" board for a customer
export async function getOrCreateMainBoard(customerId: string): Promise<string> {
  try {
    // First, try to get the existing "Main" board
    const { data: existingBoard, error: fetchError } = await supabase
      .from('recruiting_board_board')
      .select('id')
      .eq('customer_id', customerId)
      .eq('name', 'Main')
      .is('recruiting_board_column_id', null) // Main boards have NULL column_id
      .is('ended_at', null)
      .single();

    if (!fetchError && existingBoard) {
      return existingBoard.id;
    }

    // If no Main board exists, create one
    const { data: newBoard, error: createError } = await supabase
      .from('recruiting_board_board')
      .insert({
        customer_id: customerId,
        name: 'Main',
        recruiting_board_column_id: null,
        display_order: 1
      })
      .select('id')
      .single();

    if (createError) {
      console.error('Error creating Main board:', createError);
      throw new Error('Failed to create Main board');
    }

    return newBoard.id;
  } catch (error) {
    console.error('Error in getOrCreateMainBoard:', error);
    throw error;
  }
}

// Fetch all boards for a customer
export async function fetchRecruitingBoards(customerId: string): Promise<RecruitingBoardBoard[]> {
  try {
    const { data, error } = await supabase
      .from('recruiting_board_board')
      .select('*')
      .eq('customer_id', customerId)
      .is('recruiting_board_column_id', null) // Only main boards, not sub-boards
      .is('ended_at', null)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching recruiting boards:', error);
      throw new Error('Failed to fetch recruiting boards');
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchRecruitingBoards:', error);
    throw error;
  }
}

// Create a new recruiting board
export async function createRecruitingBoard(customerId: string, boardName: string): Promise<RecruitingBoardBoard> {
  try {
    // Get the next display order
    const { data: maxOrderData, error: maxOrderError } = await supabase
      .from('recruiting_board_board')
      .select('display_order')
      .eq('customer_id', customerId)
      .is('recruiting_board_column_id', null)
      .is('ended_at', null)
      .order('display_order', { ascending: false })
      .limit(1);

    if (maxOrderError) {
      console.error('Error getting max display order:', maxOrderError);
      throw new Error('Failed to get max display order');
    }

    const nextOrder = (maxOrderData?.[0]?.display_order || 0) + 1;

    const { data, error } = await supabase
      .from('recruiting_board_board')
      .insert({
        customer_id: customerId,
        name: boardName,
        recruiting_board_column_id: null,
        display_order: nextOrder
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating recruiting board:', error);
      throw new Error('Failed to create recruiting board');
    }

    return data;
  } catch (error) {
    console.error('Error in createRecruitingBoard:', error);
    throw error;
  }
}

// Update recruiting board name
export async function updateRecruitingBoardName(boardId: string, newName: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('recruiting_board_board')
      .update({ name: newName })
      .eq('id', boardId);

    if (error) {
      console.error('Error updating board name:', error);
      throw new Error('Failed to update board name');
    }
  } catch (error) {
    console.error('Error in updateRecruitingBoardName:', error);
    throw error;
  }
}

// Delete a recruiting board (soft delete)
export async function deleteRecruitingBoard(boardId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('recruiting_board_board')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', boardId)
      .is('ended_at', null);

    if (error) {
      console.error('Error deleting recruiting board:', error);
      throw new Error('Failed to delete recruiting board');
    }
  } catch (error) {
    console.error('Error in deleteRecruitingBoard:', error);
    throw error;
  }
}

// Update recruiting board display order
export async function updateRecruitingBoardOrder(boards: { id: string; display_order: number }[]): Promise<void> {
  try {
    for (const board of boards) {
      const { error } = await supabase
        .from('recruiting_board_board')
        .update({ display_order: board.display_order })
        .eq('id', board.id);

      if (error) {
        console.error('Error updating board order:', error);
        throw new Error('Failed to update board order');
      }
    }
  } catch (error) {
    console.error('Error in updateRecruitingBoardOrder:', error);
    throw error;
  }
}
export async function fetchRecruitingBoardPositions(customerId: string, boardId?: string): Promise<RecruitingBoardColumn[]> {
  const startTime = performance.now();
  
  try {
    console.log('[fetchRecruitingBoardPositions] Starting fetch with:', { customerId, boardId });
    
    // Get the board ID - use provided or get/create Main board
    const activeBoardId = boardId || await getOrCreateMainBoard(customerId);
    console.log('[fetchRecruitingBoardPositions] Using activeBoardId:', activeBoardId);

    const { data, error } = await supabase
      .from('recruiting_board_column')
      .select('*')
      .eq('customer_id', customerId)
      .eq('recruiting_board_board_id', activeBoardId)
      .is('ended_at', null)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('[fetchRecruitingBoardPositions] Error fetching recruiting board columns:', error);
      throw new Error('Failed to fetch recruiting board columns');
    }

    const totalTime = performance.now() - startTime;
    
    return data || [];
  } catch (error) {
    console.error('[fetchRecruitingBoardPositions] Exception:', error);
    const errorTime = performance.now() - startTime;
    throw error;
  }
}

export async function createRecruitingBoardPosition(customerId: string, positionName: string, boardId?: string | null): Promise<RecruitingBoardColumn> {
  try {
    // Get the board ID - use provided one or get/create Main board
    const activeBoardId = boardId || await getOrCreateMainBoard(customerId);

    // Get the next display order
    const { data: maxOrderData, error: maxOrderError } = await supabase
      .from('recruiting_board_column')
      .select('display_order')
      .eq('customer_id', customerId)
      .eq('recruiting_board_board_id', activeBoardId)
      .is('ended_at', null)
      .order('display_order', { ascending: false })
      .limit(1);

    if (maxOrderError) {
      console.error('Error getting max display order:', maxOrderError);
      throw new Error('Failed to get max display order');
    }

    // Start at 1 if no positions exist, otherwise add 1 to the max
    const nextOrder = (maxOrderData?.[0]?.display_order || 0) + 1;

    const { data, error } = await supabase
      .from('recruiting_board_column')
      .insert({
        customer_id: customerId,
        recruiting_board_board_id: activeBoardId,
        name: positionName,
        display_order: nextOrder
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating recruiting board column:', error);
      throw new Error('Failed to create recruiting board column');
    }

    return data;
  } catch (error) {
    console.error('Error in createRecruitingBoardPosition:', error);
    throw error;
  }
}

export async function updateRecruitingBoardPositionOrder(customerId: string, positions: { id: string; display_order: number }[]): Promise<void> {
  try {
    // Determine a safe temporary base that exceeds any existing display_order on this board
    // 1) Find the boardId for these positions (assume all belong to the same board)
    const { data: sampleCols, error: sampleErr } = await supabase
      .from('recruiting_board_column')
      .select('recruiting_board_board_id')
      .in('id', positions.map(p => p.id))
      .limit(1);

    if (sampleErr) {
      console.error('[updateRecruitingBoardPositionOrder] Failed to fetch sample columns:', sampleErr);
      throw new Error('Failed to update column order');
    }

    const boardId = sampleCols?.[0]?.recruiting_board_board_id;

    // 2) Fetch the current max display_order for this board to avoid any collisions
    let tempBase = 1_000_000; // Fallback
    if (boardId) {
      const { data: maxRows, error: maxErr } = await supabase
        .from('recruiting_board_column')
        .select('display_order')
        .eq('customer_id', customerId)
        .eq('recruiting_board_board_id', boardId)
        .is('ended_at', null)
        .order('display_order', { ascending: false })
        .limit(1);

      if (maxErr) {
        console.error('[updateRecruitingBoardPositionOrder] Failed to get max display_order:', maxErr);
        throw new Error('Failed to update column order');
      }

      const currentMax = maxRows?.[0]?.display_order ?? 0;
      tempBase = Math.max(currentMax + 1000, 1_000_000);
    }

    // Phase 1: Set all display_orders to unique temporary values beyond current max
    for (let i = 0; i < positions.length; i++) {
      const position = positions[i];
      const tempOrder = tempBase + i + 1; // guaranteed unique and above current max
      const { error } = await supabase
        .from('recruiting_board_column')
        .update({ display_order: tempOrder })
        .eq('id', position.id)
        .eq('customer_id', customerId);

      if (error) {
        console.error('Error updating column order (phase 1):', error);
        throw new Error('Failed to update column order');
      }
    }

    // Phase 2: Set display_orders to final values
    for (const position of positions) {
      const { error } = await supabase
        .from('recruiting_board_column')
        .update({ display_order: position.display_order })
        .eq('id', position.id)
        .eq('customer_id', customerId);

      if (error) {
        console.error('Error updating column order (phase 2):', error);
        throw new Error('Failed to update column order');
      }
    }
  } catch (error) {
    console.error('Error in updateRecruitingBoardPositionOrder:', error);
    throw error;
  }
}

export async function endRecruitingBoardPosition(customerId: string, positionName: string, boardId?: string | null): Promise<void> {
  try {
    // Get the board ID - use provided one or get/create Main board
    const activeBoardId = boardId || await getOrCreateMainBoard(customerId);

    const { error } = await supabase
      .from('recruiting_board_column')
      .update({ ended_at: new Date().toISOString() })
      .eq('name', positionName)
      .eq('customer_id', customerId)
      .eq('recruiting_board_board_id', activeBoardId)
      .is('ended_at', null);

    if (error) {
      console.error('Error ending recruiting board column:', error);
      throw new Error('Failed to end recruiting board column');
    }
  } catch (error) {
    console.error('Error in endRecruitingBoardPosition:', error);
    throw error;
  }
}

export async function resetRecruitingBoardPositionOrders(customerId: string): Promise<void> {
  try {
    // Get the Main board ID
    const boardId = await getOrCreateMainBoard(customerId);

    // Get all active columns for this customer, ordered by current display_order
    const { data: positions, error: fetchError } = await supabase
      .from('recruiting_board_column')
      .select('id, display_order')
      .eq('customer_id', customerId)
      .eq('recruiting_board_board_id', boardId)
      .is('ended_at', null)
      .order('display_order', { ascending: true });

    if (fetchError) {
      console.error('Error fetching columns for reset:', fetchError);
      throw new Error('Failed to fetch columns for reset');
    }

    if (!positions || positions.length === 0) {
      return; // No positions to reset
    }

    // Update each column with a new sequential order starting at 1
    for (let i = 0; i < positions.length; i++) {
      const { error: updateError } = await supabase
        .from('recruiting_board_column')
        .update({ display_order: i + 1 })
        .eq('id', positions[i].id)
        .eq('customer_id', customerId);

      if (updateError) {
        console.error('Error updating column order:', updateError);
        throw new Error('Failed to update column order');
      }
    }
  } catch (error) {
    console.error('Error in resetRecruitingBoardPositionOrders:', error);
    throw error;
  }
}

export async function updateRecruitingBoardRanks(
  customerId: string, 
  updates: { recruitingBoardId: string; rank: number; position?: string }[],
  boardId?: string | null
): Promise<void> {
  try {
    // Get the board ID - use provided one or get/create Main board
    const activeBoardId = boardId || await getOrCreateMainBoard(customerId);

    // Group updates by column to handle rank conflicts
    const updatesByColumn = new Map<string, typeof updates>();
    
    for (const update of updates) {
      // Get column ID for grouping
      let columnId: string | null = null;
      
      if (update.position !== undefined) {
        const { data: columnData, error: columnError } = await supabase
          .from('recruiting_board_column')
          .select('id')
          .eq('customer_id', customerId)
          .eq('recruiting_board_board_id', activeBoardId)
          .eq('name', update.position)
          .is('ended_at', null)
          .single();

        if (columnError) {
          console.error('Error finding column:', columnError);
          throw new Error('Failed to find column');
        }
        
        columnId = columnData.id;
      } else {
        // If no position provided, get the current column from the athlete record
        const { data: athleteData, error: athleteError } = await supabase
          .from('recruiting_board_athlete')
          .select('recruiting_board_column_id')
          .eq('id', update.recruitingBoardId)
          .is('ended_at', null)
          .single();
          
        if (athleteError) {
          console.error('Error finding athlete:', athleteError);
          throw new Error('Failed to find athlete');
        }
        
        columnId = athleteData?.recruiting_board_column_id || null;
      }
      
      const key = columnId || 'null';
      if (!updatesByColumn.has(key)) {
        updatesByColumn.set(key, []);
      }
      updatesByColumn.get(key)!.push({
        ...update,
        _columnId: columnId
      } as any);
    }

    // Process each column separately using two-phase update to avoid rank conflicts
    for (const [columnKey, columnUpdates] of updatesByColumn) {
      // Phase 1: Set all ranks to temporary high values to avoid conflicts
      const tempOffset = 999999;
      for (const update of columnUpdates) {
        const tempRank = tempOffset + update.rank;
        const updateData: any = { rank: tempRank };
        
        if ((update as any)._columnId) {
          updateData.recruiting_board_column_id = (update as any)._columnId;
        }

        const { error } = await supabase
          .from('recruiting_board_athlete')
          .update(updateData)
          .eq('id', update.recruitingBoardId)
          .is('ended_at', null);

        if (error) {
          console.error('Error updating recruiting board rank (phase 1):', error);
          throw new Error('Failed to update recruiting board rank');
        }
      }

      // Phase 2: Set ranks to final values
      for (const update of columnUpdates) {
        const updateData: any = { rank: update.rank };
        
        if ((update as any)._columnId) {
          updateData.recruiting_board_column_id = (update as any)._columnId;
        }

        const { error } = await supabase
          .from('recruiting_board_athlete')
          .update(updateData)
          .eq('id', update.recruitingBoardId)
          .is('ended_at', null);

        if (error) {
          console.error('Error updating recruiting board rank (phase 2):', error);
          throw new Error('Failed to update recruiting board rank');
        }
      }
    }
  } catch (error) {
    console.error('Error in updateRecruitingBoardRanks:', error);
    throw error;
  }
}

export async function endRecruitingBoardAthlete(recruitingBoardId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('recruiting_board_athlete')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', recruitingBoardId)
      .is('ended_at', null);

    if (error) {
      console.error('Error ending recruiting board athlete:', error);
      throw new Error('Failed to remove athlete from recruiting board');
    }
  } catch (error) {
    console.error('Error in endRecruitingBoardAthlete:', error);
    throw error;
  }
}
export async function fetchRecruitingBoardData(sportId?: string, cachedUserDetails?: any, boardId?: string): Promise<RecruitingBoardData[]> {
  const startTime = performance.now();
  
  try {
    
    // Use cached user details if provided, otherwise fetch them
    let userDetails = cachedUserDetails;
    if (!userDetails) {
      // Timer for session fetch
      const sessionStart = performance.now();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        throw new Error('User not authenticated');
      }
      const sessionEnd = performance.now();

      // Timer for user details fetch (note: this will have its own internal timing)
      const userDetailsStart = performance.now();
      userDetails = await fetchUserDetails();
      if (!userDetails?.customer_id) {
        throw new Error('No customer ID found');
      }
      const userDetailsEnd = performance.now();
    } else {
    }
    
    if (sportId) {
    }

    // Timer for basic recruiting board data fetch
    const recruitingBoardStart = performance.now();
    
    console.log('[fetchRecruitingBoardData] Starting fetch with boardId:', boardId, 'customerId:', userDetails.customer_id);
    
    // Get the board ID - use provided boardId or get/create Main board
    const activeBoardId = boardId || await getOrCreateMainBoard(userDetails.customer_id);
    console.log('[fetchRecruitingBoardData] Using activeBoardId:', activeBoardId);
    
    // Get the recruiting board columns (positions) to resolve column names
    const { data: columnsData, error: columnsError } = await supabase
      .from('recruiting_board_column')
      .select('id, name')
      .eq('customer_id', userDetails.customer_id)
      .eq('recruiting_board_board_id', activeBoardId)
      .is('ended_at', null);

    if (columnsError) {
      console.error('[fetchRecruitingBoardData] Error fetching columns:', columnsError);
      throw new Error('Failed to fetch recruiting board columns');
    }

    console.log('[fetchRecruitingBoardData] Found columns:', columnsData?.length || 0, columnsData);

    // Create a map of column ID to column name for later lookup
    const columnIdToName = new Map(columnsData?.map((col: { id: string; name: string }) => [col.id, col.name]) || []);
    
    // First, get the basic recruiting board data
    const { data: recruitingBoardBasic, error: recruitingBoardBasicError } = await supabase
      .from('recruiting_board_athlete')
      .select(`
        id,
        athlete_id,
        user_id,
        created_at,
        athlete_tier,
        recruiting_board_column_id,
        rank,
        source
      `)
      .eq('recruiting_board_board_id', activeBoardId)
      .is('ended_at', null) // Only show athletes that haven't been ended/removed
      .order('rank', { ascending: true, nullsFirst: false});
    const recruitingBoardEnd = performance.now();

    if (recruitingBoardBasicError) {
      console.error('[fetchRecruitingBoardData] Error fetching basic recruiting board data:', recruitingBoardBasicError);
      throw new Error('Failed to fetch recruiting board data');
    }

    console.log('[fetchRecruitingBoardData] Found athletes:', recruitingBoardBasic?.length || 0, recruitingBoardBasic);

    // Fetch user details separately for each unique user_id
    const userIds = [...new Set(recruitingBoardBasic?.map((item: any) => item.user_id).filter(Boolean))];
    const userDetailsMap = new Map();
    
    if (userIds.length > 0) {
      const { data: userDetailsData, error: userDetailsError } = await supabase
        .from('user_detail')
        .select('id, name_first, name_last')
        .in('id', userIds);
      
      if (!userDetailsError && userDetailsData) {
        userDetailsData.forEach((user: any) => {
          userDetailsMap.set(user.id, user);
        });
      }
    }

    // Attach user details to recruiting board data
    const recruitingBoardBasicWithUsers = recruitingBoardBasic?.map((item: any) => ({
      ...item,
      user_detail: userDetailsMap.get(item.user_id) || null
    }));

    // Fetch ratings for all athletes on the recruiting board
    const boardAthleteIds = recruitingBoardBasicWithUsers?.map((item: { athlete_id: string }) => item.athlete_id) || [];
    const ratingsMap = new Map();
    
    if (boardAthleteIds.length > 0) {
      try {
        const ratings = await fetchAthleteRatings(boardAthleteIds, userDetails.customer_id);
        // Convert the ratings object to a Map for consistency with existing code
        Object.entries(ratings).forEach(([athleteId, rating]) => {
          ratingsMap.set(athleteId, rating);
        });
      } catch (error) {
        console.error('[fetchRecruitingBoardData] Error fetching athlete ratings:', error);
      // Don't throw error, just continue without ratings
    }
    }

    if (!recruitingBoardBasicWithUsers || recruitingBoardBasicWithUsers.length === 0) {
      // Debug log removed('[fetchRecruitingBoardData] No recruiting board data found');
      return [];
    }

    // Debug log removed('[fetchRecruitingBoardData] Found', recruitingBoardBasicWithUsers.length, 'athletes on recruiting board');

    // Get athlete IDs and fetch their sport_ids
    const athleteIds = recruitingBoardBasicWithUsers.map((item: any) => item.athlete_id);
    // Debug log removed('[fetchRecruitingBoardData] Athlete IDs:', athleteIds);
    
    // Timer for athlete sport data fetch
    const athleteDataStart = performance.now();
    
    let athleteQuery = supabase
      .from('athlete')
      .select('id, sport_id')
      .in('id', athleteIds);

    // Filter by sport if sportId is provided
    if (sportId) {
      athleteQuery = athleteQuery.eq('sport_id', sportId);
    }

    const { data: athleteData, error: athleteError } = await athleteQuery;
    const athleteDataEnd = performance.now();

    if (athleteError) {
      console.error('[fetchRecruitingBoardData] Error fetching athlete sport data:', athleteError);
      throw new Error('Failed to fetch athlete sport data');
    }

    // Debug log removed('[fetchRecruitingBoardData] Athlete sport data retrieved:', athleteData?.map((a: any) => ({ id: a.id, sport_id: a.sport_id })));
    
    if (sportId && athleteData) {
      // Debug log removed(`[fetchRecruitingBoardData] Filtered to ${athleteData.length} athletes for sport ID ${sportId}`);
    }

    // Create sport_id to sport_abbreviation mapping
    const sportIdToAbbrev: Record<number, string> = {
      1: 'mbb',  // Men's Basketball
      2: 'wbb',  // Women's Basketball
      3: 'msoc', // Men's Soccer
      4: 'wsoc', // Women's Soccer
      5: 'wvol', // Women's Volleyball
      6: 'bsb',  // Baseball
      7: 'sb',   // Softball
      8: 'mcc',  // Men's Cross Country
      9: 'wcc',  // Women's Cross Country
      10: 'mglf', // Men's Golf
      11: 'wglf', // Women's Golf
      12: 'mlax', // Men's Lacrosse
      13: 'wlax', // Women's Lacrosse
      14: 'mten', // Men's Tennis
      15: 'wten', // Women's Tennis
      16: 'mtaf', // Men's Track & Field
      17: 'wtaf', // Women's Track & Field
      18: 'mswm', // Men's Swimming
      19: 'wswm', // Women's Swimming
      20: 'mwre', // Men's Wrestling
      21: 'fb',   // Football
    };

    // Group athletes by sport to optimize queries
    const athletesBySport = athleteData?.reduce((acc: Record<string, string[]>, athlete: any) => {
      const sportAbbrev = sportIdToAbbrev[athlete.sport_id];
      if (sportAbbrev) {
        if (!acc[sportAbbrev]) {
          acc[sportAbbrev] = [];
        }
        acc[sportAbbrev].push(athlete.id);
      } else {
        console.warn('[fetchRecruitingBoardData] Unknown sport_id:', athlete.sport_id, 'for athlete:', athlete.id);
      }
      return acc;
    }, {}) || {};

    // Debug log removed('[fetchRecruitingBoardData] Athletes grouped by sport:', athletesBySport);

    // 🚀 [OPTIMIZATION] If sportId is provided, only process that specific sport
    let sportsToProcess = Object.entries(athletesBySport);
    if (sportId) {
      const targetSportAbbrev = sportIdToAbbrev[parseInt(sportId)];
      if (targetSportAbbrev && athletesBySport[targetSportAbbrev]) {
        sportsToProcess = [[targetSportAbbrev, athletesBySport[targetSportAbbrev]]];
      }
    }

    // 🚀 [OPTIMIZATION] Pre-filter recruiting board data by sport to avoid querying non-existent athletes
    let preFilteredRecruitingBoard = recruitingBoardBasicWithUsers;
    if (sportId && athleteData && athleteData.length > 0) {
      const validAthleteIds = new Set(athleteData.map((a: any) => a.id));
      preFilteredRecruitingBoard = recruitingBoardBasicWithUsers.filter((item: any) => 
        validAthleteIds.has(item.athlete_id)
      );
    }

    // Fetch athlete details from all available data sources with priority order
    const athleteDetailsMap: Record<string, any> = {};
    
    for (const [sportAbbrev, athleteIdsForSport] of sportsToProcess) {
      // Debug log removed(`[fetchRecruitingBoardData] Processing sport: ${sportAbbrev} with ${(athleteIdsForSport as string[]).length} athletes`);
      
      // Determine package tier and view suffix for this sport
      const userPackageNumbers = (userDetails.packages || []).map((pkg: any) => parseInt(String(pkg), 10));
      const viewSuffix = getViewSuffixForSport(sportAbbrev, userPackageNumbers);
      const hsViewSuffix = getHsViewSuffixForSport(sportAbbrev, userPackageNumbers);
      const bestPackage = getBestPackageForSport(sportAbbrev, userPackageNumbers);
      
      // Debug log removed(`[fetchRecruitingBoardData] Best package for ${sportAbbrev}:`, bestPackage?.description || 'none');
      
      if (bestPackage) {
        // 🚀 [OPTIMIZATION] Only query for athletes that exist in recruiting board
        const athleteIdsToQuery = preFilteredRecruitingBoard
          .filter((item: any) => athletesBySport[sportAbbrev]?.includes(item.athlete_id))
          .map((item: any) => item.athlete_id);

        // Debug log removed(`[fetchRecruitingBoardData] Querying all data sources for ${athleteIdsToQuery.length} athletes`);

        // Define data sources in priority order: TP -> Athletes -> JUCO (conditional) -> HS Athletes (conditional)
        const dataSources: { name: string; viewName: string; dataSource: 'transfer_portal' | 'all_athletes' | 'juco' | 'hs_athletes' }[] = [
          {
            name: 'transfer_portal',
            viewName: `vw_tp_athletes_wide_${sportAbbrev}${viewSuffix}`,
            dataSource: 'transfer_portal' as const
          },
          {
            name: 'athletes',
            viewName: `vw_athletes_wide_${sportAbbrev}`,
            dataSource: 'all_athletes' as const
          }
        ];

        // Only add JUCO data source for sports that have JUCO data
        const jucoSports = ['wbb', 'wsoc', 'msoc', 'bsb', 'wvol'];
        if (jucoSports.includes(sportAbbrev)) {
          dataSources.push({
            name: 'juco',
            viewName: `vw_juco_athletes_wide_${sportAbbrev}`,
            dataSource: 'juco' as const
          });
        }

        // Only add high school data source if the sport has HS athlete data
        if (hsViewSuffix) {
          dataSources.push({
            name: 'high_school',
            viewName: `vw_hs_athletes_wide_${sportAbbrev}_${hsViewSuffix}`,
            dataSource: 'hs_athletes' as const
          });
        }

        // Query each data source in priority order
        for (const source of dataSources) {
          // Skip if we already have data for all athletes from higher priority sources
          const remainingAthleteIds = athleteIdsToQuery.filter((id: string) => !athleteDetailsMap[id]);
          if (remainingAthleteIds.length === 0) {
            // Debug log removed(`[fetchRecruitingBoardData] All athletes found, skipping ${source.name}`);
            break;
          }

          // Debug log removed(`[fetchRecruitingBoardData] Querying ${source.name} (${source.viewName}) for ${remainingAthleteIds.length} remaining athletes`);

          try {
            const { data: sportAthleteData, error: sportAthleteError } = await supabase
              .from(source.viewName)
              .select(`
                athlete_id,
                athlete_first_name,
                athlete_last_name,
                initiated_date,
                year,
                school_id,
                school_name,
                is_receiving_athletic_aid,
                high_school,
                address_state,
                image_url,
                height_feet,
                height_inch,
                weight,
                division,
                primary_position,
                m_status,
                survey_completed,
                conference
              `)
              .in('athlete_id', remainingAthleteIds);

            if (sportAthleteError) {
              console.error(`[fetchRecruitingBoardData] Error fetching data from ${source.viewName}:`, sportAthleteError);
            } else if (sportAthleteData && sportAthleteData.length > 0) {
              // Debug log removed(`[fetchRecruitingBoardData] Successfully fetched ${sportAthleteData.length} athletes from ${source.name}`);
              
              // Add data source information to each athlete record
              sportAthleteData.forEach((athlete: any) => {
                if (!athleteDetailsMap[athlete.athlete_id]) {
                  athleteDetailsMap[athlete.athlete_id] = {
                    ...athlete,
                    data_source: source.dataSource
                  };
                }
              });
            }
          } catch (error) {
            console.error(`[fetchRecruitingBoardData] Error accessing view ${source.viewName}:`, error);
          }
        }
      } else {
        console.warn(`[fetchRecruitingBoardData] No package tier found for sport ${sportAbbrev}. User packages:`, userDetails.packages);
      }
    }

    // Debug log removed(`[fetchRecruitingBoardData] Athlete details map populated with ${Object.keys(athleteDetailsMap).length} entries`);
    // Debug log removed('[fetchRecruitingBoardData] Missing athlete details for:', 
      preFilteredRecruitingBoard
        .filter((item: any) => !athleteDetailsMap[item.athlete_id])
        .map((item: any) => item.athlete_id)


    // Combine the recruiting board data with athlete details (already pre-filtered by sport)
    const recruitingBoardData = preFilteredRecruitingBoard
      .map((item: any) => ({
        ...item,
        athlete_with_tp_page_details: athleteDetailsMap[item.athlete_id] || null
      }));
    
    // Debug log removed(`[fetchRecruitingBoardData] After sport filtering: ${recruitingBoardData.length} recruiting board entries`);

    // Transform the data after fetching
    const recruitingBoardDataTransformed = recruitingBoardData?.map((item: any) => ({
      ...item,
      athlete_with_tp_page_details: item.athlete_with_tp_page_details
        ? {
            ...item.athlete_with_tp_page_details,
            first_name: item.athlete_with_tp_page_details.athlete_first_name,
            last_name: item.athlete_with_tp_page_details.athlete_last_name,
          }
        : null,
    })) ?? [];

    // Debug log removed(`[fetchRecruitingBoardData] Transformed ${recruitingBoardDataTransformed.length} recruiting board entries`);



    if (!recruitingBoardDataTransformed || recruitingBoardDataTransformed.length === 0) {
      return [];
    }

    // Debug log removed(`[fetchRecruitingBoardData] All data fetched from dynamic views. Starting final data transformation`);

    // Transform the data to match the expected structure
    const transformedData = recruitingBoardDataTransformed.map((item: any, index: number) => {
      const athlete = item.athlete_with_tp_page_details;
      const userDetail = item.user_detail;

      // Calculate true score - using fallback values for now
      const trueScore = 0; // Will be implemented later when tgb_score and tgp_score are added

      // Use the image URL from the athlete object with fallback

      // Use the same default image logic as athlete profile
      const imageUrl = athlete?.image_url || "/blank-user.svg";

      // Determine tier from database - if athlete_tier is null or empty, no tier is assigned
      let tier = null;
      let tierColor = null;
      
      if (item.athlete_tier) {
        const tierNumber = parseInt(item.athlete_tier);
        if (tierNumber >= 1 && tierNumber <= 3) {
          tier = tierNumber;
          // Set tier color based on tier number
          switch (tierNumber) {
            case 1:
              tierColor = "#7363BC";
              break;
            case 2:
              tierColor = "#36C5F0";
              break;
            case 3:
              tierColor = "#FF24BA";
              break;
            default:
              tierColor = "#FF24BA";
          }
        }
      }

      // Format height using data from the athlete object
      const heightFeet = athlete?.height_feet;
      const heightInch = athlete?.height_inch;
      // Round height inches to nearest 0.1 inch
      const roundedInch = heightInch ? Math.round(heightInch * 10) / 10 : null;
      const height = heightFeet && roundedInch !== null ? `${heightFeet}'${roundedInch}"` : '';
      
      // Round weight to nearest pound
      const roundedWeight = athlete?.weight ? Math.round(athlete.weight) : '';

      // Get the latest rating from our ratings map
      const latestRating = ratingsMap.get(athlete?.athlete_id);
      
      return {
        key: item.id, // Use recruiting_board_id as unique key (not index)
        id: item.id, // Use recruiting_board_id as unique identifier for drag-and-drop
        athlete_id: athlete?.athlete_id || '', // Keep athlete_id as separate field
        recruiting_board_id: item.id,
        fname: athlete?.first_name || '',
        lname: athlete?.last_name || '',
        image: imageUrl,
        imageLarge: imageUrl,
        unread: 0,
        rating: latestRating?.name || '', // Use rating name from athlete_rating, blank if no rating
        avg: trueScore,
        school: athlete?.school_name || '',
        schoolIcon: "/b.svg",
        academy: athlete?.high_school || '',
        academyIcon: "/b.svg",
        date: athlete?.initiated_date ? new Date(athlete.initiated_date).toLocaleDateString() : '',
        evaluation: 'Some Info',
        div: athlete?.division || 'D2',
        yr: athlete?.year || 'Jr',
        $: athlete?.is_receiving_athletic_aid || 'None',
        ht: height,
        high_school: athlete?.high_school || '',
        st: athlete?.address_state || '',
        wt: roundedWeight,
        s: "540",
        h: "Y",
        direction: "Flat",
        position: columnIdToName.get(item.recruiting_board_column_id) || 'Unassigned',
        primary_position: athlete?.primary_position || '',
        school_id: athlete?.school_id || '',
        conference: athlete?.conference || '',
        status: athlete?.m_status || '',
        survey_completed: athlete?.survey_completed === 'true' || athlete?.survey_completed === true,
        tier: null, // We're not using tiers anymore
        tierColor: latestRating?.color || null, // Use rating color for styling
        userFirstName: userDetail?.name_first || '',
        userLastName: userDetail?.name_last || '',
        ratingName: latestRating?.name || null,
        ratingColor: latestRating?.color || null,
        rank: item.rank,
        // Map data_source to source if source is not set
        source: item.source || (athlete?.data_source === 'hs_athletes' ? 'high_school' : null),
        data_source: athlete?.data_source || 'unknown' // Add data source information
      };
    });

    // Debug log removed(`[fetchRecruitingBoardData] Final transformation complete. Returning ${transformedData.length} athletes`);
    
    const totalTime = performance.now() - startTime;
    
    return transformedData;
  } catch (error) {
    const errorTime = performance.now() - startTime;
    throw error;
  }
}
// New function to fetch sport-specific column configurations
export async function fetchSportColumnConfig(sportId: string, allStats: boolean = false, deduplicate: boolean = true, dataSource?: 'transfer_portal' | 'all_athletes' | 'juco' | 'hs_athletes'): Promise<SportStatConfig[]> {
  // Check cache first
  const cacheKey = `${sportId}_${allStats}_${deduplicate}_${dataSource || 'default'}`;
  if (sportColumnConfigCache.has(cacheKey)) {
    return sportColumnConfigCache.get(cacheKey)!;
  }
  
  try {
    const queryStartTime = performance.now();
    
    // First, try to join with data_type table if it exists
    let query = supabase
      .from('sport_stat_config')
      .select(`
        *,
        data_type:data_type_id(name)
      `)
      .eq('sport_id', sportId);
    
    // Filter based on allStats parameter and dataSource
    if (!allStats) {
      if (dataSource === 'juco') {
        // For juco, filter by juco_search_column_display
        query = query.not('juco_search_column_display', 'is', null);
      } else if (dataSource === 'hs_athletes') {
        // For hs_athletes, filter by hs_athlete_search_column_display
        query = query.not('hs_athlete_search_column_display', 'is', null);
      } else {
        // For other data sources, use search_column_display
        query = query.not('search_column_display', 'is', null);
      }
    } else if (dataSource === 'juco') {
      // When requesting all stats for juco, filter by juco_stat column
      query = query.eq('juco_stat', true);
    }
    
    // Use different ordering based on allStats parameter and dataSource
    if (allStats) {
      query = query.order('stat_category', { ascending: true }).order('display_order', { ascending: true });
    } else {
      if (dataSource === 'juco') {
        query = query.order('juco_search_column_display', { ascending: true });
      } else if (dataSource === 'hs_athletes') {
        query = query.order('hs_athlete_search_column_display', { ascending: true });
      } else {
        query = query.order('search_column_display', { ascending: true });
      }
    }
    
    const result = await query;
    
    const { error } = result;
    let { data } = result;

    // If the join fails (data_type table doesn't exist), fall back to basic query
    if (error) {
      let basicQuery = supabase
        .from('sport_stat_config')
        .select('*')
        .eq('sport_id', sportId);
      
      // Only filter by search_column_display if not requesting all stats
      if (!allStats) {
        if (dataSource === 'juco') {
          // For juco, filter by juco_search_column_display
          basicQuery = basicQuery.not('juco_search_column_display', 'is', null);
        } else if (dataSource === 'hs_athletes') {
          // For hs_athletes, filter by hs_athlete_search_column_display
          basicQuery = basicQuery.not('hs_athlete_search_column_display', 'is', null);
        } else {
          // For other data sources, use search_column_display
          basicQuery = basicQuery.not('search_column_display', 'is', null);
        }
      }
      
      // Use different ordering based on allStats parameter and dataSource
      if (allStats) {
        basicQuery = basicQuery.order('stat_category', { ascending: true }).order('display_order', { ascending: true });
      } else {
        if (dataSource === 'juco') {
          basicQuery = basicQuery.order('juco_search_column_display', { ascending: true });
        } else if (dataSource === 'hs_athletes') {
          basicQuery = basicQuery.order('hs_athlete_search_column_display', { ascending: true });
        } else {
          basicQuery = basicQuery.order('search_column_display', { ascending: true });
        }
      }
      
      const { data: basicData, error: basicError } = await basicQuery;
      
      if (basicError) {
        console.error('Error fetching sport column config:', basicError);
        return [];
      }
      
      data = basicData;
    }

    if (error) {
      console.error('Error fetching sport column config:', error);
      return [];
    }

    // Map data_type_id to names and decimal places if we don't have them from the join
    const dataTypeConfigMap: Record<number, { name: string; decimalPlaces?: number; isPercentage?: boolean; convertNegativeToZero?: boolean }> = {
      6: { name: 'Weight', decimalPlaces: 0 },
      98: { name: 'Games Played' },
      83: { name: 'Games Started' }, 
      100: { name: 'Goals' },
      101: { name: 'Assists' },
      102: { name: 'Points' },
      103: { name: 'Shot Attempts' },
      104: { name: 'Fouls' },
      84: { name: 'Minutes Played' },
      85: { name: 'Goals Against' },
      86: { name: 'Goals Against Average' },
      87: { name: 'Saves' },
      88: { name: 'Save Percentage', decimalPlaces: 1, isPercentage: true },
      155: { name: 'BA', decimalPlaces: 3 }, // Batting Average - 3 decimal places
      156: { name: 'OB %', decimalPlaces: 3 }, // On Base Percentage - 1 decimal place as percentage
      157: { name: 'SLG %', decimalPlaces: 3 }, // Slugging Percentage - 1 decimal place as percentage
      178: { name: 'ERA', decimalPlaces: 2 }, // Earned Run Average - 2 decimal places
      179: { name: 'IP', decimalPlaces: 1 }, // Innings Pitched - 1 decimal place
      216: { name: 'WHIP', decimalPlaces: 2 }, // Walks + Hits per Inning - 2 decimal places
      217: { name: 'OPS', decimalPlaces: 3 }, // On Base + Slugging - 3 decimal places
      218: { name: 'K/BB', decimalPlaces: 2 }, // Strikeout to Walk Ratio - 2 decimal places
      220: { name: 'wOBA', decimalPlaces: 3 }, // Weighted On Base Average - 3 decimal places
      221: { name: 'TGb', decimalPlaces: 0 }, // True Score (Batting) - 1 decimal places
      222: { name: 'FIP', decimalPlaces: 1 }, // Fielding Independent Pitching - 1 decimal places
      223: { name: 'TGp', decimalPlaces: 0 }, // True Score (Pitching) - 1 decimal places
      226: { name: 'K/9', decimalPlaces: 1 }, // Strikeouts per 9 innings - 1 decimal place
      227: { name: 'BB/9', decimalPlaces: 1 }, // Walks per 9 innings - 1 decimal place
      628: { name: 'K%', decimalPlaces: 1, isPercentage: true }, // Strikeout Percentage - 1 decimal place as percentage
      629: { name: 'BB%', decimalPlaces: 1, isPercentage: true }, // Walk Percentage - 1 decimal place as percentage
      210: { name: 'FLD %', decimalPlaces: 3 }, // Fielding Percentage - 3 decimal places as percentage
      304: { name: 'Height' }, // Height - special handling for feet/inches
      373: { name: 'VIS', decimalPlaces: 0, convertNegativeToZero: true }, // VIS - no decimal places, convert negatives to zero
      374: { name: 'VPR', decimalPlaces: 0, convertNegativeToZero: true }, // VPR - no decimal places, convert negatives to zero
      288: { name: 'PPG', decimalPlaces: 1 }, // ppg - one decimpal place
      292: { name: 'RPG', decimalPlaces: 1 }, // rpg - one decimpal place
      636: { name: 'APG', decimalPlaces: 1 }, // apg - one decimpal place
      637: { name: 'FPG', decimalPlaces: 1 }, // rpg - one decimpal place
      638: { name: 'MPG', decimalPlaces: 1 },
      650: { name: 'Kills/Set', decimalPlaces: 2 },
      219: { name: 'BB/SO', decimalPlaces: 2 },
      673: { name: 'SO/7', decimalPlaces: 2 },
      674: { name: 'BB/7', decimalPlaces: 2 },
      675: { name: 'H/7', decimalPlaces: 2 },
      676: { name: 'TO', decimalPlaces: 1 },
      677: { name: 'STL', decimalPlaces: 1 },
      678: { name: 'BLK', decimalPlaces: 1 },
      700: { name: 'Score', decimalPlaces: 1 },
      986: { name: 'Avg', decimalPlaces: 1 },
      987: { name: 'Avg/g', decimalPlaces: 1 },
      988: { name: 'Avg/g', decimalPlaces: 1 },
      989: { name: 'Avg/g', decimalPlaces: 1 },
      990: { name: 'Avg', decimalPlaces: 1 },
      // Add more mappings as needed
    };

    // Add data_type_name to each config and sanitize it for SQL
    const configsWithNames = (data || []).map((config: any) => {
      const dataTypeConfig = dataTypeConfigMap[config.data_type_id];
      const dataTypeName = config.data_type?.name || dataTypeConfig?.name || `Stat ${config.data_type_id}`;
      const decimalPlaces = dataTypeConfig?.decimalPlaces;
      const isPercentage = dataTypeConfig?.isPercentage;
      const convertNegativeToZero = dataTypeConfig?.convertNegativeToZero;
      
      // Sanitize the column name for SQL - replace special characters with underscores
      const sanitizedName = dataTypeName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_') // Replace any non-alphanumeric characters with underscores
        .replace(/_+/g, '_') // Replace multiple consecutive underscores with single underscore
        .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
      
      return {
        ...config,
        data_type_name: dataTypeName,
        sanitized_column_name: sanitizedName,
        decimal_places: decimalPlaces,
        is_percentage: isPercentage,
        convert_negative_to_zero: convertNegativeToZero
      };
    });



    // Deduplicate by data_type_id if requested (for filter dropdowns to prevent duplicate keys)
    // Keep both categories for stats display when deduplicate = false
    let finalConfigs = configsWithNames;
    
    if (deduplicate) {
      // For filtering, we only need one entry per data_type_id to avoid duplicate keys
      const uniqueConfigMap = new Map();
      configsWithNames.forEach((config: any) => {
        const dataTypeId = config.data_type_id;
        if (!uniqueConfigMap.has(dataTypeId)) {
          uniqueConfigMap.set(dataTypeId, config);
        }
      });
      finalConfigs = Array.from(uniqueConfigMap.values());
    }

    // Cache the result with the proper key
    sportColumnConfigCache.set(cacheKey, finalConfigs);
    
    return finalConfigs;
  } catch (error) {
    console.error('Error in fetchSportColumnConfig:', error);
    return [];
  }
}

// High School table column configuration based on hs_table_config
export async function fetchHighSchoolColumnConfig(): Promise<Array<{ display_name: string; data_type_id: number; sanitized_column_name: string; search_column_display: number }>> {
  try {
    const { data, error } = await supabase
      .from('hs_table_config')
      .select('display_name, search_column_display, data_type_id, data_type:data_type_id(name)')
      .order('search_column_display', { ascending: true, nullsLast: true });
    if (error) {
      console.error('Error in fetchHighSchoolColumnConfig:', error);
      return [];
    }

    const configs = (data || [])
      .filter((row: any) => row.display_name && row.data_type_id && row.search_column_display !== null && row.search_column_display !== '' && Number(row.search_column_display) > 0)
      .map((row: any) => {
        const dataTypeName = row?.data_type?.name || row.display_name;
        const sanitized = String(dataTypeName)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '');
        return {
          display_name: row.display_name as string,
          data_type_id: Number(row.data_type_id),
          sanitized_column_name: sanitized,
          search_column_display: Number(row.search_column_display)
        };
      });

    return configs;
  } catch (e) {
    console.error('Unexpected error in fetchHighSchoolColumnConfig:', e);
    return [];
  }
}

// Helper function to get column name by data_type_id directly from data_type table
async function getHSColumnNameByDataTypeId(dataTypeId: number): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('data_type')
      .select('name')
      .eq('id', dataTypeId)
      .single();
    
    if (error || !data) {
      console.error(`Error fetching column name for data_type_id ${dataTypeId}:`, error);
      return null;
    }
    
    const columnName = data.name;
    if (!columnName) return null;
    
    // Sanitize the column name for SQL (same logic as in fetchHighSchoolColumnConfig)
    return String(columnName)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  } catch (e) {
    console.error(`Error in getHSColumnNameByDataTypeId for ${dataTypeId}:`, e);
    return null;
  }
}

// Fetch distinct values from high school wide table by data_type_id
export async function fetchHSDistinctValuesByDataTypeId(dataTypeId: number): Promise<string[]> {
  try {
    const columnName = await getHSColumnNameByDataTypeId(dataTypeId);
    if (!columnName) {
      console.error(`Could not find column name for data_type_id ${dataTypeId}`);
      return [];
    }

    const { data, error } = await supabase
      .from('vw_high_school')
      .select(columnName)
      .not(columnName, 'is', null)
      .neq(columnName, '');

    if (error) {
      console.error(`Error fetching distinct values for ${columnName}:`, error);
      return [];
    }

    // Extract unique values and sort
    const values = [...new Set((data || []).map((row: any) => row[columnName]).filter((val: any) => val))] as string[];
    return values.sort();
  } catch (error) {
    console.error(`Error in fetchHSDistinctValuesByDataTypeId for ${dataTypeId}:`, error);
    return [];
  }
}

// Specific function to fetch high school states (data_type_id 1013)
export async function fetchHSStates(): Promise<string[]> {
  return fetchHSDistinctValuesByDataTypeId(1013);
}

// Specific function to fetch high school counties (data_type_id 991)
export async function fetchHSCounties(): Promise<string[]> {
  return fetchHSDistinctValuesByDataTypeId(991);
}

// Fetch counties with state abbreviations from the hs_county column
export async function fetchCountiesWithStateAbbrev(): Promise<{ value: string; label: string }[]> {
  try {
    const { data, error } = await supabase
      .from('vw_high_school')
      .select('hs_county')
      .not('hs_county', 'is', null)
      .neq('hs_county', '')
      .order('hs_county', { ascending: true });

    if (error) {
      console.error('Error fetching counties with state info:', error);
      return [];
    }

    // Extract unique county values and sort
    const uniqueCounties = [...new Set((data || []).map((row: any) => row.hs_county).filter((val: any) => val))] as string[];
    
    return uniqueCounties.map(county => ({
      value: county,
      label: county
    }));
  } catch (error) {
    console.error('Error in fetchCountiesWithStateAbbrev:', error);
    return [];
  }
}

// Fetch recruiting areas for a specific coach
export async function fetchRecruitingAreasForCoach(userId: string): Promise<{
  stateIds: number[];
  countyIds: number[];
  schoolIds: string[];
}> {
  try {
    const { data, error } = await supabase
      .from('recruiting_area')
      .select('state_id, county_id, school_id')
      .eq('user_id', userId)
      .is('ended_at', null); // Only active recruiting areas

    if (error) {
      console.error('Error fetching recruiting areas:', error);
      return { stateIds: [], countyIds: [], schoolIds: [] };
    }

    const stateIds = (data || []).map((r: any) => r.state_id).filter(Boolean);
    const countyIds = (data || []).map((r: any) => r.county_id).filter(Boolean);
    const schoolIds = (data || []).map((r: any) => r.school_id).filter(Boolean);
    
    return { stateIds, countyIds, schoolIds };
  } catch (error) {
    console.error('❌ Error in fetchRecruitingAreasForCoach:', error);
    return { stateIds: [], countyIds: [], schoolIds: [] };
  }
}

// Check if a coach has active recruiting areas
export async function checkCoachHasActiveAreas(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('recruiting_area')
      .select('id')
      .eq('user_id', userId)
      .is('ended_at', null)
      .limit(1);

    if (error) {
      console.error('Error checking coach areas:', error);
      return false;
    }

    return (data || []).length > 0;
  } catch (error) {
    console.error('Error in checkCoachHasActiveAreas:', error);
    return false;
  }
}

// Convert county IDs to county names with state abbreviations
export async function convertCountyIdsToNames(countyIds: number[]): Promise<string[]> {
  try {
    if (countyIds.length === 0) return [];
    
    const { data, error } = await supabase
      .from('county')
      .select('id, name, state(name, abbrev)')
      .in('id', countyIds);

    if (error) {
      console.error('Error fetching county names:', error);
      return [];
    }
    
    return (data || []).map((county: any) => 
      `${county.name} (${county.state?.abbrev || 'Unknown'})`
    );
  } catch (error) {
    console.error('❌ Error in convertCountyIdsToNames:', error);
    return [];
  }
}

// Convert state IDs to state abbreviations
export async function convertStateIdsToAbbrevs(stateIds: number[]): Promise<string[]> {
  try {
    if (stateIds.length === 0) return [];
    
    const { data, error } = await supabase
      .from('state')
      .select('id, abbrev')
      .in('id', stateIds);

    if (error) {
      console.error('Error fetching state abbreviations:', error);
      return [];
    }
    
    return (data || []).map((state: any) => state.abbrev);
  } catch (error) {
    console.error('❌ Error in convertStateIdsToAbbrevs:', error);
    return [];
  }
}

// Convert county names with state abbreviations to county IDs
export async function convertCountyNamesToIds(countyNames: string[]): Promise<number[]> {
  try {
    if (countyNames.length === 0) return [];
    
    // Parse county names in format "County Name (ST)" to extract county name and state abbreviation
    const countyStatePairs = countyNames.map(name => {
      const match = name.match(/^(.+?)\s*\(([A-Z]{2})\)$/);
      if (match) {
        return { countyName: match[1].trim(), stateAbbrev: match[2] };
      }
      return null;
    }).filter((pair): pair is { countyName: string; stateAbbrev: string } => pair !== null);
    
    if (countyStatePairs.length === 0) return [];
    
    // Get state IDs for the abbreviations
    const stateAbbrevs = [...new Set(countyStatePairs.map(pair => pair.stateAbbrev))];
    const { data: statesData, error: statesError } = await supabase
      .from('state')
      .select('id, abbrev')
      .in('abbrev', stateAbbrevs) as { data: { id: number; abbrev: string }[] | null; error: any };
    
    if (statesError) {
      console.error('Error fetching states:', statesError);
      return [];
    }
    
    // Get county IDs
    const countyIds: number[] = [];
    for (const pair of countyStatePairs) {
      const state = statesData?.find(s => s.abbrev === pair.stateAbbrev);
      if (state) {
        const { data: countyData, error: countyError } = await supabase
          .from('county')
          .select('id')
          .eq('name', pair.countyName)
          .eq('state_id', state.id)
          .limit(1);
        
        if (!countyError && countyData && countyData.length > 0) {
          countyIds.push(countyData[0].id);
        }
      }
    }
    
    return countyIds;
  } catch (error) {
    console.error('❌ Error in convertCountyNamesToIds:', error);
    return [];
  }
}

// Specific function to fetch high school religious affiliations (data_type_id 961)
export async function fetchHSReligiousAffiliations(): Promise<string[]> {
  return fetchHSDistinctValuesByDataTypeId(961);
}

// Fallback function for batched athlete facts queries
async function fetchAthleteFactsWithBatching(athleteIds: string[]): Promise<any[]> {
  const batchSize = 25;
  const athleteFactData: any[] = [];
  
  for (let i = 0; i < athleteIds.length; i += batchSize) {
    const batch = athleteIds.slice(i, i + batchSize);
    const batchStartTime = performance.now();
    
    try {
      const { data: batchData, error: batchError } = await supabase
        .from('athlete_fact')
        .select('athlete_id, data_type_id, value')
        .or('inactive.is.null,inactive.eq.false')
        .in('athlete_id', batch)
        .in('data_type_id', [1, 2, 7, 24, 251])
        .order('athlete_id');

      const batchEndTime = performance.now();
      // Debug log removed(`[PERF] Athlete facts batch ${i}-${i + batchSize} completed in ${batchEndTime - batchStartTime}ms`);

      if (batchError) {
        console.error(`[PERF] Athlete fact data query error for batch ${i}-${i + batchSize}:`, batchError);
      } else if (batchData) {
        athleteFactData.push(...batchData);
      }
    } catch (error) {
      console.error(`[PERF] Exception in athlete facts batch ${i}-${i + batchSize}:`, error);
    }
  }
  
  // Debug log removed(`[PERF] Fallback batching completed, total facts: ${athleteFactData.length}`);
  return athleteFactData;
}

// Fallback function for batched stats queries
async function fetchStatsWithBatching(athleteIds: string[], dynamicStatTypes: number[]): Promise<any[]> {
  const batchSize = 25;
  const statsData: any[] = [];
  
  for (let i = 0; i < athleteIds.length; i += batchSize) {
    const batch = athleteIds.slice(i, i + batchSize);
    const batchStartTime = performance.now();
    
    try {
      const { data: batchStatsData, error: batchStatsError } = await supabase
        .from('stat')
        .select('athlete_id, data_type_id, value')
        .in('athlete_id', batch)
        .in('data_type_id', dynamicStatTypes)
        .order('athlete_id');

      const batchEndTime = performance.now();
      // Debug log removed(`[PERF] Stats batch ${i}-${i + batchSize} completed in ${batchEndTime - batchStartTime}ms`);

      if (batchStatsError) {
        console.error(`[PERF] Stats query error for batch ${i}-${i + batchSize}:`, batchStatsError);
      } else if (batchStatsData) {
        statsData.push(...batchStatsData);
      }
    } catch (error) {
      console.error(`[PERF] Exception in stats batch ${i}-${i + batchSize}:`, error);
    }
  }
  
  // Debug log removed(`[PERF] Fallback stats batching completed, total stats: ${statsData.length}`);
  return statsData;
}

// Fallback function for batched school facts queries
async function fetchSchoolFactsWithBatching(schoolIds: string[]): Promise<any[]> {
  const batchSize = 25;
  const schoolFactData: any[] = [];
  
  for (let i = 0; i < schoolIds.length; i += batchSize) {
    const batch = schoolIds.slice(i, i + batchSize);
    const batchStartTime = performance.now();
    
    try {
      const { data: batchSchoolData, error: batchSchoolError } = await supabase
        .from('school_fact')
        .select('school_id, value')
        .eq('data_type_id', 119)
        .in('school_id', batch)
        .order('school_id');

      const batchEndTime = performance.now();
      // Debug log removed(`[PERF] School facts batch ${i}-${i + batchSize} completed in ${batchEndTime - batchStartTime}ms`);

      if (batchSchoolError) {
        console.error(`[PERF] School fact query error for batch ${i}-${i + batchSize}:`, batchSchoolError);
      } else if (batchSchoolData) {
        schoolFactData.push(...batchSchoolData);
      }
    } catch (error) {
      console.error(`[PERF] Exception in school facts batch ${i}-${i + batchSize}:`, error);
    }
  }
  
  // Debug log removed(`[PERF] Fallback school facts batching completed, total facts: ${schoolFactData.length}`);
  return schoolFactData;
}
// Cache for international options to prevent repeated expensive queries
const internationalOptionsCache = new Map<string, string[]>();

export async function fetchInternationalOptions(sportId?: string): Promise<string[]> {
  // Check cache first
  const cacheKey = sportId || 'all';
  if (internationalOptionsCache.has(cacheKey)) {
    return internationalOptionsCache.get(cacheKey)!;
  }

  try {
    let internationalLocations: string[] = [];

    if (sportId) {
      // Use the pre-computed view for lightning-fast results
      try {
        // Debug log removed(`Fetching international locations for sport ${sportId} from view`);
        
        // Query the distinct_state_values_by_sport view for this specific sport
        // (US states are already excluded in the view)
        // Add timeout to prevent hanging
        const queryPromise = supabase
          .from('distinct_state_values_by_sport')
          .select('value')
          .eq('sport_id', sportId);
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Query timeout after 10 seconds')), 10000);
        });
        
        const result = await Promise.race([queryPromise, timeoutPromise]) as any;
        const { data: viewData, error: viewError } = result;

        if (viewError) {
          console.error('View query failed:', viewError);
          return getFallbackInternationalOptions();
        }

        if (!viewData || viewData.length === 0) {
          // Debug log removed('No international locations found in view for sport:', sportId);
          return getFallbackInternationalOptions();
        }

        // Extract values from the view data
        internationalLocations = viewData.map((item: { value: string }) => item.value).filter((value: string) => value && value.trim() !== '');
        // Debug log removed(`Found ${internationalLocations.length} international locations for sport ${sportId} from view`);
        
      } catch (error) {
        console.error('View query failed, using fallback:', error);
        internationalLocations = getFallbackInternationalOptions();
      }
    } else {
      // Get all international locations from the view (across all sports)
      try {
        // Debug log removed('Fetching all international locations from view');
        
        // Add timeout to prevent hanging
        const allQueryPromise = supabase
          .from('distinct_state_values_by_sport')
          .select('value')
          .not('value', 'is', null)
          .neq('value', '')
          .order('value', { ascending: true });
        
        const allTimeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Query timeout after 10 seconds')), 10000);
        });
        
        const allResult = await Promise.race([allQueryPromise, allTimeoutPromise]) as any;
        const { data: allViewData, error: allViewError } = allResult;

        if (allViewError) {
          console.error('Error fetching all international options from view:', allViewError);
          return getFallbackInternationalOptions();
        }

        if (!allViewData || allViewData.length === 0) {
          // Debug log removed('No international locations found in view');
          return getFallbackInternationalOptions();
        }

        // Get unique values (in case same location appears in multiple sports)
        const uniqueValues = [...new Set(allViewData.map((item: { value: string }) => item.value).filter((value: string) => value && value.trim() !== ''))] as string[];
        internationalLocations = uniqueValues.sort();
        // Debug log removed(`Found ${internationalLocations.length} total international locations across all sports`);
        
      } catch (error) {
        console.error('Error fetching all international options, using fallback:', error);
        internationalLocations = getFallbackInternationalOptions();
      }
    }

    // If no data found, use fallback
    if (internationalLocations.length === 0) {
      // Debug log removed('No international locations found, using fallback');
      internationalLocations = getFallbackInternationalOptions();
    }
    
    // Cache the result
    internationalOptionsCache.set(cacheKey, internationalLocations);
    
    return internationalLocations;
  } catch (error) {
    console.error('Error in fetchInternationalOptions:', error);
    return getFallbackInternationalOptions();
  }
}

// Helper function to get fallback international options
function getFallbackInternationalOptions(): string[] {
  const fallbackOptions = [
    'Canada', 'Mexico', 'Puerto Rico', 'Dominican Republic', 'Cuba', 
    'Venezuela', 'Colombia', 'Brazil', 'Argentina', 'Chile', 'Peru',
    'Japan', 'South Korea', 'Taiwan', 'China', 'Australia', 'New Zealand',
    'United Kingdom', 'Germany', 'France', 'Italy', 'Spain', 'Netherlands',
    'Belgium', 'Switzerland', 'Austria', 'Sweden', 'Norway', 'Denmark',
    'Finland', 'Poland', 'Czech Republic', 'Hungary', 'Romania', 'Bulgaria',
    'Greece', 'Turkey', 'Israel', 'South Africa', 'Nigeria', 'Kenya',
    'Ghana', 'Egypt', 'Morocco', 'Tunisia', 'Algeria', 'Libya'
  ];
  
  return fallbackOptions;
}

export async function fetchPositionsBySportId(sportId: string): Promise<{ name: string; order: number; other_filter: boolean; include_filter: string | null }[]> {
  try {
    const { data, error } = await supabase
      .from('position')
      .select('name, "order", other_filter, include_filter')
      .eq('sport_id', sportId)
      .order('order', { ascending: true });

    if (error) {
      console.error('Error fetching positions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchPositionsBySportId:', error);
    return [];
  }
}

/**
 * Fetches position names by their IDs
 * @param positionIds - Array of position IDs
 * @returns Array of position names
 */
export async function fetchPositionNamesByIds(positionIds: string[]): Promise<string[]> {
  if (!positionIds.length) return [];
  
  try {
    const { data, error } = await supabase
      .from('position')
      .select('name')
      .in('id', positionIds);

    if (error) {
      console.error('Error fetching position names by IDs:', error);
      return [];
    }

    return data?.map((p: { name: string }) => p.name) || [];
  } catch (error) {
    console.error('Error in fetchPositionNamesByIds:', error);
    return [];
  }
}

/**
 * Expands position filters based on other_filter and include_filter logic
 * 
 * This function implements the position filtering logic where:
 * - If a position has other_filter = true, it will also include positions specified in include_filter
 * - The include_filter column contains comma-separated position IDs
 * - This allows certain positions to automatically include related positions in the filter
 * 
 * Example: If "Quarterback" has other_filter=true and include_filter="1,2,3", 
 * then selecting "Quarterback" will also filter for positions with IDs 1, 2, and 3
 * 
 * @param selectedPositions - Array of selected position names
 * @param allPositions - Array of all positions with other_filter and include_filter data
 * @returns Array of expanded position names to filter by
 */
export async function expandPositionFilters(
  selectedPositions: string[], 
  allPositions: { name: string; other_filter: boolean; include_filter: string | null }[]
): Promise<string[]> {
  if (!selectedPositions.length || !allPositions.length) {
    return selectedPositions;
  }

  const expandedPositions = new Set<string>(selectedPositions);

  // For each selected position, check if it has other_filter enabled
  for (const selectedPosition of selectedPositions) {
    const positionData = allPositions.find(p => p.name === selectedPosition);
    
    if (positionData?.other_filter && positionData.include_filter) {
      // Parse the comma-separated position IDs and convert to position names
      const includePositionIds = positionData.include_filter.split(',').map(id => id.trim());
      
      // Fetch position names for the included position IDs
      const includedPositionNames = await fetchPositionNamesByIds(includePositionIds);
      
      // Add the included position names to our expanded set
      includedPositionNames.forEach(positionName => {
        expandedPositions.add(positionName);
      });
    }
  }

  return Array.from(expandedPositions);
}

// Function to fetch school logos from school_fact table
export async function fetchSchoolLogos(schoolIds: string[]): Promise<Record<string, string>> {
  if (!schoolIds.length) return {};
  
  try {
    const { data, error } = await supabase
      .from('school_fact')
      .select('school_id, value')
      .eq('data_type_id', 23) // Logo URL data type
      .in('school_id', schoolIds);

    if (error) {
      console.error('Error fetching school logos:', error);
      return {};
    }

    // Create a map of school_id to logo URL
    const logoMap: Record<string, string> = {};
    data?.forEach((fact: { school_id: string; value: string }) => {
      if (fact.value) {
        logoMap[fact.school_id] = fact.value;
      }
    });

    return logoMap;
  } catch (error) {
    console.error('Error in fetchSchoolLogos:', error);
    return {};
  }
}

// Function to fetch all schools
export async function fetchSchools(): Promise<{ id: string; name: string }[]> {
  try {
    const { data, error } = await supabase
      .from('school')
      .select('id, name')
      .order('name');

    if (error) {
      console.error('Error fetching schools:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchSchools:', error);
    return [];
  }
}

// New function to fetch schools by division using the utility
export async function fetchSchoolsByDivision(division?: 'D1' | 'D2' | 'D3' | 'NAIA' | 'ALL'): Promise<{ id: string; name: string }[]> {
  const { fetchSchoolsByDivision: fetchByDivision } = await import('@/utils/schoolUtils');
  return fetchByDivision({ division: division === 'ALL' ? undefined : division });
}

// Function to fetch coach information from school_fact table for JUCO athletes
export async function fetchJucoCoachInfo(schoolId: string, sportAbbrev: string): Promise<{
  name?: string;
  email?: string;
  officePhone?: string;
  cellPhone?: string;
} | null> {
  if (!schoolId || !sportAbbrev) return null;

  // Map sport abbreviations to their coach info data type IDs
  const sportToCoachDataTypes: Record<string, {
    name: number;
    email: number;
    officePhone: number;
    cellPhone?: number; // Some sports don't have cell phone data
  }> = {
    bsb: {
      name: 652,
      email: 653,
      officePhone: 654,
      cellPhone: 655
    },
    wvol: {
      name: 656,
      email: 657,
      officePhone: 658,
      cellPhone: 659
    },
    msoc: {
      name: 660,
      email: 661,
      officePhone: 662
    },
    wbb: {
      name: 664,
      email: 669,
      officePhone: 670
    },
    wsoc: {
      name: 665,
      email: 666,
      officePhone: 667,
      cellPhone: 668
    }
  };

  const coachDataTypes = sportToCoachDataTypes[sportAbbrev];
  if (!coachDataTypes) {
    return null;
  }

  try {
    // Get all data type IDs for this sport
    const dataTypeIds = [
      coachDataTypes.name,
      coachDataTypes.email,
      coachDataTypes.officePhone,
      ...(coachDataTypes.cellPhone ? [coachDataTypes.cellPhone] : [])
    ];

    const { data, error } = await supabase
      .from('school_fact')
      .select('data_type_id, value')
      .eq('school_id', schoolId)
      .in('data_type_id', dataTypeIds);

    if (error) {
      console.error('Error fetching coach info:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    // Map the results to coach info
    const coachInfo: {
      name?: string;
      email?: string;
      officePhone?: string;
      cellPhone?: string;
    } = {};

    data.forEach((fact: { data_type_id: number; value: string }) => {
      if (fact.data_type_id === coachDataTypes.name) {
        coachInfo.name = fact.value;
      } else if (fact.data_type_id === coachDataTypes.email) {
        coachInfo.email = fact.value;
      } else if (fact.data_type_id === coachDataTypes.officePhone) {
        coachInfo.officePhone = fact.value;
      } else if (coachDataTypes.cellPhone && fact.data_type_id === coachDataTypes.cellPhone) {
        coachInfo.cellPhone = fact.value;
      }
    });

    return coachInfo;
  } catch (error) {
    console.error('Error in fetchJucoCoachInfo:', error);
    return null;
  }
}

// Function to fetch conferences based on sport abbreviation
export async function fetchConferences(sportAbbrev: string): Promise<string[]> {
  try {
    // Map sport abbreviations to their conference column names
    const sportToConferenceColumn: Record<string, string> = {
      'fb': 'conference',
      'bsb': 'bsb_conference', 
      'sb': 'sb_conference',
      'wbb': 'wbb_conference',
      'mbb': 'mbb_conference',
      'msoc': 'msoc_conference',
      'wsoc': 'wsoc_conference',
      'wvol': 'wvol_conference',
      'mlax': 'mlax_conference',
      'wlax': 'wlax_conference',
      'mten': 'mten_conference',
      'wten': 'wten_conference',
      'mglf': 'mglf_conference',
      'wglf': 'wglf_conference',
      'mtaf': 'mtaf_conference',
      'wtaf': 'wtaf_conference',
      'mswm': 'mswm_conference',
      'wswm': 'wswm_conference',
      'mwre': 'mwre_conference'
    };

    const conferenceColumn = sportToConferenceColumn[sportAbbrev];
    
    if (!conferenceColumn) {
      console.warn(`No conference column mapping found for sport: ${sportAbbrev}`);
      return [];
    }

    // Use the appropriate materialized view based on sport
    const viewName = `vw_athletes_wide_${sportAbbrev}`;
    
    const { data, error } = await supabase
      .from(viewName)
      .select(conferenceColumn)
      .not(conferenceColumn, 'is', null)
      .not(conferenceColumn, 'eq', '');

    if (error) {
      console.error(`Error fetching conferences for ${sportAbbrev} using column ${conferenceColumn}:`, error);
      // If the column doesn't exist in this view, return empty array
      return [];
    }

    // Extract unique conference values
    const conferences = [...new Set(
      data
        .map((item: any) => item[conferenceColumn] as string)
        .filter((conf: string) => conf && conf.trim() !== '')
    )].sort() as string[];

    return conferences;
  } catch (error) {
    console.error('Error fetching conferences:', error);
    return [];
  }
}

// Function to fetch conferences for activity feed (from recruiting college data)
export async function fetchActivityFeedConferences(): Promise<string[]> {
  try {
    // Try different activity feed views in order of preference
    const viewNames = [
      'vw_activity_feed_fb_platinum',
      'vw_activity_feed_fb_gold', 
      'vw_activity_feed_fb_silver_plus'
    ];

    for (const viewName of viewNames) {
      try {
        const { data, error } = await supabase
          .from(viewName)
          .select('sfw_conference')
          .not('sfw_conference', 'is', null)
          .not('sfw_conference', 'eq', '')
          .limit(1000); // Limit to prevent large queries

        if (!error && data && data.length > 0) {
          // Extract unique conference values
          const conferences = [...new Set(
            data
              .map((item: any) => item.sfw_conference as string)
              .filter((conf: string) => conf && conf.trim() !== '')
          )].sort() as string[];

          if (conferences.length > 0) {
            return conferences;
          }
        }
      } catch (viewError) {
        console.warn(`View ${viewName} not available, trying next...`);
        continue;
      }
    }

    // If no views work, return empty array
    console.warn('No activity feed views available for conferences');
    return [];
  } catch (error) {
    console.error('Error fetching activity feed conferences:', error);
    return [];
  }
}

// Function to fetch level options for activity feed (from sfw_fbs_conf_group)
export async function fetchActivityFeedLevels(): Promise<string[]> {
  try {
    // Try different activity feed views in order of preference
    const viewNames = [
      'vw_activity_feed_fb_platinum',
      'vw_activity_feed_fb_gold', 
      'vw_activity_feed_fb_silver_plus'
    ];

    for (const viewName of viewNames) {
      try {
        const { data, error } = await supabase
          .from(viewName)
          .select('sfw_fbs_conf_group')
          .not('sfw_fbs_conf_group', 'is', null)
          .not('sfw_fbs_conf_group', 'eq', '')
          .limit(1000); // Limit to prevent large queries

        if (!error && data && data.length > 0) {
          // Extract unique level values
          const levels = [...new Set(
            data
              .map((item: any) => item.sfw_fbs_conf_group as string)
              .filter((level: string) => level && level.trim() !== '')
          )].sort() as string[];

          if (levels.length > 0) {
            return levels;
          }
        }
      } catch (viewError) {
        console.warn(`View ${viewName} not available, trying next...`);
        continue;
      }
    }

    // If no views work, return fallback levels
    console.warn('No activity feed views available for levels, using fallback');
    return ['P4', 'G5', 'FCS', 'D2', 'NAIA', 'D3', 'Other'];
  } catch (error) {
    console.error('Error fetching activity feed levels:', error);
    // Return fallback levels on error
    return ['P4', 'G5', 'FCS', 'D2', 'NAIA', 'D3', 'Other'];
  }
}

// Function to fetch school options for activity feed (from sfw_school_name)
export async function fetchActivityFeedSchools(): Promise<string[]> {
  try {
    // Try different activity feed views in order of preference
    const viewNames = [
      'vw_activity_feed_fb_platinum',
      'vw_activity_feed_fb_gold',
      'vw_activity_feed_fb_silver_plus'
    ];

    for (const viewName of viewNames) {
      try {
        const { data, error } = await supabase
          .from(viewName)
          .select('sfw_school_name')
          .not('sfw_school_name', 'is', null)
          .not('sfw_school_name', 'eq', '');

        if (!error && data && data.length > 0) {
          const schools = [...new Set(
            data
              .map((item: any) => item.sfw_school_name as string)
              .filter((school: string) => school && school.trim() !== '')
          )].sort() as string[];

          console.log(`Found ${schools.length} unique schools in ${viewName}`);
          
          if (schools.length > 0) {
            return schools;
          }
        }
      } catch (viewError) {
        console.warn(`View ${viewName} not available, trying next...`);
        continue;
      }
    }

    // If no views work, try to get schools from the main school table as fallback
    console.warn('No activity feed views available for schools, trying fallback...');
    try {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('school')
        .select('school_name')
        .not('school_name', 'is', null)
        .not('school_name', 'eq', '')
        .limit(1000);

      if (!fallbackError && fallbackData && fallbackData.length > 0) {
        const fallbackSchools = [...new Set(
          fallbackData
            .map((item: any) => item.school_name as string)
            .filter((school: string) => school && school.trim() !== '')
        )].sort() as string[];

        console.log(`Found ${fallbackSchools.length} schools from fallback source`);
        return fallbackSchools;
      }
    } catch (fallbackError) {
      console.error('Fallback school query failed:', fallbackError);
    }

    return [];
  } catch (error) {
    console.error('Error fetching activity feed schools:', error);
    return [];
  }
}

// Function to fetch school data and school facts
export async function fetchSchoolWithFacts(schoolId: string): Promise<{
  school: any;
  facts: any[];
} | null> {
  try {
    // Fetch school data from school table
    const { data: schoolData, error: schoolError } = await supabase
      .from('school')
      .select(`
        name
      `)
      .eq('id', schoolId)
      .single();

    if (schoolError) {
      console.error('Error fetching school data:', schoolError);
      return null;
    }

    // Fetch school facts from school_fact table
    const { data: factsData, error: factsError } = await supabase
      .from('school_fact')
      .select('*')
      .eq('school_id', schoolId);

    if (factsError) {
      console.error('Error fetching school facts:', factsError);
      return null;
    }

    return {
      school: schoolData,
      facts: factsData || []
    };
  } catch (error) {
    console.error('Error in fetchSchoolWithFacts:', error);
    return null;
  }
}
// Fetch season data from sport_season_selector table
export async function fetchSeasonData(sportId: number, dataSource: 'transfer_portal' | 'all_athletes' | 'juco' | 'high_schools' | 'hs_athletes'): Promise<number | null> {
  try {
    const isJuco = dataSource === 'juco';
    
    const { data, error } = await supabase
      .from('sport_season_selector')
      .select('season')
      .eq('sport_id', sportId)
      .eq('is_juco', isJuco)
      .single();

    if (error) {
      console.error('Error fetching season data:', error);
      return null;
    }

    // Only return season if it's greater than 2000
    if (data && data.season > 2000) {
      return data.season;
    }

    return null;
  } catch (error) {
    console.error('Error in fetchSeasonData:', error);
    return null;
  }
}

// ===== ADMIN QUERY FUNCTIONS =====

// Fetch user details by IDs (batch processing)
export async function fetchUserDetailsByIds(userIds: string[]): Promise<any[]> {
  // Use larger batch size for better throughput
  const batchSize = 200; // Increased from 50 to reduce number of queries
  const results: any[] = [];
  
  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);
    
    const { data: batchData, error: batchError } = await supabase
      .from('user_detail')
      .select('id, name_first, name_last, phone, last_sign_in_at')
      .in('id', batch);
    
    if (batchError) {
      console.error('Error fetching user details batch:', batchError);
      throw batchError;
    }
    
    if (batchData) {
      results.push(...batchData);
    }
  }
  
  return results;
}

// Fetch all data types in use
export async function fetchDataTypesInUse(): Promise<any[]> {
  const { data, error } = await supabase
    .from('vw_af_data_types_in_use')
    .select('id, name')
    .order('name');
  
  if (error) {
    console.error('Error fetching data types:', error);
    throw error;
  }
  
  return data || [];
}

// Fetch athlete data types for a specific athlete
export async function fetchAthleteDataTypes(athleteId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('athlete_fact')
    .select('data_type_id')
    .eq('athlete_id', athleteId);
  
  if (error) {
    console.error('Error fetching athlete data types:', error);
    throw error;
  }
  
  return data || [];
}

// Insert new athlete fact
export async function insertAthleteFact(athleteId: string, dataTypeId: number, value: string): Promise<any> {
  const { data, error } = await supabase
    .from('athlete_fact')
    .insert({
      athlete_id: athleteId,
      data_type_id: dataTypeId,
      value: value,
      source: 'manual_admin',
      date: new Date().toISOString().split('T')[0]
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error saving athlete fact:', error);
    throw error;
  }
  
  return data;
}

// Fetch athlete fact data for a specific athlete and data type
export async function fetchAthleteFactData(athleteId: string, dataTypeId: number, limit?: number): Promise<any[]> {
  let query = supabase
    .from('athlete_fact')
    .select('*')
    .eq('athlete_id', athleteId)
    .eq('data_type_id', dataTypeId)
    .order('created_at', { ascending: false });
  
  if (limit) {
    query = query.limit(limit);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching athlete fact data:', error);
    throw error;
  }
  
  return data || [];
}

// Fetch school data types that are in use
export async function fetchSchoolDataTypesInUse(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('vw_sf_data_types_in_use')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching school data types in use:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in fetchSchoolDataTypesInUse:', error);
    throw error;
  }
}

// Fetch school data types for a specific school
export async function fetchSchoolDataTypes(schoolId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('school_fact')
      .select('data_type_id')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching school data types:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in fetchSchoolDataTypes:', error);
    throw error;
  }
}

// Fetch school fact data for a specific school and data type
export async function fetchSchoolFactData(schoolId: string, dataTypeId: number, limit?: number): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('school_fact')
      .select('*')
      .eq('school_id', schoolId)
      .eq('data_type_id', dataTypeId)
      .order('created_at', { ascending: false })
      .limit(limit || 1);

    if (error) {
      console.error('Error fetching school fact data:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in fetchSchoolFactData:', error);
    throw error;
  }
}

// Insert a new school fact
export async function insertSchoolFact(schoolId: string, dataTypeId: number, value: string): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('school_fact')
      .insert({
        school_id: schoolId,
        data_type_id: dataTypeId,
        value: value,
        source: 'manual_admin'
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting school fact:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error in insertSchoolFact:', error);
    throw error;
  }
}

// Update school basic information (name)
export async function updateSchoolBasicInfo(schoolId: string, updates: { name?: string }): Promise<void> {
  const { supabase } = await import('./supabaseClient');
  
  const { error } = await supabase
    .from('school')
    .update(updates)
    .eq('id', schoolId);

  if (error) {
    console.error('Error updating school basic info:', error);
    throw new Error(`Failed to update school: ${error.message}`);
  }
}

// Fetch customer data types that are in use
export async function fetchCustomerDataTypesInUse(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('vw_cs_data_types_in_use')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching customer data types in use:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in fetchCustomerDataTypesInUse:', error);
    throw error;
  }
}

// Fetch customer data types for a specific customer
export async function fetchCustomerDataTypes(customerId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('customer_setting')
      .select('data_type_id')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching customer data types:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in fetchCustomerDataTypes:', error);
    throw error;
  }
}

// Fetch customer fact data for a specific customer and data type
export async function fetchCustomerFactData(customerId: string, dataTypeId: number, limit?: number): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('customer_setting')
      .select('*')
      .eq('customer_id', customerId)
      .eq('data_type_id', dataTypeId)
      .order('created_at', { ascending: false })
      .limit(limit || 1);

    if (error) {
      console.error('Error fetching customer fact data:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in fetchCustomerFactData:', error);
    throw error;
  }
}

// Upsert a customer fact (insert or update)
export async function insertCustomerFact(customerId: string, dataTypeId: number, value: string): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('customer_setting')
      .upsert({
        customer_id: customerId,
        data_type_id: dataTypeId,
        value: value,
        source: 'manual_admin'
      }, {
        onConflict: 'customer_id,data_type_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting customer fact:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error in insertCustomerFact:', error);
    throw error;
  }
}

// Update customer basic information
export async function updateCustomerBasicInfo(customerId: string, updates: { [key: string]: any }): Promise<void> {
  const { supabase } = await import('./supabaseClient');
  
  const { error } = await supabase
    .from('customer')
    .update(updates)
    .eq('id', customerId);

  if (error) {
    console.error('Error updating customer basic info:', error);
    throw new Error(`Failed to update customer: ${error.message}`);
  }
}

// Fetch all sports for dropdown
export async function fetchSports(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('sport')
      .select('id, name')
      .order('name');

    if (error) {
      console.error('Error fetching sports:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in fetchSports:', error);
    throw error;
  }
}

// Coach data types in use (from coach_fact)
export async function fetchCoachDataTypesInUse(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('vw_cf_data_types_in_use')
      .select('*')
      .order('name');
    if (error) {
      console.error('Error fetching coach data types in use:', error);
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error('Error in fetchCoachDataTypesInUse:', error);
    throw error;
  }
}

// Search coaches from view vw_coach_school_sport (id, school, sport)
export async function searchCoaches(searchTerm: string, limit: number = 25, sportName?: string): Promise<any[]> {
  let query = supabase
    .from('vw_coach_school_sport')
    .select(`
      id,
      school,
      sport,
      first_name,
      last_name,
      end_date
    `)
    .limit(limit);

  if (sportName && sportName.trim()) {
    query = query.ilike('sport', `%${sportName.trim()}%`);
  }
  if (searchTerm && searchTerm.trim()) {
    query = query.ilike('school', `%${searchTerm.trim()}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error searching coaches:', error);
    throw error;
  }
  return data || [];
}

// Coach data-type helpers (facts come from coach_fact)
export async function fetchCoachDataTypes(coachId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('coach_fact')
      .select('data_type_id')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching coach data types:', error);
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error('Error in fetchCoachDataTypes:', error);
    throw error;
  }
}

export async function fetchCoachFactData(coachId: string, dataTypeId: number, limit?: number): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('coach_fact')
      .select('*')
      .eq('coach_id', coachId)
      .eq('data_type_id', dataTypeId)
      .order('created_at', { ascending: false })
      .limit(limit || 1);
    if (error) {
      console.error('Error fetching coach fact data:', error);
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error('Error in fetchCoachFactData:', error);
    throw error;
  }
}

export async function insertCoachFact(coachId: string, dataTypeId: number, value: string): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('coach_fact')
      .insert({
        coach_id: coachId,
        data_type_id: dataTypeId,
        value: value,
        source: 'manual_admin'
      })
      .select()
      .single();
    if (error) {
      console.error('Error inserting coach fact:', error);
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error in insertCoachFact:', error);
    throw error;
  }
}

export async function updateCoachBasicInfo(coachId: string, updates: {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  twitter_handle?: string;
  best_phone?: string;
}): Promise<void> {
  const { supabase } = await import('./supabaseClient');
  const { error } = await supabase
    .from('coach')
    .update(updates)
    .eq('id', coachId);
  if (error) {
    console.error('Error updating coach basic info:', error);
    throw new Error(`Failed to update coach: ${error.message}`);
  }
}

// Coach-school history and updates
export async function fetchCoachSchoolHistory(coachId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('coach_school')
      .select(`
        id,
        coach_id,
        school_id,
        sport_id,
        start_date,
        end_date,
        school:school(id, name),
        sport:sport(id, name)
      `)
      .eq('coach_id', coachId)
      .order('start_date', { ascending: false });
    if (error) {
      console.error('Error fetching coach school history:', error);
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error('Error in fetchCoachSchoolHistory:', error);
    throw error;
  }
}

export async function updateCoachSchoolRecord(coachSchoolId: string, updates: { school_id?: string; sport_id?: number; start_date?: string; end_date?: string | null }): Promise<void> {
  try {
    const { error } = await supabase
      .from('coach_school')
      .update(updates)
      .eq('id', coachSchoolId);
    if (error) {
      console.error('Error updating coach school record:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in updateCoachSchoolRecord:', error);
    throw error;
  }
}

export async function endCoachSchoolRecord(coachSchoolId: string, endDate: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('coach_school')
      .update({ end_date: endDate })
      .eq('id', coachSchoolId);
    if (error) {
      console.error('Error ending coach school record:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in endCoachSchoolRecord:', error);
    throw error;
  }
}

export async function transferCoach(
  coachId: string,
  fromCoachSchoolId: string,
  toSchoolId: string,
  sportId: number,
  transferDate: string
): Promise<void> {
  try {
    // 1) End the from row
    const { error: endFromError } = await supabase
      .from('coach_school')
      .update({ end_date: transferDate })
      .eq('id', fromCoachSchoolId);
    if (endFromError) throw endFromError;

    // 2) End any existing coach at destination school for same sport at transfer date
    const { error: endDestError } = await supabase
      .from('coach_school')
      .update({ end_date: transferDate })
      .eq('school_id', toSchoolId)
      .eq('sport_id', sportId)
      .is('end_date', null);
    if (endDestError) throw endDestError;

    // 3) Insert new row for this coach at destination
    const { error: insertError } = await supabase
      .from('coach_school')
      .insert({
        coach_id: coachId,
        school_id: toSchoolId,
        sport_id: sportId,
        start_date: transferDate
      });
    if (insertError) throw insertError;
  } catch (error) {
    console.error('Error in transferCoach:', error);
    throw error;
  }
}

// Search customers from view vw_customer_school_sport (id, school, sport)
export async function searchCustomers(searchTerm: string, limit: number = 25, sportName?: string): Promise<any[]> {
  let query = supabase
    .from('vw_customer_school_sport')
    .select(`
      id,
      school,
      sport
    `)
    .limit(limit);

  // Filter by sport name if provided
  if (sportName && sportName.trim()) {
    query = query.ilike('sport', `%${sportName.trim()}%`);
  }



  // Debounced school name search
  if (searchTerm.trim()) {
    const term = searchTerm.trim();
    query = query.ilike('school', `%${term}%`);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Error searching customers:', error);
    throw error;
  }
  
  return data || [];
}
// Search athletes with complex search logic - supports multiple table types
export async function searchAthletes(
  searchTerm: string, 
  limit: number = 25, 
  tableType: 'college' | 'hs' | 'juco' = 'college'
): Promise<any[]> {
  // Map table type to actual table name
  const tableMap = {
    'college': 'vw_admin_college_athlete',
    'hs': 'vw_admin_hs_athlete',
    'juco': 'vw_admin_juco_athlete'
  };

  const tableName = tableMap[tableType];
  if (!tableName) {
    throw new Error(`Invalid table type: ${tableType}`);
  }

  let query = supabase
    .from(tableName)
    .select(`
      athlete_id,
      athlete_first_name,
      athlete_last_name,
      sport_id,
      school_name
    `)
    .limit(limit);

  if (searchTerm.trim()) {
    const searchTerms = searchTerm.toLowerCase().trim().split(/\s+/).filter(term => term.length > 0);
    
    if (searchTerms.length > 0) {
      if (searchTerms.length === 1) {
        const term = searchTerms[0];
        query = query.or(`athlete_first_name.ilike.%${term}%,athlete_last_name.ilike.%${term}%,school_name.ilike.%${term}%`);
      } else if (searchTerms.length === 2) {
        const [firstTerm, secondTerm] = searchTerms;
        
        const conditions = [
          `and(athlete_first_name.ilike.%${firstTerm}%,athlete_last_name.ilike.%${secondTerm}%)`,
          `and(athlete_first_name.ilike.%${secondTerm}%,athlete_last_name.ilike.%${firstTerm}%)`,
          `athlete_first_name.ilike.%${firstTerm} ${secondTerm}%`,
          `athlete_last_name.ilike.%${firstTerm} ${secondTerm}%`,
          `school_name.ilike.%${firstTerm} ${secondTerm}%`
        ];
        
        query = query.or(conditions.join(','));
      } else {
        // More than 2 words: try different combinations
        const fullSearchTerm = searchTerms.join(' ');
        const firstTerm = searchTerms[0];
        const lastTerm = searchTerms[searchTerms.length - 1];
        
        const conditions = [
          // First word in first name, rest in last name
          `and(athlete_first_name.ilike.%${firstTerm}%,athlete_last_name.ilike.%${searchTerms.slice(1).join(' ')}%)`,
          // All but last word in first name, last word in last name
          `and(athlete_first_name.ilike.%${searchTerms.slice(0, -1).join(' ')}%,athlete_last_name.ilike.%${lastTerm}%)`,
          // Full term in first name
          `athlete_first_name.ilike.%${fullSearchTerm}%`,
          // Full term in last name
          `athlete_last_name.ilike.%${fullSearchTerm}%`,
          // Full term in school name
          `school_name.ilike.%${fullSearchTerm}%`
        ];
        
        query = query.or(conditions.join(','));
      }
    }
  }

  const { data, error } = await query;
  
  if (error) {
    console.error(`Error searching ${tableType} athletes:`, error);
    throw error;
  }
  
  return data || [];
}

// Legacy functions for backward compatibility
export async function searchHsAthletes(searchTerm: string, limit: number = 25): Promise<any[]> {
  return searchAthletes(searchTerm, limit, 'hs');
}

export async function searchJucoAthletes(searchTerm: string, limit: number = 25): Promise<any[]> {
  return searchAthletes(searchTerm, limit, 'juco');
}

// Check if user has athlete access
export async function checkUserAthleteAccess(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_access_override')
    .select('customer_package_id')
    .eq('user_id', userId)
    .in('customer_package_id', [3, 5])
    .is('access_end', null);

  if (error) {
    console.error('Error checking athlete access:', error);
    return false;
  }
  
  return data && data.length > 0;
}

// Fetch all sports
export async function fetchAllSports(): Promise<any[]> {
  const { data, error } = await supabase
    .from('sport')
    .select('id, name, abbrev')
    .order('name');
  
  if (error) {
    console.error('Error loading sports:', error);
    throw error;
  }
  
  return data || [];
}

// Fetch customers with packages for a sport
export async function fetchCustomersWithPackages(packageIds: number[]): Promise<any[]> {
  const { data, error } = await supabase
    .from('customer_package_map')
    .select(`
      customer_id,
      customer_package_id,
      customer_package!inner (
        id,
        package_name
      )
    `)
    .in('customer_package_id', packageIds)
    .is('access_end', null);

  if (error) {
    console.error('Error fetching customers with packages:', error);
    throw error;
  }
  
  return data || [];
}

// Fetch user-customer mappings
export async function fetchUserCustomerMappings(customerIds: string[]): Promise<any[]> {
  const { data, error } = await supabase
    .from('user_customer_map')
    .select(`
      user_id,
      customer_id,
      created_at,
      access_end
    `)
    .in('customer_id', customerIds);

  if (error) {
    console.error('Error fetching user-customer mappings:', error);
    throw error;
  }
  
  return data || [];
}

// Fetch athletes from sport view
export async function fetchAthletesFromSportView(sportAbbrev: string): Promise<any[]> {
  const viewName = `vw_athletes_wide_${sportAbbrev}`;
  
  const { data, error } = await supabase
    .from(viewName)
    .select(`
      athlete_id,
      athlete_first_name,
      athlete_last_name,
      school_state,
      school_name,
      roster_link,
      *
    `)
    .order('athlete_last_name')
    .order('athlete_first_name');

  if (error) {
    console.error('Error loading athletes:', error);
    throw error;
  }
  
  return data || [];
}

// Fetch customers for a sport
export async function fetchCustomersForSport(sportId: number): Promise<any[]> {
  const { data, error } = await supabase
    .from('customer')
    .select(`
      id,
      sport_id,
      school_id,
      school!inner (
        name
      )
    `)
    .eq('sport_id', sportId);

  if (error) {
    console.error('Error fetching customers:', error);
    throw error;
  }
  
  return data || [];
}

// Fetch package data for customers
export async function fetchPackageDataForCustomers(customerIds: string[]): Promise<any[]> {
  const { data, error } = await supabase
    .from('customer_package_map')
    .select(`
      customer_id,
      customer_package!inner (
        id,
        package_name
      )
    `)
    .in('customer_id', customerIds)
    .is('access_end', null);

  if (error) {
    console.error('Error fetching package data:', error);
    throw error;
  }
  
  return data || [];
}

// Fetch package data by IDs
export async function fetchPackagesByIds(packageIds: number[]): Promise<any[]> {
  const { data, error } = await supabase
    .from('customer_package')
    .select('id, package_name')
    .in('id', packageIds)
    .order('package_name');
  
  if (error) {
    console.error('Error fetching packages:', error);
    throw error;
  }
  
  return data || [];
}

// Fetch all customers for management
export async function fetchAllCustomersForManagement(sportId: number): Promise<any[]> {
  const { data, error } = await supabase
    .from('customer')
    .select(`
      id,
      sport_id,
      school_id,
      school!inner (
        name
      )
    `)
    .eq('sport_id', sportId);

  if (error) {
    console.error('Error fetching customers:', error);
    throw error;
  }
  
  return data || [];
}

// Fetch alerts for customers
export async function fetchAlertsForCustomers(customerIds: string[]): Promise<any[]> {
  const { data, error } = await supabase
    .from('tp_alert')
    .select(`
      id,
      created_at,
      customer_id,
      user_id,
      recipient,
      filter,
      rule,
      ended_at
    `)
    .in('customer_id', customerIds)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching alerts:', error);
    throw error;
  }
  
  return data || [];
}

// Create new customer
export async function createCustomer(sportId: number, schoolId: string): Promise<any> {
  const { data, error } = await supabase
    .from('customer')
    .insert({
      sport_id: sportId,
      school_id: schoolId
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating customer:', error);
    throw error;
  }
  
  return data;
}

// Create customer package mappings
export async function createCustomerPackageMappings(mappings: any[]): Promise<void> {
  const { error } = await supabase
    .from('customer_package_map')
    .insert(mappings);

  if (error) {
    console.error('Error creating package mappings:', error);
    throw error;
  }
}

// Fetch existing packages for customer
export async function fetchExistingPackagesForCustomer(customerId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('customer_package_map')
    .select('customer_package_id')
    .eq('customer_id', customerId)
    .is('access_end', null);

  if (error) {
    console.error('Error fetching existing packages:', error);
    throw error;
  }
  
  return data || [];
}

// Update customer package access
export async function updateCustomerPackageAccess(packageMapIds: string[], accessEnd: string): Promise<void> {
  const { error } = await supabase
    .from('customer_package_map')
    .update({ access_end: accessEnd })
    .in('id', packageMapIds);

  if (error) {
    console.error('Error updating package access:', error);
    throw error;
  }
}

// Update user access
export async function updateUserAccess(userId: string, customerId: string, accessEnd: string | null): Promise<void> {
  const { error } = await supabase
    .from('user_customer_map')
    .update({ access_end: accessEnd })
    .eq('user_id', userId)
    .eq('customer_id', customerId);

  if (error) {
    console.error('Error updating user access:', error);
    throw error;
  }
}

// Update user details
export async function updateUserDetails(userId: string, details: { name_first?: string; name_last?: string; phone?: string }): Promise<void> {
  const { error } = await supabase
    .from('user_detail')
    .update({
      name_first: details.name_first || null,
      name_last: details.name_last || null,
      phone: details.phone || null,
    })
    .eq('id', userId);

  if (error) {
    console.error('Error updating user details:', error);
    throw error;
  }
}

// Create alert
export async function createAlert(alertData: {
  customer_id: string;
  user_id: string;
  recipient: string;
  rule: string;
  filter: string;
}): Promise<void> {
  const { error } = await supabase
    .from('tp_alert')
    .insert(alertData);

  if (error) {
    console.error('Error creating alert:', error);
    throw error;
  }
}

// End alerts
export async function endAlerts(alertIds: string[]): Promise<void> {
  const now = new Date().toISOString();
  
  const { error } = await supabase
    .from('tp_alert')
    .update({ ended_at: now })
    .in('id', alertIds)
    .is('ended_at', null);

  if (error) {
    console.error('Error ending alerts:', error);
    throw error;
  }
}

// Complex function to load sport users with all related data
export async function loadSportUsersWithData(packageIds: number[], getUserDetails: (userIds: string[]) => Promise<any[]>): Promise<any[]> {
  // Step 1: Get customers with the target packages
  const customersWithPackages = await fetchCustomersWithPackages(packageIds);
  
  if (!customersWithPackages || customersWithPackages.length === 0) {
    return [];
  }

  const customerIds = customersWithPackages.map((item: any) => item.customer_id);

  // Step 2: Get users associated with these customers
  const userCustomerMappings = await fetchUserCustomerMappings(customerIds);
  
  if (!userCustomerMappings || userCustomerMappings.length === 0) {
    return [];
  }

  const userIds = userCustomerMappings.map((item: any) => item.user_id);

  // Steps 3, 4, and 5 can run in parallel since they're independent
  // Step 3: Get user details using cached helper function
  const userDetailsPromise = getUserDetails(userIds);

  // Step 4: Get user emails from auth table using dedicated API
  const emailPromise = (async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Authentication required to fetch user emails');
    }

    const emailResponse = await fetch('/api/admin/get-user-emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userIds }),
    });

    const emailResult = await emailResponse.json();
    if (!emailResponse.ok) {
      throw new Error(emailResult.error || 'Failed to fetch user emails');
    }

    const userEmailMap = new Map<string, string>();
    if (emailResult.emails) {
      if (Array.isArray(emailResult.emails)) {
        // Handle array format
        emailResult.emails.forEach((emailData: any) => {
          userEmailMap.set(emailData.user_id, emailData.email);
        });
      } else if (typeof emailResult.emails === 'object') {
        // Handle object format (key-value pairs where value is the email string)
        Object.entries(emailResult.emails).forEach(([userId, email]) => {
          userEmailMap.set(userId, email as string);
        });
      }
    } else {
      console.warn('No emails data received from API:', emailResult);
    }
    return userEmailMap;
  })();

  // Step 5: Get customer details (including school info)
  const customerDetailsPromise = supabase
    .from('customer')
    .select(`
      id,
      sport_id,
      school_id,
      school!inner (
        name
      )
    `)
    .in('id', customerIds);

  // Wait for all parallel operations to complete
  const [userDetails, userEmailMap, customerDetailsResponse] = await Promise.all([
    userDetailsPromise,
    emailPromise,
    customerDetailsPromise,
  ]);

  const { data: customerDetails, error: customerError } = customerDetailsResponse;
  if (customerError) {
    console.error('Error fetching customer details:', customerError);
    throw customerError;
  }

  // Transform the data using our multi-step results
  // Pre-build Maps for O(1) lookups instead of O(n) filter/find operations
  // This converts O(n³) complexity to O(n)
  
  // Map: user_id -> array of user-customer mappings
  const userMappingsByUserId = new Map<string, any[]>();
  userCustomerMappings?.forEach((mapping: any) => {
    const existing = userMappingsByUserId.get(mapping.user_id) || [];
    existing.push(mapping);
    userMappingsByUserId.set(mapping.user_id, existing);
  });
  
  // Map: customer_id -> customer details
  const customerDetailsMap = new Map<string, any>();
  customerDetails?.forEach((customer: any) => {
    customerDetailsMap.set(customer.id, customer);
  });
  
  // Map: customer_id -> array of customer packages
  const packagesByCustomerId = new Map<string, any[]>();
  customersWithPackages?.forEach((pkg: any) => {
    const existing = packagesByCustomerId.get(pkg.customer_id) || [];
    existing.push(pkg);
    packagesByCustomerId.set(pkg.customer_id, existing);
  });
  
  // Map: userKey -> user entry (for combining packages)
  const userMap = new Map<string, any>();
  
  // Now iterate through user details with O(1) lookups
  userDetails?.forEach((user: any) => {
    // Get user mappings - O(1) lookup
    const userMappings = userMappingsByUserId.get(user.id) || [];
    
    userMappings.forEach((mapping: any) => {
      // Get customer details - O(1) lookup
      const customerDetail = customerDetailsMap.get(mapping.customer_id);
      const schoolName = customerDetail?.school?.name || 'Unknown School';
      
      // Get customer packages - O(1) lookup
      const customerPackages = packagesByCustomerId.get(mapping.customer_id) || [];
      
      customerPackages.forEach((packageInfo: any) => {
        const packageName = packageInfo.customer_package?.package_name || `Package ${packageInfo.customer_package_id}`;
        
        // Create a unique key for each user-school combination
        const userKey = `${user.id}-${mapping.customer_id}`;
        
        if (userMap.has(userKey)) {
          // User already exists, add package to existing entry
          const existingUser = userMap.get(userKey)!;
          const packages = existingUser.package_name.split(' | ');
          if (!packages.includes(packageName)) {
            existingUser.package_name = [...packages, packageName].join(' | ');
          }
          // Keep the most recent access_end (null takes precedence for active status)
          if (existingUser.access_end && !mapping.access_end) {
            existingUser.access_end = mapping.access_end;
          }
        } else {
          // New user entry
          userMap.set(userKey, {
            id: user.id,
            email: userEmailMap.get(user.id) || 'Unknown',
            name_first: user.name_first,
            name_last: user.name_last,
            phone: user.phone || null,
            school_name: schoolName,
            package_name: packageName,
            access_date: mapping.created_at || '',
            access_end: mapping.access_end,
            customer_id: mapping.customer_id,
            last_sign_in_at: user.last_sign_in_at || null
          });
        }
      });
    });
  });
  
  return Array.from(userMap.values());
}

// Fetch all customers with package information for management
export async function fetchAllCustomersWithPackages(sportId: number): Promise<any[]> {
  // Get customers for the selected sport with school information
  const customersData = await fetchCustomersForSport(sportId);

  if (!customersData || customersData.length === 0) {
    return [];
  }

  // Get package information for each customer
  const customerIds = customersData.map((customer: any) => customer.id);
  const { data: packageData, error: packageError } = await supabase
    .from('customer_package_map')
    .select(`
      id,
      customer_id,
      access_start,
      access_end,
      customer_package!inner (
        id,
        package_name
      )
    `)
    .in('customer_id', customerIds);

  if (packageError) {
    console.error('Error fetching package data:', packageError);
    throw packageError;
  }

  // Create individual rows for each customer-package combination
  const customerPackageRows: any[] = [];
  
  customersData.forEach((customer: any) => {
    const customerPackages = packageData?.filter((pkg: any) => pkg.customer_id === customer.id) || [];
    
    if (customerPackages.length === 0) {
      // Customer with no packages - show as single row
      customerPackageRows.push({
        id: `${customer.id}-no-package`,
        customer_id: customer.id,
        school_name: customer.school?.name || 'Unknown School',
        school_id: customer.school_id,
        sport_id: customer.sport_id,
        package_name: 'No Package',
        package_id: null,
        access_start: null,
        access_end: null,
        customer_package_map_id: null,
        status: 'inactive' // No packages means inactive
      });
    } else {
      // Customer with packages - create row for each package
      customerPackages.forEach((pkg: any) => {
        customerPackageRows.push({
          id: pkg.id,
          customer_id: customer.id,
          school_name: customer.school?.name || 'Unknown School',
          school_id: customer.school_id,
          sport_id: customer.sport_id,
          package_name: pkg.customer_package?.package_name || 'Unknown Package',
          package_id: pkg.customer_package?.id,
          access_start: pkg.access_start,
          access_end: pkg.access_end,
          customer_package_map_id: pkg.id,
          status: pkg.access_end ? 'inactive' : 'active' // Active if no access_end date
        });
      });
    }
  });

  return customerPackageRows;
}

// ===== ATHLETE MANAGEMENT FUNCTIONS =====

/**
 * Update athlete basic information (first name, last name)
 */
export async function updateAthleteBasicInfo(athleteId: string, updates: { first_name?: string; last_name?: string }): Promise<void> {
  const { supabase } = await import('./supabaseClient');
  
  const { error } = await supabase
    .from('athlete')
    .update(updates)
    .eq('id', athleteId);

  if (error) {
    console.error('Error updating athlete basic info:', error);
    throw new Error(`Failed to update athlete: ${error.message}`);
  }
}
/**
 * Fetch athlete school history with school names
 */
export async function fetchAthleteSchoolHistory(athleteId: string): Promise<any[]> {
  const { supabase } = await import('./supabaseClient');
  
  const { data, error } = await supabase
    .from('athlete_school')
    .select(`
      id,
      athlete_id,
      school_id,
      start_date,
      end_date,
      school (
        id,
        name
      )
    `)
    .eq('athlete_id', athleteId)
    .order('start_date', { ascending: true });

  if (error) {
    console.error('Error fetching athlete school history:', error);
    throw new Error(`Failed to fetch school history: ${error.message}`);
  }

  return data || [];
}

/**
 * Search schools by name
 */
export async function searchSchools(query: string, limit: number = 50): Promise<any[]> {
  const { supabase } = await import('./supabaseClient');
  
  const { data, error } = await supabase
    .from('school')
    .select('id, name')
    .ilike('name', `%${query}%`)
    .limit(limit)
    .order('name');

  if (error) {
    console.error('Error searching schools:', error);
    throw new Error(`Failed to search schools: ${error.message}`);
  }

  return data || [];
}

/**
 * Update an existing athlete school record
 */
export async function updateAthleteSchoolRecord(
  recordId: string, 
  updates: { school_id?: string; start_date?: string; end_date?: string }
): Promise<void> {
  const { supabase } = await import('./supabaseClient');
  
  const { error } = await supabase
    .from('athlete_school')
    .update(updates)
    .eq('id', recordId);

  if (error) {
    console.error('Error updating athlete school record:', error);
    throw new Error(`Failed to update school record: ${error.message}`);
  }
}

/**
 * Transfer athlete to a new school
 */
export async function transferAthlete(
  athleteId: string, 
  newSchoolId: string, 
  transferDate: string
): Promise<void> {
  const { supabase } = await import('./supabaseClient');
  
  try {
    // Start a transaction
    const { error: updateError } = await supabase
      .from('athlete_school')
      .update({ end_date: transferDate })
      .eq('athlete_id', athleteId)
      .is('end_date', null); // Only update records without end_date

    if (updateError) {
      console.error('Error updating existing school records:', updateError);
      throw new Error(`Failed to update existing school records: ${updateError.message}`);
    }

    // Insert new school record
    const { error: insertError } = await supabase
      .from('athlete_school')
      .insert({
        athlete_id: athleteId,
        school_id: newSchoolId,
        start_date: transferDate,
        end_date: null
      });

    if (insertError) {
      console.error('Error inserting new school record:', insertError);
      throw new Error(`Failed to create new school record: ${insertError.message}`);
    }

  } catch (error) {
    console.error('Error in transferAthlete:', error);
    throw error;
  }
}

// Save new coach with school assignment and facts
export async function saveNewCoach(
  firstName: string,
  lastName: string,
  schoolId: string,
  sportId: number,
  startDate: string,
  endDate: string | null,
  coachFacts: {[key: string]: string},
  coachDataTypes: any[]
): Promise<void> {
  try {
    // Create coach record
    const coachData = await supabase
      .from('coach')
      .insert({
        first_name: firstName.trim(),
        last_name: lastName.trim()
      })
      .select()
      .single();

    if (coachData.error) {
      throw coachData.error;
    }

    const coachId = coachData.data.id;

    // First, end any current coaches at this school and sport
    const endCurrentCoaches = await supabase
      .from('coach_school')
      .update({ end_date: startDate })
      .eq('school_id', schoolId)
      .eq('sport_id', sportId)
      .is('end_date', null);

    if (endCurrentCoaches.error) {
      throw endCurrentCoaches.error;
    }

    // Create coach_school record
    const coachSchoolData = await supabase
      .from('coach_school')
      .insert({
        coach_id: coachId,
        school_id: schoolId,
        sport_id: sportId,
        start_date: startDate,
        end_date: endDate
      })
      .select()
      .single();

    if (coachSchoolData.error) {
      throw coachSchoolData.error;
    }

    // Add coach facts for filled fields
    const factPromises = Object.entries(coachFacts)
      .filter(([_, value]) => value.trim())
      .map(async ([dataTypeName, value]) => {
        const dataType = coachDataTypes.find(dt => dt.name === dataTypeName);
        if (dataType) {
          return supabase
            .from('coach_fact')
            .insert({
              coach_id: coachId,
              data_type_id: dataType.id,
              value: value.trim(),
              source: 'manual_admin'
            });
        }
      });

    await Promise.all(factPromises);
  } catch (error) {
    console.error('Error in saveNewCoach:', error);
    throw error;
  }
}

/**
 * Fetch athlete videos for a specific athlete
 * Returns all athlete_video records for the given athlete_id
 */
export async function fetchAthleteVideos(athleteId: string): Promise<any[]> {
  try {
    const { data: videos, error } = await supabase
      .from('athlete_video')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching athlete videos:', error);
      throw error;
    }

    return videos || [];
  } catch (error) {
    console.error('Error in fetchAthleteVideos:', error);
    throw error;
  }
}

// Update school facts
export async function updateSchoolFact(schoolId: string, dataTypeId: number, value: string): Promise<void> {
  try {
    console.log(`[updateSchoolFact] Starting check for schoolId: ${schoolId}, dataTypeId: ${dataTypeId}, value: "${value}"`);
    console.log(`[updateSchoolFact] Value type: ${typeof value}, length: ${value?.length}`);
    console.log(`[updateSchoolFact] Value JSON: ${JSON.stringify(value)}`);
    
    // First, check if a fact already exists for this school and data type
    const { data: existingFact, error: fetchError } = await supabase
      .from('school_fact')
      .select('id, value')
      .eq('school_id', schoolId)
      .eq('data_type_id', dataTypeId)
      .is('inactive', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    console.log(`[updateSchoolFact] Existing fact query result:`, { existingFact, fetchError });

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found"
      console.log(`[updateSchoolFact] Error fetching existing fact:`, fetchError);
      throw fetchError;
    }

    // Check if the value has actually changed
    if (existingFact && existingFact.value === value) {
      console.log(`[updateSchoolFact] No change detected - value "${value}" is the same as existing value "${existingFact.value}". Skipping insert.`);
      return;
    }

    // Insert new fact only if there's a change
    console.log(`[updateSchoolFact] Value changed from "${existingFact?.value || 'none'}" to "${value}". Inserting new fact.`);
    const { data: insertResult, error: insertError } = await supabase
      .from('school_fact')
      .insert({
        school_id: schoolId,
        data_type_id: dataTypeId,
        value,
        source: 'manual_college_coach'
      })
      .select();

    if (insertError) {
      console.log(`[updateSchoolFact] Error inserting new fact:`, insertError);
      throw insertError;
    }
    console.log(`[updateSchoolFact] Insert result:`, insertResult);
    console.log(`[updateSchoolFact] Successfully inserted new fact`);
  } catch (error) {
    console.error('Error in updateSchoolFact:', error);
    throw error;
  }
}

// Update coach facts
export async function updateCoachFact(coachId: string, dataTypeId: number, value: string): Promise<void> {
  try {
    console.log(`[updateCoachFact] Starting check for coachId: ${coachId}, dataTypeId: ${dataTypeId}, value: "${value}"`);
    
    // Skip saving null, undefined, or empty values
    if (value === null || value === undefined || value === '') {
      console.log(`[updateCoachFact] Skipping save - value is null, undefined, or empty: "${value}"`);
      return;
    }
    
    // First, check if a fact already exists for this coach and data type
    const { data: existingFact, error: fetchError } = await supabase
      .from('coach_fact')
      .select('id, value')
      .eq('coach_id', coachId)
      .eq('data_type_id', dataTypeId)
      .is('inactive', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    console.log(`[updateCoachFact] Existing fact query result:`, { existingFact, fetchError });

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found"
      console.log(`[updateCoachFact] Error fetching existing fact:`, fetchError);
      throw fetchError;
    }

    // Check if the value has actually changed
    if (existingFact && existingFact.value === value) {
      console.log(`[updateCoachFact] No change detected - value "${value}" is the same as existing value "${existingFact.value}". Skipping insert.`);
      return;
    }

    // Insert new fact only if there's a change
    console.log(`[updateCoachFact] Value changed from "${existingFact?.value || 'none'}" to "${value}". Inserting new fact.`);
    const { data: insertResult, error: insertError } = await supabase
      .from('coach_fact')
      .insert({
        coach_id: coachId,
        data_type_id: dataTypeId,
        value,
        source: 'manual_college_coach'
      })
      .select();

    if (insertError) {
      console.log(`[updateCoachFact] Error inserting new fact:`, insertError);
      throw insertError;
    }
    console.log(`[updateCoachFact] Insert result:`, insertResult);
    console.log(`[updateCoachFact] Successfully inserted new fact`);
  } catch (error) {
    console.error('Error in updateCoachFact:', error);
    throw error;
  }
}