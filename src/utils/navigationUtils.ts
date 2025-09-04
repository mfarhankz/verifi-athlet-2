import { supabase } from "@/lib/supabaseClient";
import { fetchUserDetails } from "./utils";
import { menuPackageMap } from "@/app/(dashboard)/_components/Sidebar";

const other_sport_packages = [2, 7, 8, 10, 11, 12, 14, 15, 16, 18, 19, 20, 22, 23, 24, 26, 27, 28, 30, 31, 32, 34, 35, 36, 38, 39, 40, 
  42, 43, 44, 46, 47, 48, 50, 51, 52, 54, 55, 56, 58, 59, 60, 62, 63, 64, 66, 67, 68, 70, 71, 73, 74, 75, 77]
  
// Define the menu routes in a single place
export const menuRoutes = [
  { key: '1', route: '/transfers', packageIds: other_sport_packages, title: 'Transfers' },
  { key: '2', route: '/settings?tab=alerts', packageIds: other_sport_packages, title: 'Alerts' },
  { key: '3', route: '/pre-portal-search', packageIds: [3], title: 'Pre-Portal Search' },
  { key: '4', route: '/recruiting-board', packageIds: other_sport_packages.concat([3]), title: 'Recruiting Board' },
  { key: '5', route: '/athlete-compare', packageIds: [3], title: 'Athlete Compare' },
  { key: '6', route: '/road-planner', packageIds: [1], title: 'Road Planner' },
  { key: '7', route: '/cap-manager?view=positional-ranking', packageIds: [1], title: 'Cap Manager' },
  { key: '7-1', route: '/cap-manager?view=positional-ranking', packageIds: [1], title: 'Positional Ranking' },
  { key: '7-2', route: '/cap-manager?view=by-year', packageIds: [1], title: 'By Year' },
  { key: '7-3', route: '/cap-manager?view=list', packageIds: [1], title: 'List' },
  { key: '7-4', route: '/cap-manager?view=budget', packageIds: [1], title: 'Budget' },
  { key: '7-5', route: '/cap-manager?view=reports', packageIds: [1], title: 'Reports' },
  { key: '7-6', route: '/cap-manager?view=depth-chart', packageIds: [1], title: 'Depth Chart' },
  { key: '13', route: '/admin', packageIds: [3], title: 'Admin' },
];

// Define unclickable menu items with restricted access to other_sport_packages
export const unclickableMenuRoutes = [
  { key: '8', title: 'Pre-Portal', packageIds: other_sport_packages },
  { key: '9', title: 'JUCO Database', packageIds: other_sport_packages },
  { key: '10', title: 'TrueGrade Rankings', packageIds: other_sport_packages },
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
  return requiredPackageIds.some(packageId => userPackages.includes(packageId));
}

// Function to check if user has access to a specific feature
export function hasFeatureAccess(userPackages: number[], featureName: keyof typeof featureAccess): boolean {
  const feature = featureAccess[featureName];
  return hasPackageAccess(userPackages, feature.packageIds);
}

// Function to determine the first accessible route for a user
export function getFirstAccessibleRoute(userPackages: number[]) {
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