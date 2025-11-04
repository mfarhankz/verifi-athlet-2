import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal, Typography, Button, Space, Flex, Input, message, Checkbox, Alert } from 'antd';
import { SearchOutlined, CloseOutlined, DownOutlined } from '@ant-design/icons';
import MultipleContainers from '@/app/dndkit/presets/Sortable/MultipleContainers';
import { RecruitingBoardData } from '@/types/database';
import ChooseBoardDropdown from './ChooseBoardDropdown';
import SettingsDropdown from './SettingsDropdown';
import Filters from './Filters';

const { Title, Text } = Typography;

interface SubBoardModalProps {
  isVisible: boolean;
  onClose: () => void;
  columnName: string;
  athletes: RecruitingBoardData[];
  onRemoveAthlete?: (athleteId: string) => void;
  onEditAthlete?: (athleteId: string, updates: Partial<RecruitingBoardData>) => void;
}

export default function SubBoardModal({
  isVisible,
  onClose,
  columnName,
  athletes,
  onRemoveAthlete,
  onEditAthlete
}: SubBoardModalProps) {
  const [searchValue, setSearchValue] = useState('');
  const [allowMultiples, setAllowMultiples] = useState(false);
  const [isChooseBoardModalVisible, setIsChooseBoardModalVisible] = useState(false);
  const [isLayoutDropdownVisible, setIsLayoutDropdownVisible] = useState(false);
  const [filterState, setFilterState] = useState({});
  const [currentBoardId, setCurrentBoardId] = useState<string>(columnName);
  const [positions, setPositions] = useState<string[]>(['Unassigned']);

  // Sample saved boards
  const savedBoards = useMemo(() => [
    { id: '1', name: 'Home State Kids' },
    { id: '2', name: 'Priority Targets' },
    { id: '3', name: 'Backup Options' },
    { id: '4', name: 'Long Shots' }
  ], []);

  // Sample saved layouts
  const savedLayouts = useMemo(() => [
    { id: '1', name: 'Default Layout' },
    { id: '2', name: 'Compact View' },
    { id: '3', name: 'Detailed View' }
  ], []);

  // Track all athlete instances across all columns
  const [athleteInstances, setAthleteInstances] = useState<RecruitingBoardData[]>([]);

  // Initialize athlete instances when modal opens
  useEffect(() => {
    if (isVisible) {
      const initial = athletes.map(athlete => ({
        ...athlete,
        position: 'Unassigned'
      }));
      setAthleteInstances(initial);
    }
  }, [isVisible, athletes]);

  // Transform for display
  const transformedAthletes = useMemo(() => athleteInstances, [athleteInstances]);

  // Filter athletes based on search
  const filteredAthletes = useMemo(() => {
    if (!searchValue.trim()) return transformedAthletes;
    
    const searchLower = searchValue.toLowerCase();
    return transformedAthletes.filter(athlete =>
      `${athlete.fname} ${athlete.lname}`.toLowerCase().includes(searchLower) ||
      athlete.school?.toLowerCase().includes(searchLower) ||
      athlete.position?.toLowerCase().includes(searchLower)
    );
  }, [transformedAthletes, searchValue]);

  // Handle drag end - this is where we implement the copy vs move behavior
  const handleDragEnd = useCallback(() => {
    // MultipleContainers handles the drag internally
    // We just need to ensure the state is managed properly
    // For "allow multiples", we need to track when items are copied vs moved
    // This will require modifying the MultipleContainers component behavior
  }, []);

  const handlePositionCreate = useCallback((positionName: string) => {
    setPositions(prev => [...prev, positionName]);
    message.success(`Column "${positionName}" created`);
  }, []);

  const handlePositionDelete = useCallback((positionName: string) => {
    setPositions(prev => prev.filter(p => p !== positionName));
    message.success(`Column "${positionName}" deleted`);
  }, []);

  const handleRemoveFromBoard = useCallback(async (athleteId: string) => {
    if (onRemoveAthlete) {
      onRemoveAthlete(athleteId);
    }
  }, [onRemoveAthlete]);

  return (
    <Modal
      open={isVisible}
      onCancel={onClose}
      footer={null}
      closable={false}
      maskClosable={false}
      width="95vw"
      style={{ top: 20, padding: 0 }}
      bodyStyle={{ padding: 0, height: '90vh', overflow: 'hidden' }}
      styles={{
        body: { height: '90vh', overflow: 'hidden', padding: 0 },
        content: { height: '90vh', padding: 0 },
        header: { display: 'none' },
        mask: { backgroundColor: 'rgba(0, 0, 0, 0.75)' }
      }}
    >
      {/* Close Button */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 1001,
          fontSize: '20px',
          width: '24px',
          height: '24px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#666',
          lineHeight: '1',
          fontWeight: 'normal'
        }}
      >
        ×
      </div>

      {/* Controls Bar */}
      <Flex
        align="center"
        gap={8}
        style={{
          padding: '12px 24px',
          backgroundColor: '#fafafa',
          borderBottom: '1px solid #f0f0f0'
        }}
      >
        {/* Allow Multiples Checkbox */}
        <Checkbox
          checked={allowMultiples}
          onChange={(e) => setAllowMultiples(e.target.checked)}
          style={{ marginRight: 16 }}
        >
          Allow multiples
        </Checkbox>

        {/* Card Layout Dropdown */}
        <div style={{ position: 'relative' }}>
          <SettingsDropdown
            isVisible={isLayoutDropdownVisible}
            onClose={() => setIsLayoutDropdownVisible(false)}
            onSelect={(layoutId) => {
              const layout = savedLayouts.find(l => l.id === layoutId);
              if (layout) {
                message.info(`Loading layout: ${layout.name}`);
              }
              setIsLayoutDropdownVisible(false);
            }}
            items={savedLayouts}
            allowCreate={false}
            searchPlaceholder="Search saved layouts..."
            placement="bottomLeft"
            trigger={
              <Button
                icon={<DownOutlined />}
                onClick={() => setIsLayoutDropdownVisible(!isLayoutDropdownVisible)}
              >
                Card Layout
              </Button>
            }
          />
        </div>

        {/* Choose Board Dropdown */}
        <div style={{ position: 'relative' }}>
          <ChooseBoardDropdown
            isVisible={isChooseBoardModalVisible}
            onClose={() => setIsChooseBoardModalVisible(false)}
            onSelect={(boardName) => {
              setCurrentBoardId(boardName);
              message.info(`Switching to board: ${boardName}`);
              setIsChooseBoardModalVisible(false);
            }}
            customerId={null} // Not needed for sub-board
            placement="bottomLeft"
            trigger={
              <Button
                icon={<DownOutlined />}
                onClick={() => setIsChooseBoardModalVisible(!isChooseBoardModalVisible)}
              >
                Choose Board
                {currentBoardId && <span> ({currentBoardId})</span>}
              </Button>
            }
          />
        </div>

        {/* Search Input */}
        <Input
          placeholder="Search here..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          prefix={<SearchOutlined />}
          style={{ width: 300, marginLeft: 8 }}
          size="large"
        />

        {/* Filters Button */}
        <div style={{ position: 'relative', marginLeft: 'auto' }}>
          <Filters
            onApplyFilters={(filters) => {
              setFilterState(filters);
              message.info('Filters applied');
            }}
            onResetFilters={() => {
              setFilterState({});
              message.info('Filters reset');
            }}
            dataSource="transfer_portal"
          />
        </div>
      </Flex>

      {/* Warning Message */}
      <Alert
        message="This feature is not live and is for demonstration purposes only"
        type="warning"
        showIcon
        closable
        style={{ margin: '16px' }}
      />

      {/* Board Content */}
      <div style={{ padding: '16px', height: 'calc(90vh - 120px)', overflow: 'auto' }}>
        {filteredAthletes.length > 0 ? (
          <MultipleContainers
            data={filteredAthletes}
            handle={true}
            positionConfig={positions.map((pos, index) => ({ 
              id: pos, 
              customer_id: 'demo-customer-id', 
              recruiting_board_board_id: currentBoardId || 'demo-board-id',
              name: pos,
              display_order: index + 1,
              created_at: new Date().toISOString(), 
              ended_at: null 
            }))}
            onPositionCreate={handlePositionCreate}
            onPositionDelete={handlePositionDelete}
            onRemoveFromBoard={handleRemoveFromBoard}
            allowMultiples={allowMultiples}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <Text type="secondary">No athletes found</Text>
          </div>
        )}
      </div>
    </Modal>
  );
}