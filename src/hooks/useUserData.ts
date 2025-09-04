import { useCustomer, useUserSafely } from '@/contexts/CustomerContext';

export interface UserDataState {
  isLoading: boolean;
  isReady: boolean;
  isAvailable: boolean;
  userDetails: any;
  activeCustomerId: string | null;
  customers: any[];
  activeSportAbbrev: string | null;
  activeSportName: string | null;
  retryLoad: () => void;
}

export const useUserData = (): UserDataState => {
  const { 
    userDetails, 
    isLoading, 
    isReady, 
    isAvailable 
  } = useUserSafely();
  
  const { 
    activeCustomerId, 
    customers, 
    activeSportAbbrev, 
    activeSportName, 
    retryLoad 
  } = useCustomer();

  return {
    isLoading,
    isReady,
    isAvailable,
    userDetails,
    activeCustomerId,
    customers,
    activeSportAbbrev,
    activeSportName,
    retryLoad
  };
};

// Hook for components that require user data to be available
export const useUserDataRequired = () => {
  const userData = useUserData();
  
  if (!userData.isAvailable) {
    throw new Error('User data is not available. Component should be wrapped with a loading check.');
  }
  
  return userData;
}; 