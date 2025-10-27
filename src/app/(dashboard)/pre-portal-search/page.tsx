"use client";

import React, { Suspense } from "react";
import UserDataProvider from '@/components/UserDataProvider';
import { TableSearchContent } from '../_components/TableSearchContent';

export default function PrePortalSearch() {
  return (
    <UserDataProvider>
      <Suspense fallback={<div>Loading...</div>}>
        <TableSearchContent dataSource="all_athletes" baseRoute="/pre-portal-search" />
      </Suspense>
    </UserDataProvider>
  );
}