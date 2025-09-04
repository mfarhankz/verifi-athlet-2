"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { fetchUserDetails } from '@/utils/utils';

interface UserCustomer {
  customer_id: string;
}

interface CustomerPackage {
  customer_package_id: number;
  package_id: number;
}

interface SidebarContextType {
  collapsed: boolean;
  toggleCollapsed: () => void;
  setCollapsed: (collapsed: boolean) => void;
  currentMenuTitle: string;
  setCurrentMenuTitle: (title: string) => void;
  userPackages: number[];
  isLoading: boolean;
}

const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  toggleCollapsed: () => {},
  setCollapsed: () => {},
  currentMenuTitle: '',
  setCurrentMenuTitle: () => {},
  userPackages: [],
  isLoading: true,
});

export const SidebarProvider = ({ children }: { children: React.ReactNode }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [currentMenuTitle, setCurrentMenuTitle] = useState('');
  const [userPackages, setUserPackages] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  // Fetch user packages when the component mounts
  useEffect(() => {
    const fetchUserPackages = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        
        if (data.session) {
          const userDetails = await fetchUserDetails();
          if (userDetails) {
            const packageIds = (userDetails.packages || []).map((id: string) => parseInt(id, 10));
            setUserPackages(packageIds);
          }
        }
      } catch (error) {
        console.error("Error fetching user packages:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserPackages();
  }, []);

  return (
    <SidebarContext.Provider value={{ 
      collapsed, 
      toggleCollapsed,
      setCollapsed,
      currentMenuTitle, 
      setCurrentMenuTitle,
      userPackages,
      isLoading
    }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => useContext(SidebarContext); 