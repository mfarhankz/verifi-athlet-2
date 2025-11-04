"use client";

import { useState } from "react";
import { Drawer, Button, Input, Space, Typography, Divider, Flex } from "antd";
import { CloseOutlined, UserOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import type { Player } from "../types";

const { Text } = Typography;

// ============================================================================
// TODO: DATABASE INTEGRATION
// ============================================================================
// This component handles adding/removing players from the score tracker
//
// 1. Fetch available players from database
// 2. Implement search functionality for players
// 3. Update selectedPlayers to database
// 4. Show warning about staff-wide impact
//
// Database tables:
//   - players: Available players
//   - score_tracker_selections: Track which players are in each user's view
//
// ============================================================================

interface AddPlayersDrawerProps {
  visible: boolean;
  onClose: () => void;
  selectedPlayers: Player[];
  onUpdatePlayers: (players: Player[]) => void;
}

export function AddPlayersDrawer({
  visible,
  onClose,
  selectedPlayers,
  onUpdatePlayers,
}: AddPlayersDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [holdingPlayers, setHoldingPlayers] = useState<Player[]>([]);

  // ============================================================================
  // TODO: DATABASE INTEGRATION
  // ============================================================================
  // This component searches ALL players from the recruiting board table,
  // NOT just current score tracker players. Players should be searchable
  // by name, school, state, position, year, etc.
  //
  // IMPORTANT: This is a database search that should support:
  // 1. Real-time search as user types (debounced)
  // 2. Search across multiple fields (name, high school, state, year, position)
  // 3. Exclude players already in score tracker (selectedPlayers)
  //
  // Example Supabase query:
  // const searchTerm = searchQuery.trim();
  // const { data, error } = await supabase
  //   .from('recruitment_board')
  //   .select('*')
  //   .or(`name.ilike.%${searchTerm}%,high_school.ilike.%${searchTerm}%,state.ilike.%${searchTerm}%`)
  //   .eq('user_id', currentUser.id)
  //   .limit(50); // Limit results for performance
  //
  // Mock data for development - search results for "shawn"
  // ============================================================================
  const mockAllRecruitingBoardPlayers: Player[] = [
    { id: "5", name: "Shawn Fen", recruitingCoach: "MK", position: "OL", state: "Arizona", highSchool: "Ajo", year: "2026" },
    { id: "6", name: "Trip Shawn", recruitingCoach: "MK", position: "OL", state: "Connecticut", highSchool: "Mystic", year: "2026" },
    { id: "7", name: "Shawn Wallace", recruitingCoach: "MK", position: "OL", state: "Ohio", highSchool: "Dublin", year: "2028" },
    { id: "8", name: "Logan Shawn", recruitingCoach: "MK", position: "OL", state: "Hawaii", highSchool: "Ewa Beach", year: "2026" },
    { id: "9", name: "Shawn Bryant", recruitingCoach: "MK", position: "CB", state: "CO", highSchool: "Saguache", year: "2026" },
    { id: "10", name: "Shawn di Leo", recruitingCoach: "MK", position: "QB", state: "WA", highSchool: "Snoqualmie", year: "2027" },
    { id: "11", name: "Shawn Vargas", recruitingCoach: "MK", position: "RB", state: "CA", highSchool: "Temecula", year: "2027" },
  ];

  const handleAddToHolding = (player: Player) => {
    if (!holdingPlayers.find(p => p.id === player.id)) {
      setHoldingPlayers([...holdingPlayers, player]);
    }
  };

  const handleRemoveFromHolding = (playerId: string) => {
    setHoldingPlayers(holdingPlayers.filter(p => p.id !== playerId));
  };

  const handleAddPlayers = () => {
    // ============================================================================
    // TODO: DATABASE INTEGRATION
    // ============================================================================
    // When adding players, save to score_tracker_selections table:
    //
    // Example Supabase query:
    // const playerIds = holdingPlayers.map(p => p.id);
    // const { error } = await supabase
    //   .from('score_tracker_selections')
    //   .insert(
    //     playerIds.map(playerId => ({
    //       user_id: currentUser.id,
    //       player_id: playerId,
    //       created_at: new Date().toISOString()
    //     }))
    //   );
    //
    // Also need to notify all team members (staff-wide impact)
    // ============================================================================
    
    // Add holding players to the score tracker
    onUpdatePlayers([...selectedPlayers, ...holdingPlayers]);
    setHoldingPlayers([]);
    onClose();
  };

  const handleReset = () => {
    setHoldingPlayers([]);
  };

  // Filter out players already in score tracker
  const filteredAvailable = mockAllRecruitingBoardPlayers.filter(p =>
    !selectedPlayers.find(sp => sp.id === p.id) &&
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Drawer
      title={null}
      placement="right"
      onClose={onClose}
      open={visible}
      width={420}
      styles={{
        body: { padding: 0 },
        header: { display: 'none' }
      }}
      maskClosable={true}
      destroyOnClose={false}
    >
      <Flex vertical style={{ height: '100%', position: 'relative' }}>
        <Flex justify="space-between" align="center" style={{ padding: '16px', borderBottom: '1px solid rgba(18, 109, 184, 0.2)', background:'rgba(18, 109, 184, 0.1)' }}>
          <h4 style={{ margin: 0 }}>Add Players</h4>
          <Button 
            type="text" 
            icon={<CloseOutlined />}
            onClick={onClose}
          />
        </Flex>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '100px' }}>
          {/* Search Input */}
          <Input
            placeholder="Search players..."
            prefix={<UserOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ marginBottom: "16px" }}
          />

          {/* Available Players - Search from recruiting board */}
          <Typography.Text strong>Available Players</Typography.Text>
          {filteredAvailable.map((player) => (
        <div
          key={player.id}
          style={{
            padding: "8px 12px",
            marginBottom: "8px",
            backgroundColor: "#f5f5f5",
            borderRadius: "4px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
          onClick={() => handleAddToHolding(player)}
        >
          <div>
            <Text strong>{player.name}</Text>
            <div>
              <Text type="secondary" style={{ fontSize: "12px" }}>
                {player.highSchool}, {player.state} {player.year}
              </Text>
            </div>
          </div>
          <Button
            type="text"
            icon={<PlusOutlined style={{ color: "#52c41a" }} />}
            onClick={(e) => {
              e.stopPropagation();
              handleAddToHolding(player);
            }}
          />
        </div>
      ))}

        
        {/* Footer Buttons with Holding Area */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, borderTop: '1px solid #f0f0f0', backgroundColor: 'white', zIndex: 10 }}>
          {/* Holding Area for Selected Players */}
          {holdingPlayers.length > 0 && (
            <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0', backgroundColor: '#fafafa', maxHeight: '150px', overflowY: 'auto' }}>
              <Typography.Text strong style={{ display: 'block', marginBottom: '8px' }}>
                Selected ({holdingPlayers.length})
              </Typography.Text>
              {holdingPlayers.map((player) => (
                <div
                  key={player.id}
                  style={{
                    padding: "8px 12px",
                    marginBottom: "4px",
                    backgroundColor: "#fff",
                    borderRadius: "4px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <div>
                    <Text>{player.name}</Text>
                  </div>
                  <Button
                    type="text"
                    size="small"
                    icon={<DeleteOutlined style={{ color: "#ff4d4f" }} />}
                    onClick={() => handleRemoveFromHolding(player.id)}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Warning Message */}
          <div style={{
            padding: "12px 16px",
            borderTop: holdingPlayers.length > 0 ? '1px solid #f0f0f0' : 'none',
            borderBottom: holdingPlayers.length > 0 ? '1px solid #f0f0f0' : 'none',
            backgroundColor: "#fff7e6"
          }}>
            <Text style={{ fontSize: '12px' }}>
              <strong>Note:</strong> Players will be added to every staff member&apos;s view, and the score tracker email.
            </Text>
          </div>

          {/* Action Buttons */}
          <div style={{ padding: '16px' }}>
            <Flex gap={8} justify="center">
              <Button size="large" onClick={handleReset} style={{ flex: 1 }}>
                Reset
              </Button>
              <Button 
                type="primary" 
                size="large" 
                onClick={handleAddPlayers}
                disabled={holdingPlayers.length === 0}
                style={{ flex: 1 }}
              >
                Add Players
              </Button>
            </Flex>
          </div>
        </div>
        </div>
      </Flex>
    </Drawer>
  );
}

