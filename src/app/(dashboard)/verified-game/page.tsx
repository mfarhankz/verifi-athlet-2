"use client";

import React, { useState } from 'react';
import { Tabs, Select } from 'antd';
import WeeksManager from '@/components/verified-game/WeeksManager';
import GamesManager from '@/components/verified-game/GamesManager';
import UserPicks from '@/components/verified-game/UserPicks';
import Leaderboard from '@/components/verified-game/Leaderboard';
import { VerifiedGameProvider } from '@/components/verified-game/VerifiedGameContext';
import VerifiedGameAccessControl from '@/components/verified-game/VerifiedGameAccessControl';

const VerifiedGamePage = () => {
  const [activeTab, setActiveTab] = useState('1');
  
  const items = [
    {
      key: '1',
      label: 'Picks',
      children: <UserPicks />,
    },
    {
      key: '2',
      label: 'Leaderboard',
      children: <Leaderboard />,
    },
    {
      key: '3',
      label: 'Games',
      children: <GamesManager />,
    },
    {
      key: '4',
      label: 'Weeks',
      children: <WeeksManager />,
    },
  ];

  const getCurrentComponent = () => {
    const currentItem = items.find(item => item.key === activeTab);
    return currentItem ? currentItem.children : <UserPicks />;
  };

  return (
    <VerifiedGameAccessControl>
      <div 
        className="container mx-auto p-2 sm:p-4"
        style={{
          height: 'calc(100vh - 64px)', // Account for header height
          overflow: 'auto',
          paddingBottom: '20px'
        }}
      >
        <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Verified Game</h1>
        <VerifiedGameProvider>
          {/* Mobile: Dropdown selector */}
          <div className="block sm:hidden mb-4">
            <Select
              value={activeTab}
              onChange={setActiveTab}
              style={{ width: '100%' }}
              size="large"
              options={items.map(item => ({
                value: item.key,
                label: item.label
              }))}
            />
          </div>
          
          {/* Desktop: Tabs */}
          <div className="hidden sm:block">
            <Tabs 
              activeKey={activeTab}
              onChange={setActiveTab}
              items={items}
              className="verified-game-tabs"
              tabBarStyle={{ 
                fontSize: '12px',
                marginBottom: '16px'
              }}
              tabBarGutter={8}
              size="small"
              centered={false}
              type="line"
              tabPosition="top"
              style={{
                '--ant-tabs-tab-padding': '12px 16px',
              } as React.CSSProperties}
            />
          </div>
          
          {/* Mobile: Content area */}
          <div className="block sm:hidden">
            {getCurrentComponent()}
          </div>
        </VerifiedGameProvider>
      </div>
    </VerifiedGameAccessControl>
  );
};

export default VerifiedGamePage; 