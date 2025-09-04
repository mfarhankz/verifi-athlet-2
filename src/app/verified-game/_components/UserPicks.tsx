"use client";

import React from 'react';
import { Select, Card, List, Empty, Spin, Button, message } from 'antd';
import { useVerifiedGame } from './VerifiedGameContext';

const UserPicks: React.FC = () => {
  const { 
    weeks, 
    games, 
    userPicks, 
    selectedWeek, 
    setSelectedWeek, 
    makeUserPick, 
    currentUser, 
    loading 
  } = useVerifiedGame();

  const handleMakePick = async (gameId: string, teamId: string) => {
    await makeUserPick(gameId, teamId);
    message.success('Pick saved successfully');
  };

  // Get the user's pick for a specific game
  const getUserPick = (gameId: string) => {
    return userPicks.find(pick => pick.game_id === gameId);
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
    <div className="p-4">
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-4">My Picks</h2>
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

      {!selectedWeek ? (
        <Empty description="Please select a week to view games" />
      ) : games.length === 0 ? (
        <Empty description="No games found for this week" />
      ) : (
        <List
          grid={{ gutter: 16, column: 2 }}
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
                  title={`${game.team1?.school} vs ${game.team2?.school}`}
                  extra={
                    hasWinner ? (
                      <span className="text-green-600 font-semibold">
                        Winner: {game.winner_id === game.team1_id ? game.team1?.school : game.team2?.school}
                      </span>
                    ) : hasStarted ? (
                      <span className="text-blue-600">Game in progress</span>
                    ) : (
                      <span className="text-gray-600">Not started</span>
                    )
                  }
                >
                  {hasStarted ? (
                    <div>
                      {userPick ? (
                        <div>
                          <p>Your pick: {userPick.team_id === game.team1_id ? game.team1?.school : game.team2?.school}</p>
                          {hasWinner && (
                            <p className={userPickedWinner ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                              {userPickedWinner ? "You won! +1 point" : "You lost"}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p>You did not make a pick for this game</p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="mb-2">Make your pick:</p>
                      <div className="flex gap-2">
                        <Button
                          type={userPick?.team_id === game.team1_id ? "primary" : "default"}
                          onClick={() => handleMakePick(game.id, game.team1_id)}
                        >
                          {game.team1?.school}
                        </Button>
                        <Button
                          type={userPick?.team_id === game.team2_id ? "primary" : "default"}
                          onClick={() => handleMakePick(game.id, game.team2_id)}
                        >
                          {game.team2?.school}
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