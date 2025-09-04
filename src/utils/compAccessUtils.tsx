"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';

export type CompDisplayMode = 'on' | 'off' | 'oneLine';

interface CompAccessContextType {
  effectiveCompAccess: boolean;
  compDisplayMode: CompDisplayMode;
  toggleCompAccess: () => void;
  setCompDisplayMode: (mode: CompDisplayMode) => void;
  hasCompensationAccess: boolean;
}

const CompAccessContext = createContext<CompAccessContextType | undefined>(undefined);

export const CompAccessProvider = ({ children }: { children: ReactNode }) => {
  const [compDisplayMode, setCompDisplayMode] = useState<CompDisplayMode>('on');
  const [compensationAccess, setCompensationAccess] = useState(false);

  useEffect(() => {
    const fetchUserDetails = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Check if user has an active compensation access override with customer_package_id = 6
        const { data, error } = await supabase
          .from('user_access_override')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('customer_package_id', 6)
          .is('access_end', null)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          // Only log actual errors, not the "no rows returned" case
          console.error('Error fetching user access override:', error);
          setCompensationAccess(false);
        } else {
          // If we got a record back, the user has compensation access
          setCompensationAccess(!!data);
        }
      }
    };

    fetchUserDetails();
  }, []);

  // Comp access is effective when user has access and mode is 'on'
  const effectiveCompAccess = compensationAccess && compDisplayMode === 'on';
  
  const hasCompensationAccess = compensationAccess;

  const toggleCompAccess = () => {
    setCompDisplayMode(prev => {
      if (prev === 'on') return 'off';
      if (prev === 'off') return 'oneLine';
      return 'on';
    });
  };

  const value = { 
    effectiveCompAccess, 
    compDisplayMode, 
    toggleCompAccess, 
    setCompDisplayMode,
    hasCompensationAccess
  };
  
  return (
    <CompAccessContext.Provider value={value}>
      {children}
    </CompAccessContext.Provider>
  );
};

export const useEffectiveCompAccess = () => {
  const context = useContext(CompAccessContext);
  if (context === undefined) {
    throw new Error('useEffectiveCompAccess must be used within a CompAccessProvider');
  }
  return context;
};