"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Select, Space, Typography, DatePicker, Dropdown, MenuProps, Modal, Input } from "antd";
import type { RangePickerProps } from "antd/es/date-picker";
import dayjs, { Dayjs } from "dayjs";
import { 
  ExportOutlined, 
  FilterOutlined,
  CalendarOutlined,
  AppstoreOutlined,
  UserOutlined,
  PlusOutlined,
  SettingOutlined,
  CheckSquareOutlined,
  EditOutlined,
  DeleteOutlined,
  DownOutlined
} from "@ant-design/icons";
import { AddPlayersDrawer } from "./_components/AddPlayersDrawer";
import { ScoreTrackerTable } from "./_components/ScoreTrackerTable";
import { ColumnOptionsDrawer } from "./_components/ColumnOptionsDrawer";
import type { Player, GameResult, ScoreTrackerState } from "./types";

const { Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

// ============================================================================
// TODO: DATABASE INTEGRATION
// ============================================================================
// This page currently uses mock data. To connect to the database:
//
// 1. Replace mockPlayers and mockGameResults with database queries
// 2. Implement Add/Remove Players functionality
// 3. Implement Set Email Sort to save email preferences
// 4. Implement Custom Views to save/load filter configurations
// 5. Implement column freeze and reordering
//
// The ScoreTrackerState interface defines the complete state structure
// which should map to your database tables
//
// Example database tables needed:
//   - players: Store player information
//   - game_results: Store game results and scores
//   - saved_views: Store user's saved filter configurations
//   - email_preferences: Store email sort settings per user
//   - column_preferences: Store table column configurations
//
// ============================================================================

// Mock data - TODO: Replace with database queries
const mockPlayers: Player[] = [
  {
    id: "1",
    name: "Mika Wilson",
    recruitingCoach: "MK",
    position: "OL",
    record: "10W - 0L",
    highSchool: "Saguache",
    state: "Colorado",
    year: "2026",
    phone: "(303) 232-5993",
    rating: "n/a"
  },
  {
    id: "2",
    name: "Lucas Ha",
    recruitingCoach: "MK",
    position: "OL",
    record: "2W - 8L",
    highSchool: "Saguache",
    state: "Colorado",
    year: "2026",
    phone: "(303) 232-5993",
    rating: "n/a"
  },
  {
    id: "3",
    name: "Chase Hoffman",
    recruitingCoach: "MK",
    position: "OL",
    record: "8W - 2L",
    highSchool: "Saguache",
    state: "Colorado",
    year: "2026",
    phone: "(303) 232-5993",
    rating: "n/a"
  },
  {
    id: "4",
    name: "Nick Rourke",
    recruitingCoach: "MK",
    position: "OL",
    record: "6W - 4L",
    highSchool: "Saguache",
    state: "Colorado",
    year: "2026",
    phone: "(303) 232-5993",
    rating: "n/a"
  }
];

const mockGameResults: GameResult[] = [
  // Mika Wilson's games
  {
    playerId: "1",
    opponent: "Jefferson",
    homeAway: "H",
    result: "W",
    score: "34-0",
    date: "9/6",
    gameSummary: "Saguache CO @ Monte Vista",
    source: "MP SS"
  },
  {
    playerId: "1",
    opponent: "Brighton",
    homeAway: "A",
    result: "W",
    score: "28-14",
    date: "9/13",
    gameSummary: "Saguache CO @ Brighton",
    source: "MP SS"
  },
  {
    playerId: "1",
    opponent: "Culver",
    homeAway: "A",
    result: "L",
    score: "7-21",
    date: "9/20",
    gameSummary: "Saguache CO @ Culver",
    source: "MP SS"
  },
  // Chase Hoffman's games (default player - playerId: "3")
  {
    playerId: "3",
    opponent: "Centennial",
    homeAway: "H",
    result: "W",
    score: "42-14",
    date: "9/5",
    gameSummary: "Chase Hoffman: 8 catches, 120 yards, 2 TDs",
    source: "MP SS"
  },
  {
    playerId: "3",
    opponent: "Highlands Ranch",
    homeAway: "A",
    result: "W",
    score: "35-21",
    date: "9/12",
    gameSummary: "Chase Hoffman: 6 catches, 95 yards, 1 TD",
    source: "MP SS"
  },
  {
    playerId: "3",
    opponent: "ThunderRidge",
    homeAway: "H",
    result: "L",
    score: "14-42",
    date: "9/19",
    gameSummary: "Chase Hoffman: 4 catches, 65 yards",
    source: "MP SS"
  },
  {
    playerId: "3",
    opponent: "Mountain Vista",
    homeAway: "A",
    result: "W",
    score: "28-17",
    date: "9/26",
    gameSummary: "Chase Hoffman: 7 catches, 105 yards, 1 TD",
    source: "MP SS"
  },
];

export default function ScoreTracker() {
  // ============================================================================
  // TODO: DEFAULT PLAYER SELECTION FOR PM
  // ============================================================================
  // When connecting to database, the PM should decide the default behavior:
  // 
  // Option 1: Alphabetically first player (as implemented)
  // Option 2: First player by recruitment date
  // Option 3: Most recently viewed player
  // Option 4: Player with most recent game
  // 
  // Currently defaults to alphabetically first player when entering Player View
  // without a selection, or if the selected player becomes unavailable.
  // ============================================================================
  
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // ============================================================================
  // TODO: DATABASE INTEGRATION - GET DEFAULT PLAYER FROM RECRUITMENT BOARD
  // ============================================================================
  // The defaultPlayer should be dynamically pulled from the recruitment board
  // table in the database. Currently using first alphabetically sorted player.
  // 
  // Example query:
  // const { data } = await supabase
  //   .from('recruitment_board')
  //   .select('player_id')
  //   .eq('user_id', currentUser.id)
  //   .order('last_name', { ascending: true })
  //   .limit(1);
  // const defaultPlayerId = data[0]?.player_id;
  // ============================================================================
  const defaultPlayerId = mockPlayers.length > 0 ? mockPlayers[0].id : null;
  
        // Get initial view and player from query string, default to 'weekView' view
        // Note: query string state is for development/debugging
        // When connected to database, this should load user's saved preferences
        const initialView = (searchParams?.get('view') as 'weekView' | 'player' | 'grid') || 'weekView';
  // TODO: DATABASE INTEGRATION - Load last selected player from database
  // For now, use query string or default to null (no specific player selected)
  const initialPlayer = searchParams?.get('player') || null;
  
        const [selectedView, setSelectedView] = useState<'weekView' | 'player' | 'grid'>(initialView);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(initialPlayer);
  const [addPlayersVisible, setAddPlayersVisible] = useState(false);
  const [columnOptionsVisible, setColumnOptionsVisible] = useState(false);
  const [showSavedFilters, setShowSavedFilters] = useState(false);
  const [savedViews, setSavedViews] = useState<any[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>(mockPlayers.slice(0, 4));
  // Column configuration - matches the table column order
  const [columnConfig, setColumnConfig] = useState<any[]>([
    { key: 'surprise', visible: true, order: 0, frozen: true, iconOnly: true },
    { key: 'recruitingCoach', visible: true, order: 1, frozen: true },
    { key: 'name', visible: true, order: 2, frozen: true },
    { key: 'year', visible: true, order: 3, frozen: true },
    { key: 'position', visible: true, order: 4, frozen: true },
    { key: 'rating', visible: true, order: 5, frozen: true },
    { key: 'highSchool', visible: true, order: 6, frozen: true }, // Freeze ends here
    { key: 'opponent', visible: true, order: 7, frozen: false },
    { key: 'result', visible: true, order: 8, frozen: false },
    { key: 'statsGameSummary', visible: true, order: 9, frozen: false },
    { key: 'gameDate', visible: true, order: 10, frozen: false },
    { key: 'source', visible: true, order: 11, frozen: false },
    { key: 'winLoss', visible: true, order: 12, frozen: false },
    { key: 'nextWeekOpponent', visible: true, order: 13, frozen: false },
    { key: 'nextWeekHomeAway', visible: true, order: 14, frozen: false },
    { key: 'nextWeekDate', visible: true, order: 15, frozen: false },
  ]);
  const [freezeMarkerIndex, setFreezeMarkerIndex] = useState<number>(6); // Freeze after highschool
  const [dateRangeVisible, setDateRangeVisible] = useState(false);
  const [customViewsVisible, setCustomViewsVisible] = useState(false);
  const [emailSortModalVisible, setEmailSortModalVisible] = useState(false);
  const [emailSortActive, setEmailSortActive] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [removePlayersModalVisible, setRemovePlayersModalVisible] = useState(false);
  // ============================================================================
  // TODO: DATABASE INTEGRATION
  // ============================================================================
  // When page loads, load the current week from database or default to current week
  // This should be stored per-user or per-session
  // ============================================================================
  const [selectedWeek, setSelectedWeek] = useState<Dayjs | null>(null); // Will default to current week on first render
  
  // Grid view date span configuration - TODO: Make this a user preference or database setting
  const gridViewDateSpan = 4; // Number of weeks to show in grid view (default: 4 weeks)
  
  // Mock saved views - TODO: Load from database
  const savedViewsList = [
    { id: '1', name: 'Mika Wilson', icon: 'mail' },
    { id: '2', name: 'Hillsborouh', icon: 'heart' },
    { id: '3', name: 'Nick Rourke', icon: 'heart' },
    { id: '4', name: 'Ohio CBs', icon: 'heart' },
  ];

  const handleSetEmailSort = () => {
    setEmailSortModalVisible(true);
  };

  const handleConfirmEmailSort = async () => {
    // ============================================================================
    // TODO: DATABASE INTEGRATION
    // ============================================================================
    // Save current view configuration as email preference
    // This should save the current selected view, players, and column config
    // to the user's email preferences table in database
    //
    // Example database call:
    // const { data, error } = await supabase
    //   .from('email_preferences')
    //   .upsert({
    //     user_id: currentUser.id,
    //     email_sort_config: {
    //       view_type: selectedView,
    //       selected_players: selectedPlayers.map(p => p.id),
    //       column_config: columnConfig,
    //       date_span: gridViewDateSpan
    //     }
    //   });
    // ============================================================================
    
    try {
      // TODO: Add actual database call here
      // const response = await saveEmailSortConfig(...);
      console.log("Setting email sort preference for all team members");
      
      // Update state after successful save
      setEmailSortActive(true);
      setEmailSortModalVisible(false);
    } catch (error) {
      console.error("Error setting email sort:", error);
      // Handle error - maybe show a toast/message
    }
  };

  const handleExport = () => {
    // TODO: Export filtered data to CSV/Excel
    console.log("Exporting data");
  };

  const handleRemovePlayers = () => {
    setRemovePlayersModalVisible(true);
  };

  const handleConfirmRemovePlayers = () => {
    // ============================================================================
    // TODO: DATABASE INTEGRATION
    // ============================================================================
    // Remove players from score_tracker_selections table:
    //
    // const { error } = await supabase
    //   .from('score_tracker_selections')
    //   .delete()
    //   .in('player_id', selectedRowKeys)
    //   .eq('user_id', currentUser.id);
    //
    // Also need to notify all team members (staff-wide impact)
    // ============================================================================
    
    // Remove selected players from score tracker
    setSelectedPlayers(selectedPlayers.filter(p => !selectedRowKeys.includes(p.id)));
    setSelectedRowKeys([]);
    setRemovePlayersModalVisible(false);
  };

  // Set default week on mount
  useEffect(() => {
    if (!selectedWeek) {
      setSelectedWeek(dayjs());
    }
  }, []);

  // ============================================================================
  // TODO: DATABASE INTEGRATION - Save view and player state
  // ============================================================================
  // When connected to database, save user's view preferences:
  // 1. Save selectedView to user preferences table
  // 2. Save selectedPlayer if viewing player view
  // 3. Save selectedWeek for week view
  // 
  // Example:
  // useEffect(() => {
  //   supabase.from('user_preferences').upsert({
  //     user_id: currentUser.id,
  //     last_view: selectedView,
  //     last_selected_player: selectedPlayer,
  //     last_selected_week: selectedWeek?.toISOString()
  //   });
  // }, [selectedView, selectedPlayer, selectedWeek]);
  //
  // Query string state is only for development/debugging
  // ============================================================================
  
  // Update URL when view or player changes (for development/debugging only)
  // Skip the initial mount to avoid setting query string on page load
  const [isInitialMount, setIsInitialMount] = useState(true);
  
  useEffect(() => {
    if (isInitialMount) {
      setIsInitialMount(false);
      return;
    }
    
    const params = new URLSearchParams();
    params.set('view', selectedView);
    if (selectedPlayer) {
      params.set('player', selectedPlayer);
    }
    router.push(`?${params.toString()}`);
  }, [selectedView, selectedPlayer, router, isInitialMount]);

  return (
    <div style={{ padding: "20px" }}>
      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "24px", flexWrap: "wrap" }}>
        <Dropdown
          trigger={['click']}
          open={dateRangeVisible}
          onOpenChange={(open) => setDateRangeVisible(open)}
          popupRender={() => (
            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                  <DatePicker
                    picker="week"
                    value={selectedWeek}
                    onChange={(date) => {
                      if (date) {
                        setSelectedWeek(date);
                        setDateRangeVisible(false);
                        // TODO: DATABASE INTEGRATION
                        // Fetch game data for selected week
                        // const weekStart = date.startOf('week').toISOString();
                        // const weekEnd = date.endOf('week').toISOString();
                        // const { data } = await supabase
                        //   .from('game_results')
                        //   .select('*')
                        //   .gte('game_date', weekStart)
                        //   .lte('game_date', weekEnd)
                        //   .in('player_id', selectedPlayers.map(p => p.id));
                      }
                    }}
                    style={{ width: '100%' }}
                    format="MM/DD/YYYY"
                    placeholder="Select Week"
                    getPopupContainer={(trigger) => trigger}
                  />
            </div>
          )}
        >
          <Button 
            icon={<CalendarOutlined />}
            type={selectedView === 'weekView' ? 'primary' : 'default'}
            onClick={() => {
              setSelectedView('weekView');
              // Default to current week if no week selected
              if (!selectedWeek) {
                setSelectedWeek(dayjs());
              }
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            Week View
            <DownOutlined />
          </Button>
        </Dropdown>
        
        <Button 
          icon={<AppstoreOutlined />}
          type={selectedView === 'grid' ? 'primary' : 'default'}
          onClick={() => setSelectedView('grid')}
        >
          Grid View
        </Button>
        <Dropdown
          menu={{
            items: mockPlayers
              .sort((a, b) => a.name.localeCompare(b.name)) // Sort alphabetically
              .map(player => ({
                key: player.id,
                label: player.name,
                onClick: () => {
                  setSelectedPlayer(player.id);
                  setSelectedView('player');
                },
              })),
          }}
          trigger={['click']}
          placement="bottomLeft"
          popupRender={(menu) => (
            <div style={{ backgroundColor: 'white', padding: '8px', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
              {/* Selected player at top - only show if not the default player */}
              {selectedPlayer && selectedPlayer !== defaultPlayerId && (
                <div style={{ 
                  padding: '8px', 
                  backgroundColor: '#f0f0f0', 
                  borderRadius: '4px',
                  marginBottom: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="icon-pushpin" style={{ color: '#1890ff' }}></i>
                    <span style={{ fontWeight: 500 }}>
                      {mockPlayers.find(p => p.id === selectedPlayer)?.name}
                    </span>
                  </div>
                  <Button
                    type="text"
                    size="small"
                    icon={<i className="icon-close-circle" style={{ color: '#ff4d4f' }}></i>}
                    onClick={() => {
                      setSelectedPlayer(defaultPlayerId);
                      setSelectedView('player');
                    }}
                  />
                </div>
              )}
              
              <Input
                placeholder="Search players..."
                prefix={<i className="icon-search-normal-1"></i>}
                style={{ marginBottom: '8px' }}
                allowClear
              />
              {menu}
            </div>
          )}
        >
          <Button 
            type={selectedView === 'player' && selectedPlayer ? 'primary' : 'default'}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              color: selectedView === 'player' && selectedPlayer ? 'white' : undefined
            }}
          >
            <UserOutlined />
            <span>Player View</span>
            <DownOutlined />
          </Button>
        </Dropdown>
        
        <div style={{ marginLeft: "auto", display: "flex", gap: "12px" }}>
                 {selectedRowKeys.length > 0 && (
                   <Button
                     danger
                     icon={<DeleteOutlined />}
                     onClick={handleRemovePlayers}
                   >
                     Remove Players
                   </Button>
                 )}
                 <Button
                   icon={<PlusOutlined />}
                   onClick={() => setAddPlayersVisible(true)}
                 >
                   Add Player(s)
                 </Button>
          <Button 
            icon={<ExportOutlined />}
            onClick={handleExport}
          >
            Export
          </Button>
          <Button 
            style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              color: 'white'
            }}
            icon={<FilterOutlined />}
            onClick={() => {
              setShowSavedFilters(true);
              setColumnOptionsVisible(true);
            }}
          >
            Custom Views
          </Button>
          <Button 
            icon={emailSortActive ? <CheckSquareOutlined /> : <i className="icon-square"></i>}
            onClick={handleSetEmailSort}
          >
            Set Email Sort
          </Button>
        </div>
      </div>


      {/* Data Table */}
      <div style={{ 
        backgroundColor: "#fff", 
        padding: "16px", 
        borderRadius: "8px",
        overflow: "auto"
      }}>
               <ScoreTrackerTable
                 viewType={selectedView}
                 players={selectedPlayers}
                 gameResults={mockGameResults}
                 selectedPlayer={selectedPlayer}
                 selectedWeek={selectedWeek}
                 columnConfig={columnConfig}
                 dateSpan={gridViewDateSpan}
                 selectedRowKeys={selectedRowKeys}
                 setSelectedRowKeys={setSelectedRowKeys}
               />
      </div>

      {/* Side Drawers */}
      <AddPlayersDrawer
        visible={addPlayersVisible}
        onClose={() => setAddPlayersVisible(false)}
        selectedPlayers={selectedPlayers}
        onUpdatePlayers={setSelectedPlayers}
      />
      
      <ColumnOptionsDrawer
        visible={columnOptionsVisible}
        onClose={() => {
          setColumnOptionsVisible(false);
          setShowSavedFilters(false);
        }}
        columns={columnConfig}
        onUpdateColumns={(newColumns) => {
          // ============================================================================
          // TODO: DATABASE INTEGRATION
          // ============================================================================
          // Save column configuration to database
          //
          // Example:
          // const { error } = await supabase
          //   .from('column_preferences')
          //   .upsert({
          //     user_id: currentUser.id,
          //     column_config: JSON.stringify(newColumns),
          //     freeze_position: freezeMarkerIndex,
          //     updated_at: new Date().toISOString()
          //   });
          // ============================================================================
          setColumnConfig(newColumns);
        }}
        showSavedFilters={showSavedFilters}
        freezeMarkerIndex={freezeMarkerIndex}
        onUpdateFreezeMarker={setFreezeMarkerIndex}
      />

      {/* Remove Players Modal */}
      <Modal
        title={null}
        open={removePlayersModalVisible}
        onCancel={() => setRemovePlayersModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setRemovePlayersModalVisible(false)}>
            Cancel
          </Button>,
          <Button key="confirm" danger type="primary" onClick={handleConfirmRemovePlayers}>
            Remove Players
          </Button>,
        ]}
        width={500}
        centered
      >
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{ 
            fontSize: '24px', 
            color: '#ff4d4f',
            minWidth: '24px'
          }}>
            ⚠️
          </div>
          <div style={{ flex: 1 }}>
            <Typography.Title level={4} style={{ margin: 0, marginBottom: '8px' }}>
              Remove Players
            </Typography.Title>
            <Typography.Text type="secondary">
              Players will be removed from every staff member&apos;s view, and the score tracker email.
            </Typography.Text>
          </div>
        </div>
      </Modal>

      {/* Set Email Sort Modal */}
      <Modal
        title={null}
        open={emailSortModalVisible}
        onCancel={() => setEmailSortModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setEmailSortModalVisible(false)}>
            Cancel
          </Button>,
          <Button key="confirm" type="primary" onClick={handleConfirmEmailSort}>
            Set Email Sort
          </Button>,
        ]}
        width={500}
        centered
      >
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{ 
            fontSize: '24px', 
            color: '#ff8c00',
            minWidth: '24px'
          }}>
            ⚠️
          </div>
          <div style={{ flex: 1 }}>
            <Typography.Title level={4} style={{ margin: 0, marginBottom: '8px' }}>
              Set Email Sort
            </Typography.Title>
            <Typography.Text type="secondary">
              This will save your current view configuration as the default email sort for all members of your team.
            </Typography.Text>
          </div>
        </div>
      </Modal>
    </div>
  );
}

