import { supabase } from "@/lib/supabaseClient";
import { fetchUserDetails } from "./utils";
import { menuPackageMap } from "@/app/(dashboard)/_components/Sidebar";
import { 
  PACKAGE_DEFINITIONS, 
  getPackageIdsBySport, 
  getPackageIdsByType,
  getJucoPackageIds 
} from "@/lib/queries";

// ============================================================================
// DYNAMIC PACKAGE ARRAYS
// ============================================================================
// These are now dynamically generated from PACKAGE_DEFINITIONS

// Get all non-football sport packages (excluding admin and football)
const other_sport_packages: number[] = PACKAGE_DEFINITIONS
  .filter(pkg => pkg.sport !== 'fb' && pkg.sport !== 'admin')
  .map(pkg => pkg.package_id);

// Get JUCO packages
const juco_packages: number[] = getJucoPackageIds();

// Get Ultra packages (all sports)
const ultra_packages: number[] = getPackageIdsByType('ultra');

// Get all football packages
const football_packages: number[] = getPackageIdsBySport('fb');

// Get college football packages (excluding high school packages like camp_data)
const football_college_packages: number[] = PACKAGE_DEFINITIONS
  .filter(pkg => pkg.sport === 'fb' && pkg.package_type !== 'camp_data')
  .map(pkg => pkg.package_id);

// Get all non-football NAIA packages
const non_football_naia_packages: number[] = PACKAGE_DEFINITIONS
  .filter(pkg => pkg.is_naia && pkg.sport !== 'fb')
  .map(pkg => pkg.package_id);

// Pre-compute combined arrays to avoid concat issues during runtime
const other_sport_and_juco_packages: number[] = [...other_sport_packages, ...juco_packages];
const all_college_packages: number[] = [...other_sport_and_juco_packages, ...football_college_packages];
const all_customers_packages: number[] = [...other_sport_and_juco_packages, ...football_packages];
const all_college_no_juco_packages: number[] = [...other_sport_packages.filter(id => !juco_packages.includes(id)), ...football_college_packages];
const utra_plat_gold_admin_packages: number[] = [...ultra_packages, 1, 3, 97, 98, ...non_football_naia_packages];
const utra_platinum_packages: number[] = [...ultra_packages, 1];
const all_customers_with_admin: number[] = [...all_customers_packages, 3];

// Define the menu routes in a single place
export const menuRoutes = [
  { key: '16', route: '/high-school', packageIds: football_packages, title: 'High Schools' },
  { key: '17', route: '/hs-athlete', packageIds: football_packages, title: 'HS Athlete' },
  { key: '1', route: '/transfers', packageIds: all_college_packages, title: 'Transfers' },
  { key: '2', route: '/settings?tab=alerts', packageIds: all_college_no_juco_packages, title: 'Alerts' },
  { key: '14', route: '/juco', packageIds: other_sport_and_juco_packages, title: 'JUCO' },
  { key: '3', route: '/pre-portal-search', packageIds: utra_plat_gold_admin_packages, title: 'Pre-Portal Search' },
  { key: '4', route: '/recruiting-board', packageIds: all_customers_with_admin, title: 'Recruiting Board' },
  { key: '5', route: '/athlete-compare', packageIds: [3], title: 'Athlete Compare' },
  { key: '6', route: '/road-planner', packageIds: utra_platinum_packages, title: 'Road Planner' },
  { key: '7', route: '/cap-manager?view=positional-ranking', packageIds: utra_platinum_packages, title: 'Cap Manager' },
  { key: '7-1', route: '/cap-manager?view=positional-ranking', packageIds: utra_platinum_packages, title: 'Positional Ranking' },
  { key: '7-2', route: '/cap-manager?view=by-year', packageIds: utra_platinum_packages, title: 'By Year' },
  { key: '7-3', route: '/cap-manager?view=list', packageIds: utra_platinum_packages, title: 'List' },
  { key: '7-4', route: '/cap-manager?view=budget', packageIds: utra_platinum_packages, title: 'Budget' },
  { key: '7-5', route: '/cap-manager?view=reports', packageIds: utra_platinum_packages, title: 'Reports' },
  { key: '7-6', route: '/cap-manager?view=depth-chart', packageIds: utra_platinum_packages, title: 'Depth Chart' },
  { key: '13', route: '/admin', packageIds: [3], title: 'Admin' },
  { key: '15', route: '/verified-game', packageIds: [3, 4, 5, 78], title: 'Verified Game' },
];

