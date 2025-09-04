"use client";

import React, { useState } from 'react';
import { Button, Select, Card, List, Modal, message, Empty, Spin, Flex } from 'antd';
import { useVerifiedGame, Game, Team, Week } from './VerifiedGameContext';

const GamesManager: React.FC = () => {
  const { 
    weeks, 
    games, 
    teams, 
    selectedWeek, 
    setSelectedWeek, 
    createGame, 
    startGame, 
    declareWinner, 
    isAdmin, 
    loading
  } = useVerifiedGame();
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [team1Id, setTeam1Id] = useState<string>('');
  const [team2Id, setTeam2Id] = useState<string>('');

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

    await createGame(selectedWeek, team1Id, team2Id);
    setTeam1Id('');
    setTeam2Id('');
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
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Manage Games</h2>
        <Button 
          type="primary" 
          onClick={() => setIsCreateModalOpen(true)}
          disabled={!selectedWeek}
        >
          Create New Game
        </Button>
      </div>

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

      {!selectedWeek ? (
        <Empty description="Please select a week to view games" />
      ) : games.length === 0 ? (
        <Empty description="No games found for this week" />
      ) : (
        <List
          grid={{ gutter: 16, column: 2 }}
          dataSource={games}
          renderItem={(game) => (
            <List.Item>
              <Card 
                title={`${game.team1?.school} vs ${game.team2?.school}`}
                extra={
                  game.winner_id ? (
                    <span className="text-green-600 font-semibold">
                      Winner: {game.winner_id === game.team1_id ? game.team1?.school : game.team2?.school}
                    </span>
                  ) : game.has_started ? (
                    <span className="text-blue-600">Game in progress</span>
                  ) : (
                    <span className="text-gray-600">Not started</span>
                  )
                }
              >
                <p>Created: {new Date(game.created_at).toLocaleDateString()}</p>
                
                {!game.has_started && (
                  <Button 
                    type="primary" 
                    onClick={() => handleStartGame(game.id)}
                    className="mt-2"
                  >
                    Start Game
                  </Button>
                )}
                
                {game.has_started && !game.winner_id && (
                  <Flex gap="small" className="mt-2">
                    <Button 
                      type="primary"
                      onClick={() => handleDeclareWinner(game.id, game.team1_id)}
                    >
                      {game.team1?.school} Wins
                    </Button>
                    <Button 
                      type="primary"
                      onClick={() => handleDeclareWinner(game.id, game.team2_id)}
                    >
                      {game.team2?.school} Wins
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
      >
        <div className="mb-4">
          <p className="mb-2">Team 1:</p>
          <Select
            placeholder="Select team 1"
            style={{ width: '100%' }}
            value={team1Id || undefined}
            onChange={(value) => setTeam1Id(value)}
            options={teams.map((team) => ({
              value: team.id,
              label: team.school,
            }))}
          />
        </div>
        <div>
          <p className="mb-2">Team 2:</p>
          <Select
            placeholder="Select team 2"
            style={{ width: '100%' }}
            value={team2Id || undefined}
            onChange={(value) => setTeam2Id(value)}
            options={teams.map((team) => ({
              value: team.id,
              label: team.school,
            }))}
          />
        </div>
      </Modal>
    </div>
  );
};

export default GamesManager; 