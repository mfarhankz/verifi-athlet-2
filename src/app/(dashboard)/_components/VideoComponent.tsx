"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { AthleteData, AthleteVideo } from "@/types/database";
import { fetchAthleteVideos } from "@/lib/queries";
import { getCachedSignedUrl, needsSigning } from "@/lib/cloudfrontUtils";

// Lazy-load hls.js only if needed (m3u8 on non-Safari)
let HlsLib: any = null;
async function ensureHls() {
  if (HlsLib) return HlsLib;
  const mod = await import("hls.js");
  HlsLib = mod.default;
  return HlsLib;
}

const playbackRates = [0.25, 0.5, 1, 1.5, 2];

const VideoComponent = ({ athlete }: { athlete: AthleteData | null }) => {
  const [videosList, setVideosList] = useState<AthleteVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<AthleteVideo | null>(null);
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
  const [selectedVideoOrder, setSelectedVideoOrder] = useState<string[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  
  // Video player refs and state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<any>(null);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [showShortcuts, setShowShortcuts] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [signedUrls, setSignedUrls] = useState<Map<string, string>>(new Map());

  // Generate signed URLs for videos
  const generateSignedUrlsForVideos = async (videos: AthleteVideo[]) => {
    console.log('🎬 Generating signed URLs for videos:', videos.length);
    const urlMap = new Map<string, string>();
    
    for (const video of videos) {
      console.log(`🔍 Processing video ${video.id}: ${video.video_link}`);
      
      if (needsSigning(video.video_link)) {
        console.log(`✅ Video ${video.id} needs signing, generating signed URL...`);
        try {
          const signedUrl = await getCachedSignedUrl(video.video_link);
          console.log(`🔑 Generated signed URL for ${video.id}: ${signedUrl.substring(0, 100)}...`);
          urlMap.set(video.id, signedUrl);
        } catch (error) {
          console.warn(`❌ Failed to generate signed URL for video ${video.id}:`, error);
          // Use original URL as fallback
          urlMap.set(video.id, video.video_link);
        }
      } else {
        console.log(`⚠️ Video ${video.id} doesn't need signing, using original URL`);
        // Use original URL if it doesn't need signing
        urlMap.set(video.id, video.video_link);
      }
    }
    
    console.log('📋 Final URL map:', Array.from(urlMap.entries()));
    return urlMap;
  };

  // Fetch athlete videos from database
  useEffect(() => {
    const loadAthleteVideos = async () => {
      if (!athlete?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const videos = await fetchAthleteVideos(athlete.id);
        setVideosList(videos);
        
        // Generate signed URLs for videos that need them
        const signedUrlMap = await generateSignedUrlsForVideos(videos);
        setSignedUrls(signedUrlMap);
      } catch (error) {
        console.error('Error loading athlete videos:', error);
        setVideosList([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadAthleteVideos();
  }, [athlete?.id]);

  // Attach video source with HLS support
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedVideo) return;

    // Cleanup previous hls instance if any
    if (hlsRef.current) {
      hlsRef.current.destroy?.();
      hlsRef.current = null;
    }

    // Get the signed URL for this video, fallback to original if not available
    const videoUrl = signedUrls.get(selectedVideo.id) || selectedVideo.video_link;
    const isM3U8 = videoUrl.toLowerCase().includes(".m3u8");
    const canNativeHls = !!video.canPlayType("application/vnd.apple.mpegurl");

    const attach = async () => {
      if (isM3U8 && !canNativeHls) {
        // Use hls.js
        const Hls = await ensureHls();
        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
          });
          hlsRef.current = hls;
          hls.attachMedia(video);
          hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(videoUrl));
        } else {
          // Fallback: try setting src directly
          video.src = videoUrl;
        }
      } else {
        // MP4 or Safari HLS
        video.src = videoUrl;
      }
    };

    attach().then(() => {
      if (isPlaying) {
        video.play().catch(() => {/* user gesture required on some browsers */});
      }
    });

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy?.();
        hlsRef.current = null;
      }
    };
  }, [selectedVideo, isPlaying, signedUrls]);

  // Handle playback rate changes without restarting video
  useEffect(() => {
    const video = videoRef.current;
    if (video && selectedVideo) {
      video.playbackRate = playbackRate;
    }
  }, [playbackRate, selectedVideo]);

  // Clear selected video when no videos are selected
  useEffect(() => {
    const selectedVideos = getSelectedVideos();
    if (selectedVideos.length === 0) {
      setSelectedVideo(null);
      setIsPlaying(false);
    }
  }, [selectedVideoIds]);

  // Update selected video when currentVideoIndex changes
  useEffect(() => {
    const selectedVideos = getSelectedVideos();
    if (selectedVideos.length > 0 && currentVideoIndex < selectedVideos.length) {
      setSelectedVideo(selectedVideos[currentVideoIndex]);
    }
  }, [currentVideoIndex, selectedVideoIds]);

  const [checked, setChecked] = useState([false, false, false]);
  const toggle = (idx: number) => {
    setChecked((prev) => prev.map((val, i) => (i === idx ? !val : val)));
  };

  // Handle selecting/deselecting videos from grid squares
  const toggleVideoSelection = (videoType: string, event: string) => {
    const videosForCrossSection = getVideosForCrossSection(videoType, event);
    const allSelected = videosForCrossSection.every(video => selectedVideoIds.has(video.id));
    
    if (allSelected) {
      // Deselect all videos in this cross-section
      setSelectedVideoIds(prev => {
        const newSet = new Set(prev);
        videosForCrossSection.forEach(video => newSet.delete(video.id));
        return newSet;
      });
      // Remove from order and renumber remaining videos
      setSelectedVideoOrder(prev => {
        const newOrder = prev.filter(id => !videosForCrossSection.some(video => video.id === id));
        return newOrder;
      });
    } else {
      // Select all videos in this cross-section
      setSelectedVideoIds(prev => {
        const newSet = new Set(prev);
        videosForCrossSection.forEach(video => newSet.add(video.id));
        return newSet;
      });
      // Add to end of order
      setSelectedVideoOrder(prev => {
        const newOrder = [...prev];
        videosForCrossSection.forEach(video => {
          if (!newOrder.includes(video.id)) {
            newOrder.push(video.id);
          }
        });
        return newOrder;
      });
    }
  };

  // Handle selecting/deselecting all videos in a row (event)
  const toggleRowSelection = (event: string) => {
    const videosInRow = videosList.filter(video => video.event === event);
    const allSelected = videosInRow.every(video => selectedVideoIds.has(video.id));
    
    if (allSelected) {
      // Deselect all videos in this row
      setSelectedVideoIds(prev => {
        const newSet = new Set(prev);
        videosInRow.forEach(video => newSet.delete(video.id));
        return newSet;
      });
      setSelectedVideoOrder(prev => {
        const newOrder = prev.filter(id => !videosInRow.some(video => video.id === id));
        return newOrder;
      });
    } else {
      // Select all videos in this row
      setSelectedVideoIds(prev => {
        const newSet = new Set(prev);
        videosInRow.forEach(video => newSet.add(video.id));
        return newSet;
      });
      setSelectedVideoOrder(prev => {
        const newOrder = [...prev];
        videosInRow.forEach(video => {
          if (!newOrder.includes(video.id)) {
            newOrder.push(video.id);
          }
        });
        return newOrder;
      });
    }
  };

  // Handle selecting/deselecting all videos in a column (video type)
  const toggleColumnSelection = (videoType: string) => {
    const videosInColumn = videosList.filter(video => video.video_type === videoType);
    const allSelected = videosInColumn.every(video => selectedVideoIds.has(video.id));
    
    if (allSelected) {
      // Deselect all videos in this column
      setSelectedVideoIds(prev => {
        const newSet = new Set(prev);
        videosInColumn.forEach(video => newSet.delete(video.id));
        return newSet;
      });
      setSelectedVideoOrder(prev => {
        const newOrder = prev.filter(id => !videosInColumn.some(video => video.id === id));
        return newOrder;
      });
    } else {
      // Select all videos in this column
      setSelectedVideoIds(prev => {
        const newSet = new Set(prev);
        videosInColumn.forEach(video => newSet.add(video.id));
        return newSet;
      });
      setSelectedVideoOrder(prev => {
        const newOrder = [...prev];
        videosInColumn.forEach(video => {
          if (!newOrder.includes(video.id)) {
            newOrder.push(video.id);
          }
        });
        return newOrder;
      });
    }
  };

  // Get selected videos for display in the video list (in selection order)
  const getSelectedVideos = () => {
    return selectedVideoOrder
      .map(id => videosList.find(video => video.id === id))
      .filter(Boolean) as AthleteVideo[];
  };

  // Get selection number for a video
  const getSelectionNumber = (videoId: string) => {
    return selectedVideoOrder.indexOf(videoId) + 1;
  };

  // Download all selected videos as individual files
  const downloadIndividualVideos = async () => {
    const selectedVideos = getSelectedVideos();
    setIsDownloading(true);
    setDownloadProgress(0);
    
    for (let i = 0; i < selectedVideos.length; i++) {
      const video = selectedVideos[i];
      const fileName = `${video.event || 'Video'}_${video.video_type}_${i + 1}.mp4`;
      
      // Update progress
      setDownloadProgress(Math.round(((i + 1) / selectedVideos.length) * 100));
      
      try {
        // Get the signed URL for this video, fallback to original if not available
        const videoUrl = signedUrls.get(video.id) || video.video_link;
        
        // Try to fetch the video as a blob
        const response = await fetch(videoUrl);
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Clean up the URL
          window.URL.revokeObjectURL(url);
        } else {
          // If direct download fails, open in new tab as fallback
          const link = document.createElement('a');
          link.href = videoUrl;
          link.target = '_blank';
          link.textContent = `Open ${fileName}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } catch (error) {
        console.error('Download failed for video:', video.video_link, error);
        // Fallback: open in new tab
        const videoUrl = signedUrls.get(video.id) || video.video_link;
        const link = document.createElement('a');
        link.href = videoUrl;
        link.target = '_blank';
        link.textContent = `Open ${fileName}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      // Add small delay between downloads
      if (i < selectedVideos.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    setIsDownloading(false);
    setDownloadProgress(0);
  };


  // Get total duration of all selected videos
  const getTotalDuration = () => {
    return getSelectedVideos().reduce((total, video) => {
      const duration = parseDuration(video.time || '0:00');
      return total + duration;
    }, 0);
  };

  // Parse duration string to seconds
  const parseDuration = (duration: string): number => {
    const parts = duration.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return parseInt(duration) || 0;
  };

  // Get proportional width for a video based on its duration
  const getVideoWidth = (video: AthleteVideo): number => {
    const totalDuration = getTotalDuration();
    if (totalDuration === 0) return 100; // Equal width if no duration info
    
    const videoDuration = parseDuration(video.time || '0:00');
    return (videoDuration / totalDuration) * 100;
  };

  // Handle video selection and auto-play
  const handleVideoClick = (video: AthleteVideo) => {
    const selectedVideos = getSelectedVideos();
    const videoIndex = selectedVideos.findIndex(v => v.id === video.id);
    if (videoIndex !== -1) {
      setCurrentVideoIndex(videoIndex);
      setSelectedVideo(video);
      setIsPlaying(true);
    }
  };

  // Auto-advance to next video
  const handleVideoEnd = () => {
    const selectedVideos = getSelectedVideos();
    if (currentVideoIndex < selectedVideos.length - 1) {
      const nextIndex = currentVideoIndex + 1;
      setCurrentVideoIndex(nextIndex);
      setSelectedVideo(selectedVideos[nextIndex]);
      // Continue playing the next video
      setIsPlaying(true);
    } else {
      // No more videos, stop playing
      setIsPlaying(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const v = videoRef.current;
      if (!v) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          if (v.paused) v.play().catch(() => {}); else v.pause();
          break;
        case "k":
        case "K":
          e.preventDefault();
          v.pause();
          break;
        case "l":
        case "L": {
          e.preventDefault();
          const i = playbackRates.indexOf(playbackRate);
          const next = Math.min(playbackRates.length - 1, i + 1);
          const newRate = playbackRates[next];
          setPlaybackRate(newRate);
          v.playbackRate = newRate;
          break;
        }
        case "j":
        case "J": {
          e.preventDefault();
          const i = playbackRates.indexOf(playbackRate);
          const prev = Math.max(0, i - 1);
          const newRate = playbackRates[prev];
          setPlaybackRate(newRate);
          v.playbackRate = newRate;
          break;
        }
        case "ArrowRight":
          e.preventDefault();
          v.currentTime = v.currentTime + (e.shiftKey ? 10 : 5);
          break;
        case "ArrowLeft":
          e.preventDefault();
          v.currentTime = Math.max(0, v.currentTime - (e.shiftKey ? 10 : 5));
          break;
        case "?":
        case "h":
        case "H":
          e.preventDefault();
          setShowShortcuts(prev => !prev);
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [playbackRate]);

  // Get unique video types and events for grid headers
  const getUniqueVideoTypes = () => {
    const types = [...new Set(videosList.map(video => video.video_type).filter(Boolean))];
    return types;
  };

  const getUniqueEvents = () => {
    const events = [...new Set(videosList.map(video => video.event).filter(Boolean))];
    return events;
  };

  // Get video types that actually have videos (not just unique types)
  const getVideoTypesWithVideos = () => {
    return videoTypes.filter(videoType => 
      videosList.some(video => video.video_type === videoType)
    );
  };

  const videoTypes = getUniqueVideoTypes();
  const events = getUniqueEvents();

  // Check if a video should show select option based on cross-section
  const shouldShowSelectOption = (videoType: string | undefined, event: string) => {
    if (!videoType) return false;
    if (!checked.some(c => c)) return true; // Show all videos if no filters selected
    
    const videoTypesWithVideos = getVideoTypesWithVideos();
    const selectedVideoTypes = videoTypesWithVideos.filter((_, idx) => checked[idx]);
    
    // Check if this video type is in the selected types
    return selectedVideoTypes.includes(videoType);
  };

  // Get videos for a specific cross-section
  const getVideosForCrossSection = (videoType: string | undefined, event: string) => {
    if (!videoType) return [];
    return videosList.filter(video => 
      video.video_type === videoType && video.event === event
    );
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="bio">
        <div className="flex items-center justify-center h-[617px] bg-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading videos...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show no videos message if no videos found
  if (videosList.length === 0) {
    return (
      <div className="bio">
        <div className="flex items-center justify-center h-[617px] bg-gray-100">
          <div className="text-center">
            <p className="text-gray-500 text-lg">No videos available for this athlete.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bio">
      {/* Main video display */}
      {selectedVideo ? (
        <div className="relative">
          <video
            ref={videoRef}
            controls
            playsInline
            preload="metadata"
            className="w-full h-[617px] border-0"
            onEnded={handleVideoEnd}
          />
          
          {/* Keyboard shortcuts dropdown */}
          {showShortcuts && (
            <div className="absolute top-12 right-4 bg-black bg-opacity-90 text-white p-3 rounded-lg max-w-xs">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-white">Space</span>
                  <span className="text-white">Play/Pause</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white">J / L</span>
                  <span className="text-white">Slower/Faster</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white">← / →</span>
                  <span className="text-white">Seek ±5s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white">Shift + ←/→</span>
                  <span className="text-white">Seek ±10s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white">H / ?</span>
                  <span className="text-white">Toggle Help</span>
                </div>
              </div>
            </div>
          )}

          {/* Video info overlay */}
          <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-xs px-2 py-1 rounded bg-gray-100 text-black">
                {playbackRate}×
              </span>
              <button 
                onClick={() => setShowShortcuts(!showShortcuts)}
                className="bg-gray-600 text-white px-2 py-1 rounded text-xs hover:bg-gray-700"
                title="Show keyboard shortcuts (H or ?)"
              >
                ⌨️
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative w-full h-[617px] bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-4">🎬</div>
            <h3 className="text-xl font-semibold mb-2">No Video Selected</h3>
            <p className="text-sm">Select videos from the grid below to start watching</p>
          </div>
        </div>
      )}

      {/* Navigation controls */}
      {selectedVideo && getSelectedVideos().length > 1 && (
        <div className="mt-3 flex gap-2 justify-center">
          <button
            className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-sm"
            onClick={() => {
              if (currentVideoIndex > 0) {
                const prevIndex = currentVideoIndex - 1;
                setCurrentVideoIndex(prevIndex);
                setSelectedVideo(getSelectedVideos()[prevIndex]);
                setIsPlaying(true);
              }
            }}
            disabled={currentVideoIndex === 0}
          >
            ← Previous
          </button>
          <button
            className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-sm"
            onClick={() => {
              if (currentVideoIndex < getSelectedVideos().length - 1) {
                const nextIndex = currentVideoIndex + 1;
                setCurrentVideoIndex(nextIndex);
                setSelectedVideo(getSelectedVideos()[nextIndex]);
                setIsPlaying(true);
              }
            }}
            disabled={currentVideoIndex === getSelectedVideos().length - 1}
          >
            Next →
          </button>
        </div>
      )}

      {/* Video list - shows only selected videos in selection order with proportional widths */}
      <div className="flex items-center w-full">
        {getSelectedVideos().map((video, idx) => {
          const isCurrentVideo = idx === currentVideoIndex;
          const videoWidth = getVideoWidth(video);
          
          return (
            <div 
              key={video.id} 
              className={`py-2 px-3 cursor-pointer transition-all duration-300 ${
                isCurrentVideo 
                  ? 'bg-primary text-white shadow-lg transform scale-105' 
                  : 'bg-[#f5f5f5] hover:bg-gray-200'
              }`}
              style={{ width: `${videoWidth}%` }}
              onClick={() => handleVideoClick(video)}
            >
              <h6 className="flex items-center justify-between text-primary !text-[22px] !font-[700] !opacity-100 !mb-2">
                <span className={`rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2 ${
                  isCurrentVideo 
                    ? 'bg-white text-primary' 
                    : 'bg-primary text-white'
                }`}>
                  {getSelectionNumber(video.id)}
                </span>
                {video.event || 'Video'}{" "}
                {video.time && (
                  <span className="mb-0 opacity-60 !text-[22px] !font-[400]">
                    {video.time}
                  </span>
                )}
              </h6>
              <p className="text-center !text-[16px] !font-[400] !opacity-100">{video.video_type}</p>
              {isCurrentVideo && (
                <div className="mt-2">
                  <div className="w-full bg-white bg-opacity-30 rounded-full h-1">
                    <div className="bg-white h-1 rounded-full animate-pulse"></div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className={`grid mt-2 gap-1 border-solid border-[#e5e5e5] border-width-[1px] p-2`} style={{ gridTemplateColumns: `200px repeat(${getVideoTypesWithVideos().length}, 1fr)` }}>
        <div></div>
        {getVideoTypesWithVideos().map((videoType, idx) => (
          <div
            key={videoType}
            className="!text-[24px] !font-[600] flex items-center justify-center"
          >
            <div
              className="cursor-pointer flex items-center justify-center"
              onClick={() => toggleColumnSelection(videoType as string)}
            >
              <div
                className={`checkbox-ui mr-2${videosList.filter(video => video.video_type === videoType).every(video => selectedVideoIds.has(video.id)) ? " checked" : ""}`}
              ></div>
              {videoType}
            </div>
          </div>
        ))}
      </div>

      {/* Grid-based video squares */}
      {events.map((eventName, eventIdx) => {
        const videoTypesWithVideos = getVideoTypesWithVideos();
        return (
          <div key={eventName} className={`grid mt-1 gap-1`} style={{ gridTemplateColumns: `200px repeat(${videoTypesWithVideos.length}, 1fr)` }}>
            {/* Event name column */}
            <div className="flex items-center border-t-0 border-l-0 border-r-0 border-solid border-[#f5f5f5] border-width-[1px]">
              <div className="flex cursor-pointer" onClick={() => toggleRowSelection(eventName as string)}>
                <div className={`checkbox-ui mt-[7px] mr-[7px]${videosList.filter(video => video.event === eventName).every(video => selectedVideoIds.has(video.id)) ? " checked" : ""}`}></div>
                <h6 className="!text-[16px] !font-[500] !opacity-100 !leading-[30px] !mb-0">
                  <span className="block w-full">{eventName}</span>
                  <span className="block w-full">
                    {(() => {
                      const firstVideoType = videoTypesWithVideos[0];
                      return firstVideoType ? getVideosForCrossSection(firstVideoType as string, eventName as string)[0]?.time || '' : '';
                    })()}
                  </span>
                </h6>
              </div>
            </div>
            
            {/* Video type columns - only show types that have videos */}
            {videoTypesWithVideos.map((videoType, typeIdx) => {
              if (!videoType) return null;
              const videosForCrossSection = getVideosForCrossSection(videoType as string, eventName as string);
              const shouldShow = shouldShowSelectOption(videoType as string, eventName as string);
              const allSelected = videosForCrossSection.every(video => selectedVideoIds.has(video.id));
              const selectedCount = videosForCrossSection.length > 0 && allSelected ? 
                getSelectionNumber(videosForCrossSection[0].id) : 0;
              
              // Only show button if there are videos in this cross-section
              if (videosForCrossSection.length === 0) {
                return (
                  <div key={`${videoType}-${eventName}`} className="flex justify-center">
                    <div className="w-full h-10 flex items-center justify-center text-gray-400">
                      -
                    </div>
                  </div>
                );
              }
              
              return (
                <div key={`${videoType}-${eventName}`} className="flex justify-center">
                  {shouldShow ? (
                    <button 
                      className={`select-btn ${allSelected ? 'selected' : ''}`}
                      onClick={() => toggleVideoSelection(videoType as string, eventName as string)}
                    >
                      <span className="first">Select</span>
                      <span className="second">
                        <i className="number-ss mr-2">{selectedCount}</i> Selected
                      </span>
                    </button>
                  ) : (
                    <div className="w-full h-10 flex items-center justify-center text-gray-400">
                      -
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Download options - only show if there are selected videos */}
      {getSelectedVideos().length > 0 && (
        <div className="mt-4 text-center">
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Download {getSelectedVideos().length} selected video{getSelectedVideos().length !== 1 ? 's' : ''}
            </p>
            
            {isDownloading ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span className="text-sm text-primary font-medium">
                    Downloading... {downloadProgress}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${downloadProgress}%` }}
                  ></div>
                </div>
              </div>
            ) : (
              <button 
                onClick={downloadIndividualVideos}
                disabled={isDownloading}
                className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 hover:shadow-lg transform hover:scale-105 transition-all duration-200 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none border-2 border-green-500 hover:border-green-600"
              >
                Download Videos
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoComponent;
