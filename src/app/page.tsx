"use client";

import { Button, ConfigProvider, Flex, Layout, Space, Spin } from "antd";
import { createStyles } from "antd-style";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { handleAuthRedirect } from "@/utils/navigationUtils";
import Login from "@/components/login";

const useStyle = createStyles(({ prefixCls, css }) => ({
  linearGradientButton: css`
    &.${prefixCls}-btn-primary:not([disabled]):not(
        .${prefixCls}-btn-dangerous
      ) {
      border-width: 0;

      > span {
        position: relative;
      }

      &::before {
        content: "";
        background: linear-gradient(135deg, #6253e1, #04befe);
        position: absolute;
        inset: 0;
        opacity: 1;
        transition: all 0.3s;
        border-radius: inherit;
      }

      &:hover::before {
        opacity: 0;
      }
    }
  `,
}));

const layoutStyle = {
  overflow: "hidden",
  height: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
};

export default function Home() {
  const { styles } = useStyle();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is already authenticated and redirect if needed
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        
        if (data.session) {
          // User is authenticated, handle redirect
          setIsAuthenticated(true);
          await handleAuthRedirect(router);
        } else {
          // User is not authenticated, show login form
          setIsAuthenticated(false);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error checking authentication:", error);
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // Handle successful login
  const handleLoginSuccess = async (userId: string) => {
    setLoading(true);
    await handleAuthRedirect(router);
  };

  if (loading) {
    return (
      <Layout style={layoutStyle}>
        <Spin tip="Loading..." fullscreen>
          <div className="content-placeholder" />
        </Spin>
      </Layout>
    );
  }

  return (
    <Layout style={layoutStyle}>
      <ConfigProvider
        button={{
          className: styles.linearGradientButton,
        }}
      >
        <Space direction="vertical" align="center" size="large">
          <h1>Welcome to Verified Athletics</h1>
          <Login onLoginSuccess={handleLoginSuccess} />
        </Space>
      </ConfigProvider>
    </Layout>
  );
}
