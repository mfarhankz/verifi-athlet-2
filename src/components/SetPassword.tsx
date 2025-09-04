"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import styles from "./SetPassword.module.css";

const SetPassword: React.FC = () => {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const token = query.get("access_token");

    // if (token) {
    //   setAccessToken(token);
    //   supabase.auth.setSession(token)
    //     .then(({ error }) => {
    //       if (error) {
    //         setMessage(`Error setting session: ${error.message}`);
    //       }
    //     });
    // } else {
    //   setMessage("Invalid or expired token.");
    // }
  }, []);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) {
      setMessage("Missing access token.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage(`Error updating password: ${error.message}`);
    } else {
      setMessage("Password has been set successfully.");
      // Redirect to homepage after successful password reset
      setTimeout(() => {
        router.push("/");
      }, 2000); // Redirect after 2 seconds to allow the user to see the success message
    }
  };

  return (
    <div className={styles.setPassword}>
      <h2>Set Password</h2>
      {message && <p>{message}</p>}
      <form onSubmit={handleSetPassword}>
        <input
          type="password"
          placeholder="New Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Confirm New Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <button type="submit">Set Password</button>
      </form>
    </div>
  );
};

export default SetPassword;
