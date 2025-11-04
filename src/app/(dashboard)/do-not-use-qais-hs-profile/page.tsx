"use client";

import { Button, Dropdown, Flex, MenuProps, Modal, Skeleton } from "antd";
import React, { useState } from "react";
import ImageWithAverage from "../_components/ImageWithAverage";
import PlayerInformation from "../_components/PlayerInformation";
import Image from "next/image";
import ProgressBar from "@/components/ProgressBar";
import { Rate } from 'antd';

import { Switch } from "antd";

export default function NewPages() {
  const [isPlayerModalVisible, setIsPlayerModalVisible] = useState(true);
  const handleClosePlayerModal = () => {
    setIsPlayerModalVisible(false);
  };

  const onChange = (checked: boolean) => {
    console.log(`switch to ${checked}`);
  };

  const items: MenuProps["items"] = [
    {
      label: <a href="#">Follow Athlete Offers</a>,
      key: "0",
    },
    {
      type: "divider",
    },
    {
      label: <a href="#">Front Rush</a>,
      key: "1",
    },
    {
      type: "divider",
    },
    {
      label: <a href="#">+ Recruiting Board</a>,
      key: "3",
    },
  ];
  return (
    <div>
      <Modal
        title={null}
        open={isPlayerModalVisible}
        onCancel={handleClosePlayerModal}
        footer={null}
        width="95vw"
        style={{ top: 20 }}
        className="new-modal-ui"
        destroyOnHidden={true}
        closable={true}
        maskClosable={true}
      >
        <button
          className="close"
          onClick={() => handleClosePlayerModal()}
        ></button>

        <Flex>
          <div className="main-container-ui">
            <div className="grid grid-cols-[215px_minmax(0,1fr)] gap-2">
              <div className="flex flex-col gap-2">
                <div className="card">
                  <div className="player-img">
                    {false ? (
                      <Skeleton.Image
                        active
                        style={{ width: 200, height: 200 }}
                      />
                    ) : (
                      <Image src="/jj.png" alt="abc" width={200} height={200} />
                    )}
                    <ul>
                      <li>
                        <i className="icon-svg-tape-measure"></i> 6.2” / 173lb
                      </li>
                      <li>
                        <i className="icon-svg-calendar"></i> 2025
                      </li>
                      <li>
                        <i className="icon-svg-cake"></i> 9/17/1995 (29)
                      </li>
                      <li>
                        <i className="icon-svg-education"></i> 3.5
                      </li>
                      <li>
                        <i className="icon-svg-football"></i> Front Striker
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="card">
                  <h4 className="mt-2 flex items-center">
                    <i className="icon-svg-link"></i> Player Links
                  </h4>
                  <ul className="link-list">
                    <li>
                      <a href={`https://www.google.com`}>HS Highlight Tape</a>
                    </li>
                  </ul>

                  <h5 className="flex items-center">
                    <i className="icon-svg-file"></i> Transcript
                  </h5>
                  <ul className="link-list">
                    <li>
                      <a href={`https://www.google.com`}>
                        Download Transcript 1{" "}
                      </a>
                    </li>
                    <li>
                      <a href={`https://www.google.com`}>
                        Download Transcript 2{" "}
                      </a>
                    </li>
                    <li>
                      <a href={`https://www.google.com`}>
                        Download Transcript 3{" "}
                      </a>
                    </li>
                  </ul>

                  <h5 className="flex items-center">
                    <i className="icon-svg-file-validation"></i> SAT / ACT
                  </h5>
                  <ul className="link-list !mb-0">
                    <li>
                      <a href={`https://www.google.com`}>
                        Download SAT / ACT 1
                      </a>
                    </li>
                    <li>
                      <a href={`https://www.google.com`}>
                        Download SAT / ACT 2
                      </a>
                    </li>
                  </ul>
                </div>

                <div className="xfeed">
                  <div className="">
                    <img src="/x-logo.svg" alt="X Feed" height={50} />
                  </div>
                  <span className="gray">Follow on X</span>
                  <h3>Bryce Shaun</h3>
                  <h6>@bryceshaun</h6>
                  <div className="white-skew-btn">
                    <a
                      href={``}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      <button>Catch on X</button>
                    </a>
                  </div>
                </div>
              </div>
              <div className="card-withou-pading gray-scale overflow-auto">
                <div className="grid grid-cols-[1fr_550px] gap-4 mb-4">
                  <div className="card">
                    <div className="detail-box">
                      <div className="flex items-center justify-between">
                        <h1>Jason Jonathon</h1>
                        <div className="ml-2 gap-1 flex">
                          <div className="star-badge">3.7</div>
                          <div className="agreement-badge"></div>
                          <div className="wave-badge"></div>
                          <button className="icon-edit-2 flex align-center justify-center text-lg bg-white border border-solid border-[#d2d2db] w-[42px]"></button>
                          <Dropdown menu={{ items }} trigger={["click"]}>
                            <Button className="select-dropdown !border-[#d2d2db] !shadow-none w-[42px]">
                              <i className="icon-menu-1"></i>
                            </Button>
                          </Dropdown>
                        </div>
                      </div>
                      <div className="arrow-bg relative flex items-center justify-between">
                        <h5 className="school">
                          <Image
                            src="/b.svg"
                            alt="abc"
                            width={20}
                            height={24}
                          />
                          Kansas City School (Miami, FL | Miami-Dade)
                        </h5>

                        <div className="absolute right-0 top-5 text-[16px] leading-[24px]">
                          <strong className="font-[500]">NCAA ID</strong> <br />{" "}
                          4039ZD
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="flex gap-10">
                          <h6 className="flex items-center !font-normal">
                            <i className="icon-call flex text-lg mr-1"></i>{" "}
                            (904) 9393 5039
                          </h6>
                          <h6 className="flex items-center !font-normal">
                            <i className="icon-sms flex text-lg mr-1"></i>{" "}
                            <a href="mailto:morgan.jason@gmail.com">
                              morgan.jason@gmail.com
                            </a>
                          </h6>
                        </div>
                        <h6 className="flex items-center !font-normal">
                          <i className="icon-location flex text-lg mr-1"></i>{" "}
                          495 - 11th Street Lake City, FL 03832
                        </h6>
                      </div>
                      <div className="mt-8 flex justify-center">
                        <a href="javascript:void(0)" className="profile-btn">
                          Request Athlete to Update Profile
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="card flex items-center justify-center gap-4">
                    <div className="flex-1 px-2">
                      <h4 className="mb-3 italic">Athletic Projection</h4>
                      <div className="flex flex-col gap-1">
                        <ProgressBar
                          value={25}
                          height={20}
                          color="#FF7525"
                          label="Athletic Testing"
                          labelSize="12"
                          labelWeight={400}
                          labelWidth={110}
                        />
                        <ProgressBar
                          value={92}
                          height={20}
                          color="#2BB650"
                          label="Recruiting Services"
                          labelSize="12"
                          labelWeight={400}
                          labelWidth={110}
                        />
                        <ProgressBar
                          value={18}
                          height={20}
                          color="#C00E1E"
                          label="Offers"
                          labelSize="12"
                          labelWeight={400}
                          labelWidth={110}
                        />
                        <ProgressBar
                          value={29}
                          height={20}
                          color="#FF7525"
                          label="Scouts"
                          labelSize="12"
                          labelWeight={400}
                          labelWidth={110}
                        />
                        <ProgressBar
                          value={81}
                          height={20}
                          color="#2BB650"
                          label="Honors"
                          labelSize="12"
                          labelWeight={400}
                          labelWidth={110}
                        />
                        <ProgressBar
                          value={64}
                          height={20}
                          color="#2BB650"
                          label="HS Coach"
                          labelSize="12"
                          labelWeight={400}
                          labelWidth={110}
                        />
                        <ProgressBar
                          value={18}
                          height={20}
                          color="#C00E1E"
                          label="Data Scraping"
                          labelSize="12"
                          labelWeight={400}
                          labelWidth={110}
                        />
                      </div>
                    </div>

                    <div className="w-[150px] mr-5 flex items-center justify-center card border border-black p-5">
                      <div className="">
                        <h5 className="m-0 italic ">Current Projection</h5>
                        <h4 className="italic text-[22px]">D3 - Top Half</h4>
                        <div className="">
                          <ProgressBar
                            value={85}
                            height={55}
                            color="#2BB650"
                            label=""
                            labelSize="14"
                            labelWeight={400}
                            labelWidth={110}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="error">
                  Tennessee Titans College - 29/11/2026
                  <div className="check">
                    <i className="icon-svg-green-tick"></i> Walk ON{" "}
                  </div>
                </div>
                <div className="info">
                  <div>
                    <span>JUCO Details:</span>
                    <h4>Pasadena HS (2025)</h4>
                  </div>
                  <div className="text-center">
                    <span>AA Grad Date</span>
                    <h6>9/2/2023</h6>
                  </div>
                  <div className="text-center">
                    <span>Pell Eligible</span>
                    <h6>Yes</h6>
                  </div>
                  <div className="text-center">
                    <span>Eligibility</span>
                    <h6>4 - 3</h6>
                  </div>
                </div>
                <div className="col-span-8 card-withou-pading gray-scale">
                  <PlayerInformation athlete={null} useMockData={true} />
                </div>

                <div className="mt-5 flex gap-4">
                  <div className="card p-0 w-96">
                    <h3 className="!text-lg font-[500] text-gray-900 mb-4 bg-[#f6f6f8] p-2 !m-0">
                      Raw Measureables
                    </h3>
                    <div className="p-3">
                      <p className="p-0 m-0 leading-5">
                        Our proprietary web scrape helps predict athletic
                        potential in athletes with very little other
                        information. This score often serves as a starting point
                        until we know more about an athlete
                      </p>
                    </div>
                  </div>

                  <div className="card p-0 w-96">
                    <h3 className="!text-lg font-[500] text-gray-900 mb-4 bg-[#f6f6f8] p-2 !m-0">
                      HS Scouts
                    </h3>
                    <div className="p-3">
                      <table className="w-full new-table">
                        <thead>
                          <tr>
                            <th>Source</th>
                            <th>Score</th>
                            <th>Height</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>Quick info here</td>
                            <td>50</td>
                            <td>5.11”</td>
                          </tr>
                          <tr>
                            <td>Additional info here</td>
                            <td>49</td>
                            <td>5.10”</td>
                          </tr>
                          <tr>
                            <td>Go Information</td>
                            <td>63</td>
                            <td>5.9”</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="card p-0 w-96">
                    <h3 className="!text-lg font-[500] text-gray-900 mb-4 bg-[#f6f6f8] p-2 !m-0">
                      Scouts
                    </h3>
                    <div className="p-3">
                      <table className="w-full new-table">
                        <thead>
                          <tr>
                            <th>Source</th>
                            <th>Score</th>
                            <th>Height</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>Quick info here</td>
                            <td>50</td>
                            <td>5.11”</td>
                          </tr>
                          <tr>
                            <td>Additional info here</td>
                            <td>49</td>
                            <td>5.10”</td>
                          </tr>
                          <tr>
                            <td>Go Information</td>
                            <td>63</td>
                            <td>5.9”</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 mt-5">
                  <div className="card p-0 w-96">
                    <div className="flex items-center justify-end bg-[#f6f6f8] p-2">
                      <h3 className="!text-lg font-[500] text-gray-900 !mb-0 mr-4">
                        View as
                      </h3>
                      <span className="text-sm">Height</span>
                      <Switch
                        defaultChecked
                        className="mx-3 !min-h-[23px]"
                        onChange={onChange}
                      />
                      <span className="text-sm">Source</span>
                    </div>
                    <div className="p-3">
                      <img
                        src="/chart2.png"
                        alt="Georgia Tech Logo"
                        className="w-full mb-4"
                      />
                      <table className="w-full new-table">
                        <thead>
                          <tr>
                            <th>Source</th>
                            <th>Score</th>
                            <th>Height</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>Quick info here</td>
                            <td>50</td>
                            <td>5.11”</td>
                          </tr>
                          <tr>
                            <td>Additional info here</td>
                            <td>49</td>
                            <td>5.10”</td>
                          </tr>
                          <tr>
                            <td>Go Information</td>
                            <td>63</td>
                            <td>5.9”</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <div className="card p-0 w-96">
                      <h3 className="!text-lg font-[500] text-gray-900 mb-4 bg-[#f6f6f8] p-2 !m-0">
                        Offers
                      </h3>
                      <div className="p-3">
                        <div className="flex items-center gap-2">
                          <img
                            src="/pl1.png"
                            alt="Georgia Tech Logo"
                            className="w-12 h-12 mt-1"
                          />
                          <div>
                            <h5 className="!font-[400] text-lg m-0 text-gray-900">
                              University of New Jersey
                            </h5>
                            <span className="!font-[600]">$394,039</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <img
                            src="/pl1.png"
                            alt="Georgia Tech Logo"
                            className="w-12 h-12 mt-1"
                          />
                          <div>
                            <h5 className="!font-[400] text-lg m-0 text-gray-900">
                              University of New Jersey
                            </h5>
                            <span className="!font-[600]">$394,039</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <img
                            src="/a.png"
                            alt="Georgia Tech Logo"
                            className="w-12 h-12 mt-1"
                          />
                          <div>
                            <h5 className="!font-[400] text-lg m-0 text-gray-900">
                              University of New Jersey
                            </h5>
                            <span className="!font-[600]">$394,039</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="card p-0 w-96">
                      <h3 className="!text-lg font-[500] text-gray-900 mb-4 bg-[#f6f6f8] p-2 !m-0">
                        Recruiting Services
                      </h3>
                      <div className="p-3 flex justify-between">
                        <div>
                          <h6 className="!text-[16px]">Player Rating</h6>
                          <h2 className="!text-5xl !font-bold italic !mb-1">4.5</h2>
                          <Rate allowHalf defaultValue={4.5} className="bg-none" />
                        </div>
                        <div className="flex flex-col gap-2">
                          <h5 className="flex flex-col items-center !text-[22px] mb-0"><span className="text-[16px] !font-normal">TN</span> 37</h5>
                          <h5 className="flex flex-col items-center !text-[22px] mb-0"><span className="text-[16px] !font-normal">Edge</span> 111</h5>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Flex>
      </Modal>
    </div>
  );
}
