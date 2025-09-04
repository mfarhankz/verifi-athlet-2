"use client";

import React, { useState, useEffect } from 'react';
import { Table, Select, Spin, Empty, Alert } from 'antd';
import { useVerifiedGame } from './VerifiedGameContext';
import { supabase } from '@/lib/supabaseClient';

interface LeaderboardUser {
  id: string;
  email: string;
  name: string;
  points: number;
}

interface UserPick {
  user_id: string;
  game_id: string;
  team_id: string;
  users?: {
    id: string;
    email: string;
  };
  games?: {
    winner_id: string | null;
    week_id: string;
  };
}

// Type for table row data
interface TableRowData {
  id: string;
  name: string;
  email: string;
  points: number;
}

const Leaderboard: React.FC = () => {
  const { weeks, selectedWeek, setSelectedWeek, loading } = useVerifiedGame();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  // Fetch leaderboard data when selected week changes
  useEffect(() => {
    const fetchLeaderboardData = async () => {
      if (!selectedWeek) return;
      
      setLoadingLeaderboard(true);
      setError(null);
      setDebugInfo(null);
      
      try {
        // First, check if there are any games with winners for this week
        const { data: gamesWithWinners, error: gamesError } = await supabase
          .from('verified_game_games')
          .select('id')
          .eq('week_id', selectedWeek)
          .not('winner_id', 'is', null);
        
        if (gamesError) {
          throw new Error(`Error checking for games with winners: ${gamesError.message}`);
        }
        
        if (!gamesWithWinners || gamesWithWinners.length === 0) {
          setDebugInfo("No games with winners found for this week");
          setLeaderboardData([]);
          setLoadingLeaderboard(false);
          return; // No games with winners, so no points to calculate
        }
        
        setDebugInfo(`Found ${gamesWithWinners.length} games with winners. Attempting to fetch leaderboard...`);
        
        // Try the direct query approach first since it's more reliable
        try {
          const { data: directData, error: directError } = await supabase.from('verified_game_user_picks')
            .select(`
              user_id,
              game_id,
              team_id,
              users:user_id(id, email),
              games:game_id(winner_id, week_id)
            `)
            .eq('games.week_id', selectedWeek);
          
          if (directError) {
            throw new Error(`Error with direct query: ${directError.message}`);
          }
          
          if (directData && directData.length > 0) {
            // Process the data manually
            const userPoints: Record<string, { email: string, points: number }> = {};
            
            directData.forEach((pick: UserPick) => {
              if (pick.games && pick.games.winner_id && pick.team_id === pick.games.winner_id) {
                const userId = pick.user_id;
                if (!userPoints[userId]) {
                  userPoints[userId] = { 
                    email: pick.users?.email || 'Unknown', 
                    points: 0 
                  };
                }
                userPoints[userId].points += 1;
              }
            });
            
            const processedData = Object.entries(userPoints).map(([id, data]) => ({
              id,
              email: data.email,
              name: data.email.split('@')[0],
              points: data.points
            }));
            
            setLeaderboardData(processedData);
            setDebugInfo(`Successfully processed ${directData.length} picks and found ${processedData.length} users with points`);
          } else {
            setLeaderboardData([]);
            setDebugInfo("No user picks found for games in this week");
          }
        } catch (directQueryError) {
          // If direct query fails, try the RPC function
          setDebugInfo(`Direct query failed: ${directQueryError instanceof Error ? directQueryError.message : 'Unknown error'}. Trying RPC function...`);
          
          const { data, error } = await supabase.rpc('get_verified_game_leaderboard', {
            week_id_param: selectedWeek
          });
          
          if (error) {
            throw new Error(`Error fetching leaderboard data: ${error.message}`);
          }
          
          if (data && data.length > 0) {
            setLeaderboardData(data);
            setDebugInfo(`Successfully fetched ${data.length} users from RPC function`);
          } else {
            setLeaderboardData([]);
            setDebugInfo("No data returned from RPC function");
          }
        }
      } catch (error) {
        console.error('Error fetching leaderboard data:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
        setLeaderboardData([]);
      } finally {
        setLoadingLeaderboard(false);
      }
    };

    fetchLeaderboardData();
  }, [selectedWeek]);

  const columns = [
    {
      title: 'Rank',
      key: 'rank',
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: 'User',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: LeaderboardUser) => text || record.email.split('@')[0],
    },
    {
      title: 'Points',
      dataIndex: 'points',
      key: 'points',
      sorter: (a: LeaderboardUser, b: LeaderboardUser) => a.points - b.points,
      defaultSortOrder: 'descend' as const,
    },
  ];

  if (loading || loadingLeaderboard) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Leaderboard</h2>
      
      <div className="mb-4">
        <Select
          placeholder="Select a week"
          style={{ width: 200 }}
          value={selectedWeek || undefined}
          onChange={(value) => setSelectedWeek(value)}
          options={weeks.map((week) => ({
            value: week.id,
            label: week.name,
          }))}
        />
      </div>

      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          className="mb-4"
        />
      )}
      
      {debugInfo && (
        <Alert
          message="Debug Info"
          description={debugInfo}
          type="info"
          showIcon
          className="mb-4"
        />
      )}

      {!selectedWeek ? (
        <Empty description="Please select a week to view the leaderboard" />
      ) : leaderboardData.length === 0 ? (
        <Empty description="No data available for this week. This could be because no games have winners declared yet, or no users have made correct picks." />
      ) : (
        <Table 
          dataSource={leaderboardData} 
          columns={columns} 
          rowKey="id"
          pagination={false}
        />
      )}
    </div>
  );
};

export default Leaderboard; 