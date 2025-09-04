"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Skeleton } from "antd";
import AthleteProfileContent from "../_components/AthleteProfileContent";
import UserDataProvider from "@/components/UserDataProvider";

// Create a separate component for the content that uses useSearchParams
function AthleteProfileWrapper() {
  const params = useSearchParams();
  const athleteId = params?.get("id");
  const mainTpPageId = params?.get("main_tp_page_id");

  // If main_tp_page_id is provided, use it; otherwise use the athlete_id
  if (mainTpPageId) {
    return <AthleteProfileContent mainTpPageId={mainTpPageId} />;
  } else if (athleteId) {
    return <AthleteProfileContent athleteId={athleteId} />;
  } else {
    return <div>No athlete ID or main transfer portal page ID provided</div>;
  }
}

// Export the main component that uses Suspense
export default function MsocAthleteProfile() {
  return (
    <UserDataProvider>
      <Suspense
        fallback={
          <div className="full-page-loader">
            <Skeleton active avatar paragraph={{ rows: 10 }} />
          </div>
        }
      >
        <AthleteProfileWrapper />
      </Suspense>
    </UserDataProvider>
  );
}