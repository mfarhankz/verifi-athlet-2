"use client";

import React, { Suspense } from "react";
import UserDataProvider from '@/components/UserDataProvider';
import { TableSearchContent } from '../_components/TableSearchContent';

export default function Portal() {
  return (
    <UserDataProvider>
      <Suspense fallback={<div>Loading...</div>}>
        <TableSearchContent dataSource="transfer_portal" baseRoute="/transfers" />
      </Suspense>
    </UserDataProvider>
  );
}
