"use client";

import React from 'react';
import { Tabs } from 'antd';
import WeeksManager from './_components/WeeksManager';
import GamesManager from './_components/GamesManager';
import UserPicks from './_components/UserPicks';
import Leaderboard from './_components/Leaderboard';
import { VerifiedGameProvider } from './_components/VerifiedGameContext';

const VerifiedGamePage = () => {
  const items = [
    {
      key: '1',
      label: 'Manage Weeks',
      children: <WeeksManager />,
    },
    {
      key: '2',
      label: 'Manage Games',
      children: <GamesManager />,
    },
    {
      key: '3',
      label: 'My Picks',
      children: <UserPicks />,
    },
    {
      key: '4',
      label: 'Leaderboard',
      children: <Leaderboard />,
    },
  ];

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Verified Game</h1>
      <VerifiedGameProvider>
        <Tabs defaultActiveKey="1" items={items} />
      </VerifiedGameProvider>
    </div>
  );
};

export default VerifiedGamePage; 