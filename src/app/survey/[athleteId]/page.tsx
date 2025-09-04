'use client';

import { useParams } from 'next/navigation';
import { Suspense } from 'react';
import { SurveyAuthProvider } from '@/contexts/SurveyAuthContext';
import SurveyContent from '../_components/SurveyContent';
import SurveyLogin from '../_components/SurveyLogin';
import { useSurveyAuth } from '@/contexts/SurveyAuthContext';

// Inner component that uses hooks that need a suspense boundary
function SurveyPageContent() {
  const params = useParams();
  const athleteId = params?.athleteId as string;
  const { isAuthenticated, athleteId: authAthleteId, loading } = useSurveyAuth();

  // Show loading state
  if (loading) {
    return (
      <div className="main-container mobile-survey">
        <div className="text-center py-8">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <SurveyLogin />;
  }

  // Show error if athlete ID doesn't match
  if (authAthleteId !== athleteId) {
    return (
      <div className="main-container mobile-survey">
        <div className="text-center py-8">
          <p>Access denied. This survey token is not valid for this athlete.</p>
        </div>
      </div>
    );
  }

  // Show survey content if authenticated and athlete ID matches
  return <SurveyContent athleteId={athleteId} />;
}

// Main component wrapped with Suspense and Auth Provider
export default function SurveyPage() {
  return (
    <SurveyAuthProvider>
      <Suspense fallback={<div>Loading survey...</div>}>
        <SurveyPageContent />
      </Suspense>
    </SurveyAuthProvider>
  );
} 