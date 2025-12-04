"use client";

import type { MenuProps } from "antd";
import { Menu, Spin, Button } from "antd";
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { useSidebar } from './SidebarContext';
import { menuRoutes, unclickableMenuRoutes, hasPackageAccess } from '@/utils/navigationUtils';
import { CloseOutlined } from '@ant-design/icons';

type MenuItem = Required<MenuProps>["items"][number];

const getItem = (
  label: React.ReactNode,
  key: string,
  icon?: React.ReactNode,
  children?: MenuItem[],
  type?: 'group',
): MenuItem => {
  return {
    key,
    icon,
    children,
    label,
    type,
  } as MenuItem;
};

// Custom link component with visible styling
const StyledLink = ({ href, children }: { href: string, children: React.ReactNode }) => {
  const { setMobileOpen } = useSidebar();
  
  const handleClick = () => {
    setMobileOpen(false);
  };
  
  return (
    <Link href={href} style={{ color: '#fff', fontWeight: '500' }} onClick={handleClick}>
      {children}
    </Link>
  );
};

// Custom component for submenu items with proper styling
const SubMenuItem = ({ href, children }: { href: string, children: React.ReactNode }) => {
  const { collapsed, setMobileOpen } = useSidebar();
  
  const handleClick = () => {
    setMobileOpen(false);
  };
  
  return (
    <Link href={href} style={{ 
      color: '#fff', 
      fontWeight: '400',
      fontSize: '14px',
      opacity: '0.9',
      display: 'block',
      paddingLeft: collapsed ? '15px' : '32px',
    }} onClick={handleClick}>
      {children}
    </Link>
  );
};

// Custom component for unclickable menu items
const UnclickableMenuItem = ({ children }: { children: React.ReactNode }) => (
  <span style={{ 
    color: '#999', 
    fontWeight: '300',
    cursor: 'not-allowed',
    opacity: '0.9',
    display: 'block',
    padding: '0',
    userSelect: 'none',
    pointerEvents: 'none',
  }}>
    {children}
  </span>
);

// Custom component for unclickable icons
const UnclickableIcon = ({ className }: { className: string }) => (
  <i className={className} style={{ 
    opacity: '0.3',
    color: '#999',
  }} />
);

// Define mapping between menu keys and package IDs
// This maps each menu item to the package IDs required to view it
export const menuPackageMap: Record<string, number[]> = Object.fromEntries(
  [...menuRoutes, ...unclickableMenuRoutes].map(route => [route.key, route.packageIds])
);

// Menu titles mapping
export const menuTitles: Record<string, string> = Object.fromEntries(
  [...menuRoutes, ...unclickableMenuRoutes].map(route => [route.key, route.title])
);

