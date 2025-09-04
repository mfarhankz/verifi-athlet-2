'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';

interface SurveyAuthContextType {
  isAuthenticated: boolean;
  athleteId: string | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  validateToken: (token: string) => Promise<boolean>;
  logout: () => void;
}

const SurveyAuthContext = createContext<SurveyAuthContextType | undefined>(undefined);

export const useSurveyAuth = () => {
  const context = useContext(SurveyAuthContext);
  if (context === undefined) {
    throw new Error('useSurveyAuth must be used within a SurveyAuthProvider');
  }
  return context;
};

interface SurveyAuthProviderProps {
  children: ReactNode;
}

export const SurveyAuthProvider: React.FC<SurveyAuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  // Validate token with the API
  const validateToken = async (tokenToValidate: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/validate-survey-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: tokenToValidate }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsAuthenticated(true);
        setAthleteId(data.athlete_id);
        setToken(tokenToValidate);
        
        // Store token in sessionStorage for persistence
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('surveyToken', tokenToValidate);
          sessionStorage.setItem('surveyAthleteId', data.athlete_id);
        }
        
        return true;
      } else {
        setError(data.error || 'Invalid token');
        setIsAuthenticated(false);
        setAthleteId(null);
        setToken(null);
        return false;
      }
    } catch (err) {
      setError('Network error occurred');
      setIsAuthenticated(false);
      setAthleteId(null);
      setToken(null);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    setIsAuthenticated(false);
    setAthleteId(null);
    setToken(null);
    setError(null);
    
    // Clear sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('surveyToken');
      sessionStorage.removeItem('surveyAthleteId');
    }
  };

  // Initialize authentication on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check for token in URL first
        const urlToken = searchParams?.get('token');
        
        // Then check sessionStorage
        let storedToken = null;
        let storedAthleteId = null;
        
        if (typeof window !== 'undefined') {
          storedToken = sessionStorage.getItem('surveyToken');
          storedAthleteId = sessionStorage.getItem('surveyAthleteId');
        }

        // Use URL token if available, otherwise use stored token
        const tokenToValidate = urlToken || storedToken;

        if (tokenToValidate) {
          const isValid = await validateToken(tokenToValidate);
          if (!isValid && urlToken) {
            // If URL token is invalid, clear stored token too
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('surveyToken');
              sessionStorage.removeItem('surveyAthleteId');
            }
          }
        } else {
          setIsAuthenticated(false);
          setAthleteId(null);
          setToken(null);
        }
      } catch (err) {
        console.error('Error initializing survey auth:', err);
        setError('Failed to initialize authentication');
        setIsAuthenticated(false);
        setAthleteId(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [searchParams]);

  const value: SurveyAuthContextType = {
    isAuthenticated,
    athleteId,
    token,
    loading,
    error,
    validateToken,
    logout,
  };

  return (
    <SurveyAuthContext.Provider value={value}>
      {children}
    </SurveyAuthContext.Provider>
  );
};
