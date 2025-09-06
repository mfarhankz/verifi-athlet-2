"use client";

import React, { useState } from "react";
import {
  Modal,
  Typography,
  Space,
  Button,
  Progress,
  Card,
  Row,
  Col,
} from "antd";
import Image from "next/image";
import { Flex } from "antd";
import Filters from "../_components/Filters";

interface NewModalProps {
  isVisible: boolean;
  onClose: () => void;
}

const { Title, Text, Paragraph } = Typography;

export default function NewModal({ isVisible, onClose }: NewModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Add your submission logic here
      console.log("Submitting school profile...");

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      onClose();
    } catch (error) {
      console.error("Error submitting:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  // Static college prospects data for ABERNATHY HS - matching the image exactly
  const prospectsData = [
    {
      key: "1",
      name: "Jerome Bell",
      gradYear: "2027",
      projection: "D3 - Top half",
      bestOffer: "$2,203",
      gpa: "3.22",
      position: "WR",
      height: "5100",
      weight: "135",
      score: 58.9,
      hasStar: true,
      initials: "JB",
    },
    {
      key: "2",
      name: "Darrell Steward",
      gradYear: "2027",
      projection: "D3 - Top half",
      bestOffer: "$114",
      gpa: "3.22",
      position: "WR",
      height: "5090",
      weight: "135",
      score: 58.9,
      hasStar: true,
      initials: "DS",
    },
    {
      key: "3",
      name: "Wade Warren",
      gradYear: "2027",
      projection: "D3 - Top half",
      bestOffer: "$296",
      gpa: "3.22",
      position: "DB",
      height: "5100",
      weight: "180",
      score: 58.9,
      hasStar: true,
      initials: "WW",
    },
    {
      key: "4",
      name: "Devon Lane",
      gradYear: "2027",
      projection: "D3 - Top half",
      bestOffer: "$1,900",
      gpa: "3.22",
      position: "QB",
      height: "6000",
      weight: "160",
      score: 58.9,
      hasStar: true,
      initials: "DL",
    },
    {
      key: "1",
      name: "Ronald Richards",
      gradYear: "2028",
      projection: "D3",
      bestOffer: "$1,705",
      gpa: "3.55",
      position: "OLB",
      height: "5020",
      weight: "220",
      score: 58.9,
      hasStar: true,
      initials: "RR",
    },
    {
      key: "2",
      name: "Darlene Robertson",
      gradYear: "2026",
      projection: "D3 - Top half",
      bestOffer: "$207",
      gpa: "3.55",
      position: "LB",
      height: "5100",
      weight: "135",
      score: 58.9,
      hasStar: true,
      initials: "DR",
    },
  ];

  return (
    <Modal
      open={isVisible}
      onCancel={handleCancel}
      width={"90%"}
      centered
      footer={null}
      className="new-modal"
    >
      <button className="close" onClick={handleCancel}></button>
      <div className="p-0 max-h-[80vh] gap-4 flex flex-col overflow-y-auto">
        {/* Header Section */}
        <div className="flex justify-between items-center bg-white p-4 max-h-14">
          <div className="flex-1 flex items-center text-center gap-5">
            <Title
              level={2}
              className="m-0 italic text-blue-500 text-4xl font-extrabold drop-shadow-sm"
            >
              ABERNATHY HS
            </Title>
            <Text type="secondary" className="leading-[25px] tracking-[0.16px]">
              <div className="gap-4 flex">
                <span>State: Texas </span> <span>/</span>{" "}
                <span>County: Hale</span>
              </div>
            </Text>
          </div>
          <Space>
            <Button
              icon={
                <i className="icon-edit-2 text-2xl flex items-center justify-center border-none"></i>
              }
              type="text"
              className=""
            />
            <div className="vertical-border"></div>
            <Button
              icon={
                <i className="icon-printer text-2xl flex items-center justify-center"></i>
              }
              type="text"
            />
          </Space>
        </div>

        {/* Head Coach Section */}
        <div className="">
          <div className="flex gap-4">
            {/* Left Column - Head Coach Information + Social Box */}
            <div className="w-[60%] bg-white p-4 flex-shrink-0 flex">
              {/* Left: Head Coach Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className=" font-semibold text-gray-800  h3">
                    Head Coach - Justine Wiley
                  </h3>
                  <span className="text-xs text-gray-500">8/12/2024 3:45</span>
                </div>
                <p className="paragraph-text mb-10">jwiley@abernathysid.com</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm-p text-black mb-0">Home (Best)</p>
                    <p className="text-sm-p text-black mb-0">(830) 229 9483</p>
                  </div>
                  <div>
                    <p className="text-sm text-black mb-0">Cell</p>
                    <p className="text-sm font-semibold text-gray-800 mb-0">
                      (325) 977 2346
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-black mb-0">Office</p>
                    <p className="text-sm text-black mb-0">(806) 298 4910</p>
                  </div>
                </div>
              </div>

              {/* Right: Social Box */}
              <div className="text-center w-[134px] h-[149px] bg-black py-6 px-4 !mb-0 ">
                <img src="/twitter.png" alt="" className="w-12" />
                <p className="text-[#C8FF24] text-xl mb-0 py-1">
                  @justineWiley
                </p>
                <button className="bg-transparent border-none">
                  <img src="/follow.svg" alt="" width={95} />
                </button>
              </div>
            </div>

            {/* Right Column - School Information */}
            <div className="flex-1 bg-white p-4">
              <p className="text-sm text-gray-800 mb-0">
                505 7th St Abernathy, Tx 79311
              </p>
              <p className="text-sm text-gray-800 mb-0">(805) 289 4940</p>
              <p className="text-sm text-gray-800 mb-8">
                AD's Name - Justin Wiley -{" "}
                <span className="text-blue-500">jwiley@abernathysid.com</span>
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="mb-0">Enrollment Size</p>
                  <p className="mb-0">254</p>
                </div>
                <div>
                  <p className="mb-0">Religious Affiliation</p>
                  <p className="mb-0">None</p>
                </div>
                <div>
                  <p className="mb-0">School Type</p>
                  <p className="mb-0">Public</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Score Cards */}

        <Card className="mb-6  !p-0 ">
          <Row gutter={24} align="top" className="py-6">
            {/* LEFT SIDE */}
            <Col span={8}>
              <div className="mx-5">
                {/* Row 1 → 3 columns */}
                <div className="grid grid-cols-3 ">
                  <div>
                    <p className="text-gray-800 font-medium text-sm mb-0">
                      2024 Record
                    </p>
                    <p className="text-size">8W - 4L</p>
                  </div>
                  <div>
                    <p className="text-gray-800 font-medium text-sm mb-0">
                      2023 Record
                    </p>
                    <p className="text-size">5W - 6L</p>
                  </div>
                  <div>
                    <p className="text-gray-800 font-medium text-sm mb-0">
                      Schedule
                    </p>
                    <p className="text-[#126DB8] !font-medium cursor-pointer">
                      Make
                    </p>
                  </div>
                </div>

                {/* Row 2 → 2 columns */}
                <div className="grid grid-cols-2 ">
                  <div>
                    <p className="text-gray-800 font-medium text-sm mb-0">
                      Conference
                    </p>
                    <p className="text-size">3A - 2Region | District 4</p>
                  </div>
                  <div className="ml-16">
                    <p className="text-gray-800 font-medium text-sm mb-0">
                      State Classification
                    </p>
                    <p className="text-size">Division 2A-2</p>
                  </div>
                </div>
              </div>
            </Col>

            {/* RIGHT SIDE */}
            <Col span={16} className="mt-6">
              <Row gutter={16} className="gap-7">
                {/* # of Prospects Score */}
                <Col span={4}>
                  <div className="flex flex-col items-start">
                    <Text type="secondary" className="score-heading mb-1">
                      # of Prospects Score
                    </Text>
                    <div className="flex items-center w-full">
                      <span className="bg-[#1C1D4D] text-white w-8 h-10 flex items-center justify-center font-bold score-number">
                        7
                      </span>
                      <div className="relative flex-1 h-10 clip-progress">
                        <Progress
                          percent={70}
                          size={["100%", 40]}
                          strokeColor="#22C55E"
                          trailColor="#DCFCE7"
                          strokeLinecap="butt"
                          showInfo={false}
                          className="h-10"
                        />
                      </div>
                    </div>
                  </div>
                </Col>

                {/* # of D1 Prospects Score */}
                <Col span={4}>
                  <div className="flex flex-col items-start">
                    <Text type="secondary" className="score-heading mb-1">
                      # of D1 Prospects Score
                    </Text>
                    <div className="flex items-center w-full">
                      <span className="bg-[#1C1D4D] text-white w-8 h-10 flex items-center justify-center font-bold score-number">
                        5
                      </span>
                      <div className="relative flex-1 h-10 clip-progress">
                        <Progress
                          percent={50}
                          size={["100%", 40]}
                          strokeColor="#F97316"
                          trailColor="#FFEDD5"
                          strokeLinecap="butt"
                          showInfo={false}
                          className="h-10"
                        />
                      </div>
                    </div>
                  </div>
                </Col>

                {/* Team Quality Score */}
                <Col span={4}>
                  <div className="flex flex-col items-start">
                    <Text type="secondary" className="score-heading mb-1">
                      Team Quality Score
                    </Text>
                    <div className="flex items-center w-full">
                      <span className="bg-[#1C1D4D] text-white w-8 h-10 flex items-center justify-center font-bold score-number">
                        2
                      </span>
                      <div className="relative flex-1 h-10 clip-progress">
                        <Progress
                          percent={20}
                          size={["100%", 40]}
                          strokeColor="#EF4444"
                          trailColor="#FEE2E2"
                          strokeLinecap="butt"
                          showInfo={false}
                          className="h-10"
                        />
                      </div>
                    </div>
                  </div>
                </Col>

                {/* Athlete Income Score */}
                <Col span={4}>
                  <div className="flex flex-col items-start">
                    <Text type="secondary" className="score-heading mb-1">
                      Athlete Income Score
                    </Text>
                    <div className="flex items-center w-full">
                      <span className="bg-[#1C1D4D] text-white w-8 h-10 flex items-center justify-center font-bold score-number">
                        8
                      </span>
                      <div className="relative flex-1 h-10 clip-progress">
                        <Progress
                          percent={80}
                          size={["100%", 40]}
                          strokeColor="#22C55E"
                          trailColor="#DCFCE7"
                          strokeLinecap="butt"
                          showInfo={false}
                          className="h-10"
                        />
                      </div>
                    </div>
                  </div>
                </Col>

                {/* Academics Score */}
                <Col span={4}>
                  <div className="flex flex-col items-start">
                    <Text type="secondary" className="score-heading mb-1">
                      Academics Score
                    </Text>
                    <div className="flex items-center w-full">
                      <span className="bg-[#1C1D4D] text-white w-8 h-10 flex items-center justify-center font-bold score-number">
                        7
                      </span>
                      <div className="relative flex-1 h-10 clip-progress">
                        <Progress
                          percent={70}
                          size={["100%", 40]}
                          strokeColor="#22C55E"
                          trailColor="#DCFCE7"
                          strokeLinecap="butt"
                          showInfo={false}
                          className="h-10"
                        />
                      </div>
                    </div>
                  </div>
                </Col>
              </Row>
            </Col>
          </Row>
        </Card>

        {/* College Prospects */}

        <Flex justify="space-between" align="center">
          <Title level={2} className="page-heading">
            College Prospect
          </Title>

          <Space>
            <Button size="large" className="default">
              <i className="icon-filter-1"></i>
              Filters
            </Button>
            <Button type="primary" size="large" className="bg-primary">
              <i className="icon-user text-white"></i>
              Add Athlete
            </Button>
          </Space>
        </Flex>

        <table className="new-style-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Grad Year</th>
              <th>Athletic Projection</th>
              <th>Best Offer</th>
              <th>GPA</th>
              <th>Position</th>
              <th>Height</th>
              <th>Weight</th>
              <th>Highlight</th>
            </tr>
          </thead>
          <tbody>
            {prospectsData.map((athlete, index) => (
              <tr key={athlete.key}>
                <td>
                  <div className="flex items-center justify-start gap-2">
                    <Flex
                      className="user-image extra-small"
                      style={{ width: "48px", margin: 0 }}
                    >
                      <Flex className="gray-scale">
                        <Image
                          src={`/player${athlete.key}.png`}
                          alt={athlete.name}
                          width={48}
                          height={48}
                        />
                        <span className="yellow">{5.0}</span>
                      </Flex>
                    </Flex>
                    <div className="pro-detail ml-1">
                      <h4 className="flex mb-0">
                        {athlete.name}
                        <small className="flex ml-2 items-center justify-center">
                          <Image
                            src={"/success-star.svg"}
                            alt={athlete.name}
                            width={18}
                            height={18}
                            className="mr-1"
                          />
                          5.0
                        </small>
                      </h4>
                    </div>
                  </div>
                </td>
                <td>{athlete.gradYear}</td>
                <td>{athlete.projection}</td>
                <td>{athlete.bestOffer}</td>
                <td>{athlete.gpa}</td>
                <td>{athlete.position}</td>
                <td>{athlete.height}</td>
                <td>{athlete.weight}</td>
                <td>
                  <span className="text-blue-500 text-sm font-medium">
                    Link
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
