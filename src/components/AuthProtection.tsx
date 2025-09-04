"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Session } from '@supabase/auth-helpers-nextjs';

interface AuthProtectionProps {
  children: React.ReactNode;
}

const AuthProtection: React.FC<AuthProtectionProps> = ({ children }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      // Wait for Supabase to load session from storage
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      setSession(data.session);
      setLoading(false);
    };

    checkAuth();

    const timeoutId = setTimeout(() => {
      if (!session && !loading) {
        router.push("/login");
      }
    }, 500); // Add a small delay before redirecting to avoid "eager" kicks

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event: string, session: Session | null) => {
        setSession(session);
        setLoading(false);
        if (!session) {
          router.push("/login");
        }
      }
    );

    return () => {
      isMounted = false;
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
      clearTimeout(timeoutId);
    };
  }, [router, session, loading]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        Loading...
      </div>
    );
  }

  // If session is null after loading, don't render children (redirect will happen)
  if (!session) {
    return null;
  }

  return <>{children}</>;
};

export default AuthProtection; 