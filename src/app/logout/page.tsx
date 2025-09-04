"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const performLogout = async () => {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error("Error logging out:", error);
        }
      } catch (err) {
        console.error("Unexpected error during logout:", err);
      } finally {
        // Redirect to login page regardless of success/failure
        router.push("/");
      }
    };

    performLogout();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-xl font-semibold mb-8">Logging out...</h1>
        <p>You will be redirected shortly.</p>
      </div>
    </div>
  );
} 