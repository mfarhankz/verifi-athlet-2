"use client";

import React, { useState, useEffect } from 'react';
import { Select, Card, List, Empty, Spin, Button, message } from 'antd';
import { useVerifiedGame, UserPickWithDetails } from './VerifiedGameContext';

const UserPicks: React.FC = () => {
  const { 
    weeks, 
    games, 
    userPicks, 
    selectedWeek, 
    setSelectedWeek, 
    makeUserPick, 
    currentUser, 
    loading,
    fetchAllUserPicksForGame
  } = useVerifiedGame();

  const [allUserPicks, setAllUserPicks] = useState<Record<string, UserPickWithDetails[]>>({});

  // Fetch all user picks for locked games
  useEffect(() => {
    const fetchAllPicks = async () => {
      if (!games.length) return;
      
      const lockedGames = games.filter(game => game.has_started);
      const picksData: Record<string, UserPickWithDetails[]> = {};
      
      for (const game of lockedGames) {
        const picks = await fetchAllUserPicksForGame(game.id);
        picksData[game.id] = picks;
      }
      
      setAllUserPicks(picksData);
    };

    fetchAllPicks();
  }, [games, fetchAllUserPicksForGame]);

  const handleMakePick = async (gameId: string, teamId: string) => {
    await makeUserPick(gameId, teamId);
    message.success('Pick saved successfully');
  };

  // Get the user's pick for a specific game
  const getUserPick = (gameId: string) => {
    return userPicks.find(pick => pick.game_id === gameId);
  };

  // Component to display who picked each team
  const TeamPicksDisplay: React.FC<{ 
    game: any; 
    allPicks: UserPickWithDetails[]; 
  }> = ({ game, allPicks }) => {
    const team1Picks = allPicks.filter(pick => pick.team_id === game.team1_id);
    const team2Picks = allPicks.filter(pick => pick.team_id === game.team2_id);
    const hasWinner = !!game.winner_id;
    const team1IsWinner = game.winner_id === game.team1_id;
    const team2IsWinner = game.winner_id === game.team2_id;

    return (
      <div className="mt-3">
        <div className="grid grid-cols-2 gap-4">
          {/* Team 1 Picks */}
          <div className={`p-3 rounded ${hasWinner && team1IsWinner ? 'bg-green-50 border border-green-200' : hasWinner && !team1IsWinner ? 'bg-red-50 border border-red-200' : 'bg-gray-50 border border-gray-200'}`}>
            <h4 className={`font-semibold text-sm mb-2 ${hasWinner && team1IsWinner ? 'text-green-700' : hasWinner && !team1IsWinner ? 'text-red-700' : 'text-gray-700'}`}>
              {game.team1?.name}
            </h4>
            {team1Picks.length > 0 ? (
              <div className="space-y-1">
                {team1Picks.map((pick, index) => (
                  <div key={index} className="text-sm">
                    {pick.user_detail?.name_first || 'Unknown'}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500">No picks</div>
            )}
          </div>

          {/* Team 2 Picks */}
          <div className={`p-3 rounded ${hasWinner && team2IsWinner ? 'bg-green-50 border border-green-200' : hasWinner && !team2IsWinner ? 'bg-red-50 border border-red-200' : 'bg-gray-50 border border-gray-200'}`}>
            <h4 className={`font-semibold text-sm mb-2 ${hasWinner && team2IsWinner ? 'text-green-700' : hasWinner && !team2IsWinner ? 'text-red-700' : 'text-gray-700'}`}>
              {game.team2?.name}
            </h4>
            {team2Picks.length > 0 ? (
              <div className="space-y-1">
                {team2Picks.map((pick, index) => (
                  <div key={index} className="text-sm">
                    {pick.user_detail?.name_first || 'Unknown'}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500">No picks</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="p-4">
        <p>Please log in to make picks.</p>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-4">
      <div className="mb-8 sm:mb-4">
        <h2 className="text-lg sm:text-xl font-semibold mb-4">My Picks</h2>
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

      {!selectedWeek ? (
        <Empty description="Please select a week to view games" />
      ) : games.length === 0 ? (
        <Empty description="No games found for this week" />
      ) : (
        <List
          grid={{ 
            gutter: [8, 8], 
            xs: 1, 
            sm: 1, 
            md: 2,
            lg: 2,
            xl: 2,
            xxl: 2
          }}
          dataSource={games}
          renderItem={(game) => {
            const userPick = getUserPick(game.id);
            const hasStarted = game.has_started;
            const hasWinner = !!game.winner_id;
            const userPickedWinner = hasWinner && userPick && userPick.team_id === game.winner_id;
            const userPickedLoser = hasWinner && userPick && userPick.team_id !== game.winner_id;
            
            return (
              <List.Item>
                <Card 
                  title={
                    <div>
                      {hasWinner ? (
                        <div>
                          <div className="block sm:hidden text-center">
                            <div className={game.winner_id === game.team1_id ? "text-green-600 font-semibold" : "text-gray-600"}>
                              {game.team1?.name} {game.winner_id === game.team1_id && "(W)"}
                            </div>
                            <div className={game.winner_id === game.team2_id ? "text-green-600 font-semibold" : "text-gray-600"}>
                              {game.team2?.name} {game.winner_id === game.team2_id && "(W)"}
                            </div>
                            <div className="text-xs mt-2 text-green-600 font-semibold">
                              Game Complete
                            </div>
                          </div>
                          <div className="hidden sm:block text-sm">
                            <span className={game.winner_id === game.team1_id ? "text-green-600 font-semibold" : "text-gray-600"}>
                              {game.team1?.name} {game.winner_id === game.team1_id && "(W)"}
                            </span>
                            <span className="mx-2">vs</span>
                            <span className={game.winner_id === game.team2_id ? "text-green-600 font-semibold" : "text-gray-600"}>
                              {game.team2?.name} {game.winner_id === game.team2_id && "(W)"}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="block sm:hidden text-center">
                            <div className="font-semibold">{game.team1?.name}</div>
                            <div className="font-semibold">{game.team2?.name}</div>
                            <div className="text-xs mt-2">
                              {hasStarted ? (
                                <span className="text-blue-600">Game in progress</span>
                              ) : (
                                <span className="text-gray-600">Not started</span>
                              )}
                            </div>
                          </div>
                          <div className="hidden sm:block">
                            {game.team1?.name} vs {game.team2?.name}
                          </div>
                        </div>
                      )}
                    </div>
                  }
                  size="small"
                  extra={
                    <div className="hidden sm:block text-xs sm:text-sm">
                      {hasWinner ? (
                        <span className="text-green-600 font-semibold">Game Complete</span>
                      ) : hasStarted ? (
                        <span className="text-blue-600">Game in progress</span>
                      ) : (
                        <span className="text-gray-600">Not started</span>
                      )}
                    </div>
                  }
                >
                  {game.kickoff_time && (
                    <p className="text-sm mb-2">
                      Kickoff: {new Date(game.kickoff_time).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric'
                      })} at {new Date(game.kickoff_time).toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit',
                        hour12: true 
                      })}
                    </p>
                  )}
                  {hasStarted ? (
                    <div>
                      {userPick ? (
                        <div>
                          <p className={`text-sm ${hasWinner ? (userPickedWinner ? "text-green-600 font-semibold" : "text-red-600 font-semibold") : ""}`}>
                            Your pick: {userPick.team_id === game.team1_id ? game.team1?.name : game.team2?.name}
                          </p>
                          {hasWinner && (
                            <p className={`text-sm ${userPickedWinner ? "text-green-600 font-bold" : "text-red-600 font-bold"}`}>
                              {userPickedWinner ? "You won! +1 point" : "You lost"}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm">You did not make a pick for this game</p>
                      )}
                      
                      {/* Show who picked each team for locked games */}
                      {allUserPicks[game.id] && (
                        <TeamPicksDisplay 
                          game={game} 
                          allPicks={allUserPicks[game.id]} 
                        />
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="mb-2 text-sm">Make your pick:</p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          type={userPick?.team_id === game.team1_id ? "primary" : "default"}
                          onClick={() => handleMakePick(game.id, game.team1_id)}
                          size="small"
                          className="w-full sm:w-auto"
                        >
                          {game.team1?.name}
                        </Button>
                        <Button
                          type={userPick?.team_id === game.team2_id ? "primary" : "default"}
                          onClick={() => handleMakePick(game.id, game.team2_id)}
                          size="small"
                          className="w-full sm:w-auto"
                        >
                          {game.team2?.name}
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              </List.Item>
            );
          }}
        />
      )}
    </div>
  );
};

export default UserPicks; 