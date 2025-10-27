"use client";

import React, { useState, useEffect } from 'react';
import { Table, Select, Spin, Empty, Alert } from 'antd';
import { useVerifiedGame } from './VerifiedGameContext';
import { supabase } from '@/lib/supabaseClient';

interface LeaderboardUser {
  id: string;
  name: string;
  totalWins: number;
  totalPicks: number;
  totalGames: number;
  thisWeekWins: number;
  thisWeekPicks: number;
  thisWeekGames: number;
  thisWeekCash: number;
  totalCash: number;
  rank: number;
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

  // Fetch leaderboard data when selected week changes
  useEffect(() => {
    const fetchLeaderboardData = async () => {
      if (!selectedWeek) return;
      
      setLoadingLeaderboard(true);
      setError(null);
      
      try {
        // Fetch all user picks
        const { data: allUserPicks, error: picksError } = await supabase
          .from('verified_game_user_picks')
          .select('user_id, game_id, team_id');
        
        if (picksError) {
          throw new Error(`Error fetching user picks: ${picksError.message}`);
        }
        
        // Fetch all games with winners
        const { data: allGames, error: gamesError } = await supabase
          .from('verified_game_games')
          .select('id, winner_id, week_id')
          .not('winner_id', 'is', null);
        
        if (gamesError) {
          throw new Error(`Error fetching games: ${gamesError.message}`);
        }
        
        // Fetch user details
        const userIds = [...new Set(allUserPicks?.map((pick: any) => pick.user_id) || [])];
        const { data: users, error: usersError } = await supabase
          .from('user_detail')
          .select('id, name_first, name_last')
          .in('id', userIds);
        
        if (usersError) {
          console.warn('Could not fetch user details, using user IDs instead:', usersError.message);
        }
        
        // Process data for all weeks
        const userStats: Record<string, {
          name: string;
          totalWins: number;
          totalPicks: number;
          totalGames: number;
          thisWeekWins: number;
          thisWeekPicks: number;
          thisWeekGames: number;
          thisWeekCash: number;
          totalCash: number;
        }> = {};
        
        // Get current week games
        const currentWeekGames = allGames?.filter((game: any) => game.week_id === selectedWeek) || [];
        const currentWeekGameIds = new Set(currentWeekGames.map((game: any) => game.id));
        
        // Initialize user stats
        userIds.forEach((userId: any) => {
          const user = users?.find((u: any) => u.id === userId);
          const displayName = user?.name_first && user?.name_last 
            ? `${user.name_first} ${user.name_last}`
            : `User ${userId.slice(0, 8)}`;
          
          userStats[userId] = {
            name: displayName,
            totalWins: 0,
            totalPicks: 0,
            totalGames: allGames?.length || 0,
            thisWeekWins: 0,
            thisWeekPicks: 0,
            thisWeekGames: currentWeekGames.length,
            thisWeekCash: 0,
            totalCash: 0
          };
        });
        
        // Process all picks
        allUserPicks?.forEach((pick: any) => {
          const game = allGames?.find((g: any) => g.id === pick.game_id);
          if (game && game.winner_id) {
            const userId = pick.user_id;
            if (userStats[userId]) {
              userStats[userId].totalPicks++;
              
              // Check if pick was correct
              if (pick.team_id === game.winner_id) {
                userStats[userId].totalWins++;
              }
              
              // Check if this is current week
              if (currentWeekGameIds.has(pick.game_id)) {
                userStats[userId].thisWeekPicks++;
                if (pick.team_id === game.winner_id) {
                  userStats[userId].thisWeekWins++;
                }
              }
            }
          }
        });
        
        // Calculate cash for current week and total cash across all weeks
        Object.entries(userStats).forEach(([userId, user]) => {
          // Calculate current week cash
          if (user.thisWeekWins === 4) {
            user.thisWeekCash = 20;
          } else if (user.thisWeekWins === 5) {
            user.thisWeekCash = 50;
          }
          
          // Calculate total cash by processing all weeks
          let totalCashEarned = 0;
          
          // Get all weeks to process
          const allWeekIds = [...new Set(allGames?.map((game: any) => game.week_id) || [])];
          
          allWeekIds.forEach(weekId => {
            // Get games for this week
            const weekGames = allGames?.filter((game: any) => game.week_id === weekId) || [];
            const weekGameIds = new Set(weekGames.map((game: any) => game.id));
            
            // Count wins for this week
            let weekWins = 0;
            allUserPicks?.forEach((pick: any) => {
              if (pick.user_id === userId && weekGameIds.has(pick.game_id)) {
                const game = weekGames.find((g: any) => g.id === pick.game_id);
                if (game && game.winner_id && pick.team_id === game.winner_id) {
                  weekWins++;
                }
              }
            });
            
            // Calculate cash for this week
            if (weekWins === 4) {
              totalCashEarned += 20;
            } else if (weekWins === 5) {
              totalCashEarned += 50;
            }
          });
          
          user.totalCash = totalCashEarned;
        });
        
        // Calculate ranks based on total wins, then total cash as tiebreaker
        const sortedForRanking = Object.entries(userStats)
          .map(([id, stats]) => ({ id, ...stats }))
          .sort((a, b) => {
            if (a.totalWins !== b.totalWins) {
              return b.totalWins - a.totalWins;
            }
            return b.totalCash - a.totalCash;
          });

        const processedData = sortedForRanking.map((user, index) => ({
          id: user.id,
          name: user.name,
          totalWins: user.totalWins,
          totalPicks: user.totalPicks,
          totalGames: user.totalGames,
          thisWeekWins: user.thisWeekWins,
          thisWeekPicks: user.thisWeekPicks,
          thisWeekGames: user.thisWeekGames,
          thisWeekCash: user.thisWeekCash,
          totalCash: user.totalCash,
          rank: index + 1
        }));
            
            setLeaderboardData(processedData);
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
      dataIndex: 'rank',
      key: 'rank',
      width: 60,
      sorter: (a: LeaderboardUser, b: LeaderboardUser) => a.rank - b.rank,
      defaultSortOrder: 'ascend' as const,
    },
    {
      title: 'Competitor',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      sorter: (a: LeaderboardUser, b: LeaderboardUser) => a.name.localeCompare(b.name),
    },
    {
      title: 'Total Wins',
      dataIndex: 'totalWins',
      key: 'totalWins',
      sorter: (a: LeaderboardUser, b: LeaderboardUser) => b.totalWins - a.totalWins,
      defaultSortOrder: 'descend' as const,
      width: 100,
    },
    {
      title: 'Details',
      key: 'details',
      render: (_: unknown, record: LeaderboardUser) => {
        const percentage = record.totalGames > 0 ? Math.round((record.totalWins / record.totalPicks) * 100) : 0;
        return `${record.totalWins} of ${record.totalPicks} (${percentage}%)`;
      },
      width: 120,
      sorter: (a: LeaderboardUser, b: LeaderboardUser) => {
        const aPercentage = a.totalGames > 0 ? Math.round((a.totalWins / a.totalPicks) * 100) : 0;
        const bPercentage = b.totalGames > 0 ? Math.round((b.totalWins / b.totalPicks) * 100) : 0;
        return aPercentage - bPercentage;
      },
    },
    {
      title: 'This Week',
      key: 'thisWeek',
      render: (_: unknown, record: LeaderboardUser) => `${record.thisWeekWins} of ${record.thisWeekPicks}`,
      width: 100,
      sorter: (a: LeaderboardUser, b: LeaderboardUser) => b.thisWeekWins - a.thisWeekWins,
      defaultSortOrder: 'descend' as const,
    },
    {
      title: 'Cash (this week)',
      key: 'thisWeekCash',
      render: (_: unknown, record: LeaderboardUser) => record.thisWeekCash > 0 ? `$${record.thisWeekCash}` : '-',
      width: 120,
      sorter: (a: LeaderboardUser, b: LeaderboardUser) => b.thisWeekCash - a.thisWeekCash,
      defaultSortOrder: 'descend' as const,
    },
    {
      title: 'Cash (total)',
      dataIndex: 'totalCash',
      key: 'totalCash',
      render: (cash: number) => cash > 0 ? `$${cash}` : '-',
      width: 100,
      sorter: (a: LeaderboardUser, b: LeaderboardUser) => b.totalCash - a.totalCash,
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
    <div className="p-2 sm:p-4">
      <h2 className="text-lg sm:text-xl font-semibold mb-4">Leaderboard</h2>
      
      <div className="mb-4">
        <Select
          placeholder="Select a week"
          style={{ width: '100%', maxWidth: 200 }}
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
      

      {!selectedWeek ? (
        <Empty description="Please select a week to view the leaderboard" />
      ) : leaderboardData.length === 0 ? (
        <Empty description="No data available for this week. This could be because no games have winners declared yet, or no users have made correct picks." />
      ) : (
        <div className="overflow-x-auto">
        <Table 
          dataSource={leaderboardData} 
          columns={columns} 
          rowKey="id"
          pagination={false}
            scroll={{ x: 800 }}
            size="small"
        />
        </div>
      )}
    </div>
  );
};

export default Leaderboard; 