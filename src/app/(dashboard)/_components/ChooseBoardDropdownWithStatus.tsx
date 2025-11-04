"use client";

import React, { useState, useEffect } from 'react';
import { Card, Typography, Space, Spin, Input } from 'antd';
import { supabase } from '@/lib/supabaseClient';

const { Text } = Typography;

interface Board {
  id: string;
  name: string;
  athletesOnBoardCount?: number; // Count of selected athletes already on this board
  totalAthletes?: number; // Total number of athletes being added
}

interface ChooseBoardDropdownWithStatusProps {
  isVisible: boolean;
  onClose: () => void;
  onSelect: (boardId: string, boardName: string) => void;
  customerId: string;
  athleteId?: string; // For profile pages - single athlete
  athleteIds?: string[]; // For search page - multiple athletes
  placement?: 'bottomLeft' | 'bottomRight';
  simpleMode?: boolean;
}

export default function ChooseBoardDropdownWithStatus({
  isVisible,
  onClose,
  onSelect,
  customerId,
  athleteId,
  athleteIds,
  placement = 'bottomLeft',
  simpleMode = false
}: ChooseBoardDropdownWithStatusProps) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isVisible && customerId) {
      fetchBoardsWithStatus();
      setSearchQuery(''); // Reset search when opening
    }
  }, [isVisible, customerId, athleteId, athleteIds]);

  const fetchBoardsWithStatus = async () => {
    setLoading(true);
    try {
      // Fetch all boards
      const { data: boardsData, error: boardsError } = await supabase
        .from('recruiting_board_board')
        .select('id, name')
        .eq('customer_id', customerId)
        .is('recruiting_board_column_id', null)
        .is('ended_at', null)
        .order('display_order');

      if (boardsError) {
        console.error('Error fetching boards:', boardsError);
        return;
      }

      if (!boardsData || boardsData.length === 0) {
        setBoards([]);
        return;
      }

      // If we have athlete ID(s), check which boards they're on
      const athleteIdsList = athleteId ? [athleteId] : athleteIds || [];
      if (athleteIdsList.length > 0) {
        const { data: athletesOnBoards, error: athletesError } = await supabase
          .from('recruiting_board_athlete')
          .select('recruiting_board_board_id, athlete_id')
          .in('athlete_id', athleteIdsList)
          .is('ended_at', null);

        if (athletesError) {
          console.error('Error fetching athlete board status:', athletesError);
          setBoards(boardsData.map((b: { id: string; name: string }) => ({ 
            ...b, 
            athletesOnBoardCount: 0,
            totalAthletes: athleteIdsList.length
          })));
          return;
        }

        // Count how many of the selected athletes are on each board
        const boardsWithStatus = boardsData.map((board: { id: string; name: string }) => {
          const athletesOnThisBoard = athletesOnBoards?.filter(
            (ab: { recruiting_board_board_id: string; athlete_id: string }) => ab.recruiting_board_board_id === board.id
          ) || [];
          
          return {
            ...board,
            athletesOnBoardCount: athletesOnThisBoard.length,
            totalAthletes: athleteIdsList.length
          };
        });

        setBoards(boardsWithStatus);
      } else {
        setBoards(boardsData.map((b: { id: string; name: string }) => ({ 
          ...b, 
          athletesOnBoardCount: 0,
          totalAthletes: 0
        })));
      }
    } catch (error) {
      console.error('Error in fetchBoardsWithStatus:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999,
        }}
        onClick={onClose}
      />
      
      {/* Dropdown */}
      <Card
        style={{
          position: 'absolute',
          top: '100%',
          [placement === 'bottomRight' ? 'right' : 'left']: 0,
          marginTop: '8px',
          width: '280px',
          maxHeight: '400px',
          overflowY: 'auto',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ marginBottom: '12px' }}>
          <Text strong>Select Board</Text>
        </div>
        
        {!loading && boards.length > 0 && (
          <Input
            placeholder="Search boards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ marginBottom: '12px' }}
          />
        )}
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Spin />
          </div>
        ) : boards.length === 0 ? (
          <Text type="secondary">No boards available</Text>
        ) : (() => {
          const filteredBoards = boards.filter(board => 
            board.name.toLowerCase().includes(searchQuery.toLowerCase())
          );
          
          return filteredBoards.length === 0 ? (
            <Text type="secondary">No boards match your search</Text>
          ) : (
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              {filteredBoards.map((board) => {
              const allAthletesOnBoard = board.athletesOnBoardCount === board.totalAthletes && board.totalAthletes! > 0;
              const someAthletesOnBoard = board.athletesOnBoardCount! > 0 && !allAthletesOnBoard;
              
              return (
                <div
                  key={board.id}
                  onClick={() => {
                    onSelect(board.id, board.name);
                    onClose();
                  }}
                  style={{
                    padding: '12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    backgroundColor: '#fff',
                    border: '1px solid',
                    borderColor: '#e8e8e8',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#fafafa';
                    e.currentTarget.style.borderColor = '#1890ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#fff';
                    e.currentTarget.style.borderColor = '#e8e8e8';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text 
                      style={{ 
                        fontWeight: board.name === 'Main' ? 500 : 400
                      }}
                    >
                      {board.name}
                    </Text>
                    {allAthletesOnBoard ? (
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        All on board
                      </Text>
                    ) : someAthletesOnBoard ? (
                      <Text type="warning" style={{ fontSize: '12px', color: '#faad14' }}>
                        {board.athletesOnBoardCount} of {board.totalAthletes} on board
                      </Text>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </Space>
          );
        })()}
      </Card>
    </>
  );
}

