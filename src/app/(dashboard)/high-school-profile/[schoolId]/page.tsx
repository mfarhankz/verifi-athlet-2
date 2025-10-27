'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import UserDataProvider from '@/components/UserDataProvider';
import SchoolProfileContent from '../../_components/SchoolProfileContent';

// Inner component that uses hooks that need a suspense boundary
function HighSchoolProfilePageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  
  const schoolId = params?.schoolId as string;
  const dataSource = searchParams?.get('dataSource') || 'high_schools';

  return (
    <SchoolProfileContent 
      schoolId={schoolId}
      dataSource={dataSource}
      isInModal={false}
    />
  );
}

// Main component wrapped with Suspense
export default function HighSchoolProfilePage() {
  return (
    <UserDataProvider>
      <Suspense fallback={<div>Loading school details...</div>}>
        <HighSchoolProfilePageContent />
      </Suspense>
    </UserDataProvider>
  );
}
