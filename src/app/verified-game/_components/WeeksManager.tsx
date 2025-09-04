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
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Manage Weeks</h2>
        <Button type="primary" onClick={() => setIsModalOpen(true)}>
          Create New Week
        </Button>
      </div>

      <List
        grid={{ gutter: 16, column: 3 }}
        dataSource={weeks}
        loading={loading}
        renderItem={(week) => (
          <List.Item>
            <Card title={week.name}>
              <p>Created: {new Date(week.created_at).toLocaleDateString()}</p>
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