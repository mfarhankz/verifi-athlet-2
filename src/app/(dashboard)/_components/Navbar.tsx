"use client";

import type { MenuProps } from "antd";
import { Input, Dropdown, Typography, Avatar, Flex, Button, Image } from "antd";
import Link from 'next/link'
import { useSidebar } from './SidebarContext';
import { MenuFoldOutlined, MenuUnfoldOutlined, MenuOutlined } from '@ant-design/icons';
import CustomerSelector from './CustomerSelector';
import { useZoom } from '@/contexts/ZoomContext';
import { useState, useEffect } from 'react';

const { Paragraph } = Typography;

const items: MenuProps["items"] = [
  // {
  //   key: "1",
  //   label: <Link href="/survey">Survey</Link>,
  // },
  {
    key: "3",
    label: <Link href="/settings">Settings</Link>,
  },
  {
    key: "4",
    label: <Link href="/logout">Logout</Link>,
  },
];

const { Search } = Input;

export default function Navbar() {
  const { collapsed, toggleCollapsed, currentMenuTitle, toggleMobileOpen } = useSidebar();
  const { handleZoomIn, handleZoomOut } = useZoom();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <Flex align="center" justify="space-between" className="navbar">
      {/* Desktop sidebar toggle */}
      {!isMobile && (
        <Button 
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={toggleCollapsed}
          style={{ fontSize: '16px', marginRight: '10px' }}
        />
      )}

      {/* Mobile sidebar toggle - top left */}
      {isMobile && (
        <Button 
          type="text"
          icon={<MenuOutlined />}
          onClick={toggleMobileOpen}
          style={{ fontSize: '16px', marginRight: '10px' }}
        />
      )}

      {/* Screen title - hidden on mobile */}
      {!isMobile && (
        <Paragraph style={{ margin: "0" }} className="player-list">
          <span>{currentMenuTitle}</span>
        </Paragraph>
      )}

      <div style={{ flex: 1 }} />

      <Image
        src="/Verified Athletics Logo.png"
        alt="Verified Athletics Logo"
        preview={false}
        style={{
          height: "30px",
          width: "auto",
          maxWidth: "100%",
          display: "block"
        }}
      />

      <div style={{ flex: 1 }} />

      {/* Zoom controls */}
      <div className="flex items-center space-x-2 mr-4">
        <button 
          className="glass" 
          onClick={handleZoomOut}
          title="Zoom Out"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM7 10h4" />
          </svg>
        </button>
        <button 
          className="glass" 
          onClick={handleZoomIn}
          title="Zoom In"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
          </svg>
        </button>
      </div>

      {/* Customer selector dropdown */}
      <CustomerSelector />

      <Dropdown
        menu={{
          items,
          selectable: true,
          defaultSelectedKeys: ["3"],
        }}
      >
        <Typography.Link style={{ marginLeft: "15px" }}>
          <i className="icon-arrow-down-1"></i>
        </Typography.Link>
      </Dropdown>
    </Flex>
  );
}