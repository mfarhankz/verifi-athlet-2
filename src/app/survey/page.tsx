"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Component that uses useSearchParams - needs to be wrapped in Suspense
function SurveyRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Get athlete ID from URL parameters
    const athleteId = searchParams?.get('id');
    
    if (athleteId) {
      // Redirect to the new dynamic route
      router.push(`/survey/${athleteId}`);
    } else {
      // If no athlete ID, show an error or redirect to a default page
      alert('No athlete ID provided. Please access the survey through a valid athlete link.');
      router.push('/');
    }
  }, [router, searchParams]);

  return (
    <div className="main-container mobile-survey">
      <div className="text-center py-8">
        <p>Redirecting to survey...</p>
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function Survey() {
  return (
    <Suspense fallback={
      <div className="main-container mobile-survey">
        <div className="text-center py-8">
          <p>Loading...</p>
        </div>
      </div>
    }>
      <SurveyRedirect />
    </Suspense>
  );
}
