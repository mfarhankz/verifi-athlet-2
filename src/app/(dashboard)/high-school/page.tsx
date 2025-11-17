"use client";

import React from "react";
import { TableSearchContent } from "../_components/TableSearchContent";

export default function HighSchoolPage() {
  return (
    <TableSearchContent 
      dataSource="high_schools" 
      baseRoute="/high-school" 
    />
  );
}
