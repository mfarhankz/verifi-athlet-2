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

const { Header, Sider, Content } = Layout;

const headerStyle: React.CSSProperties = {

};

const contentStyle: React.CSSProperties = {
  textAlign: "center",
  color: "var(--foreground)",
  backgroundColor: "var(--background)",
};

const siderStyle: React.CSSProperties = {
  textAlign: "center",
  lineHeight: "16px",
  color: "var(--text-white)",
  backgroundColor: "var(--bg-primary)",
};

const layoutStyle = {
  overflow: "hidden",
  height: "100vh",
};

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <AuthProtection>
      <Flex gap="middle" wrap>
        <Layout style={layoutStyle}>
          <Header >
            <Navbar/>
          </Header>
          <Layout>
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
            <Content style={contentStyle}>
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