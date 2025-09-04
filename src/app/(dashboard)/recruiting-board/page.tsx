"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import MultipleContainers from "@/app/dndkit/presets/Sortable/MultipleContainers";
import { Flex, Typography, Spin, Alert, message } from "antd";
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

  const { zoom } = useZoom();
  const { activeCustomerId, customers, userDetails: contextUserDetails, isReady: contextReady } = useCustomer();

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
        
        // Start with progressive rendering for large datasets
        if (recruitingBoardData.length > 50) {
          setVisibleData(recruitingBoardData.slice(0, renderChunkSize));
        } else {
          setVisibleData(recruitingBoardData);
        }
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

  // Progressive rendering effect for large datasets
  useEffect(() => {
    if (data.length > 50 && visibleData.length < data.length) {
      const timer = setTimeout(() => {
        const nextChunkSize = Math.min(visibleData.length + 25, data.length);
        const nextVisibleData = data.slice(0, nextChunkSize);
        setVisibleData(nextVisibleData);
      }, 50); // Small delay to prevent blocking
      
      return () => clearTimeout(timer);
    }
  }, [data, visibleData]);

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
            className="flex items-center justify-center"
          >
            <span className="bg-[#FF24BA] w-[20px] h-[20px] flex mr-2"></span>
            Tier 3
          </Typography.Paragraph>
        </Flex>
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
