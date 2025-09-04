import React, { useState, useEffect } from 'react';
import { Checkbox, Flex, Typography, Spin, Button } from 'antd';
import { DownOutlined, SwapOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabaseClient';
import { useCustomer } from '@/contexts/CustomerContext';
import { fetchAdjustedPlayers, fetchUserDetails, fetchPositionOrder } from '@/utils/utils';

const { Title, Text } = Typography;

interface ScenarioCompareProps {
  selectedYear: number;
  selectedMonth: string;
  selectedScenario: string;
  activeFilters: { [key: string]: string[] | string };
}

interface Scenario {
  name: string;
  customer_id: string;
}

interface ScenarioGroup {
  name: string;
  scenarios: string[];
}

interface Player {
  id: string;
  athlete_id: string;
  name__first: string;
  name__last: string;
  position: string;
  compensation: number;
  [key: string]: any;
}

interface PlayerComparisonData {
  player: Player;
  group1Pay: number;
  group2Pay: number;
  difference: number;
}

const ScenarioCompare: React.FC<ScenarioCompareProps> = ({
  selectedYear,
  selectedMonth,
  selectedScenario,
  activeFilters
}) => {
  const { activeCustomerId } = useCustomer();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [group1, setGroup1] = useState<ScenarioGroup>({ name: 'Group A', scenarios: [] });
  const [group2, setGroup2] = useState<ScenarioGroup>({ name: 'Group B', scenarios: [] });
  const [playerComparisonData, setPlayerComparisonData] = useState<PlayerComparisonData[]>([]);
  const [loading, setLoading] = useState(false);
  const [scenariosLoading, setScenariosLoading] = useState(true);
  const [showGroup1Menu, setShowGroup1Menu] = useState(false);
  const [showGroup2Menu, setShowGroup2Menu] = useState(false);
  const [team, setTeam] = useState<string>("");
  const [sortColumn, setSortColumn] = useState<string>('difference');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [positionOrder, setPositionOrder] = useState<Array<{position: string, category: string}>>([]);
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});

  // Initialize team
  useEffect(() => {
    const initializeTeam = async () => {
      const userDetails = await fetchUserDetails();
      if (userDetails) {
        setTeam(userDetails.customer_id);
        
        // Fetch position order and category mapping
        const positionOrderData = await fetchPositionOrder(userDetails.customer_id, selectedYear);
        setPositionOrder(positionOrderData);
        
        const categoryMap = positionOrderData.reduce((acc, item) => {
          acc[item.position] = item.category;
          return acc;
        }, {} as Record<string, string>);
        setCategoryMap(categoryMap);
      }
    };
    initializeTeam();
  }, [selectedYear]);

  // Fetch available scenarios
  useEffect(() => {
    const fetchScenarios = async () => {
      if (!activeCustomerId) return;
      
      setScenariosLoading(true);
      try {
        const { data, error } = await supabase
          .from('scenario')
          .select('name, customer_id')
          .eq('customer_id', activeCustomerId);
        
        if (error) {
          console.error('Error fetching scenarios:', error);
        } else if (data) {
          setScenarios(data);
          setGroup1(prev => ({ ...prev, scenarios: [] }));
          setGroup2(prev => ({ ...prev, scenarios: [] }));
        }
      } catch (error) {
        console.error('Error fetching scenarios:', error);
      } finally {
        setScenariosLoading(false);
      }
    };

    fetchScenarios();
  }, [activeCustomerId]);

  // Fetch player comparison data when groups change
  useEffect(() => {
    const fetchPlayerComparisonData = async () => {
      if (!team) return;
      
      setLoading(true);
      try {
        const [group1Players, group2Players] = await Promise.all([
          fetchPlayersForScenarios(group1.scenarios),
          fetchPlayersForScenarios(group2.scenarios)
        ]);

        const comparisonData: PlayerComparisonData[] = [];
        const allPlayers = new Map<string, Player>();
        group1Players.forEach(player => allPlayers.set(player.athlete_id, player));
        group2Players.forEach(player => allPlayers.set(player.athlete_id, player));

        allPlayers.forEach((player) => {
          const group1Player = group1Players.find(p => p.athlete_id === player.athlete_id);
          const group2Player = group2Players.find(p => p.athlete_id === player.athlete_id);
          
          const group1Pay = group1Player?.compensation || 0;
          const group2Pay = group2Player?.compensation || 0;
          const difference = group1Pay - group2Pay;

          comparisonData.push({
            player: {
              ...player,
              positionCategory: categoryMap[player.position] || ''
            },
            group1Pay,
            group2Pay,
            difference
          });
        });

        // Sort by the selected column
        comparisonData.sort((a, b) => {
          let aValue: any, bValue: any;
          
          if (sortColumn === 'position' || sortColumn === 'positionCategory') {
            const posA = positionOrder.findIndex(p => p.position === a.player.position);
            const posB = positionOrder.findIndex(p => p.position === b.player.position);
            aValue = posA;
            bValue = posB;
          } else if (sortColumn === 'difference') {
            aValue = Math.abs(a.difference);
            bValue = Math.abs(b.difference);
          } else if (sortColumn === 'name__last') {
            aValue = a.player.name__last.toLowerCase();
            bValue = b.player.name__last.toLowerCase();
          } else {
            aValue = a.player[sortColumn as keyof Player];
            bValue = b.player[sortColumn as keyof Player];
          }

          if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
          return 0;
        });

        setPlayerComparisonData(comparisonData);
      } catch (error) {
        console.error('Error fetching player comparison data:', error);
        setPlayerComparisonData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerComparisonData();
  }, [group1.scenarios, group2.scenarios, selectedYear, team, selectedMonth, activeFilters, sortColumn, sortDirection, positionOrder, categoryMap]);

  const fetchPlayersForScenarios = async (scenarioNames: string[]): Promise<Player[]> => {
    try {
      if (scenarioNames.length === 0) {
        // When no scenarios selected, fetch with default behavior (no scenario filter)
        const { players } = await fetchAdjustedPlayers(
          team,
          selectedYear,
          '', // Empty string for no scenario filter
          activeFilters,
          selectedMonth
        );
        return players.map(player => ({ ...player, athlete_id: player.athlete_id || '' }));
      }
      
      // Pass all scenarios as comma-separated string to fetchAdjustedPlayers
      const scenarioString = scenarioNames.join(',');
      const { players } = await fetchAdjustedPlayers(
        team,
        selectedYear,
        scenarioString,
        activeFilters,
        selectedMonth
      );
      
      return players.map(player => ({ ...player, athlete_id: player.athlete_id || '' }));
    } catch (error) {
      console.error('Error fetching players for scenarios:', error);
      return [];
    }
  };

  const toggleScenarioInGroup = (groupNumber: 1 | 2, scenarioName: string) => {
    const group = groupNumber === 1 ? group1 : group2;
    const setGroup = groupNumber === 1 ? setGroup1 : setGroup2;
    
    setGroup(prev => {
      const isSelected = prev.scenarios.includes(scenarioName);
      if (isSelected) {
        return {
          ...prev,
          scenarios: prev.scenarios.filter(s => s !== scenarioName)
        };
      } else {
        return {
          ...prev,
          scenarios: [...prev.scenarios, scenarioName]
        };
      }
    });
  };

  const swapGroups = () => {
    const temp = group1;
    setGroup1(group2);
    setGroup2(temp);
  };

  const handleSort = (column: string) => {
    const direction = sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortColumn(column);
    setSortDirection(direction);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getDifferenceColor = (diff: number) => {
    if (diff > 0) return '#52c41a';
    if (diff < 0) return '#ff4d4f';
    return '#000000';
  };

  const getGroupDisplayText = (group: ScenarioGroup) => {
    if (group.scenarios.length === 0) return 'Scenario Off';
    if (group.scenarios.length === 1) return group.scenarios[0];
    return `${group.scenarios.length} scenarios selected`;
  };

  const getGroupedAndSortedData = () => {
    if (sortColumn === 'position' || sortColumn === 'positionCategory') {
      const grouped = playerComparisonData.reduce((acc, data) => {
        const key = sortColumn === 'position' ? data.player.position : data.player.positionCategory;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(data);
        return acc;
      }, {} as { [key: string]: PlayerComparisonData[] });

      // Sort groups based on position order
      const sortedGroups = Object.keys(grouped).sort((a, b) => {
        if (sortColumn === 'position') {
          const posA = positionOrder.findIndex(p => p.position === a);
          const posB = positionOrder.findIndex(p => p.position === b);
          return sortDirection === 'asc' ? posA - posB : posB - posA;
        } else {
          // For categories, sort by category order in positionOrder
          const categoryOrder = Array.from(new Set(positionOrder.map(p => p.category)));
          const catA = categoryOrder.indexOf(a);
          const catB = categoryOrder.indexOf(b);
          return sortDirection === 'asc' ? catA - catB : catB - catA;
        }
      });

      return sortedGroups.map(group => ({
        group,
        players: grouped[group],
        summary: {
          totalGroup1Pay: grouped[group].reduce((sum, data) => sum + data.group1Pay, 0),
          totalGroup2Pay: grouped[group].reduce((sum, data) => sum + data.group2Pay, 0),
          totalDifference: grouped[group].reduce((sum, data) => sum + data.difference, 0)
        }
      }));
    }

    // Return single group for other sort columns
    return [{
      group: 'All',
      players: playerComparisonData,
      summary: {
        totalGroup1Pay: playerComparisonData.reduce((sum, data) => sum + data.group1Pay, 0),
        totalGroup2Pay: playerComparisonData.reduce((sum, data) => sum + data.group2Pay, 0),
        totalDifference: playerComparisonData.reduce((sum, data) => sum + data.difference, 0)
      }
    }];
  };

  if (scenariosLoading) {
    return (
      <div style={{ 
        flex: 1,
        background: '#fff', 
        borderRadius: 8, 
        boxShadow: '0 2px 8px #0001', 
        padding: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '600px'
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (scenarios.length === 0) {
    return (
      <div style={{ 
        flex: 1,
        background: '#fff', 
        borderRadius: 8, 
        boxShadow: '0 2px 8px #0001', 
        padding: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '600px',
        flexDirection: 'column',
        gap: 16
      }}>
        <Title level={3} style={{ margin: 0, textAlign: 'center' }}>
          No Scenarios Available
        </Title>
        <Text style={{ textAlign: 'center', color: '#666' }}>
          Create scenarios in the Budget view to compare them here.
        </Text>
      </div>
    );
  }

  if (scenarios.length === 1) {
    return (
      <div style={{ 
        flex: 1,
        background: '#fff', 
        borderRadius: 8, 
        boxShadow: '0 2px 8px #0001', 
        padding: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '600px',
        flexDirection: 'column',
        gap: 16
      }}>
        <Title level={3} style={{ margin: 0, textAlign: 'center' }}>
          Only One Scenario Available
        </Title>
        <Text style={{ textAlign: 'center', color: '#666' }}>
          Create at least one more scenario to enable comparison.
        </Text>
        <Text style={{ textAlign: 'center', color: '#999', fontSize: '14px' }}>
          Current scenario: {scenarios[0].name}
        </Text>
      </div>
    );
  }

  return (
    <div style={{ 
      flex: 1,
      background: '#fff', 
      borderRadius: 8, 
      boxShadow: '0 2px 8px #0001', 
      padding: 16,
      minHeight: '600px'
    }}>
      <Title level={3} style={{ marginBottom: 24, textAlign: 'center' }}>
        <SwapOutlined style={{ marginRight: 8 }} />
        Scenario Comparison
      </Title>

      {/* Scenario Group Selectors */}
      <Flex align="center" justify="center" gap="large" style={{ marginBottom: 32 }}>
        {/* Group 1 Selector */}
        <div style={{ position: 'relative' }}>
          <Text strong style={{ display: 'block', marginBottom: 8, textAlign: 'center', fontSize: '16px' }}>
            {group1.name}
          </Text>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowGroup1Menu(!showGroup1Menu)}
              style={{
                minWidth: 150,
                padding: '8px 12px',
                border: '1px solid #d9d9d9',
                borderRadius: '6px',
                backgroundColor: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '14px'
              }}
            >
              <span>{getGroupDisplayText(group1)}</span>
              <DownOutlined style={{ fontSize: '10px', color: 'rgba(0,0,0,0.45)' }} />
            </button>
            
            {showGroup1Menu && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: 'white',
                border: '1px solid #d9d9d9',
                borderRadius: '6px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                zIndex: 1000,
                maxHeight: '200px',
                overflowY: 'auto',
                marginTop: '4px'
              }}>
                {scenarios.map((scenario) => (
                  <div key={scenario.name} style={{ padding: '8px 12px', display: 'flex', alignItems: 'center' }}>
                    <Checkbox
                      checked={group1.scenarios.includes(scenario.name)}
                      onChange={() => toggleScenarioInGroup(1, scenario.name)}
                      style={{ marginRight: '8px' }}
                    />
                    <span style={{ fontSize: '14px' }}>{scenario.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Swap Button */}
        <Button
          type="text"
          icon={<SwapOutlined />}
          onClick={swapGroups}
          style={{ marginTop: 24 }}
          title="Swap groups"
          aria-label="Swap group A and group B"
        />

        {/* Group 2 Selector */}
        <div style={{ position: 'relative' }}>
          <Text strong style={{ display: 'block', marginBottom: 8, textAlign: 'center', fontSize: '16px' }}>
            {group2.name}
          </Text>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowGroup2Menu(!showGroup2Menu)}
              style={{
                minWidth: 150,
                padding: '8px 12px',
                border: '1px solid #d9d9d9',
                borderRadius: '6px',
                backgroundColor: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '14px'
              }}
            >
              <span>{getGroupDisplayText(group2)}</span>
              <DownOutlined style={{ fontSize: '10px', color: 'rgba(0,0,0,0.45)' }} />
            </button>
            
            {showGroup2Menu && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: 'white',
                border: '1px solid #d9d9d9',
                borderRadius: '6px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                zIndex: 1000,
                maxHeight: '200px',
                overflowY: 'auto',
                marginTop: '4px'
              }}>
                {scenarios.map((scenario) => (
                  <div key={scenario.name} style={{ padding: '8px 12px', display: 'flex', alignItems: 'center' }}>
                    <Checkbox
                      checked={group2.scenarios.includes(scenario.name)}
                      onChange={() => toggleScenarioInGroup(2, scenario.name)}
                      style={{ marginRight: '8px' }}
                    />
                    <span style={{ fontSize: '14px' }}>{scenario.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Flex>

      {/* Close dropdowns when clicking outside */}
      {showGroup1Menu || showGroup2Menu ? (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={() => {
            setShowGroup1Menu(false);
            setShowGroup2Menu(false);
          }}
        />
      ) : null}

      {/* Player Comparison Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>Loading comparison data...</div>
        </div>
      ) : playerComparisonData.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            border: '1px solid #e8e8e8',
            borderRadius: '6px',
            overflow: 'hidden'
          }}>
            <thead>
              <tr style={{ 
                backgroundColor: '#fafafa',
                borderBottom: '2px solid #e8e8e8'
              }}>
                <th style={{ 
                  padding: '12px 16px', 
                  textAlign: 'left', 
                  fontWeight: 600,
                  borderRight: '1px solid #e8e8e8',
                  cursor: 'pointer'
                }}
                onClick={() => handleSort('name__last')}>
                  Name {sortColumn === 'name__last' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th style={{ 
                  padding: '12px 16px', 
                  textAlign: 'center', 
                  fontWeight: 600,
                  borderRight: '1px solid #e8e8e8',
                  cursor: 'pointer'
                }}
                onClick={() => handleSort('positionCategory')}>
                  Cat {sortColumn === 'positionCategory' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th style={{ 
                  padding: '12px 16px', 
                  textAlign: 'center', 
                  fontWeight: 600,
                  borderRight: '1px solid #e8e8e8',
                  cursor: 'pointer'
                }}
                onClick={() => handleSort('position')}>
                  Pos {sortColumn === 'position' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th style={{ 
                  padding: '12px 16px', 
                  textAlign: 'right', 
                  fontWeight: 600,
                  borderRight: '1px solid #e8e8e8'
                }}>
                  {group1.scenarios.length > 0 ? group1.scenarios.join(', ') : 'Default'}
                </th>
                <th style={{ 
                  padding: '12px 16px', 
                  textAlign: 'right', 
                  fontWeight: 600,
                  borderRight: '1px solid #e8e8e8'
                }}>
                  {group2.scenarios.length > 0 ? group2.scenarios.join(', ') : 'Default'}
                </th>
                <th style={{ 
                  padding: '12px 16px', 
                  textAlign: 'right', 
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                onClick={() => handleSort('difference')}>
                  Diff {sortColumn === 'difference' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody>
              {getGroupedAndSortedData().map((groupData, index) => (
                <React.Fragment key={groupData.group}>
                  <tr style={{ 
                    backgroundColor: '#f0f0f0',
                    borderTop: '2px solid #e8e8e8',
                    fontWeight: 600
                  }}>
                    <td style={{ 
                      padding: '12px 16px',
                      borderRight: '1px solid #e8e8e8'
                    }}>
                      {groupData.group}
                    </td>
                    <td style={{ 
                      padding: '12px 16px',
                      textAlign: 'center',
                      borderRight: '1px solid #e8e8e8'
                    }}>
                      {/* Empty for category column */}
                    </td>
                    <td style={{ 
                      padding: '12px 16px',
                      textAlign: 'center',
                      borderRight: '1px solid #e8e8e8'
                    }}>
                      {/* Empty for position column */}
                    </td>
                    <td style={{ 
                      padding: '12px 16px',
                      textAlign: 'right',
                      borderRight: '1px solid #e8e8e8'
                    }}>
                      {formatCurrency(groupData.summary.totalGroup1Pay)}
                    </td>
                    <td style={{ 
                      padding: '12px 16px',
                      textAlign: 'right',
                      borderRight: '1px solid #e8e8e8'
                    }}>
                      {formatCurrency(groupData.summary.totalGroup2Pay)}
                    </td>
                    <td style={{ 
                      padding: '12px 16px',
                      textAlign: 'right',
                      color: getDifferenceColor(groupData.summary.totalDifference),
                      fontWeight: 600
                    }}>
                      {formatCurrency(groupData.summary.totalDifference)}
                    </td>
                  </tr>
                  {groupData.players.map((data, playerIndex) => (
                    <tr key={data.player.id} style={{ 
                      borderBottom: '1px solid #f0f0f0',
                      backgroundColor: playerIndex % 2 === 0 ? '#ffffff' : '#fafafa'
                    }}>
                      <td style={{ 
                        padding: '12px 16px',
                        borderRight: '1px solid #e8e8e8',
                        fontWeight: 500
                      }}>
                        {data.player.name__first} {data.player.name__last}
                      </td>
                      <td style={{ 
                        padding: '12px 16px',
                        textAlign: 'center',
                        borderRight: '1px solid #e8e8e8',
                        fontWeight: 500
                      }}>
                        {data.player.positionCategory}
                      </td>
                      <td style={{ 
                        padding: '12px 16px',
                        textAlign: 'center',
                        borderRight: '1px solid #e8e8e8',
                        fontWeight: 500
                      }}>
                        {data.player.position}
                      </td>
                      <td style={{ 
                        padding: '12px 16px',
                        textAlign: 'right',
                        borderRight: '1px solid #e8e8e8'
                      }}>
                        {formatCurrency(data.group1Pay)}
                      </td>
                      <td style={{ 
                        padding: '12px 16px',
                        textAlign: 'right',
                        borderRight: '1px solid #e8e8e8'
                      }}>
                        {formatCurrency(data.group2Pay)}
                      </td>
                      <td style={{ 
                        padding: '12px 16px',
                        textAlign: 'right',
                        color: getDifferenceColor(data.difference),
                        fontWeight: 600
                      }}>
                        {formatCurrency(data.difference)}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 0',
          color: '#666',
          fontSize: '16px'
        }}>
          {playerComparisonData.length === 0
            ? 'No player data available for the selected scenarios.'
            : 'Please select scenarios for both groups to compare.'
          }
        </div>
      )}
    </div>
  );
};

export default ScenarioCompare; 