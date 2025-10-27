import React, { useState, useEffect } from 'react';
import { Input, Select, Button, Space, Spin, Modal, List } from 'antd';
import { SearchOutlined, CloseOutlined } from '@ant-design/icons';
import { useDrag } from 'react-dnd/dist/hooks';
import { AthleteData } from '@/types/database';
import { isAthleteAssigned, assignAthleteToDepthChart } from '@/utils/depthChartUtils';
import { fetchAdjustedPlayers, fetchSubPositions } from '@/utils/utils';
import { useUserData } from '@/hooks/useUserData';
import PlayerCard from '@/components/cap-manager/PlayerCard';
import { Player } from '@/types/Player';
import { ATHLETE_DRAG_TYPE } from './DraggableAthleteCard';
import { DepthChartSubPosition } from '@/types/depthChart';

const { Option } = Select;

interface AthleteSelectorProps {
  year: number;
  scenario?: string;
  month?: number;
  isOpen: boolean;
  onClose: () => void;
  onSelectAthlete: (athlete: AthleteData) => void;
  selectedFormationId?: string | null;
  onAthleteAssigned?: () => void;
}

const AthleteSelector: React.FC<AthleteSelectorProps> = ({
  year,
  scenario = '',
  month = 1,
  isOpen,
  onClose,
  onSelectAthlete,
  selectedFormationId,
  onAthleteAssigned
}) => {
  const { activeCustomerId } = useUserData();
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [assignedAthletes, setAssignedAthletes] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [showPositionSelector, setShowPositionSelector] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [subPositions, setSubPositions] = useState<DepthChartSubPosition[]>([]);
  const [positionSelectorLoading, setPositionSelectorLoading] = useState(false);

  // Get unique positions for filter
  const positions = React.useMemo(() => {
    const posSet = new Set<string>();
    players.forEach(player => {
      if (player.position) posSet.add(player.position);
    });
    return Array.from(posSet).sort();
  }, [players]);

  const fetchAthletes = async () => {
    if (!activeCustomerId || !isOpen) return;

    setLoading(true);
    try {
      const result = await fetchAdjustedPlayers(
        activeCustomerId,
        year,
        scenario,
        {}, // activeFilters - empty for now
        'Jan' // selectedMonth
      );
      
      setPlayers(result.players);

      // Check which athletes are already assigned
      const assignedSet = new Set<string>();
      await Promise.all(
        result.players.map(async (player) => {
          const { isAssigned } = await isAthleteAssigned(
            player.id,
            activeCustomerId,
            year,
            scenario,
            month
          );
          if (isAssigned) {
            assignedSet.add(player.id);
          }
        })
      );
      
      setAssignedAthletes(assignedSet);
    } catch (error) {
      console.error('Error fetching athletes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter players based on search and position
  useEffect(() => {
    let filtered = [...players];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(player => 
        player.name__first?.toLowerCase().includes(search) ||
        player.name__last?.toLowerCase().includes(search) ||
        `${player.name__first} ${player.name__last}`.toLowerCase().includes(search)
      );
    }

    if (positionFilter) {
      filtered = filtered.filter(player =>
        player.position?.toLowerCase().includes(positionFilter.toLowerCase())
      );
    }

    setFilteredPlayers(filtered);
  }, [players, searchTerm, positionFilter]);

  // Fetch athletes when component opens
  useEffect(() => {
    if (isOpen) {
      fetchAthletes();
    }
  }, [isOpen, year, scenario, month, activeCustomerId]);

  const handleAthleteClick = async (player: Player) => {
    if (!selectedFormationId) {
      console.error('No formation selected');
      return;
    }

    setSelectedPlayer(player);
    setPositionSelectorLoading(true);
    setShowPositionSelector(true);

    try {
      const positions = await fetchSubPositions(selectedFormationId);
      setSubPositions(positions);
    } catch (error) {
      console.error('Error fetching sub-positions:', error);
    } finally {
      setPositionSelectorLoading(false);
    }
  };

  const handlePositionSelect = async (subPositionId: string) => {
    if (!selectedPlayer || !activeCustomerId) return;

    try {
      // Use athlete_id if available, fallback to id
      const athleteId = selectedPlayer.athlete_id || selectedPlayer.id;
      
      await assignAthleteToDepthChart(
        athleteId,
        subPositionId,
        activeCustomerId,
        year,
        1, // Will be adjusted by database function
        scenario,
        month
      );

      setShowPositionSelector(false);
      setSelectedPlayer(null);
      
      if (onAthleteAssigned) {
        onAthleteAssigned();
      }
      
      // Update assigned athletes list
      setAssignedAthletes(prev => new Set([...prev, selectedPlayer.id]));
      
    } catch (error) {
      console.error('Error assigning athlete:', error);
    }
  };

  // Draggable wrapper for PlayerCard
  const DraggablePlayerCard: React.FC<{ player: Player; isAssigned: boolean }> = ({ player, isAssigned }) => {
    const [{ isDragging: isCardDragging }, drag] = useDrag(() => ({
      type: ATHLETE_DRAG_TYPE,
      item: () => {
        setIsDragging(true);
        // Use athlete_id if available, fallback to id
        const athleteId = player.athlete_id || player.id;
        return { 
          athleteId: athleteId,
          // No currentSubPositionId since this is a new player from selector
        };
      },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
      canDrag: !isAssigned, // Can't drag already assigned players
      end: () => {
        setIsDragging(false);
      }
    }), [player.id, isAssigned]);

    return (
      <div 
        ref={drag as any}
        className={`
          relative cursor-pointer transition-all duration-200 
          ${isCardDragging ? 'opacity-50' : ''}
          ${isAssigned 
            ? 'opacity-60 cursor-not-allowed' 
            : 'hover:scale-105 hover:shadow-lg cursor-grab active:cursor-grabbing'
          }
        `}
        onClick={() => !isAssigned && handleAthleteClick(player)}
      >
        <PlayerCard
          player={player}
          selectedYear={year}
          onClick={() => !isAssigned && handleAthleteClick(player)}
          context="kanban"
          selectedScenario={scenario}
          showScholarshipDollars={false}
          isDraggable={false}
        />
        {isAssigned && (
          <div className="absolute inset-0 bg-black bg-opacity-30 rounded-lg flex items-center justify-center">
            <div className="bg-white px-3 py-1 rounded text-sm font-medium text-gray-700">
              Already Assigned
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center transition-all duration-200 ${isDragging ? '-translate-y-full z-0' : 'z-50'}`}>
      <div className="bg-white rounded-lg p-6 w-11/12 max-w-6xl max-h-[800px] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Select Athlete to Add to Depth Chart</h2>
          <Button 
            type="text" 
            icon={<CloseOutlined />} 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-4">
          <Input
            placeholder="Search athletes by name..."
            prefix={<SearchOutlined />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
            allowClear
          />
          <Select
            placeholder="Filter by position"
            value={positionFilter || undefined}
            onChange={(value) => setPositionFilter(value || '')}
            allowClear
            className="w-48"
          >
            {positions.map(position => (
              <Option key={position} value={position}>
                {position}
              </Option>
            ))}
          </Select>
        </div>

        {/* Results count */}
        <div className="text-sm text-gray-600 mb-3">
          {loading ? (
            <Spin size="small" />
          ) : (
            `${filteredPlayers.length} athlete${filteredPlayers.length !== 1 ? 's' : ''} found`
          )}
          {assignedAthletes.size > 0 && (
            <span className="ml-2">
              ({assignedAthletes.size} already assigned)
            </span>
          )}
        </div>

        {/* Athletes Grid */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Spin size="large" />
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              {searchTerm || positionFilter 
                ? 'No athletes found matching your filters.' 
                : 'No athletes available for this year.'
              }
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredPlayers.map(player => {
                const isAssigned = assignedAthletes.has(player.id);

                return (
                  <DraggablePlayerCard
                    key={player.id}
                    player={player}
                    isAssigned={isAssigned}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Click on an athlete to select a position, or drag and drop onto depth chart positions.
          </div>
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* Position Selector Modal */}
      <Modal
        title={`Select Position for ${selectedPlayer?.name__first} ${selectedPlayer?.name__last}`}
        open={showPositionSelector}
        onCancel={() => {
          setShowPositionSelector(false);
          setSelectedPlayer(null);
        }}
        footer={null}
        width={400}
      >
        {positionSelectorLoading ? (
          <div className="text-center py-8">
            <Spin size="large" />
          </div>
        ) : (
          <List
            dataSource={subPositions}
            renderItem={(position) => (
              <List.Item
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handlePositionSelect(position.id)}
              >
                <div className="w-full p-2">
                  <div className="font-medium">{position.name}</div>
                  <div className="text-sm text-gray-500">
                    Click to add {selectedPlayer?.name__first} to this position
                  </div>
                </div>
              </List.Item>
            )}
          />
        )}
      </Modal>
    </div>
  );
};

export default AthleteSelector;
