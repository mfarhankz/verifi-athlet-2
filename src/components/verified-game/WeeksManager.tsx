"use client";

import React, { useState } from 'react';
import { Button, Input, List, Card, Modal, message } from 'antd';
import { useVerifiedGame } from './VerifiedGameContext';

const WeeksManager: React.FC = () => {
  const { weeks, createWeek, isAdmin, loading } = useVerifiedGame();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newWeekName, setNewWeekName] = useState('');

  const handleCreateWeek = async () => {
    if (!newWeekName.trim()) {
      message.error('Please enter a week name');
      return;
    }

    await createWeek(newWeekName);
    setNewWeekName('');
    setIsModalOpen(false);
    message.success('Week created successfully');
  };

  if (!isAdmin) {
    return (
      <div className="p-4">
        <p>You do not have permission to manage weeks.</p>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
        <h2 className="text-lg sm:text-xl font-semibold">Manage Weeks</h2>
        <Button type="primary" onClick={() => setIsModalOpen(true)} size="small" className="w-full sm:w-auto">
          Create New Week
        </Button>
      </div>

      <List
        grid={{ 
          gutter: [8, 8], 
          xs: 1, 
          sm: 2, 
          md: 3,
          lg: 3,
          xl: 3,
          xxl: 3
        }}
        dataSource={weeks}
        loading={loading}
        renderItem={(week) => (
          <List.Item>
            <Card title={week.name} size="small">
              <p className="text-sm">Created: {new Date(week.created_at).toLocaleDateString()}</p>
            </Card>
          </List.Item>
        )}
      />

      <Modal
        title="Create New Week"
        open={isModalOpen}
        onOk={handleCreateWeek}
        onCancel={() => setIsModalOpen(false)}
      >
        <Input
          placeholder="Enter week name (e.g., Week 1, Week 2)"
          value={newWeekName}
          onChange={(e) => setNewWeekName(e.target.value)}
        />
      </Modal>
    </div>
  );
};

export default WeeksManager; 