"use client";

import React, { Suspense } from "react";
import UserDataProvider from '@/components/UserDataProvider';
import { TableSearchContent } from '../_components/TableSearchContent';

export default function HsAthlete() {
  return (
    <UserDataProvider>
      <Suspense fallback={<div>Loading...</div>}>
        <TableSearchContent dataSource="hs_athletes" baseRoute="/hs-athlete" />
      </Suspense>
    </UserDataProvider>
  );
}
