'use client';

import { useEffect, useRef, useState } from 'react';

interface TwitterEmbedProps {
  twitterHandle: string;
}

export default function TwitterEmbed({ twitterHandle }: TwitterEmbedProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [embedSuccess, setEmbedSuccess] = useState(false);
  const [embedFailed, setEmbedFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!twitterHandle) {
      setIsLoading(false);
      return;
    }

    // Function to load Twitter widgets
    const loadTwitterWidgets = () => {
      if (window.twttr) {
        window.twttr.widgets.load(containerRef.current);
        
        // Check for widget loading with multiple attempts
        let attempts = 0;
        const maxAttempts = 8;
        const checkInterval = setInterval(() => {
          attempts++;
          const iframe = containerRef.current?.querySelector('iframe');
          
          if (iframe) {
            console.log('Twitter embed successful!');
            setEmbedSuccess(true);
            setIsLoading(false);
            clearInterval(checkInterval);
          } else if (attempts >= maxAttempts) {
            console.log('Twitter embed failed, showing fallback');
            setEmbedFailed(true);
            setIsLoading(false);
            clearInterval(checkInterval);
          }
        }, 1000);
      } else {
        setEmbedFailed(true);
        setIsLoading(false);
      }
    };

    // Function to handle Twitter widget errors
    const handleTwitterError = () => {
      setEmbedFailed(true);
      setIsLoading(false);
    };

    // Check if Twitter widget script is already loaded
    if (window.twttr) {
      loadTwitterWidgets();
    } else {
      // Create a script element for Twitter widgets
      const script = document.createElement('script');
      script.src = 'https://platform.twitter.com/widgets.js';
      script.async = true;
      script.charset = 'utf-8';
      
      // Add event listeners
      script.onload = loadTwitterWidgets;
      script.onerror = handleTwitterError;
      
      // Append script to document
      document.body.appendChild(script);
      
      // Set a timeout to handle cases where the script loads but widgets fail
      const timeoutId = setTimeout(() => {
        if (isLoading) {
          handleTwitterError();
        }
      }, 12000); // 12 seconds timeout
      
      // Cleanup function
      return () => {
        clearTimeout(timeoutId);
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };
    }
  }, [twitterHandle, isLoading]);

  // If no Twitter handle provided
  if (!twitterHandle) {
    return (
      <div className="twitter-embed-container">
        <div className="twitter-timeline-container">
          <div className="p-4 text-center">
            <p className="text-gray-500">No Twitter Account Available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="twitter-embed-container" ref={containerRef}>
      <div className="twitter-timeline-container">
        {isLoading && (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2">Loading X feed...</span>
          </div>
        )}
        
        {embedSuccess && (
          <div className="twitter-timeline-wrapper">
            <a 
              className="twitter-timeline" 
              data-height="500" 
              data-theme="light"
              data-chrome="noheader nofooter noborders transparent"
              href={`https://twitter.com/${twitterHandle}`}
            >
              Loading tweets...
            </a>
          </div>
        )}
        
        {embedFailed && (
          <div className="twitter-feed-card">
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">@{twitterHandle}</h3>
                <p className="text-base text-gray-700 mt-2 font-medium">X.com is being annoying about embedding this profile</p>
              </div>
              
              <a 
                href={`https://x.com/${twitterHandle}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-full px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                View Profile on X
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Add TypeScript declaration for the Twitter widget
declare global {
  interface Window {
    twttr: any;
  }
} 