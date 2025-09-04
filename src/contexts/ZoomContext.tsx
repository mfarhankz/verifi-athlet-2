"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ZoomContextType {
  zoom: number;
  setZoom: (zoom: number) => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  resetZoom: () => void;
}

const ZoomContext = createContext<ZoomContextType | undefined>(undefined);

export const useZoom = () => {
  const context = useContext(ZoomContext);
  if (!context) {
    throw new Error('useZoom must be used within a ZoomProvider');
  }
  return context;
};

export const ZoomProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [zoom, setZoom] = useState(100);

  const handleZoomIn = () => {
    setZoom(prevZoom => Math.min(prevZoom + 10, 200));
  };

  const handleZoomOut = () => {
    setZoom(prevZoom => Math.max(prevZoom - 10, 20));
  };

  const resetZoom = () => {
    setZoom(100);
  };

  const value = {
    zoom,
    setZoom,
    handleZoomIn,
    handleZoomOut,
    resetZoom
  };

  return (
    <ZoomContext.Provider value={value}>
      {children}
    </ZoomContext.Provider>
  );
}; 