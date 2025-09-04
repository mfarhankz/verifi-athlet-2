'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    $crisp: any[];
    CRISP_WEBSITE_ID: string;
  }
}

export default function CrispChat() {
  useEffect(() => {
    // Initialize Crisp with your actual website ID
    window.$crisp = [];
    window.CRISP_WEBSITE_ID = "cb4778c4-6416-49d7-95c6-27090123c8e3";

    // Create and append the script exactly as provided by Crisp
    const d = document;
    const s = d.createElement("script");
    s.src = "https://client.crisp.chat/l.js";
    s.async = true;
    d.getElementsByTagName("head")[0].appendChild(s);

    // Cleanup function
    return () => {
      // Remove the script when component unmounts
      const existingScript = document.querySelector('script[src="https://client.crisp.chat/l.js"]');
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, []);

  return null; // This component doesn't render anything visible
} 