"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import MultipleContainers from "@/app/dndkit/presets/Sortable/MultipleContainers";
import { Flex, Typography, Spin, Alert, message, Button } from "antd";
import { fetchRecruitingBoardData, fetchRecruitingBoardPositions, createRecruitingBoardPosition, endRecruitingBoardPosition, updateRecruitingBoardRanks, endRecruitingBoardAthlete } from "@/lib/queries";
import { RecruitingBoardData, RecruitingBoardPosition } from "@/types/database";
import { fetchUserDetails } from "@/utils/utils";
import { useZoom } from "@/contexts/ZoomContext";
import { useCustomer } from "@/contexts/CustomerContext";

export default function RecruitingBoard() {
  const [data, setData] = useState<RecruitingBoardData[]>([]);
  const [positions, setPositions] = useState<RecruitingBoardPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [renderChunkSize, setRenderChunkSize] = useState(50); // Start with 50 athletes
  const [visibleData, setVisibleData] = useState<RecruitingBoardData[]>([]);
  
  // Source filter toggles
  const [sourceFilters, setSourceFilters] = useState({
    portal: true,
    juco: true,
    prePortal: true,
    highSchool: true
  });

  const { zoom } = useZoom();
  const { activeCustomerId, customers, userDetails: contextUserDetails, isReady: contextReady } = useCustomer();

  // Analyze data to determine which source types exist
  const sourceAnalysis = useMemo(() => {
    const sources = {
      portal: 0,
      juco: 0,
      prePortal: 0,
      highSchool: 0,
      none: 0
    };

    data.forEach(athlete => {
      if (athlete.source === 'portal') {
        sources.portal++;
      } else if (athlete.source === 'juco') {
        sources.juco++;
      } else if (athlete.source === 'pre-portal') {
        sources.prePortal++;
      } else if (athlete.source === 'high_school') {
        sources.highSchool++;
      } else {
        sources.none++;
      }
    });

    const totalSourceTypes = [sources.portal, sources.juco, sources.prePortal, sources.highSchool].filter(count => count > 0).length;
    
    return {
      counts: sources,
      hasMultipleSourceTypes: totalSourceTypes > 1,
      availableSources: {
        portal: sources.portal > 0,
        juco: sources.juco > 0,
        prePortal: sources.prePortal > 0,
        highSchool: sources.highSchool > 0
      }
    };
  }, [data]);

  // Filter data based on source toggles
  const filteredData = useMemo(() => {
    return data.filter(athlete => {
      if (athlete.source === 'portal') {
        return sourceFilters.portal;
      } else if (athlete.source === 'juco') {
        return sourceFilters.juco;
      } else if (athlete.source === 'pre-portal') {
        return sourceFilters.prePortal;
      } else if (athlete.source === 'high_school') {
        return sourceFilters.highSchool;
      } else {
        // For athletes with no source, show them by default
        return true;
      }
    });
  }, [data, sourceFilters]);

  const loadData = useCallback(async () => {
    // Don't proceed if CustomerContext is not ready
    if (!contextReady || !contextUserDetails) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      if (contextUserDetails?.customer_id) {
        setCustomerId(contextUserDetails.customer_id);
        
        // Get the active customer's sport ID
        const activeCustomer = customers?.find(c => c.customer_id === activeCustomerId);
        const activeSportId = activeCustomer?.sport_id;
        
        // Make position and recruiting board data calls in parallel
        const [positionData, recruitingBoardData] = await Promise.all([
          fetchRecruitingBoardPositions(contextUserDetails.customer_id),
          fetchRecruitingBoardData(activeSportId, contextUserDetails)
        ]);
        
        setPositions(positionData);
        setData(recruitingBoardData);
      }
      
    } catch (err) {
      console.error('Error loading recruiting board data:', err);
      setError('Failed to load recruiting board data');
    } finally {
      setLoading(false);
    }
  }, [contextReady, contextUserDetails, customers, activeCustomerId]);



  const handleRankUpdate = async (updates: { athleteId: string; rank: number; position?: string }[]) => {
    if (!customerId) return;
    
    try {
      await updateRecruitingBoardRanks(customerId, updates);
      // Optionally reload data to reflect changes
      // loadData();
    } catch (err) {
      console.error('Error updating ranks:', err);
      message.error('Failed to update athlete ranks');
    }
  };

  const handlePositionDelete = useCallback(async (positionName: string) => {
    if (!customerId) return;
    
    try {
      await endRecruitingBoardPosition(customerId, positionName);
      message.success('Position deleted successfully');
      loadData(); // Reload data to get updated positions
    } catch (err) {
      console.error('Error deleting position:', err);
      message.error('Failed to delete position');
    }
  }, [customerId, loadData]);

  const handlePositionCreate = useCallback(async (positionName: string) => {
    if (!customerId) return;
    
    try {
      await createRecruitingBoardPosition(customerId, positionName);
      message.success('Position created successfully');
      loadData(); // Reload data to get updated positions
    } catch (err) {
      console.error('Error creating position:', err);
      message.error('Failed to create position');
    }
  }, [customerId, loadData]);

  const handleRemoveFromBoard = useCallback(async (recruitingBoardId: string, athleteName: string) => {
    try {
      await endRecruitingBoardAthlete(recruitingBoardId);
      message.success(`${athleteName} removed from recruiting board`);
      loadData(); // Reload data to reflect changes
    } catch (err) {
      console.error('Error removing athlete from board:', err);
      message.error('Failed to remove athlete from recruiting board');
    }
  }, [loadData]);

  useEffect(() => {
    // Only load data when CustomerContext is ready
    if (contextReady) {
      loadData();
    }
  }, [loadData, contextReady]);

  // Progressive rendering effect for large datasets using filtered data
  useEffect(() => {
    if (filteredData.length > 50 && visibleData.length < filteredData.length) {
      const timer = setTimeout(() => {
        const nextChunkSize = Math.min(visibleData.length + 25, filteredData.length);
        const nextVisibleData = filteredData.slice(0, nextChunkSize);
        setVisibleData(nextVisibleData);
      }, 50); // Small delay to prevent blocking
      
      return () => clearTimeout(timer);
    } else if (filteredData.length <= 50) {
      setVisibleData(filteredData);
    }
  }, [filteredData, visibleData]);

  // Reset visible data when filters change
  useEffect(() => {
    if (filteredData.length <= 50) {
      setVisibleData(filteredData);
    } else {
      setVisibleData(filteredData.slice(0, renderChunkSize));
    }
  }, [sourceFilters]);

  if (loading) {
    return (
      <div className="main-container">
        <div className="flex items-center justify-center h-[calc(100vh-155px)]">
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="main-container">
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      </div>
    );
  }

  return (
    <div className="main-container">
      <Flex className="card mb-4 items-center justify-between">

        <Flex>
          <Typography.Paragraph
            style={{ marginBottom: 0 }}
            className="flex items-center justify-center mr-6"
          >
            <span className="bg-[#7363BC] w-[20px] h-[20px] flex mr-2"></span>
            Tier 1
          </Typography.Paragraph>

          <Typography.Paragraph
            style={{ marginBottom: 0 }}
            className="flex items-center justify-between mr-6"
          >
            <span className="bg-[#36C5F0] w-[20px] h-[20px] flex mr-2"></span>
            Tier 2
          </Typography.Paragraph>

          <Typography.Paragraph
            style={{ marginBottom: 0 }}
            className="flex items-center justify-center mr-6"
          >
            <span className="bg-[#FF24BA] w-[20px] h-[20px] flex mr-2"></span>
            Tier 3
          </Typography.Paragraph>

          {sourceAnalysis.availableSources.juco && (
            <Typography.Paragraph
              style={{ marginBottom: 0 }}
              className="flex items-center justify-center mr-6"
            >
              <span className="w-[20px] h-[20px] flex mr-2" style={{ backgroundColor: 'rgba(135, 206, 250, 0.15)', border: '1px solid rgba(135, 206, 250, 0.5)' }}></span>
              JUCO
            </Typography.Paragraph>
          )}

          {sourceAnalysis.availableSources.prePortal && (
            <Typography.Paragraph
              style={{ marginBottom: 0 }}
              className="flex items-center justify-center mr-6"
            >
              <span className="w-[20px] h-[20px] flex mr-2" style={{ backgroundColor: 'rgba(255, 165, 0, 0.15)', border: '1px solid rgba(255, 165, 0, 0.5)' }}></span>
              Pre-Portal
            </Typography.Paragraph>
          )}

          {sourceAnalysis.availableSources.portal && (
            <Typography.Paragraph
              style={{ marginBottom: 0 }}
              className="flex items-center justify-center mr-6"
            >
              <span className="w-[20px] h-[20px] flex mr-2" style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', border: '1px solid rgba(0, 0, 0, 0.2)' }}></span>
              Portal
            </Typography.Paragraph>
          )}

          {sourceAnalysis.availableSources.highSchool && (
            <Typography.Paragraph
              style={{ marginBottom: 0 }}
              className="flex items-center justify-center mr-6"
            >
              <span className="w-[20px] h-[20px] flex mr-2" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.5)' }}></span>
              High School
            </Typography.Paragraph>
          )}
        </Flex>

        {/* Source Filter Toggles - only show if there are multiple source types */}
        {sourceAnalysis.hasMultipleSourceTypes && (
          <Flex gap={8}>
            {sourceAnalysis.availableSources.portal && (
              <Button
                size="small"
                type={sourceFilters.portal ? "primary" : "default"}
                onClick={() => setSourceFilters(prev => ({ ...prev, portal: !prev.portal }))}
                style={{
                  fontSize: '11px',
                  height: '24px',
                  padding: '0 8px',
                  borderRadius: '12px',
                  border: sourceFilters.portal ? 'none' : '1px solid #d9d9d9',
                  backgroundColor: sourceFilters.portal ? '#1890ff' : '#fff',
                  color: sourceFilters.portal ? '#fff' : '#666'
                }}
              >
                Portal
              </Button>
            )}
            {sourceAnalysis.availableSources.juco && (
              <Button
                size="small"
                type={sourceFilters.juco ? "primary" : "default"}
                onClick={() => setSourceFilters(prev => ({ ...prev, juco: !prev.juco }))}
                style={{
                  fontSize: '11px',
                  height: '24px',
                  padding: '0 8px',
                  borderRadius: '12px',
                  border: sourceFilters.juco ? 'none' : '1px solid #d9d9d9',
                  backgroundColor: sourceFilters.juco ? '#1890ff' : '#fff',
                  color: sourceFilters.juco ? '#fff' : '#666'
                }}
              >
                JUCO
              </Button>
            )}
            {sourceAnalysis.availableSources.prePortal && (
              <Button
                size="small"
                type={sourceFilters.prePortal ? "primary" : "default"}
                onClick={() => setSourceFilters(prev => ({ ...prev, prePortal: !prev.prePortal }))}
                style={{
                  fontSize: '11px',
                  height: '24px',
                  padding: '0 8px',
                  borderRadius: '12px',
                  border: sourceFilters.prePortal ? 'none' : '1px solid #d9d9d9',
                  backgroundColor: sourceFilters.prePortal ? '#1890ff' : '#fff',
                  color: sourceFilters.prePortal ? '#fff' : '#666'
                }}
              >
                Pre-Portal
              </Button>
            )}
            {sourceAnalysis.availableSources.highSchool && (
              <Button
                size="small"
                type={sourceFilters.highSchool ? "primary" : "default"}
                onClick={() => setSourceFilters(prev => ({ ...prev, highSchool: !prev.highSchool }))}
                style={{
                  fontSize: '11px',
                  height: '24px',
                  padding: '0 8px',
                  borderRadius: '12px',
                  border: sourceFilters.highSchool ? 'none' : '1px solid #d9d9d9',
                  backgroundColor: sourceFilters.highSchool ? '#1890ff' : '#fff',
                  color: sourceFilters.highSchool ? '#fff' : '#666'
                }}
              >
                High School
              </Button>
            )}
          </Flex>
        )}
      </Flex>
      <div className="w-[100%] overflow-auto h-[calc(100vh-155px)]">
        <div 
          className="flex"
          style={{ 
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top left',
            paddingBottom: zoom > 100 ? '2rem' : '0',
            paddingRight: zoom > 100 ? '5%' : '0',
            minHeight: zoom > 100 ? `${zoom}vh` : 'auto',
            width: zoom > 100 ? `${Math.max(zoom, 120)}%` : '100%',
            marginBottom: zoom > 100 ? '4rem' : '0'
          }}
        >
          {visibleData.length > 0 ? (
            <div>
              <MultipleContainers 
                data={visibleData} 
                handle={true} 
                refreshCallback={loadData}
                positionConfig={positions}
                onRankUpdate={handleRankUpdate}
                onPositionDelete={handlePositionDelete}
                onPositionCreate={handlePositionCreate}
                onRemoveFromBoard={handleRemoveFromBoard}
              />
              {data.length > visibleData.length && (
                <div className="text-center p-4 text-gray-500">
                  Loading more athletes... ({visibleData.length}/{data.length})
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center w-full h-full">
              <Typography.Text type="secondary">
                No athletes in your recruiting board. Add athletes from the transfers page to get started.
              </Typography.Text>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
