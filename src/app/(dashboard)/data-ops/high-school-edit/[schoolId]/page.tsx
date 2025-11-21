'use client';

import { useParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import UserDataProvider from '@/components/UserDataProvider';
import EditSchoolPageContent from './EditSchoolPageContent';

// Inner component that uses hooks that need a suspense boundary
function EditSchoolPageWrapper() {
  const params = useParams();
  const schoolId = params?.schoolId as string;

  return <EditSchoolPageContent schoolId={schoolId} />;
}

// Main component wrapped with Suspense
export default function EditSchoolPage() {
  return (
    <UserDataProvider>
      <Suspense fallback={<div>Loading...</div>}>
        <EditSchoolPageWrapper />
      </Suspense>
    </UserDataProvider>
  );
}

