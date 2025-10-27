"use client";

import { Flex, Layout } from "antd";
import Navbar from "@/app/(dashboard)/_components/Navbar";
import Sidebar from "@/app/(dashboard)/_components/Sidebar";
import { SearchProvider } from './_components/SearchContext';
import { SidebarProvider } from './_components/SidebarContext';
import { useSidebar } from './_components/SidebarContext';
import { CustomerProvider } from "@/contexts/CustomerContext";
import { ColorConfigProvider } from "@/contexts/ColorConfigContext";
import { ZoomProvider } from "@/contexts/ZoomContext";
import AuthProtection from "@/components/AuthProtection";
import { useState, useEffect } from 'react';

const { Header, Sider, Content } = Layout;

const headerStyle: React.CSSProperties = {

};

const getContentStyle = (collapsed: boolean): React.CSSProperties => ({
  textAlign: "center",
  color: "var(--foreground)",
  backgroundColor: "var(--background)",
  marginLeft: collapsed ? "50px" : "209px", // Adjust based on sidebar state
  overflowY: "auto",
  height: "calc(100vh - 64px)", // Subtract header height
  padding: "20px",
  transition: "margin-left 0.2s",
});

const siderStyle: React.CSSProperties = {
  textAlign: "center",
  lineHeight: "16px",
  color: "var(--text-white)",
  backgroundColor: "var(--bg-primary)",
  height: "100vh",
  position: "fixed",
  left: 0,
  overflowY: "auto",
};

const layoutStyle = {
  overflow: "hidden",
  height: "100vh",
};

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { collapsed, isMobileOpen } = useSidebar();
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
    <AuthProtection>
      <Flex gap="middle" wrap>
        <Layout style={layoutStyle}>
          <Header >
            <Navbar/>
          </Header>
          <Layout>
            {/* Desktop sidebar */}
            {!isMobile && (
              <Sider 
                width="209px" 
                collapsible
                collapsed={collapsed}
                trigger={null}
                collapsedWidth={50}
                style={siderStyle}
              >
                <Sidebar/>
              </Sider>
            )}
            
            {/* Mobile sidebar overlay */}
            {isMobile && isMobileOpen && (
              <div 
                className="mobile-sidebar-overlay"
                style={{
                  position: 'fixed',
                  top: 50, /* Start from the very top */
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'var(--bg-primary)',
                  zIndex: 9999,
                  overflow: 'auto',
                  paddingTop: '64px' /* Add padding to push content below navbar */
                }}
              >
                <Sidebar/>
              </div>
            )}
            
            <Content style={getContentStyle(collapsed)}>
              {children}
            </Content>
          </Layout>
        </Layout>
      </Flex>
    </AuthProtection>
  );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <SearchProvider>
      <SidebarProvider>
        <CustomerProvider>
          <ColorConfigProvider>
            <ZoomProvider>
              <DashboardLayout>
                {children}
              </DashboardLayout>
            </ZoomProvider>
          </ColorConfigProvider>
        </CustomerProvider>
      </SidebarProvider>
    </SearchProvider>
  );
}