// Define unclickable menu items with restricted access to other_sport_packages
export const unclickableMenuRoutes = [
  { key: '8', title: 'Pre-Portal', packageIds: other_sport_packages },
  { key: '10', title: 'Verified Rating', packageIds: other_sport_packages },
  { key: '11', title: 'Depth Chart', packageIds: other_sport_packages },
  { key: '12', title: 'Player Tracking', packageIds: other_sport_packages },
];

// Define feature access control
export const featureAccess = {
  boardTagColors: { packageIds: [1], title: 'Board Tag Colors' },
  scholarshipType: { packageIds: [1], title: 'Scholarship Type' },
};

// Helper function to check if user has access to any of the required packages
export function hasPackageAccess(userPackages: number[], requiredPackageIds: number[]): boolean {
  // Add null/undefined checks to prevent runtime errors
  if (!userPackages || !Array.isArray(userPackages) || !requiredPackageIds || !Array.isArray(requiredPackageIds)) {
    return false;
  }
  return requiredPackageIds.some(packageId => userPackages.includes(packageId));
}

// Function to check if user has access to a specific feature
export function hasFeatureAccess(userPackages: number[], featureName: keyof typeof featureAccess): boolean {
  const feature = featureAccess[featureName];
  if (!feature || !feature.packageIds) {
    return false;
  }
  return hasPackageAccess(userPackages, feature.packageIds);
}

// Function to determine the first accessible route for a user
export function getFirstAccessibleRoute(userPackages: number[]) {
  // Add null/undefined check to prevent runtime errors
  if (!userPackages || !Array.isArray(userPackages)) {
    return null;
  }
  
  // Check if user only has access to Verified Game packages (4, 5, 78)
  const verifiedGameOnlyPackages = [4, 5, 78];
  const hasOnlyVerifiedGameAccess = userPackages.length > 0 && 
    userPackages.every(pkg => verifiedGameOnlyPackages.includes(pkg));
  
  // If user only has Verified Game access, redirect them there
  if (hasOnlyVerifiedGameAccess) {
    const verifiedGameRoute = menuRoutes.find(route => route.route === '/verified-game');
    if (verifiedGameRoute && hasPackageAccess(userPackages, verifiedGameRoute.packageIds)) {
      return verifiedGameRoute.route;
    }
  }
  
  // Find the first menu item the user has access to
  const firstAccessibleMenuItem = menuRoutes
    .filter(route => !route.key.includes('-')) // Filter out submenu items
    .find(route => hasPackageAccess(userPackages, route.packageIds));
  
  return firstAccessibleMenuItem?.route || null;
}

// Function to check if user is authenticated and redirect accordingly
export async function handleAuthRedirect(router: any) {
  try {
    // Check if user is authenticated
    const { data } = await supabase.auth.getSession();
    
    if (!data.session) {
      // User is not authenticated, redirect to home page
      router.push('/');
      return false;
    }
    
    // User is authenticated, get their details including packages
    const userDetails = await fetchUserDetails();
    
    if (!userDetails) {
      router.push('/');
      return false;
    }
    
    // Find the first accessible route
    const accessibleRoute = getFirstAccessibleRoute((userDetails.packages || []).map(Number));
    
    if (accessibleRoute) {
      // Redirect to the first accessible route
      router.push(accessibleRoute);
      return true;
    } else {
      // No accessible routes, show an error or redirect to a default page
      router.push('/no-access');
      return false;
    }
  } catch (error) {
    console.error("Error in authentication check:", error);
    return false;
  }
} 