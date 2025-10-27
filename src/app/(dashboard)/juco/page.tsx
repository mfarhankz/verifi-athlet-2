"use client";

import React, { Suspense } from "react";
import UserDataProvider from '@/components/UserDataProvider';
import { TableSearchContent } from '../_components/TableSearchContent';

export default function JucoPortal() {
  return (
    <UserDataProvider>
      <Suspense fallback={<div>Loading...</div>}>
        <TableSearchContent dataSource="juco" baseRoute="/juco" />
      </Suspense>
    </UserDataProvider>
  );
}
