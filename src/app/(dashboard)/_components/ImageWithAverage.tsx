import React from "react";
import { Flex } from "antd";
import Image from "next/image";

interface ImageWithAverageProps {
  src?: string;
  alt?: string;
  size?: string;
  height?: number;
  width?: number;
  containerWidth?: string;
  average?: number;
}

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

  // Use default image if no src provided or if src is empty
  const imageSrc = src || "/blank-user";
  
  // Determine if we should show the score
  const shouldShowScore = average !== null && average !== undefined && average > 0;
  const scoreDisplay = shouldShowScore ? Math.round(average) : '';
  
  return (
    <Flex className={`user-image ${size}`} align="center" style={{width:containerWidth}}>
      <Flex className="gray-scale">
        <Image 
          src={imageSrc} 
          alt={alt} 
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
            // Fallback to default image if the provided image fails to load
            const target = e.target as HTMLImageElement;
            target.src = "/blank-user.svg";
          }}
        />
        <span className={getClassByAvg(average)}>{scoreDisplay}</span>
      </Flex>
    </Flex>
  );
}