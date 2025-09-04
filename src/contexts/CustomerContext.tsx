"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchUserDetails } from '@/utils/utils';
import { supabase } from '@/lib/supabaseClient';

// Extend the customer type to include sport abbreviation
type Customer = {
  customer_id: string;
  school_id: string;
  sport_id: string;
  sport_abbrev?: string;
  sport_name?: string;
};

// Sport data type
type Sport = {
  id: string;
  name: string;
  abbrev: string;
};

// Extend the customer type to include sport abbreviation
type UserDetailsType = {
  id: string;
  name_first: string;
  name_last: string;
  email?: string;
  customers: Array<Customer>;
  customer_id: string;
  packages?: string[]; // Array of package IDs the user has access to
  [key: string]: any;
};

// Define the shape of our context
type CustomerContextType = {
  userDetails: UserDetailsType | null;
  customers: Array<Customer>;
  activeCustomerId: string | null;
  setActiveCustomerId: (id: string) => void;
  isLoading: boolean;
  activeSportAbbrev: string | null;
  activeSportName: string | null;
  isReady: boolean;
  retryLoad: () => void;
};

// Create context with default values
const CustomerContext = createContext<CustomerContextType>({
  userDetails: null,
  customers: [],
  activeCustomerId: null,
  setActiveCustomerId: () => {},
  isLoading: true,
  activeSportAbbrev: null,
  activeSportName: null,
  isReady: false,
  retryLoad: () => {},
});

// Custom hook to use the customer context
export const useCustomer = () => useContext(CustomerContext);

// Convenience hook for user details
export const useUser = () => {
  const { userDetails } = useCustomer();
  return userDetails;
};

// Convenience hook for active customer ID
export const useActiveCustomerId = () => {
  const { activeCustomerId } = useCustomer();
  return activeCustomerId;
};

// Hook to safely access user details with loading state
export const useUserSafely = () => {
  const { userDetails, isLoading, isReady } = useCustomer();
  
  return {
    userDetails,
    isLoading,
    isReady,
    isAvailable: !isLoading && isReady && userDetails !== null
  };
};

// Provider component
export const CustomerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userDetails, setUserDetails] = useState<UserDetailsType | null>(null);
  const [customers, setCustomers] = useState<Array<Customer>>([]);
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSportAbbrev, setActiveSportAbbrev] = useState<string | null>(null);
  const [activeSportName, setActiveSportName] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Function to load user details
  const loadUserDetails = async () => {
    setIsLoading(true);
    try {
      const details = await fetchUserDetails();
      setUserDetails(details);
      if (details) {
        const customersWithoutSportDetails = details.customers || [];
        // Fetch sport details for all sport_ids
        const sportIds = customersWithoutSportDetails
          .map((customer: { sport_id: string }) => customer.sport_id)
          .filter((id: string | null | undefined) => id);
        let sportsMap: Record<string, { abbrev: string; name: string }> = {};
        if (sportIds.length > 0) {
          const { data: sportsData, error: sportsError } = await supabase
            .from('sport')
            .select('id, name, abbrev')
            .in('id', sportIds);
          if (sportsError) {
            console.error('Error fetching sports data:', sportsError);
          } else if (sportsData) {
            sportsMap = sportsData.reduce((acc: Record<string, { abbrev: string; name: string }>, sport: Sport) => {
              acc[sport.id] = { abbrev: sport.abbrev, name: sport.name };
              return acc;
            }, {} as Record<string, { abbrev: string; name: string }>);
          }
        }
        // Combine customer data with sport details
        const enrichedCustomers = customersWithoutSportDetails.map((customer: { sport_id: string; customer_id: string; school_id: string }) => ({
          ...customer,
          sport_abbrev: customer.sport_id ? sportsMap[customer.sport_id]?.abbrev : undefined,
          sport_name: customer.sport_id ? sportsMap[customer.sport_id]?.name : undefined
        }));
        setCustomers(enrichedCustomers);
        setActiveCustomerId(details.customer_id);
        // Set active sport details for the active customer
        const activeCustomer = enrichedCustomers.find((customer: Customer) => customer.customer_id === details.customer_id);
        if (activeCustomer) {
          setActiveSportAbbrev(activeCustomer.sport_abbrev || null);
          setActiveSportName(activeCustomer.sport_name || null);
        }
      }
    } catch (error) {
      console.error('Error loading user details:', error);
    } finally {
      setIsLoading(false);
      setIsReady(true);
    }
  };

  // Retry function
  const retryLoad = () => {
    setIsReady(false);
    loadUserDetails();
  };

  // Load user details and customers on mount
  useEffect(() => {
    loadUserDetails();
  }, []);

  // Save active customer ID to localStorage when it changes
  useEffect(() => {
    if (activeCustomerId && typeof window !== 'undefined') {
      localStorage.setItem('activeCustomerId', activeCustomerId);
    }
  }, [activeCustomerId]);

  // Update active sport details when active customer changes
  useEffect(() => {
    if (activeCustomerId && customers.length > 0) {
      const activeCustomer = customers.find((customer: Customer) => customer.customer_id === activeCustomerId);
      if (activeCustomer) {
        setActiveSportAbbrev(activeCustomer.sport_abbrev || null);
        setActiveSportName(activeCustomer.sport_name || null);
      }
    }
  }, [activeCustomerId, customers]);

  return (
    <CustomerContext.Provider
      value={{
        userDetails,
        customers,
        activeCustomerId,
        setActiveCustomerId,
        isLoading,
        activeSportAbbrev,
        activeSportName,
        isReady,
        retryLoad
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
}; 