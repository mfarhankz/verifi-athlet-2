"use client";

import {
  Flex,
  Progress,
  Dropdown,
  Tooltip,
  Typography,
  Checkbox,
  CheckboxProps,
  Button,
  Input,
} from "antd";
import Image from "next/image";
import ImageWithAverage from "../_components/ImageWithAverage";
import UserShortInfo from "../_components/UserShortInfo";
import { data } from "@/apis/data";
import Link from "next/link";
import { Suspense } from "react";

// Inner component with all the logic
function AthleteCompareContent() {
  const onChange: CheckboxProps["onChange"] = (e) => {
    console.log(`checked = ${e.target.checked}`);
  };

  const dropdownContent = () => (
    <div className="compare-player">
      <div className="input-field">
        <Input type="text" placeholder="Search Player..." />
        <i className="icon-search-normal-1 text-xl flex"></i>
      </div>
      <Flex justify="space-between" className="px-3 py-2">
        <Typography.Text>2 Selected (max 3)</Typography.Text>
        <Link href="/">Select all</Link>
      </Flex>
      <ul>
        {data.map((player) => (
          <li key={player.key}>
            <Checkbox onChange={onChange} />
            <UserShortInfo
              src={player.image}
              height={80}
              width={80}
              fName={player.fname}
              lName={player.lname}
              average={player.avg}
              rating={player.rating}
              title={player.academy}
              school={player.school}
              schoolIcon={player.schoolIcon}
            />
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="main-container">
      <Flex vertical className="gap-3">
        <Flex className="card items-center justify-between">
          <h4>
            Compare Athlete
          </h4>

          <Dropdown dropdownRender={dropdownContent} trigger={["click"]}>
            <Button className="select-dropdown">
              Add athlete to compare <i className="icon-arrow-down-1"></i>
            </Button>
          </Dropdown>
        </Flex>
        <Flex className="grid grid-cols-12 gap-4 match">
          <Flex className="col-span-4" align="center" vertical>
            <Flex vertical className="card-box">
              <a href="javascript:" className="icon-xmark-regular"></a>
              <ImageWithAverage
                src="/servey-img.png"
                alt="Survey Image"
                height={250}
                width={250}
                average={85.7}
              />
              <Flex
                align="center"
                justify="center"
                className="name uppercase mb-5 mt-3"
              >
                <Typography.Title level={3} className="mr-3">
                  Jason Shaun
                </Typography.Title>
                <Image
                  className="mr-1"
                  src={"/warning-star.svg"}
                  alt={""}
                  height={22}
                  width={22}
                />
                <Typography.Text>4.2</Typography.Text>
              </Flex>
              <Flex className="status mb-10" align="center" justify="center">
                <Typography.Title level={5}>Active</Typography.Title>
                <Typography.Text>ID: AX30902</Typography.Text>
              </Flex>
              <Flex vertical className="w-full achievements">
                <Typography.Title level={4} className="italic">
                  Profile & Achievements
                </Typography.Title>
                <Flex justify="space-between" align="center" className="gray">
                  <Typography.Title level={5} className="flex items-center">
                    <i className="icon-calendar-1 mr-2 flex"></i>Age
                  </Typography.Title>
                  <Typography.Text>H24 Years 4 months</Typography.Text>
                </Flex>
                <Flex justify="space-between" align="center">
                  <Typography.Title level={5} className="flex items-center">
                    <i className="icon-receipt-item mr-2 flex"></i>Height,
                    Weight
                  </Typography.Title>
                  <Typography.Text>6&apos;2&quot;, 225 lbs</Typography.Text>
                </Flex>
                <Flex justify="space-between" align="center" className="gray">
                  <Typography.Title level={5} className="flex items-center">
                    <i className="icon-teacher mr-2 flex"></i>School
                  </Typography.Title>
                  <Typography.Text>Jackson HS</Typography.Text>
                </Flex>
                <Flex justify="space-between" align="center">
                  <Typography.Title level={5} className="flex items-center">
                    <i className="icon-location mr-2 flex"></i>Location
                  </Typography.Title>
                  <Typography.Text>New York, NY</Typography.Text>
                </Flex>
                <Flex justify="space-between" align="center" className="gray">
                  <Typography.Title level={5} className="flex items-center">
                    <i className="icon-calendar-1 mr-2 flex"></i>RFR
                  </Typography.Title>
                </Flex>
              </Flex>
              <div className="achivement-list">
                <ul className="grid grid-cols-2">
                  <li>
                    <Image src="/cupA.svg" alt="abc" width={36} height={36} />
                    <Tooltip title="2024-RB">
                      <span>2024-RB</span>
                    </Tooltip>
                  </li>
                  <li>
                    <Image src="/cupR.svg" alt="abc" width={36} height={36} />
                    <Tooltip title="2019 - RB">
                      <span>2019 - RB</span>
                    </Tooltip>
                  </li>
                  <li>
                    <Image
                      src="/madal-1.svg"
                      alt="abc"
                      width={18}
                      height={36}
                      className="madal"
                    />
                    <Tooltip title="Some hover information can come">
                      <span>Team Name First</span>
                    </Tooltip>
                  </li>
                  <li>
                    <Image
                      src="/madal-2.svg"
                      alt="abc"
                      width={18}
                      height={36}
                      className="madal"
                    />

                    <Tooltip
                      color="var(--primary)"
                      title="Some hover information can come"
                    >
                      <span>Team Name Second</span>
                    </Tooltip>
                  </li>
                  <li>
                    <Image
                      src="/madal-3.svg"
                      alt="abc"
                      width={18}
                      height={36}
                      className="madal"
                    />
                    <Tooltip title="Some hover information can come">
                      <span>Team Name Third</span>
                    </Tooltip>
                  </li>
                </ul>
              </div>
              <div className="progress">
                <Typography.Title level={4} className="italic">
                  Player Statistics
                </Typography.Title>
                <div className="flex items-center justify-between mt-2">
                  <span>YDS</span>
                  <span>
                    1389 <small>16TH</small>
                  </span>
                </div>
                <Progress
                  percent={50}
                  size={["100%", 26]}
                  strokeLinecap="butt"
                  showInfo={false}
                  className="success"
                />
                <div className="flex items-center justify-between mt-2">
                  <span>TD</span>
                  <span>
                    6 <small>TIED - 21ST</small>
                  </span>
                </div>
                <Progress
                  percent={30}
                  size={["100%", 26]}
                  strokeLinecap="butt"
                  showInfo={false}
                  className="error"
                />
                <div className="flex items-center justify-between mt-2">
                  <span>INT</span>
                  <span>
                    8 <small>TIED - 69ST</small>
                  </span>
                </div>
                <Progress
                  percent={10}
                  size={["100%", 26]}
                  strokeLinecap="butt"
                  showInfo={false}
                  className="warning"
                />
                <div className="flex items-center justify-between mt-2">
                  <span>QBR</span>
                  <span>
                    61.0 <small>11TH</small>
                  </span>
                </div>
                <Progress
                  percent={12}
                  size={["100%", 26]}
                  strokeLinecap="butt"
                  showInfo={false}
                  className="success"
                />
              </div>
              <Flex vertical className="w-full achievements mb-3">
                <Typography.Title level={4} className="italic">
                  Other Info
                </Typography.Title>
                <Flex justify="space-between" align="center" className="gray">
                  <Typography.Title level={5} className="flex items-center">
                    Last Played
                  </Typography.Title>
                  <Typography.Text>January 10, 2024</Typography.Text>
                </Flex>
              </Flex>
            </Flex>
          </Flex>
          <Flex className="col-span-4" align="center" vertical>
            <Flex vertical className="card-box">
              <a href="javascript:" className="icon-xmark-regular"></a>
              <ImageWithAverage
                src="/jack.svg"
                alt="Survey Image"
                height={250}
                width={250}
                average={85.7}
              />
              <Flex
                align="center"
                justify="center"
                className="name uppercase mb-5 mt-3"
              >
                <Typography.Title level={3} className="mr-3">
                  Martin Jack
                </Typography.Title>
                <Image
                  className="mr-1"
                  src={"/warning-star.svg"}
                  alt={""}
                  height={22}
                  width={22}
                />
                <Typography.Text>4.5</Typography.Text>
              </Flex>
              <Flex className="status mb-10" align="center" justify="center">
                <Typography.Title level={5}>Active</Typography.Title>
                <Typography.Text>ID: AX30902</Typography.Text>
              </Flex>
              <Flex vertical className="w-full achievements">
                <Typography.Title level={4} className="italic">
                  Profile & Achievements
                </Typography.Title>
                <Flex justify="space-between" align="center" className="gray">
                  <Typography.Title level={5} className="flex items-center">
                    <i className="icon-calendar-1 mr-2 flex"></i>Age
                  </Typography.Title>
                  <Typography.Text>H24 Years 4 months</Typography.Text>
                </Flex>
                <Flex justify="space-between" align="center">
                  <Typography.Title level={5} className="flex items-center">
                    <i className="icon-receipt-item mr-2 flex"></i>Height,
                    Weight
                  </Typography.Title>
                  <Typography.Text>6&apos;2&quot;, 225 lbs</Typography.Text>
                </Flex>
                <Flex justify="space-between" align="center" className="gray">
                  <Typography.Title level={5} className="flex items-center">
                    <i className="icon-teacher mr-2 flex"></i>School
                  </Typography.Title>
                  <Typography.Text>Jackson HS</Typography.Text>
                </Flex>
                <Flex justify="space-between" align="center">
                  <Typography.Title level={5} className="flex items-center">
                    <i className="icon-location mr-2 flex"></i>Location
                  </Typography.Title>
                  <Typography.Text>New York, NY</Typography.Text>
                </Flex>
                <Flex justify="space-between" align="center" className="gray">
                  <Typography.Title level={5} className="flex items-center">
                    <i className="icon-calendar-1 mr-2 flex"></i>RFR
                  </Typography.Title>
                </Flex>
              </Flex>
              <div className="achivement-list">
                <ul className="grid grid-cols-2">
                  <li>
                    <Image src="/cupA.svg" alt="abc" width={36} height={36} />
                    <Tooltip title="2024-RB">
                      <span>2024-RB</span>
                    </Tooltip>
                  </li>
                  <li>
                    <Image src="/cupR.svg" alt="abc" width={36} height={36} />
                    <Tooltip title="2019 - RB">
                      <span>2019 - RB</span>
                    </Tooltip>
                  </li>
                  <li>
                    <Image
                      src="/madal-1.svg"
                      alt="abc"
                      width={18}
                      height={36}
                      className="madal"
                    />
                    <Tooltip title="Some hover information can come">
                      <span>Team Name First</span>
                    </Tooltip>
                  </li>
                  <li>
                    <Image
                      src="/madal-2.svg"
                      alt="abc"
                      width={18}
                      height={36}
                      className="madal"
                    />

                    <Tooltip
                      color="var(--primary)"
                      title="Some hover information can come"
                    >
                      <span>Team Name Second</span>
                    </Tooltip>
                  </li>
                  <li>
                    <Image
                      src="/madal-3.svg"
                      alt="abc"
                      width={18}
                      height={36}
                      className="madal"
                    />
                    <Tooltip title="Some hover information can come">
                      <span>Team Name Third</span>
                    </Tooltip>
                  </li>
                </ul>
              </div>
              <div className="progress">
                <Typography.Title level={4} className="italic">
                  Player Statistics
                </Typography.Title>
                <div className="flex items-center justify-between mt-2">
                  <span>YDS</span>
                  <span>
                    1389 <small>16TH</small>
                  </span>
                </div>
                <Progress
                  percent={50}
                  size={["100%", 26]}
                  strokeLinecap="butt"
                  showInfo={false}
                  className="success"
                />
                <div className="flex items-center justify-between mt-2">
                  <span>TD</span>
                  <span>
                    6 <small>TIED - 21ST</small>
                  </span>
                </div>
                <Progress
                  percent={30}
                  size={["100%", 26]}
                  strokeLinecap="butt"
                  showInfo={false}
                  className="error"
                />
                <div className="flex items-center justify-between mt-2">
                  <span>INT</span>
                  <span>
                    8 <small>TIED - 69ST</small>
                  </span>
                </div>
                <Progress
                  percent={10}
                  size={["100%", 26]}
                  strokeLinecap="butt"
                  showInfo={false}
                  className="warning"
                />
                <div className="flex items-center justify-between mt-2">
                  <span>QBR</span>
                  <span>
                    61.0 <small>11TH</small>
                  </span>
                </div>
                <Progress
                  percent={12}
                  size={["100%", 26]}
                  strokeLinecap="butt"
                  showInfo={false}
                  className="success"
                />
              </div>
              <Flex vertical className="w-full achievements mb-3">
                <Typography.Title level={4} className="italic">
                  Other Info
                </Typography.Title>
                <Flex justify="space-between" align="center" className="gray">
                  <Typography.Title level={5} className="flex items-center">
                    Last Played
                  </Typography.Title>
                  <Typography.Text>January 10, 2024</Typography.Text>
                </Flex>
              </Flex>
            </Flex>
          </Flex>
          <Flex className="col-span-4" align="center" vertical>
            <Flex vertical className="card-box">
              <a href="javascript:" className="icon-xmark-regular"></a>
              <ImageWithAverage
                src="/alex.svg"
                alt="Survey Image"
                height={250}
                width={250}
                average={85.7}
              />
              <Flex
                align="center"
                justify="center"
                className="name uppercase mb-5 mt-3"
              >
                <Typography.Title level={3} className="mr-3">
                  Alex Shaun
                </Typography.Title>
                <Image
                  className="mr-1"
                  src={"/warning-star.svg"}
                  alt={""}
                  height={22}
                  width={22}
                />
                <Typography.Text>3.9</Typography.Text>
              </Flex>
              <Flex className="status mb-10" align="center" justify="center">
                <Typography.Title level={5}>Active</Typography.Title>
                <Typography.Text>ID: AX30902</Typography.Text>
              </Flex>
              <Flex vertical className="w-full achievements">
                <Typography.Title level={4} className="italic">
                  Profile & Achievements
                </Typography.Title>
                <Flex justify="space-between" align="center" className="gray">
                  <Typography.Title level={5} className="flex items-center">
                    <i className="icon-calendar-1 mr-2 flex"></i>Age
                  </Typography.Title>
                  <Typography.Text>H24 Years 4 months</Typography.Text>
                </Flex>
                <Flex justify="space-between" align="center">
                  <Typography.Title level={5} className="flex items-center">
                    <i className="icon-receipt-item mr-2 flex"></i>Height,
                    Weight
                  </Typography.Title>
                  <Typography.Text>6&apos;2&quot;, 225 lbs</Typography.Text>
                </Flex>
                <Flex justify="space-between" align="center" className="gray">
                  <Typography.Title level={5} className="flex items-center">
                    <i className="icon-teacher mr-2 flex"></i>School
                  </Typography.Title>
                  <Typography.Text>Jackson HS</Typography.Text>
                </Flex>
                <Flex justify="space-between" align="center">
                  <Typography.Title level={5} className="flex items-center">
                    <i className="icon-location mr-2 flex"></i>Location
                  </Typography.Title>
                  <Typography.Text>New York, NY</Typography.Text>
                </Flex>
                <Flex justify="space-between" align="center" className="gray">
                  <Typography.Title level={5} className="flex items-center">
                    <i className="icon-calendar-1 mr-2 flex"></i>RFR
                  </Typography.Title>
                </Flex>
              </Flex>
              <div className="achivement-list">
                <ul className="grid grid-cols-2">
                  <li>
                    <Image src="/cupA.svg" alt="abc" width={36} height={36} />
                    <Tooltip title="2024-RB">
                      <span>2024-RB</span>
                    </Tooltip>
                  </li>
                  <li>
                    <Image src="/cupR.svg" alt="abc" width={36} height={36} />
                    <Tooltip title="2019 - RB">
                      <span>2019 - RB</span>
                    </Tooltip>
                  </li>
                  <li>
                    <Image
                      src="/madal-1.svg"
                      alt="abc"
                      width={18}
                      height={36}
                      className="madal"
                    />
                    <Tooltip title="Some hover information can come">
                      <span>Team Name First</span>
                    </Tooltip>
                  </li>
                  <li>
                    <Image
                      src="/madal-2.svg"
                      alt="abc"
                      width={18}
                      height={36}
                      className="madal"
                    />

                    <Tooltip
                      color="var(--primary)"
                      title="Some hover information can come"
                    >
                      <span>Team Name Second</span>
                    </Tooltip>
                  </li>
                  <li>
                    <Image
                      src="/madal-3.svg"
                      alt="abc"
                      width={18}
                      height={36}
                      className="madal"
                    />
                    <Tooltip title="Some hover information can come">
                      <span>Team Name Third</span>
                    </Tooltip>
                  </li>
                </ul>
              </div>
              <div className="progress">
                <Typography.Title level={4} className="italic">
                  Player Statistics
                </Typography.Title>
                <div className="flex items-center justify-between mt-2">
                  <span>YDS</span>
                  <span>
                    1389 <small>16TH</small>
                  </span>
                </div>
                <Progress
                  percent={50}
                  size={["100%", 26]}
                  strokeLinecap="butt"
                  showInfo={false}
                  className="success"
                />
                <div className="flex items-center justify-between mt-2">
                  <span>TD</span>
                  <span>
                    6 <small>TIED - 21ST</small>
                  </span>
                </div>
                <Progress
                  percent={30}
                  size={["100%", 26]}
                  strokeLinecap="butt"
                  showInfo={false}
                  className="error"
                />
                <div className="flex items-center justify-between mt-2">
                  <span>INT</span>
                  <span>
                    8 <small>TIED - 69ST</small>
                  </span>
                </div>
                <Progress
                  percent={10}
                  size={["100%", 26]}
                  strokeLinecap="butt"
                  showInfo={false}
                  className="warning"
                />
                <div className="flex items-center justify-between mt-2">
                  <span>QBR</span>
                  <span>
                    61.0 <small>11TH</small>
                  </span>
                </div>
                <Progress
                  percent={12}
                  size={["100%", 26]}
                  strokeLinecap="butt"
                  showInfo={false}
                  className="success"
                />
              </div>
              <Flex vertical className="w-full achievements mb-3">
                <Typography.Title level={4} className="italic">
                  Other Info
                </Typography.Title>
                <Flex justify="space-between" align="center" className="gray">
                  <Typography.Title level={5} className="flex items-center">
                    Last Played
                  </Typography.Title>
                  <Typography.Text>January 10, 2024</Typography.Text>
                </Flex>
              </Flex>
            </Flex>
          </Flex>
        </Flex>
      </Flex>
    </div>
  );
}

// Main export component wrapped with Suspense
export default function AthleteCompare() {
  return (
    <Suspense fallback={<div className="loading">Loading...</div>}>
      <AthleteCompareContent />
    </Suspense>
  );
}
