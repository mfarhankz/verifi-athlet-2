"use client";

import React, { useState, useEffect } from "react";
import { Button, Flex, Tabs, Typography } from "antd";
import type { TabsProps } from "antd";
import PlayerProfile from "@/app/(dashboard)/settings/_components/PlayerProfile";
import SystemSettings from "@/app/(dashboard)/settings/_components/SystemSettings";
import ReferralProgram from "@/app/(dashboard)/settings/_components/ReferralProgram";
import MyTeam from "@/app/(dashboard)/settings/_components/MyTeam";
import Alerts from "@/app/(dashboard)/settings/_components/Alerts";
import { fetchCustomerOptionByName } from "@/utils/utils";
import { useCustomer } from "@/contexts/CustomerContext";
import { useZoom } from '@/contexts/ZoomContext';

const tabItems: TabsProps["items"] = [
  // {
  //   key: "1",
  //   label: "My Profile",
  //   children: <PlayerProfile />,
  //   icon: <i className="icon-user-octagon" />,
  // },
  {
    key: "1",
    label: "Alerts",
    children: <Alerts />,
    icon: <i className="icon-alarm" />,
  },
  {
    key: "2",
    label: "Team",
    children: <MyTeam />,
    icon: <i className="icon-profile-2user" />,
  },
  // {
  //   key: "3",
  //   label: "System Settings",
  //   children: <SystemSettings />,
  //   icon: <i className="icon-setting-2" />,
  // },
  // {
  //   key: "4",
  //   label: "Referral Program",
  //   children: <ReferralProgram />,
  //   icon: <i className="icon-money-3" />,
  // },
];

export default function Setting() {
  const { activeCustomerId } = useCustomer();
  const [activeTab, setActiveTab] = useState("1");
  const [showScholarshipDollars, setShowScholarshipDollars] = useState(false);
  const { zoom } = useZoom();

  const onChange = (key: React.SetStateAction<string>) => {
    setActiveTab(key);
  };

  const headingText: { [key: string]: string } = {
    // "1": "Settings",
    "1": "Alerts",
    "2": "Team Settings",
    // "3": "System Settings",
    // "4": "Referral Program",
  };

  useEffect(() => {
    if (!activeCustomerId) return;
    fetchCustomerOptionByName(activeCustomerId, "scholarship_display_dollars")
      .then(option => setShowScholarshipDollars(option?.selected === 1));
  }, [activeCustomerId]);

  return (
    <div className="main-container">
      <div className="w-full h-full">
        <div 
          style={{ 
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top left',
            paddingBottom: zoom > 100 ? '2rem' : '0',
            paddingRight: zoom > 100 ? '5%' : '0',
            minHeight: zoom > 100 ? `${zoom}vh` : 'auto',
            width: zoom > 100 ? `${Math.max(zoom, 120)}%` : '100%',
            marginBottom: zoom > 100 ? '4rem' : '0'
          }}
        >
          <div className={`${activeTab !== "2"} c-height`}>
            <Tabs
              defaultActiveKey="1"
              items={tabItems}
              onChange={onChange}
              className="setting-tabs fit-tabs"
              tabBarGutter={8}
            />
            {/* {activeTab !== "4" && (
              <Flex className="flex justify-center gap-2">
                <Button size="large">Cancel</Button>
                <Button type="primary" size="large">
                  Save Changes
                </Button>
              </Flex>
            )} */}
          </div>
        </div>
      </div>
    </div>
  );
}
