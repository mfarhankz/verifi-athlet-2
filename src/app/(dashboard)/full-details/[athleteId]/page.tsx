'use client';

import { useParams, useSearchParams } from 'next/navigation';
import FullPageDetails from '../../../../components/cap-manager/FullPageDetails';
import { CompDisplayMode } from '../../../../utils/compAccessUtils';
import { Suspense } from 'react';

// Inner component that uses hooks that need a suspense boundary
function FullDetailsContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  
  const athleteId = params?.athleteId as string;
  const team = searchParams?.get('team') || '';
  const selectedYear = parseInt(searchParams?.get('year') || '') || new Date().getFullYear();
  const selectedScenario = searchParams?.get('scenario') || '';
  const effectiveCompAccess = searchParams?.get('eCA') === 'true';
  const compDisplayMode = (searchParams?.get('cdm') || 'on') as CompDisplayMode;
  const targetScenario = searchParams?.get('targetScenario') || selectedScenario;

  return (
    <FullPageDetails 
      athleteId={athleteId}
      team={team} 
      selectedYear={selectedYear} 
      selectedScenario={selectedScenario}
      effectiveCompAccess={effectiveCompAccess}
      compDisplayMode={compDisplayMode}
      targetScenario={targetScenario}
    />
  );
}

// Main component wrapped with Suspense
export default function FullDetailsPage() {
  return (
    <Suspense fallback={<div>Loading athlete details...</div>}>
      <FullDetailsContent />
    </Suspense>
  );
} 