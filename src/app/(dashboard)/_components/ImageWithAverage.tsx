import React from "react";
import { Flex } from "antd";
import Image from "next/image";
import { useEffect, useState } from "react";

interface ImageWithAverageProps {
  src?: string;
  alt?: string;
  size?: string;
  height?: number;
  width?: number;
  containerWidth?: string;
  average?: number;
}

import { isValidImageUrl } from '@/utils/imageUtils';

export default function ImageWithAverage({
  src="",
  alt="",
  size,
  height,
  width,
  containerWidth,
  average=0,
}: ImageWithAverageProps) {
  const getClassByAvg = (avg: number | null | undefined) => {
    // Return "blank" class for null, undefined, or 0 values
    if (avg === null || avg === undefined || avg === 0) return "blank";
    if (avg < 60) return "red";
    if (avg >= 60 && avg < 70) return "yellow";
    if (avg >= 70 && avg < 80) return "yellow-green";
    if (avg >= 80 && avg < 90) return "light-green";
    return "green";
  };

  const [imageSrc, setImageSrc] = useState<string>("/blank-user.svg");
  const [isSupabaseImage, setIsSupabaseImage] = useState(false);

  useEffect(() => {
    if (!isValidImageUrl(src)) {
      setImageSrc("/blank-user.svg");
      setIsSupabaseImage(false);
      return;
    }

    // Check if it's a Supabase storage URL
    if (src.includes('supabase.co/storage')) {
      setImageSrc(src);
      setIsSupabaseImage(true);
    } else {
      setImageSrc(src);
      setIsSupabaseImage(false);
    }
  }, [src]);
  
  // Determine if we should show the score
  const shouldShowScore = average !== null && average !== undefined && average > 0;
  const scoreDisplay = shouldShowScore ? Math.round(average) : '';
  
  return (
    <Flex className={`user-image ${size}`} align="center" style={{width:containerWidth}}>
      <Flex className="gray-scale">
        {isSupabaseImage ? (
          // Use regular img tag for Supabase images to bypass Next.js Image optimization
          <img 
            src={imageSrc}
            alt={alt || ''}
            style={{
              objectFit: 'cover',
              objectPosition: 'top center',
              width: `${width}px`,
              height: `${height}px`,
              minWidth: `${width}px`,
              minHeight: `${height}px`,
              maxWidth: `${width}px`,
              maxHeight: `${height}px`
            }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "/blank-user.svg";
            }}
          />
        ) : (
          // Use Next.js Image component for other images
          <Image 
            src={imageSrc}
            alt={alt || ''}
            height={height}
            width={width}
            style={{
              objectFit: 'cover',
              objectPosition: 'top center',
              width: `${width}px`,
              height: `${height}px`,
              minWidth: `${width}px`,
              minHeight: `${height}px`,
              maxWidth: `${width}px`,
              maxHeight: `${height}px`
            }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "/blank-user.svg";
            }}
          />
        )}
        <span className={getClassByAvg(average)}>{scoreDisplay}</span>
      </Flex>
    </Flex>
  );
}