// Create a separate component that uses useSearchParams
function SidebarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const viewParam = searchParams?.get('view');
  const [openKeys, setOpenKeys] = useState<string[]>(['6']);
  const [selectedKey, setSelectedKey] = useState<string>('1');
  const [isCapManagerSelected, setIsCapManagerSelected] = useState(false);
  const { collapsed, setCurrentMenuTitle, userPackages, isLoading, setMobileOpen } = useSidebar();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Ensure userPackages is always an array to prevent runtime errors
  const safeUserPackages = userPackages || [];

  // Set the selected key based on pathname
  useEffect(() => {
    let newIsCapManagerSelected = false;
    let newOpenKeys = [...openKeys];
    let newSelectedKey = selectedKey;

    if (pathname === '/high-school') {
      newSelectedKey = '16';
    } else if (pathname === '/hs-athlete') {
      newSelectedKey = '17';
    } else if (pathname === '/transfers') {
      newSelectedKey = '1';
    } else if (pathname === '/settings/alerts') {
      newSelectedKey = '2';
    } else if (pathname === '/juco') {
      newSelectedKey = '14';
    } else if (pathname === '/pre-portal-search') {
      newSelectedKey = '3';
    } else if (pathname === '/recruiting-board') {
      newSelectedKey = '4';
    } else if (pathname === '/athlete-compare') {
      newSelectedKey = '5';
    } else if (pathname === '/road-planner') {
      newSelectedKey = '6';
    } else if (pathname === '/admin') {
      newSelectedKey = '13';
    }  else if (pathname === '/activity-feed') {
        newSelectedKey = '18';
      } else if (pathname === '/score-tracker') {
        newSelectedKey = '19';
    } else if (pathname === '/data-ops') {
      newSelectedKey = '20';
    } else if (pathname === '/new-page') {
      newSelectedKey = '15';
    } else if (pathname === '/new-page-2') {
      newSelectedKey = '154';
    } else if (pathname === '/new-page-3') {
      newSelectedKey = '155';
    } else if (pathname === '/cap-manager') {
      newIsCapManagerSelected = true;
      // Handle Cap Manager and its submenus
      switch (viewParam) {
        case 'positional-ranking':
          newSelectedKey = '7-1';
          break;
        case 'by-year':
          newSelectedKey = '7-2';
          break;
        case 'list':
          newSelectedKey = '7-3';
          break;
        case 'budget':
          newSelectedKey = '7-4';
          break;
        case 'depth-chart':
          newSelectedKey = '7-6';
          break;
        default:
          newSelectedKey = '7-1'; // Default to Positional Ranking
      }

      
      // Always keep Cap Manager submenu open when in Cap Manager
      if (!openKeys.includes('7') && !collapsed) {
        newOpenKeys = ['7'];
      }
    } else {
      // For any other path (including full-details), default to not CapManager
      newIsCapManagerSelected = false;
      // Close the submenu for other paths
      newOpenKeys = [];
    }

    // Only update states if they actually changed
    if (newSelectedKey !== selectedKey) {
      setSelectedKey(newSelectedKey);
    }
    
    if (newIsCapManagerSelected !== isCapManagerSelected) {
      setIsCapManagerSelected(newIsCapManagerSelected);
    }
    
    if (JSON.stringify(newOpenKeys) !== JSON.stringify(openKeys)) {
      setOpenKeys(newOpenKeys);
    }

    // Update the current menu title
    const currentTitle = menuTitles[newSelectedKey] || 'Player List';
    setCurrentMenuTitle(currentTitle);
  }, [pathname, viewParam, collapsed, setCurrentMenuTitle]);

  const onClick: MenuProps["onClick"] = (e) => {
    console.log("click ", e);
    
    // Prevent interaction with unclickable items
    const unclickableKeys = unclickableMenuItems.map(item => item?.key).filter(Boolean);
    if (unclickableKeys.includes(e.key)) {
      return; // Do nothing for unclickable items
    }
    
    // Update menu title
    setCurrentMenuTitle(menuTitles[e.key] || 'Player List');
    
    // Manually handle opening and closing of Cap Manager submenu
    if (e.key === '7') {
      // When Cap Manager is clicked, always show submenu and navigate
      setIsCapManagerSelected(true);
      
      if (!collapsed) {
        setOpenKeys(['7']);
      }
      
      // If we're already on a Cap Manager page, don't change the selected key
      // This keeps the submenu item highlighted instead of highlighting Cap Manager itself
      if (pathname && !pathname.startsWith('/cap-manager')) {
        setSelectedKey(e.key);
      }
    } else if (e.key.startsWith('7-')) {
      // When a submenu item is clicked, ensure parent menu stays open
      if (!collapsed) {
        setOpenKeys(['7']);
      }
      setIsCapManagerSelected(true);
      setSelectedKey(e.key);
    } else {
      // When any other menu item is clicked, close the Cap Manager submenu
      setOpenKeys([]);
      setIsCapManagerSelected(false);
      setSelectedKey(e.key);
    }
  };

  // Create Cap Manager submenu items based on access
  const capManagerItems: MenuItem[] = [];
  
  // Only add Cap Manager submenu items if conditions are met
  if (isCapManagerSelected && !collapsed) {
    // Positional Ranking
    if (hasPackageAccess(safeUserPackages, menuPackageMap['7-1'])) {
      capManagerItems.push({
        key: '7-1',
        label: <SubMenuItem href="/cap-manager?view=positional-ranking">Positional Ranking</SubMenuItem>,
      });
    }
    
    // By Year
    if (hasPackageAccess(safeUserPackages, menuPackageMap['7-2'])) {
      capManagerItems.push({
        key: '7-2',
        label: <SubMenuItem href="/cap-manager?view=by-year">By Year</SubMenuItem>,
      });
    }
    
    // List
    if (hasPackageAccess(safeUserPackages, menuPackageMap['7-3'])) {
      capManagerItems.push({
        key: '7-3',
        label: <SubMenuItem href="/cap-manager?view=list">List</SubMenuItem>,
      });
    }
    
    // Budget
    if (hasPackageAccess(safeUserPackages, menuPackageMap['7-4'])) {
      capManagerItems.push({
        key: '7-4',
        label: <SubMenuItem href="/cap-manager?view=budget">Budget</SubMenuItem>,
      });
    }
    
    // Reports
    if (hasPackageAccess(safeUserPackages, menuPackageMap['7-5'])) {
      capManagerItems.push({
        key: '7-5',
        label: <SubMenuItem href="/cap-manager?view=reports">Reports</SubMenuItem>,
      });
    }
    
    // Depth Chart
    if (hasPackageAccess(safeUserPackages, menuPackageMap['7-6'])) {
      capManagerItems.push({
        key: '7-6',
        label: <SubMenuItem href="/cap-manager?view=depth-chart">Depth Chart</SubMenuItem>,
      });
    }
  }

  // Define all potential menu items
  const allMenuItems: MenuItem[] = [
    {
      key: "16",
      icon: <i className="icon-teacher"></i>,
      label: <StyledLink href="/high-school">High Schools</StyledLink>,
    },
    {
      key: "17",
      icon: <i className="icon-user"></i>,
      label: <StyledLink href="/hs-athlete">HS Athlete</StyledLink>,
    },
    {
      key: "1",
      icon: <i className="icon-cup"></i>,
      label: <StyledLink href="/transfers">Transfers</StyledLink>,
    },
    {
      key: "2",
      icon: <i className="icon-alarm" />,
      label: <StyledLink href="/settings?tab=alerts">Alerts</StyledLink>,
    },
    {
      key: "14",
      icon: <i className="icon-data" />,
      label: <StyledLink href="/juco">JUCO</StyledLink>,
    },
    {
      key: "3",
      icon: <i className="icon-user-search"/>,
      label: <StyledLink href="/pre-portal-search">Pre-Portal Search</StyledLink>,
    },
    {
      key: "4",
      icon: <i className="icon-presention-chart" />,
      label: <StyledLink href="/recruiting-board">Recruiting Board</StyledLink>,
    },
    {
      key: "5",
      icon: <i className="icon-ranking-1" />,
      label: <StyledLink href="/athlete-compare">Athlete Compare</StyledLink>,
    },
    {
      key: "6",
      icon: <i className="icon-map" />,
      label: <StyledLink href="/road-planner">Road Planner</StyledLink>,
    },
    {
      key: "15",
      icon: <i className="icon-setting-2" />,
      label: <StyledLink href="/new-page">New Page</StyledLink>,
    },
    {
      key: "154",
      icon: <i className="icon-setting-2" />,
      label: <StyledLink href="/new-page-2">New Page 2</StyledLink>,
    },
    {
      key: "155",
      icon: <i className="icon-setting-2" />,
      label: <StyledLink href="/new-page-3">New Page 3</StyledLink>,
    },
    {
      key: "7",
      icon: <i className="icon-dollar-square" />,
      label: <StyledLink href="/cap-manager?view=positional-ranking">Cap Manager</StyledLink>,
    },
    {
      key: "18",
      icon: <i className="icon-calendar" />,
      label: <StyledLink href="/activity-feed">Activity Feed</StyledLink>,
    },
    {
      key: "19",
      icon: <UnclickableIcon className="icon-flash" />,
      label: <UnclickableMenuItem>Score Tracker</UnclickableMenuItem>,
      disabled: true,
    },
    {
      key: "13",
      icon: <i className="icon-setting-2" />,
      label: <StyledLink href="/admin">Admin</StyledLink>,
    },
    {
      key: "20",
      icon: <i className="icon-data" />,
      label: <StyledLink href="/data-ops">Data Ops</StyledLink>,
    },
  ];

  // Define unclickable menu items
  const unclickableMenuItems: MenuItem[] = [
  ];

  // Filter menu items based on user's package access
  const filteredItems: MenuItem[] = [];
  
  // Add only the menu items that the user has access to
  allMenuItems.forEach(item => {
    if (item && typeof item.key === 'string') {
      const requiredPackages = menuPackageMap[item.key];
      if (hasPackageAccess(safeUserPackages, requiredPackages)) {
        filteredItems.push(item);
      }
    }
  });

  // Add unclickable menu items for users who DO have access to other_sport_packages
  const unclickableItems: MenuItem[] = [];
  
  // Only check access after packages have loaded to avoid timing issues
  if (!isLoading) {
    unclickableMenuItems.forEach(item => {
      if (item && typeof item.key === 'string') {
        const requiredPackages = menuPackageMap[item.key];
        if (hasPackageAccess(safeUserPackages, requiredPackages)) {
          unclickableItems.push(item);
        }
      }
    });
  }

  // Add the Cap Manager submenu items as top-level items
  const items: MenuItem[] = [
    ...filteredItems,
    ...capManagerItems,
    ...unclickableItems,
  ];

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin />
      </div>
    );
  }

  return (
    <div>
      <Menu
        onClick={onClick}
        style={{ width: "100%" }}
        selectedKeys={[selectedKey]}
        mode="inline"
        items={items}
        className="sidebar-menu"
        inlineCollapsed={collapsed}
      />
    </div>
  );
}
// Main sidebar component that wraps the content in Suspense
export default function Sidebar() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin />
      </div>
    }>
      <SidebarContent />
    </Suspense>
  );
}

