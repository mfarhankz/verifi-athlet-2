"use client";

import React, { useState, useEffect } from 'react';
import { Button, Select, Card, List, Modal, message, Empty, Spin, Flex, Collapse, DatePicker } from 'antd';
import { useVerifiedGame, Game, PickStatus } from './VerifiedGameContext';
import dayjs from 'dayjs';

const GamesManager: React.FC = () => {
  const { 
    weeks, 
    games, 
    teams, 
    selectedWeek, 
    setSelectedWeek, 
    createGame, 
    updateGameKickoffTime,
    startGame, 
    declareWinner, 
    isAdmin, 
    loading,
    getPickStatusForGame
  } = useVerifiedGame();
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditKickoffModalOpen, setIsEditKickoffModalOpen] = useState(false);
  const [editingGameId, setEditingGameId] = useState<string>('');
  const [editingGameName, setEditingGameName] = useState<string>('');
  const [team1Id, setTeam1Id] = useState<string>('');
  const [team2Id, setTeam2Id] = useState<string>('');
  const [kickoffTime, setKickoffTime] = useState<dayjs.Dayjs | null>(null);
  const [editKickoffTime, setEditKickoffTime] = useState<dayjs.Dayjs | null>(null);
  const [pickStatus, setPickStatus] = useState<Record<string, PickStatus>>({});

  // Fetch pick status for all games
  useEffect(() => {
    const fetchPickStatus = async () => {
      if (!games.length) return;
      
      const statusData: Record<string, PickStatus> = {};
      
      for (const game of games) {
        const status = await getPickStatusForGame(game.id);
        statusData[game.id] = status;
      }
      
      setPickStatus(statusData);
    };

    fetchPickStatus();
  }, [games, getPickStatusForGame]);

  // Component to display pick status
  const PickStatusDisplay: React.FC<{ gameId: string }> = ({ gameId }) => {
    const status = pickStatus[gameId];
    
    if (!status) {
      return <div className="text-sm text-gray-500">Loading pick status...</div>;
    }

    return (
      <div className="mt-3">
        <div className="text-sm mb-2">
          <span className="font-semibold">Picks: </span>
          <span className="text-blue-600">{status.usersWithPicks}</span>
          <span className="text-gray-500"> / {status.totalUsers}</span>
        </div>
        
        {status.usersWithoutPicks.length > 0 && (
          <Collapse size="small" className="bg-gray-50">
            <Collapse.Panel 
              header={`Missing picks from ${status.usersWithoutPicks.length} user(s)`} 
              key="1"
              className="text-xs"
            >
              <div className="text-sm text-gray-600">
                <span className="font-medium">Haven&apos;t submitted:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {status.usersWithoutPicks.map((name, index) => (
                    <span 
                      key={index} 
                      className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            </Collapse.Panel>
          </Collapse>
        )}
      </div>
    );
  };

  const handleCreateGame = async () => {
    if (!selectedWeek) {
      message.error('Please select a week');
      return;
    }

    if (!team1Id || !team2Id) {
      message.error('Please select both teams');
      return;
    }

    if (team1Id === team2Id) {
      message.error('Please select different teams');
      return;
    }

    await createGame(selectedWeek, team1Id, team2Id, kickoffTime?.toISOString());
    setTeam1Id('');
    setTeam2Id('');
    setKickoffTime(null);
    setIsCreateModalOpen(false);
    message.success('Game created successfully');
  };

  const handleStartGame = async (gameId: string) => {
    await startGame(gameId);
    message.success('Game started successfully');
  };

  const handleDeclareWinner = async (gameId: string, teamId: string) => {
    await declareWinner(gameId, teamId);
    message.success('Winner declared successfully');
  };

  const handleEditKickoffTime = (game: Game) => {
    setEditingGameId(game.id);
    setEditingGameName(`${game.team1?.name} vs ${game.team2?.name}`);
    setEditKickoffTime(game.kickoff_time ? dayjs(game.kickoff_time) : null);
    setIsEditKickoffModalOpen(true);
  };

  const handleUpdateKickoffTime = async () => {
    await updateGameKickoffTime(editingGameId, editKickoffTime?.toISOString());
    setEditKickoffTime(null);
    setEditingGameId('');
    setEditingGameName('');
    setIsEditKickoffModalOpen(false);
    message.success('Kickoff time updated successfully');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-4">
        <p>You do not have permission to manage games.</p>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
        <h2 className="text-lg sm:text-xl font-semibold">Manage Games</h2>
        <Button 
          type="primary" 
          onClick={() => setIsCreateModalOpen(true)}
          disabled={!selectedWeek}
          size="small"
          className="w-full sm:w-auto"
        >
          Create New Game
        </Button>
      </div>

      <div className="mb-8 sm:mb-4">
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
          renderItem={(game) => (
            <List.Item>
              <Card 
                title={
                  <div>
                    <div className="block sm:hidden text-center">
                      <div className="font-semibold">{game.team1?.name}</div>
                      <div className="font-semibold">{game.team2?.name}</div>
                      <div className="text-xs mt-2">
                        {game.winner_id ? (
                          <span className="text-green-600 font-semibold">
                            Winner: {game.winner_id === game.team1_id ? game.team1?.name : game.team2?.name}
                          </span>
                        ) : game.has_started ? (
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
                }
                size="small"
                extra={
                  <div className="hidden sm:block text-xs sm:text-sm">
                    {game.winner_id ? (
                      <span className="text-green-600 font-semibold">
                        Winner: {game.winner_id === game.team1_id ? game.team1?.name : game.team2?.name}
                      </span>
                    ) : game.has_started ? (
                      <span className="text-blue-600">Game in progress</span>
                    ) : (
                      <span className="text-gray-600">Not started</span>
                    )}
                  </div>
                }
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm">
                    {game.kickoff_time ? (
                      <span>Kickoff: {new Date(game.kickoff_time).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric'
                      })} at {new Date(game.kickoff_time).toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit',
                        hour12: true 
                      })}</span>
                    ) : (
                      <span className="text-gray-500">No kickoff time set</span>
                    )}
                  </div>
                  <Button
                    type="link"
                    size="small"
                    onClick={() => handleEditKickoffTime(game)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {game.kickoff_time ? 'Edit' : 'Set'} Time
                  </Button>
                </div>
                
                {/* Show pick status for all games */}
                <PickStatusDisplay gameId={game.id} />
                
                {!game.has_started && (
                  <Button 
                    type="primary" 
                    onClick={() => handleStartGame(game.id)}
                    className="mt-2 w-full sm:w-auto"
                    size="small"
                  >
                    Start Game
                  </Button>
                )}
                
                {game.has_started && !game.winner_id && (
                  <Flex gap="small" className="mt-2" vertical>
                    <Button 
                      type="primary"
                      onClick={() => handleDeclareWinner(game.id, game.team1_id)}
                      size="small"
                      className="w-full sm:w-auto"
                    >
                      {game.team1?.name} Wins
                    </Button>
                    <Button 
                      type="primary"
                      onClick={() => handleDeclareWinner(game.id, game.team2_id)}
                      size="small"
                      className="w-full sm:w-auto"
                    >
                      {game.team2?.name} Wins
                    </Button>
                  </Flex>
                )}
              </Card>
            </List.Item>
          )}
        />
      )}

      <Modal
        title="Create New Game"
        open={isCreateModalOpen}
        onOk={handleCreateGame}
        onCancel={() => setIsCreateModalOpen(false)}
        width="90%"
        style={{ maxWidth: '500px' }}
        centered
      >
        <div className="mb-4">
          <p className="mb-2">Team 1:</p>
          <Select
            placeholder="Select team 1"
            style={{ width: '100%' }}
            value={team1Id || undefined}
            onChange={(value) => setTeam1Id(value)}
            showSearch
            size="large"
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={teams.map((team) => ({
              value: team.id,
              label: team.name,
            }))}
          />
        </div>
        <div className="mb-4">
          <p className="mb-2">Team 2:</p>
          <Select
            placeholder="Select team 2"
            style={{ width: '100%' }}
            value={team2Id || undefined}
            onChange={(value) => setTeam2Id(value)}
            showSearch
            size="large"
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={teams.map((team) => ({
              value: team.id,
              label: team.name,
            }))}
          />
        </div>
        <div>
          <p className="mb-2">Kickoff Time (Optional):</p>
          <DatePicker
            showTime
            format="YYYY-MM-DD HH:mm"
            placeholder="Select kickoff time"
            style={{ width: '100%' }}
            value={kickoffTime}
            onChange={(date) => setKickoffTime(date as dayjs.Dayjs | null)}
            size="large"
            className="mobile-friendly-datepicker"
          />
        </div>
      </Modal>

      <Modal
        title={`Edit Kickoff Time - ${editingGameName}`}
        open={isEditKickoffModalOpen}
        onOk={handleUpdateKickoffTime}
        onCancel={() => {
          setIsEditKickoffModalOpen(false);
          setEditKickoffTime(null);
          setEditingGameId('');
          setEditingGameName('');
        }}
        width="90%"
        style={{ maxWidth: '400px' }}
        centered
      >
        <div>
          <p className="mb-2">Kickoff Time:</p>
          <DatePicker
            showTime
            format="YYYY-MM-DD HH:mm"
            placeholder="Select kickoff time"
            style={{ width: '100%' }}
            value={editKickoffTime}
            onChange={(date) => setEditKickoffTime(date as dayjs.Dayjs | null)}
            size="large"
            className="mobile-friendly-datepicker"
          />
          <p className="text-xs text-gray-500 mt-2">
            Leave empty to remove kickoff time
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default GamesManager; 