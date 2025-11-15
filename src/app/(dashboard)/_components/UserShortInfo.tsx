/* eslint-disable react/no-unescaped-entities */
import React from "react";
import { Flex, Typography } from "antd";
import Image from "next/image";
import ImageWithAverage from "./ImageWithAverage";

interface UserShortInfoProps {
  src?: string;
  height?: number;
  width?: number;
  fName?: string;
  lName?: string;
  title?: string;
  average?: number;
  rating?: number;
  school?: string;
  schoolIcon?: string;
  footer?: boolean;
  userFirstName?: string;
  userLastName?: string;
  athleteHeight?: string;
  athleteWeight?: string;
  ratingName?: string | null;
  ratingColor?: string | null;
  customerPosition?: string;
}

export default function UserShortInfo({
  src,
  fName,
  lName,
  height,
  width,
  average=0,
  rating=0,
  title,
  school,
  schoolIcon="",
  footer,
  userFirstName,
  userLastName,
  athleteHeight,
  athleteWeight,
  ratingName,
  ratingColor,
  customerPosition
}: UserShortInfoProps) {
  // Format height and weight for display
  const formatHeightWeight = () => {
    if (athleteHeight && athleteWeight) {
      return `${athleteHeight}, ${athleteWeight} lbs`;
    } else if (athleteHeight) {
      return `${athleteHeight}`;
    } else if (athleteWeight) {
      return `${athleteWeight} lbs`;
    }
    return '';
  };

  return (
    <Flex vertical className="player-short-info">
      <Flex>
        <ImageWithAverage
          src={src}
          alt={fName}
          width={width}
          height={height}
          size="small"
          average={average}
        />
        <div className="ml-2 user-detail">
          <Flex gap={12}>
            <h5>
              <span>{fName} </span>
              {lName}
            </h5>
            <Flex align="center" justify="center">
              {ratingName && ratingColor ? (
                // Display custom rating
                <div className="flex items-center">
                  <div
                    className="mr-1 flex items-center justify-center"
                    style={{
                      width: 16,
                      height: 16,
                      backgroundColor: ratingColor,
                      borderRadius: '50%',
                    }}
                  >
                    <span style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
                      ★
                    </span>
                  </div>
                  <h6>{ratingName}</h6>
                </div>
              ) : rating > 0 ? (
                // Fallback to tier-based rating
                <>
                  <Image
                    src={
                      rating < 2
                        ? "/error-star.svg"
                        : rating > 4
                        ? "/success-star.svg"
                        : "/warning-star.svg"
                    }
                    alt={""}
                    height={14}
                    width={14}
                    className="mr-1"
                    style={{ width: 'auto' }}
                  />
                  <h6>{rating}</h6>
                </>
              ) : (
                // No rating available
                <h6></h6>
              )}
            </Flex>
          </Flex>
          <p>{title}</p>
          <p className="flex items-center">
            {/* <Image src={schoolIcon} alt="School Icon" width={15} height={18} className="mr-1" style={{ width: 'auto' }} /> */}
            {school}
          </p>
        </div>
      </Flex>
      {footer && 
      <>
        <Flex className="justify-between pr-2 pl-1 w-[97%]">
          <Typography.Text>{formatHeightWeight()}</Typography.Text>
          <Typography.Text className="items-center">
            <span className="user-icon">
              {userFirstName && userLastName ? `${userFirstName.charAt(0)}${userLastName.charAt(0)}` : 'JA'}
            </span> 
            {userFirstName && userLastName ? `${userFirstName} ${userLastName}` : 'James Alex'}
          </Typography.Text>
        </Flex>
        {customerPosition && (
          <Flex className="pr-2 pl-1 w-[97%]">
            <Typography.Text>{customerPosition}</Typography.Text>
          </Flex>
        )}
      </>
}
    </Flex>
  );
}
