'use client';

import { Suspense } from 'react';
import '../survey/survey.css';
import CollegeSelectorContent from './_components/CollegeSelectorContent';

// Main component with Suspense boundary
export default function CollegeSelectorPage() {
  return (
    <div className="survey-page">
      <Suspense fallback={
        <div className="main-container mobile-survey">
          <div className="text-center py-8">
            <p>Loading college selector...</p>
          </div>
        </div>
      }>
        <CollegeSelectorContent />
      </Suspense>
    </div>
  );
}

