"use client";

import { Table, Typography, Checkbox } from "antd";
import type { Player, GameResult, ColumnConfig } from "../types";
import type { ColumnsType } from "antd/es/table";

const { Text } = Typography;

interface ScoreTrackerTableProps {
  viewType: 'weekView' | 'player' | 'grid';
  players: Player[];
  gameResults: GameResult[];
  selectedPlayer?: string | null;
  selectedWeek?: any; // Dayjs object for selected week
  columnConfig: ColumnConfig[];
  dateSpan?: number; // Number of weeks to show in grid view
  selectedRowKeys?: React.Key[];
  setSelectedRowKeys?: (keys: React.Key[]) => void;
}

// ============================================================================
// SCORE TRACKER TABLE COMPONENT
// ============================================================================
// This component displays game data in three different views:
// - Week View: Shows all players' games for selected week with compact columns
// - Player View: Shows games for a single selected player
// - Grid View: Shows games in weekly columns
//
// TODO: DATABASE INTEGRATION
// ============================================================================
// Replace mock data with database queries
// Map ColumnConfig to database columns
// ============================================================================

export function ScoreTrackerTable({
  viewType,
  players,
  gameResults,
  selectedPlayer,
  selectedWeek,
  columnConfig,
  dateSpan = 4,
  selectedRowKeys = [],
  setSelectedRowKeys,
}: ScoreTrackerTableProps) {
  
  // Build columns dynamically from columnConfig
  // Find the last frozen column to add the border class
  const frozenColumns = columnConfig.filter(c => c.frozen && c.visible).sort((a, b) => a.order - b.order);
  const lastFrozenColumnOrder = frozenColumns.length > 0 ? frozenColumns[frozenColumns.length - 1].order : -1;
  
  const allColumnsFromConfig = columnConfig
    .filter(col => col.visible)
    .sort((a, b) => a.order - b.order)
    .map(colConfig => {
      // Map column config keys to actual column definitions
      const columnTemplates: Record<string, any> = {
        surprise: {
          title: '',
          dataIndex: 'surprise',
          key: 'surprise',
          width: 40,
          fixed: colConfig.frozen ? 'left' as const : undefined,
          className: colConfig.frozen && colConfig.order === lastFrozenColumnOrder ? 'last-frozen-column' : undefined,
          render: (text: any, record: any) => {
            const surpriseStatus = record?.surpriseStatus || 'default';
            switch(surpriseStatus) {
              case 'favorite':
                return <i className="icon-heart" style={{ color: '#1890ff', fontSize: '16px' }} />;
              case 'upset':
                return <i className="icon-warning" style={{ color: '#ff9800', fontSize: '16px' }} />;
              default:
                return <i className="icon-star" style={{ color: '#000', fontSize: '16px' }} />;
            }
          }
        },
        recruitingCoach: {
          title: 'RC',
          dataIndex: 'recruitingCoach',
          key: 'recruitingCoach',
          width: 40,
          fixed: colConfig.frozen ? 'left' as const : undefined,
          className: colConfig.frozen && colConfig.order === lastFrozenColumnOrder ? 'last-frozen-column' : undefined,
        },
        name: {
          title: 'Player',
          dataIndex: 'name',
          key: 'name',
          width: 80,
          fixed: colConfig.frozen ? 'left' as const : undefined,
          className: colConfig.frozen && colConfig.order === lastFrozenColumnOrder ? 'last-frozen-column' : undefined,
          render: (text: string, record: any) => (
            <Text
              style={{ textDecoration: 'underline', cursor: 'pointer', color: '#1890ff' }}
              onClick={() => console.log("Navigate to player:", record.id)}
            >
              {text}
            </Text>
          ),
        },
        year: {
          title: 'Year',
          dataIndex: 'year',
          key: 'year',
          width: 40,
          fixed: colConfig.frozen ? 'left' as const : undefined,
          className: colConfig.frozen && colConfig.order === lastFrozenColumnOrder ? 'last-frozen-column' : undefined,
        },
        position: {
          title: 'Pos.',
          dataIndex: 'position',
          key: 'position',
          width: 40,
          fixed: colConfig.frozen ? 'left' as const : undefined,
          className: colConfig.frozen && colConfig.order === lastFrozenColumnOrder ? 'last-frozen-column' : undefined,
        },
        rating: {
          title: 'Rating',
          dataIndex: 'rating',
          key: 'rating',
          width: 50,
          fixed: colConfig.frozen ? 'left' as const : undefined,
          className: colConfig.frozen && colConfig.order === lastFrozenColumnOrder ? 'last-frozen-column' : undefined,
        },
        highSchool: {
          title: 'Highschool',
          dataIndex: 'highSchoolFull',
          key: 'highSchool',
          width: 100,
          fixed: colConfig.frozen ? 'left' as const : undefined,
          // Add className if this is the last frozen column
          className: colConfig.frozen && colConfig.order === lastFrozenColumnOrder ? 'last-frozen-column' : undefined,
          render: (text: string, record: any) => (
            <Text>
              <Text strong>{record.highSchoolName || text?.split(',')[0]}</Text>
              {' '}
              <Text>{record.stateAbbrev || text?.split(',')[1]?.trim()}</Text>
            </Text>
          ),
        },
        opponent: {
          title: 'Opponent',
          dataIndex: 'opponentDisplay',
          key: 'opponent',
          width: 80
        },
        result: {
          title: 'Results',
          dataIndex: 'resultDisplay',
          key: 'result',
          width: 60,
          render: (text: string, record: any) => {
            const isWin = record?.isWin || text?.includes('W');
            const color = isWin ? '#52c41a' : '#ff4d4f';
            return <Text style={{ color }}>{text || record.result}</Text>;
          },
        },
        statsGameSummary: {
          title: 'Stats/Game Summary',
          dataIndex: 'gameSummary',
          key: 'statsGameSummary',
          width: 180,
          ellipsis: true,
        },
        gameDate: {
          title: 'Game Date',
          dataIndex: 'date',
          key: 'gameDate',
          width: 60
        },
        source: {
          title: 'Source',
          dataIndex: 'sourceVerified',
          key: 'source',
          width: 80,
          render: (verified: any, record: any, index: number) => {
            const hasPrimary = verified?.primary || false;
            const hasSecondary = verified?.secondary || false;
            
            // Determine background color based on verification status
            let bgColor = '#ff4d4f'; // Dark red if neither verified
            if (hasPrimary && hasSecondary) {
              bgColor = '#52c41a'; // Dark green if both verified
            } else if (hasPrimary || hasSecondary) {
              bgColor = '#faad14'; // Dark yellow/orange if one verified
            }
            
            return (
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                height: '100%',
                width: '100%',
                backgroundColor: bgColor,
                margin: '-8px', // Negative margin to extend to cell edges
                padding: '8px'
              }}>
                <a href="#" onClick={(e) => { e.preventDefault(); console.log('Primary source clicked'); }} style={{ 
                  color: '#000',
                  textDecoration: hasPrimary ? 'underline' : 'none',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}>
                  PS
                </a>
                <a href="#" onClick={(e) => { e.preventDefault(); console.log('Secondary source clicked'); }} style={{ 
                  color: '#000',
                  textDecoration: hasSecondary ? 'underline' : 'none',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}>
                  SS
                </a>
              </div>
            );
          },
        },
        winLoss: {
          title: 'W/L',
          dataIndex: 'seasonRecord',
          key: 'winLoss',
          width: 60,
          render: (record: string) => {
            const isWin = record?.includes('W');
            const color = isWin ? '#52c41a' : '#ff4d4f';
            return <Text style={{ color }}>{record}</Text>;
          },
        },
        nextWeekOpponent: { title: 'Next Week Opponent', dataIndex: 'nextWeekOpponent', key: 'nextWeekOpponent', width: 90 },
        nextWeekHomeAway: { title: 'Next Week H/A', dataIndex: 'nextWeekHomeAway', key: 'nextWeekHomeAway', width: 60, render: (text: string) => text || '-' },
        nextWeekDate: { title: 'Next Week Date', dataIndex: 'nextWeekDate', key: 'nextWeekDate', width: 80 },
      };
      
      return columnTemplates[colConfig.key];
    })
    .filter(Boolean);

  // Legacy static allColumns for reference
  const allColumnsStatic = [
    { 
      title: '', 
      dataIndex: 'surprise', 
      key: 'surprise', 
      width: 40,
      fixed: 'left' as const,
      render: (text: any, record: any) => {
        // Three possible states for surprise column
        // TODO: DATABASE INTEGRATION - Replace with actual surprise status
        const surpriseStatus = record?.surpriseStatus || 'default'; // 'favorite', 'upset', 'default'
        
        switch(surpriseStatus) {
          case 'favorite':
            return <i className="icon-heart" style={{ color: '#1890ff', fontSize: '16px' }} />;
          case 'upset':
            return <i className="icon-warning" style={{ color: '#ff9800', fontSize: '16px' }} />;
          default:
            return <i className="icon-star" style={{ color: '#d9d9d9', fontSize: '16px' }} />;
        }
      }
    },
    { 
      title: 'RC', 
      dataIndex: 'recruitingCoach', 
      key: 'recruitingCoach', 
      width: 40,
      fixed: 'left' as const,
    },
    { 
      title: 'Player', 
      dataIndex: 'name', 
      key: 'name',
      width: 80,
      fixed: 'left' as const,
      render: (text: string, record: any) => (
        <Text 
          style={{ textDecoration: 'underline', cursor: 'pointer', color: '#1890ff' }}
          onClick={() => console.log("Navigate to player:", record.id)}
        >
          {text}
        </Text>
      ),
    },
    { 
      title: 'Year', 
      dataIndex: 'year', 
      key: 'year', 
      width: 40,
      fixed: 'left' as const,
    },
    { 
      title: 'Pos.', 
      dataIndex: 'position', 
      key: 'position', 
      width: 40,
      fixed: 'left' as const,
    },
    { 
      title: 'Rating', 
      dataIndex: 'rating', 
      key: 'rating', 
      width: 50,
      fixed: 'left' as const,
    },
    { 
      title: 'Highschool', 
      dataIndex: 'highSchoolFull', 
      key: 'highSchool', 
      width: 100,
      fixed: 'left' as const,
      render: (text: string, record: any) => (
        <Text>
          <Text strong>{record.highSchoolName || text.split(',')[0]}</Text>
          {' '}
          <Text>{record.stateAbbrev || text.split(',')[1]?.trim()}</Text>
        </Text>
      ),
      className: 'last-frozen-column',
    },
    { 
      title: 'Opponent', 
      dataIndex: 'opponentDisplay', 
      key: 'opponent', 
      width: 80 
    },
    { 
      title: 'Results', 
      dataIndex: 'resultDisplay', 
      key: 'result', 
      width: 60,
      render: (text: string, record: any) => {
        const isWin = record?.isWin || text?.includes('W');
        const color = isWin ? '#52c41a' : '#ff4d4f';
        return <Text style={{ color }}>{text || record.result}</Text>;
      },
    },
    { 
      title: 'Stats/Game Summary', 
      dataIndex: 'gameSummary', 
      key: 'statsGameSummary', 
      width: 180,
      ellipsis: true,
    },
    { title: 'Game Date', dataIndex: 'date', key: 'gameDate', width: 60 },
    { 
      title: 'Source', 
      dataIndex: 'sourceVerified', 
      key: 'source', 
      width: 50,
      render: (verified: any) => {
        const hasPrimary = verified?.primary || false;
        const hasSecondary = verified?.secondary || false;
        let bgColor = '#fff5f5'; // red if neither
        
        if (hasPrimary && hasSecondary) {
          bgColor = '#f6ffed'; // green if both
        } else if (hasPrimary || hasSecondary) {
          bgColor = '#fffbe6'; // yellow if one
        }
        
        return (
          <span style={{ backgroundColor: bgColor, padding: '1px 3px', borderRadius: '2px', fontSize: '10px', color: '#000' }}>
            PM SS
          </span>
        );
      },
    },
    { 
      title: 'W/L', 
      dataIndex: 'seasonRecord', 
      key: 'winLoss', 
      width: 60,
      render: (record: string) => {
        const isWin = record?.includes('W');
        const color = isWin ? '#52c41a' : '#ff4d4f';
        return <Text style={{ color }}>{record}</Text>;
      },
    },
    { title: 'Next Week Opponent', dataIndex: 'nextWeekOpponent', key: 'nextWeekOpponent', width: 90 },
    { 
      title: 'Next Week H/A', 
      dataIndex: 'nextWeekHomeAway', 
      key: 'nextWeekHomeAway', 
      width: 60,
      render: (text: string) => text || '-',
    },
    { title: 'Next Week Date', dataIndex: 'nextWeekDate', key: 'nextWeekDate', width: 80 },
  ];
  
  // Generate columns based on view type and columnConfig
  const generateColumns = () => {
    if (!columnConfig || columnConfig.length === 0) {
      // Fallback to default columns if no config provided
      return [];
    }

    // Get visible columns in order
    const visibleColumns = columnConfig
      .filter(col => col.visible)
      .sort((a, b) => a.order - b.order);

    // Add checkbox column at the start for date range view
    const checkboxColumn = {
      key: 'selection',
      width: 50,
      render: (_: any, record: any) => (
        <Checkbox
          checked={selectedRowKeys?.includes(record.key || record.id)}
          onChange={(e) => {
            if (setSelectedRowKeys) {
              if (e.target.checked) {
                setSelectedRowKeys([...selectedRowKeys, record.key || record.id]);
              } else {
                setSelectedRowKeys(selectedRowKeys.filter(key => key !== (record.key || record.id)));
              }
            }
          }}
        />
      ),
    };

    const columnMap: Record<string, any> = {
      selection: checkboxColumn,
      recruitingCoach: { title: 'RC', dataIndex: 'recruitingCoach', key: 'recruitingCoach', width: 50 },
      name: { 
        title: 'Player', 
        dataIndex: 'name', 
        key: 'name',
        width: 100,
        render: (text: string, record: any) => (
          <Text 
            style={{ textDecoration: 'underline', cursor: 'pointer', color: '#1890ff' }}
            onClick={() => console.log("Navigate to player:", record.id)}
          >
            {text}
          </Text>
        ),
      },
      year: { title: 'Year', dataIndex: 'year', key: 'year', width: 50 },
      position: { title: 'Pos.', dataIndex: 'position', key: 'position', width: 50 },
      rating: { title: 'Rating', dataIndex: 'rating', key: 'rating', width: 50 },
      cell: { title: 'Cell', dataIndex: 'phone', key: 'cell', width: 120 },
      state: { title: 'State', dataIndex: 'state', key: 'state', width: 80 },
      // For Week View: high school and state combined
      highSchool: { 
        title: 'Highschool', 
        dataIndex: 'highSchoolFull', 
        key: 'highSchool', 
        width: 120,
        render: (text: string) => <Text strong>{text}</Text>,
        frozen: true, // Freeze after highschool
      },
      opponent: { title: 'Opponent', dataIndex: 'opponent', key: 'opponent', width: 80 },
      result: { 
        title: 'Results', 
        dataIndex: 'result', 
        key: 'result', 
        width: 60,
        render: (text: string) => {
          const isWin = text?.startsWith('W');
          const color = isWin ? '#52c41a' : '#ff4d4f';
          return <Text style={{ color }}>{text}</Text>;
        },
      },
      statsGameSummary: { 
        title: 'Stats/Game Summary', 
        dataIndex: 'gameSummary', 
        key: 'statsGameSummary', 
        width: 200,
        ellipsis: true,
      },
      gameDate: { title: 'Game Date', dataIndex: 'date', key: 'gameDate', width: 70 },
      source: { 
        title: 'Source', 
        dataIndex: 'source', 
        key: 'source', 
        width: 60,
        render: (text: string, record: any) => {
          // TODO: DATABASE INTEGRATION
          // Parse PM (primary) and SS (secondary) source verification status
          // Background: red if neither verified, yellow if one verified, green if both verified
          // Example database fields: primary_source_verified, secondary_source_verified
          const hasPrimary = record?.sourceVerified?.primary || false;
          const hasSecondary = record?.sourceVerified?.secondary || false;
          let bgColor = '#fff5f5'; // red if neither
          
          if (hasPrimary && hasSecondary) {
            bgColor = '#f6ffed'; // green if both
          } else if (hasPrimary || hasSecondary) {
            bgColor = '#fffbe6'; // yellow if one
          }
          
          return (
            <span style={{ backgroundColor: bgColor, padding: '2px 4px', borderRadius: '2px' }}>
              PM SS
            </span>
          );
        },
      },
      winLoss: { title: 'W/L', dataIndex: 'record', key: 'winLoss', width: 80 },
      nextWeekOpponent: { title: 'Next Week Opponent', dataIndex: 'nextOpponent', key: 'nextWeekOpponent', width: 120 },
      nextWeekHomeAway: { title: 'Next Week H/A', dataIndex: 'nextHomeAway', key: 'nextWeekHomeAway', width: 70 },
      nextWeekDate: { title: 'Next Week Date', dataIndex: 'nextDate', key: 'nextWeekDate', width: 100 },
    };

    const mappedColumns = visibleColumns.map(col => columnMap[col.key]).filter(Boolean);
    // Add checkbox column at the start for date range view
    return [{ title: '', key: 'selection', width: 50 }, ...mappedColumns];
  };

  // Week View - Shows all players' games for the selected week
  if (viewType === 'weekView') {
    // Uses allColumns defined at the top of the component

    // TODO: DATABASE INTEGRATION
    // Filter game results by selected week
    // In production, query database for games in the selected week range
    
    // Mock data for Week View - all players with games for selected week
    const data = gameResults.map(game => {
      const player = players.find(p => p.id === game.playerId);
      const isWin = game.result === 'W';
      
      return {
        key: game.playerId + game.date,
        id: player?.id,
        recruitingCoach: player?.recruitingCoach,
        name: player?.name,
        year: player?.year,
        position: player?.position,
        rating: player?.rating || 'n/a',
        highSchoolName: player?.highSchool,
        stateAbbrev: player?.state,
        opponentDisplay: game.homeAway === 'A' ? `@ ${game.opponent}` : game.opponent,
        resultDisplay: `${game.result} ${game.score}`,
        isWin,
        result: game.result,
        gameSummary: game.gameSummary,
        date: game.date,
        sourceVerified: { primary: true, secondary: true }, // Mock - replace with database data
        seasonRecord: player?.record || '0W - 0L', // Season W/L record
        nextWeekOpponent: 'TBD', // TODO: Get from database
        nextWeekHomeAway: 'H', // TODO: Get from database
        nextWeekDate: '10/15', // TODO: Get from database
      };
    });

    return (
      <Table
        columns={allColumnsFromConfig}
        dataSource={data}
        pagination={false}
        scroll={{ x: 'max-content' }}
        size="small"
      />
    );
  }

  // Player View - Uses same column set as Week View, but shows single player
  if (viewType === 'player' && selectedPlayer) {
    const selectedPlayerData = players.find(p => p.id === selectedPlayer);
    let playerGames = gameResults.filter(g => g.playerId === selectedPlayer);
    
    // If a week is selected, filter games to that week
    if (selectedWeek) {
      // TODO: DATABASE INTEGRATION
      // Parse game dates and filter to selected week
      // This is a simplified filter - in production, you'd parse actual game dates
      // and filter to the week range
      playerGames = playerGames.filter(game => {
        // Mock: Return all games for now
        // In production, parse game.date and filter by week
        return true;
      });
    }
    
    // Use same column structure as Week View
    const data = playerGames.map(game => {
      const isWin = game.result === 'W';
      
      return {
        key: game.playerId + game.date,
        id: selectedPlayerData?.id,
        recruitingCoach: selectedPlayerData?.recruitingCoach,
        name: selectedPlayerData?.name,
        year: selectedPlayerData?.year,
        position: selectedPlayerData?.position,
        rating: selectedPlayerData?.rating || 'n/a',
        highSchoolName: selectedPlayerData?.highSchool,
        stateAbbrev: selectedPlayerData?.state,
        opponentDisplay: game.homeAway === 'A' ? `@ ${game.opponent}` : game.opponent,
        resultDisplay: `${game.result} ${game.score}`,
        isWin,
        result: game.result,
        gameSummary: game.gameSummary,
        date: game.date,
        sourceVerified: { primary: true, secondary: true }, // Mock - replace with database data
        seasonRecord: selectedPlayerData?.record || '0W - 0L', // Season W/L record
        nextWeekOpponent: 'TBD', // TODO: Get from database
        nextWeekHomeAway: 'H', // TODO: Get from database
        nextWeekDate: '10/15', // TODO: Get from database
      };
    });

    return (
      <Table
        columns={allColumnsFromConfig}
        dataSource={data}
        pagination={false}
        scroll={{ x: 'max-content' }}
        size="small"
      />
    );
  }

  // For Grid View, show players with fixed columns + scrolling weekly game data
  if (viewType === 'grid') {
    // Fixed columns that don't scroll (6 columns: RC, Name, Pos., Record, HS, Year)
    const fixedColumns = [
      { title: 'RC', dataIndex: 'recruitingCoach', key: 'recruitingCoach', width: 50, fixed: 'left' },
      {
        title: 'Player',
        dataIndex: 'name',
        key: 'name',
        width: 120,
        fixed: 'left',
        render: (text: string) => (
          <Text style={{ textDecoration: 'underline', cursor: 'pointer', color: '#1890ff' }}>
            {text}
          </Text>
        ),
      },
      { title: 'Pos.', dataIndex: 'position', key: 'position', width: 50, fixed: 'left' },
      {
        title: 'Record',
        dataIndex: 'record',
        key: 'record',
        width: 80,
        fixed: 'left',
        render: (text: string) => {
          const isWin = text?.includes('W');
          return <Text style={{ color: isWin ? '#52c41a' : '#ff4d4f' }}>{text}</Text>;
        },
      },
      { title: 'HS', dataIndex: 'highSchool', key: 'highSchool', width: 120, fixed: 'left' },
      { 
        title: 'Year', 
        dataIndex: 'year', 
        key: 'year', 
        width: 50, 
        fixed: 'left',
        className: 'last-frozen-column', // Add class for styling
      },
    ];
    
    // Add weekly scrolling columns
    const weekColumns = [];
    for (let i = 1; i <= 20; i++) { // Show 20 weeks for scrolling
      const weekStart = i;
      const weekEnd = i + 6;
      weekColumns.push({
        title: `9/${weekStart}-9/${weekEnd}`,
        dataIndex: `week_${i}`,
        key: `week_${i}`,
        width: 100,
        align: 'center' as const,
        render: (text: string) => {
          if (text) {
            let color = '#000';
            let bgColor = 'transparent';
            if (text.startsWith('W')) {
              color = '#52c41a'; // Green for win
              bgColor = 'rgba(82, 196, 26, 0.3)'; // Medium green background
            } else if (text.startsWith('L')) {
              color = '#ff4d4f'; // Red for loss
              bgColor = 'rgba(255, 77, 79, 0.3)'; // Medium red background
            }
            return (
              <div style={{
                backgroundColor: bgColor,
                padding: '2px 6px',
                borderRadius: '4px',
                display: 'inline-block'
              }}>
                <Text style={{ fontSize: '11px', color }}>{text}</Text>
              </div>
            );
          }
          return '-';
        },
      });
    }
    
    const columns = [...fixedColumns, ...weekColumns];
    
    const data = players.map(player => ({
      key: player.id,
      recruitingCoach: player.recruitingCoach,
      name: player.name,
      position: player.position,
      record: player.record,
      highSchool: player.highSchool,
      year: player.year,
      // Mock game data for grid view
      week_1: 'W 34-0 Jefferson Sat 9/6',
      week_2: 'W 28-14 Brighton Fri 9/13',
      week_3: 'L 7-21 Culver Fri 9/20',
      week_4: 'W 28-17 Mountain Vista Fri 9/26',
    }));

    return (
      <Table
        columns={columns as any}
        dataSource={data}
        pagination={false}
        scroll={{ x: 'max-content' }}
      />
    );
  }

  // For Date Range view, show all players with game data
  const data = players.map(player => ({
    key: player.id,
    recruitingCoach: player.recruitingCoach,
    name: player.name,
    year: player.year,
    position: player.position,
    rating: player.rating || 'n/a',
    record: player.record,
    highSchool: player.highSchool,
    state: player.state,
    phone: player.phone,
    opponent: gameResults.find(g => g.playerId === player.id)?.opponent,
    homeAway: gameResults.find(g => g.playerId === player.id)?.homeAway,
    result: gameResults.find(g => g.playerId === player.id)?.result,
    gameSummary: gameResults.find(g => g.playerId === player.id)?.gameSummary,
    date: gameResults.find(g => g.playerId === player.id)?.date,
    source: gameResults.find(g => g.playerId === player.id)?.source,
  }));

  return (
    <Table
      columns={generateColumns()}
      dataSource={data}
      pagination={false}
      scroll={{ x: 'max-content' }}
    />
  );
}

