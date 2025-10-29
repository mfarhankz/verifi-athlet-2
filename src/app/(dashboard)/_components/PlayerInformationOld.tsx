"use client";

import type { TabsProps } from "antd";
import { Flex, Table, Tabs, Select } from "antd";
import Image from "next/image";
import type { TableColumnsType } from "antd";
import CommentBox from "./CommentBox";
import ProgressBar from "@/components/ProgressBar";

const onChange = (key: string) => {
  console.log(key);
};

const handleChange = (value: string) => {
  console.log(`selected ${value}`);
};

interface DataType {
  key: string;
  season: string;
  team: string;
  gp: number;
  cmp: number;
  att: number;
  cmp2: number;
  yds: number;
  avg: number;
  td: number;
  int: number;
  lng: number;
  sack: number;
  rtg: number;
  qbr: number | string;
}

const dataSource: DataType[] = [
  {
    key: "1",
    season: "2018",
    team: "KC",
    gp: 1374,
    cmp: 6065,
    att: 6690,
    cmp2: 5948,
    yds: 3536,
    avg: 8811,
    td: 1784,
    int: 9261,
    lng: 8829,
    sack: 6025,
    rtg: 5028,
    qbr: 4600,
  },
  {
    key: "2",
    season: "2019",
    team: "KC",
    gp: 8013,
    cmp: 5560,
    att: 3933,
    cmp2: 1577,
    yds: 8861,
    avg: 5560,
    td: 8861,
    int: 8861,
    lng: 6025,
    sack: 5045,
    rtg: 9359,
    qbr: 5626,
  },
  {
    key: "3",
    season: "2020",
    team: "KC",
    gp: 6065,
    cmp: 1784,
    att: 4600,
    cmp2: 6690,
    yds: 9151,
    avg: 9151,
    td: 9261,
    int: 6065,
    lng: 1439,
    sack: 5028,
    rtg: 4600,
    qbr: 4846,
  },
  {
    key: "4",
    season: "2021",
    team: "KC",
    gp: 1148,
    cmp: 4152,
    att: 9151,
    cmp2: 5028,
    yds: 8829,
    avg: 4846,
    td: 9261,
    int: 1439,
    lng: 4349,
    sack: 9151,
    rtg: 6025,
    qbr: 8013,
  },
  {
    key: "5",
    season: "2022",
    team: "KC",
    gp: 7791,
    cmp: 8013,
    att: 4152,
    cmp2: 8829,
    yds: 9462,
    avg: 5045,
    td: 4846,
    int: 4846,
    lng: 8811,
    sack: 6025,
    rtg: 9374,
    qbr: 3933,
  },
  {
    key: "6",
    season: "2023",
    team: "KC",
    gp: 8811,
    cmp: 4349,
    att: 1577,
    cmp2: 9151,
    yds: 9374,
    avg: 1374,
    td: 6690,
    int: 7791,
    lng: 1577,
    sack: 8861,
    rtg: 6065,
    qbr: 2798,
  },
  {
    key: "7",
    season: "2024",
    team: "KC",
    gp: 9374,
    cmp: 1577,
    att: 5948,
    cmp2: 4600,
    yds: 8861,
    avg: 1374,
    td: 1439,
    int: 1148,
    lng: 5948,
    sack: 8861,
    rtg: 2798,
    qbr: 9151,
  },
  {
    key: "8",
    season: "Career",
    team: "",
    gp: 7791,
    cmp: 8013,
    att: 4152,
    cmp2: 8829,
    yds: 9462,
    avg: 5045,
    td: 4846,
    int: 4846,
    lng: 8811,
    sack: 6025,
    rtg: 9374,
    qbr: "-",
  },
];

const columns: TableColumnsType<DataType> = [
  {
    title: "Season",
    dataIndex: "season",
    key: "season",
  },
  {
    title: " Team",
    dataIndex: "team",
    key: "team",
    render: (_, record) => (
      <div className="flex">
        {record.team && (
          <Image
            src="/kisspng.svg"
            alt={record.team}
            width={38}
            height={23}
            className="mr-2"
          />
        )}
        {record.team}
      </div>
    ),
  },
  {
    title: "GP",
    dataIndex: "gp",
    key: "gp",
  },
  {
    title: "CMP",
    dataIndex: "cmp",
    key: "cmp",
  },
  {
    title: "ATT",
    dataIndex: "att",
    key: "att",
  },
  {
    title: "CMP",
    dataIndex: "cmp2",
    key: "cmp2",
  },
  {
    title: "YDS",
    dataIndex: "yds",
    key: "yds",
  },
  {
    title: "AVG",
    dataIndex: "avg",
    key: "avg",
  },
  {
    title: "TD",
    dataIndex: "td",
    key: "td",
  },
  {
    title: "INT",
    dataIndex: "int",
    key: "int",
  },
  {
    title: "LNG",
    dataIndex: "lng",
    key: "lng",
  },
  {
    title: "SACK",
    dataIndex: "sack",
    key: "sack",
  },
  {
    title: "RTG",
    dataIndex: "rtg",
    key: "rtg",
  },
  {
    title: "QBR",
    dataIndex: "qbr",
    key: "qbr",
  },
];

interface RawMeasureables {
  key: string;
  date: string;
  source: string;
  measure: string;
  value: string;
  score: number;
  link: string;
}

const rawMeasureablesColumns = [
  {
    title: "Date",
    dataIndex: "date",
    key: "date",
  },
  {
    title: "Source",
    dataIndex: "source",
    key: "source",
  },
  {
    title: "Measure",
    dataIndex: "measure",
    key: "measure",
  },
  {
    title: "Value",
    dataIndex: "value",
    key: "value",
  },
  {
    title: "Score",
    dataIndex: "score",
    key: "score",
  },

  {
    title: "Link",
    dataIndex: "link",
    key: "link",
    render: (_: unknown, record: RawMeasureables) => (
      <a href={record.link} className="flex items-center">
        View Link
      </a>
    ),
  },
];

const rawMeasureables: RawMeasureables[] = [
  {
    key: "1",
    date: "5/2/2025",
    source: "GPS",
    measure: "Max Speed",
    value: "35.2 km/h",
    score: 92,
    link: "http://localhost:3000/new-pages",
  },
  {
    key: "2",
    date: "2/3/2025",
    source: "Coach",
    measure: "Vertical Jump",
    value: "32.5 in",
    score: 85,
    link: "http://localhost:3000/new-pages",
  },
  {
    key: "3",
    date: "5/4/2025",
    source: "Catapult",
    measure: "Resting HR",
    value: "5560",
    score: 88,
    link: "http://localhost:3000/new-pages",
  },
  {
    key: "4",
    date: "3/6/2025",
    source: "Strength Coach",
    measure: "10m Sprint Time",
    value: "5560",
    score: 82,
    link: "http://localhost:3000/new-pages",
  },
  {
    key: "5",
    date: "6/7/2025",
    source: "VBT Device",
    measure: "Back Squat 1RM",
    value: "2.85 m",
    score: 78,
    link: "http://localhost:3000/new-pages",
  },
  {
    key: "6",
    date: "6/7/2025",
    source: "Coach",
    measure: "Standing Broad Jump",
    value: "7.5 hours",
    score: 34,
    link: "http://localhost:3000/new-pages",
  },
  {
    key: "7",
    date: "6/7/2025",
    source: "Wearable",
    measure: "Sleep Duration",
    value: "5560",
    score: 36,
    link: "http://localhost:3000/new-pages",
  },
];

const Activity = () => (
  <div className="activity">
    <h4>Committed To</h4>
    <div className="flex items-center  justify-between p-4 ">
      <div className="flex items-center  space-x-4">
        <div className=" bg-gray-200   flex items-center justify-center">
          <Image
            className="card object-contain"
            src="/turbo.png"
            alt="abc"
            width={95}
            height={95}
          />
        </div>

        <div>
          <h5 className="!text-xl font-semibold italic text-[#1C1D4D]">
            Tennessee Titans College
          </h5>
          <div className="flex items-center space-x-3 text-sm">
            <span className="flex gap-1 items-center card font-medium">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="19"
                height="19"
                viewBox="0 0 19 19"
                fill="none"
              >
                <path
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  d="M3.76302 1.58301C2.56065 1.58301 1.58594 2.55772 1.58594 3.76009V15.6351C1.58594 16.8375 2.56065 17.8122 3.76302 17.8122H15.638C16.8404 17.8122 17.8151 16.8375 17.8151 15.6351V3.76009C17.8151 2.55772 16.8404 1.58301 15.638 1.58301H3.76302ZM13.4753 7.8294C13.7553 7.49351 13.7099 6.99432 13.374 6.71441C13.0381 6.43451 12.5389 6.47989 12.259 6.81577L8.85565 10.8998L7.48948 9.53364C7.18031 9.22449 6.67906 9.22449 6.36989 9.53364C6.06073 9.84278 6.06073 10.3441 6.36989 10.6532L8.34907 12.6324C8.50637 12.7897 8.7225 12.8735 8.94472 12.8635C9.16694 12.8533 9.37467 12.7503 9.51701 12.5794L13.4753 7.8294Z"
                  fill="#2BB650"
                />
              </svg>
              <span className="italic">Walk ON</span>
            </span>
            <span className="text-[#1C1D4D]  cursor-pointer">HS Source</span>
            <span className="text-blue-600 underline cursor-pointer">
              View Source
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">29/11/2026</p>
        </div>
      </div>

      <button className="px-4 py-2 text-sm font-medium text-gray-700 card">
        Not Committed
      </button>
    </div>

    <h4>Offers & Visits</h4>
    <div className="">
      <h5 className="text-xl font-semibold text-gray-900 mb-4">Offers (18)</h5>

      <div className="flex flex-wrap gap-3">
        <div className="group cursor-pointer relative card">
          <Image
            src="/red-bird.png"
            alt="abc"
            width={95}
            height={95}
            className="w-16 h-16 object-contain rounded-lg border border-gray-200 p-1 transition-transform group-hover:scale-110"
          />
        </div>

        <div className="group cursor-pointer relative card">
          <Image
            src="/a.png"
            alt="abc"
            width={95}
            height={95}
            className="w-16 h-16 object-contain rounded-lg border border-gray-200 p-1 transition-transform group-hover:scale-110"
          />
        </div>

        <div className="group cursor-pointer relative card">
          <Image
            src="/wolf.png"
            alt="abc"
            width={95}
            height={95}
            className="w-16 h-16 object-contain rounded-lg border border-gray-200 p-1 transition-transform group-hover:scale-110"
          />
        </div>

        <div className="group cursor-pointer relative card">
          <Image
            src="/dog.png"
            alt="abc"
            width={95}
            height={95}
            className="w-16 h-16 object-contain rounded-lg border border-gray-200 p-1 transition-transform group-hover:scale-110"
          />
        </div>

        <div className="group cursor-pointer relative card">
          <Image
            src="/uc.png"
            alt="abc"
            width={95}
            height={95}
            className="w-16 h-16 object-contain rounded-lg border border-gray-200 p-1 transition-transform group-hover:scale-110"
          />
        </div>

        <div className="group cursor-pointer relative card">
          <Image
            src="/a-star.png"
            alt="abc"
            width={95}
            height={95}
            className="w-16 h-16 object-contain rounded-lg border border-gray-200 p-1 transition-transform group-hover:scale-110"
          />
        </div>

        <div className="group cursor-pointer relative card">
          <Image
            src="/ku.png"
            alt="abc"
            width={95}
            height={95}
            className="w-16 h-16 object-contain rounded-lg border border-gray-200 p-1 transition-transform group-hover:scale-110"
          />
        </div>

        <div className="group cursor-pointer relative card">
          <Image
            src="/red-a.png"
            alt="abc"
            width={95}
            height={95}
            className="w-16 h-16 object-contain rounded-lg border border-gray-200 p-1 transition-transform group-hover:scale-110"
          />
        </div>

        <div className="group cursor-pointer relative card">
          <Image
            src="/k.png"
            alt="abc"
            width={95}
            height={95}
            className="w-16 h-16 object-contain rounded-lg border border-gray-200 p-1 transition-transform group-hover:scale-110"
          />
        </div>

        <div className="group cursor-pointer relative card">
          <Image
            src="/american.png"
            alt="abc"
            width={95}
            height={95}
            className="w-16 h-16 object-contain rounded-lg border border-gray-200 p-1 transition-transform group-hover:scale-110"
          />
        </div>

        <div className="group cursor-pointer relative card">
          <Image
            src="/nfl.png"
            alt="abc"
            width={95}
            height={95}
            className="w-16 h-16 object-contain rounded-lg border border-gray-200 p-1 transition-transform group-hover:scale-110"
          />
        </div>

        <div className="group cursor-pointer relative card">
          <Image
            src="/eagle.png"
            alt="abc"
            width={95}
            height={95}
            className="w-16 h-16 object-contain rounded-lg border border-gray-200 p-1 transition-transform group-hover:scale-110"
          />
        </div>

        <div className="group cursor-pointer relative card">
          <Image
            src="/ucf.png"
            alt="abc"
            width={95}
            height={95}
            className="w-16 h-16 object-contain rounded-lg border border-gray-200 p-1 transition-transform group-hover:scale-110"
          />
        </div>

        <div className="group cursor-pointer relative card">
          <Image
            src="/lobos.png"
            alt="abc"
            width={95}
            height={95}
            className="w-16 h-16 object-contain rounded-lg border border-gray-200 p-1 transition-transform group-hover:scale-110"
          />
        </div>

        <div className="group cursor-pointer relative card">
          <Image
            src="/b.png"
            alt="abc"
            width={95}
            height={95}
            className="w-16 h-16 object-contain rounded-lg border border-gray-200 p-1 transition-transform group-hover:scale-110"
          />
        </div>

        <div className="group cursor-pointer relative card">
          <Image
            src="/tiger.png"
            alt="abc"
            width={95}
            height={95}
            className="w-16 h-16 object-contain rounded-lg border border-gray-200 p-1 transition-transform group-hover:scale-110"
          />
        </div>

        <div className="group cursor-pointer relative card">
          <Image
            src="/men.png"
            alt="abc"
            width={95}
            height={95}
            className="w-16 h-16 object-contain rounded-lg border border-gray-200 p-1 transition-transform group-hover:scale-110"
          />
        </div>

        <div className="group cursor-pointer relative card">
          <Image
            src="/warrior.png"
            alt="abc"
            width={95}
            height={95}
            className="w-16 h-16 object-contain rounded-lg border border-gray-200 p-1 transition-transform group-hover:scale-110"
          />
        </div>
      </div>
    </div>
    <div className=" mt-5">
      <table className="w-full card ">
        <thead className="">
          <tr className="bg-gray-50 border-b border-gray-200 border-t">
            <th className="text-left text-lg font-semibold text-gray-900 px-4 py-2">
              School Name
            </th>
            <th className="text-left text-lg font-semibold text-gray-900 px-6 py-4">
              Event Date
            </th>
            <th className="text-left text-lg font-semibold text-gray-900 px-8 py-4">
              Type
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          <tr className="">
            <td className="px-6 py-4 card flex items-center space-x-4">
              <img
                src="/a.png"
                alt="Georgia Tech Logo"
                className="w-12 h-12  card"
              />
              <div>
                <h5 className="font-semibold italic text-lg text-gray-900 m-0">
                  Georgia Tech Yellow Jacket
                </h5>
                <p className="text-gray-600 text-sm m-0">
                  Jason officially visits Georgia Tech yellow Jacket
                </p>
              </div>
            </td>

            <td className="px-6 py-4 card text-gray-800 text-lg">11/12/2024</td>

            <td className="px-6 py-4 card">
              <div className="flex items-center space-x-2 text-lg text-gray-900">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="17"
                  height="17"
                  viewBox="0 0 17 17"
                  fill="none"
                >
                  <rect width="16.5361" height="16.5361" fill="#2BB650" />
                  <path
                    d="M6.49521 11.8233C6.22483 11.8233 5.95445 11.7237 5.74099 11.5102L3.60639 9.37563C3.1937 8.96294 3.1937 8.27987 3.60639 7.86718C4.01908 7.45449 4.70215 7.45449 5.11484 7.86718L6.49521 9.24755L11.4332 4.30952C11.8459 3.89683 12.529 3.89683 12.9417 4.30952C13.3544 4.72221 13.3544 5.40528 12.9417 5.81796L7.24944 11.5102C7.05021 11.7237 6.7656 11.8233 6.49521 11.8233Z"
                    fill="white"
                  />
                </svg>
                <span>Official Visit</span>
              </div>
            </td>
          </tr>

          <tr className="">
            <td className="px-6 py-4 card flex items-center space-x-4">
              <img
                src="/red-bird.png"
                alt="Clemson Tigers Logo"
                className="w-12 h-12 card"
              />
              <div>
                <h5 className="font-semibold m-0 italic text-lg text-gray-900">
                  Clemson Tigers
                </h5>
                <p className="text-gray-600 text-sm m-0">
                  Jason officially visits Georgia Tech yellow Jacket
                </p>
              </div>
            </td>

            <td className="px-6 py-4 card text-gray-800 text-lg">9/12/2024</td>

            <td className="px-6 py-4 card">
              <div className="flex items-center space-x-2 text-lg text-gray-900">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="17"
                  height="17"
                  viewBox="0 0 17 17"
                  fill="none"
                >
                  <rect width="16.5361" height="16.5361" fill="#2BB650" />
                  <path
                    d="M6.49521 11.8233C6.22483 11.8233 5.95445 11.7237 5.74099 11.5102L3.60639 9.37563C3.1937 8.96294 3.1937 8.27987 3.60639 7.86718C4.01908 7.45449 4.70215 7.45449 5.11484 7.86718L6.49521 9.24755L11.4332 4.30952C11.8459 3.89683 12.529 3.89683 12.9417 4.30952C13.3544 4.72221 13.3544 5.40528 12.9417 5.81796L7.24944 11.5102C7.05021 11.7237 6.7656 11.8233 6.49521 11.8233Z"
                    fill="white"
                  />
                </svg>
                <span>Official Visit</span>
              </div>
            </td>
          </tr>

          <tr className="">
            <td className="px-6 py-4 card flex items-center space-x-4">
              <img
                src="/wolf.png"
                alt="Georgia Tech Logo"
                className="w-12 h-12 card"
              />
              <div>
                <h5 className="font-semibold italic text-lg m-0 text-gray-900">
                  Louisville Cardinals
                </h5>
                <p className="text-gray-600 text-sm m-0">
                  Jason officially visits Georgia Tech yellow Jacket
                </p>
              </div>
            </td>
            <td className="px-6 py-4 card text-gray-800 text-lg">6/12/2024</td>
            <td className="px-6 py-4 card text-lg text-gray-900">
              Unofficial Visit
            </td>
          </tr>

          <tr className="">
            <td className="px-6 py-4 card flex items-center space-x-4">
              <img
                src="/dog.png"
                alt="Georgia Tech Logo"
                className="w-12 h-12 card"
              />
              <div>
                <p className="font-semibold italic text-lg m-0 text-gray-900">
                  Louisiana-Monroe Offer
                </p>
                <p className="text-gray-600 text-sm m-0">
                  Jason officially visits Georgia Tech yellow Jacket
                </p>
              </div>
            </td>
            <td className="px-6 card py-4 text-gray-800 text-lg">29/11/2024</td>
            <td className="px-6 card py-4 text-lg text-gray-900">
              Unofficial Visit
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);

const Video = () => (
  <div className="video">
    <h4>Video Information</h4>
  </div>
);

const Bio = () => (
  <div className="bio">
    <h4>Academic Info</h4>
    <div className="grid grid-cols-3 mb-11 font-semibold italic">
      <div>
        Desire Major <div>Journalism</div>
      </div>
      <div>
        GPA <div>GPA 3.5 (Predicted 3.8)</div>
      </div>
      <div>
        SAT/ACT <div>5/20</div>
      </div>
    </div>
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-6  ">
        <h4>Parent Contact Info</h4>
        <div>
          <h5>Mom’s Information</h5>
          <p>
            Jessica Martin (Doctor - MBBS from University of Florida) <br />{" "}
            (930) 2930 393
          </p>
        </div>
        <div className=" mt-9">
          <h5>Dad’s Information</h5>
          <p>
            Alex Martin (Real Estate - BBA from University of Taxes) <br />{" "}
            (930) 6549 203
          </p>
        </div>
      </div>
      <div className="col-span-6 ">
        <h4>Coach Contact Info</h4>
        <div>
          <p>
            Morgan Jason <br />
            University of Florida <br /> Cell: (930) 2930 393 <br />
            Home: (203) 9302 2034 <br /> Email:{" "}
            <span className="text-blue-500">morgan.jason@gmail.com</span>{" "}
          </p>
        </div>
      </div>
    </div>
  </div>
);

const Matrics = () => (
  <div>
    <h4>Matrics</h4>
    <div className="container mx-auto px-4">
      <div className="flex flex-wrap -mx-4 gap-1">
        <div className="w-full md:w-1/2 card px-4">
          <div className="rounded-md ">
            <div className="flex-1 px-2">
              <h4 className="mb-3 !bg-none italic">Athletic Projection</h4>

              <div className=" mr-5 flex items-center justify-center  border-black p-5">
                <div className="">
                  <h5 className="m-0 italic text-center">Current Projection</h5>
                  <h3 className="italic text-center ">D3 - Top Half</h3>
                  <ProgressBar
                    value={83}
                    height={55}
                    color="#2BB650"
                    label=""
                    labelSize="14"
                    labelWeight={400}
                    labelWidth={120}
                  />
                  <p className="mt-4">
                    The above current projection is calculated based on the
                    following statistics
                  </p>
                </div>
              </div>
              <div className=" flex  justify-center gap-4 bg-[#f3f8fb]">
                <div className="flex-1 px-2">
                  <h5 className=" mt-2 italic">Athletic Projection</h5>
                  <div className="flex flex-col gap-1">
                    <ProgressBar
                      value={85}
                      height={30}
                      color="#126DB8"
                      label="100 M"
                      labelSize="12"
                      labelWeight={400}
                      labelWidth={110}
                    />
                    <ProgressBar
                      value={50}
                      height={30}
                      color="#126DB8"
                      label="90 M"
                      labelSize="12"
                      labelWeight={400}
                      labelWidth={110}
                    />
                    <ProgressBar
                      value={67}
                      height={30}
                      color="#126DB8"
                      label="50 M"
                      labelSize="12"
                      labelWeight={400}
                      labelWidth={110}
                    />
                    <ProgressBar
                      value={54}
                      height={30}
                      color="#126DB8"
                      label="30 M"
                      labelSize="12"
                      labelWeight={400}
                      labelWidth={110}
                    />
                    <ProgressBar
                      value={96}
                      height={30}
                      color="#126DB8"
                      label="10 M"
                      labelSize="12"
                      labelWeight={400}
                      labelWidth={110}
                    />
                  </div>
                </div>

                <div className=" mr-5  items-center justify-center  border border-black p-5">
                  <div className="card">
                    <h5 className="m-0 italic text-center">10.09</h5>
                  </div>
                  <div className="mt-1 card">
                    <h5 className="m-0 italic text-center">6.2</h5>
                  </div>
                  <div className="mt-1 card">
                    <h5 className="m-0 italic text-center">7.4</h5>
                  </div>
                  <div className="mt-1 card">
                    <h5 className="m-0 italic text-center">4.4</h5>
                  </div>
                  <div className="mt-1 card">
                    <h5 className="m-0 italic text-center">9.2</h5>
                  </div>
                </div>
              </div>
              <div className=" flex mt-5 justify-center gap-4 bg-[#fff8f4]">
                <div className="flex-1 px-2">
                  <h5 className=" mt-2 italic">Athletic Projection</h5>
                  <div className="flex flex-col gap-1">
                    <ProgressBar
                      value={89}
                      height={30}
                      color="#FF7525"
                      label="247"
                      labelSize="12"
                      labelWeight={400}
                      labelWidth={110}
                    />
                    <ProgressBar
                      value={53}
                      height={30}
                      color="#FF7525"
                      label="ESPN"
                      labelSize="12"
                      labelWeight={400}
                      labelWidth={110}
                    />
                    <ProgressBar
                      value={68}
                      height={30}
                      color="#FF7525"
                      label="on3"
                      labelSize="12"
                      labelWeight={400}
                      labelWidth={110}
                    />
                  </div>
                </div>

                <div className=" mr-5  items-center justify-center  border border-black p-5">
                  <div className="card">
                    <h5 className="m-0 italic text-center">10.9</h5>
                  </div>
                  <div className="mt-1 card">
                    <h5 className="m-0 italic text-center">6.2</h5>
                  </div>
                  <div className="mt-1 card">
                    <h5 className="m-0 italic text-center">7.4</h5>
                  </div>
                </div>
              </div>
              <div className="flex-1 mt-5 px-2">
                <h4 className="mb-3 !bg-none italic">Athletic Projection</h4>
                <div className="flex flex-col gap-1">
                  <ProgressBar
                    value={13}
                    height={30}
                    color="#C00E1E"
                    label="HS Coach"
                    labelSize="12"
                    labelWeight={400}
                    labelWidth={110}
                  />
                  <ProgressBar
                    value={20}
                    height={30}
                    color="#2BB650"
                    label="Data Scraping"
                    labelSize="12"
                    labelWeight={400}
                    labelWidth={110}
                  />
                  <ProgressBar
                    value={12}
                    height={30}
                    color="#2BB650"
                    label="Offers"
                    labelSize="12"
                    labelWeight={400}
                    labelWidth={110}
                  />
                  <ProgressBar
                    value={32}
                    height={30}
                    color="#FF7525"
                    label="Honors"
                    labelSize="12"
                    labelWeight={400}
                    labelWidth={110}
                  />
                  <ProgressBar
                    value={18}
                    height={30}
                    color="#C00E1E"
                    label="Scouts"
                    labelSize="12"
                    labelWeight={400}
                    labelWidth={110}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full md:w-[49%] h-56  px-4">
          <div className="">
            <div className=" flex  justify-center card gap-4 bg-[#fff8f4]">
              <div className="flex-1 px-2">
                <div className="flex gap-2 items-center justify-between">
                  <h5 className=" mt-2 italic">Athletic Projection</h5>
                  <div className="flex gap-2 items-center">
                    <span className=" italic text-xl">Overall Score</span>
                    <span className="mt-1 text-xl font-medium card !bg-[#2BB650] text-white italic ">
                      85
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <ProgressBar
                    value={47}
                    height={30}
                    color="#2BB650"
                    label="Recuirtabilty"
                    labelSize="12"
                    labelWeight={500}
                    labelWidth={110}
                  />
                  <ProgressBar
                    value={55}
                    height={30}
                    color="#2BB650"
                    label="Stickiness"
                    labelSize="12"
                    labelWeight={500}
                    labelWidth={110}
                  />
                  <ProgressBar
                    value={84}
                    height={30}
                    color="#2BB650"
                    label="Athletics Impact"
                    labelSize="12"
                    labelWeight={500}
                    labelWidth={110}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="card  mt-5">
            <h3 className="text-xl font-semibold italic text-gray-800 mb-1 mt-3">
              Commitment Predictions
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              These commitment predictions will update but are frozen when the
              athlete commits
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="col-span-2 flex flex-col items-start justify-between bg-[#ebf8f2] p-4 rounded-md">
                <img src="/angry-bird.png" alt="Louisville" className="mb-2" />
                <h2 className="text-3xl !mb-0 font-bold text-gray-800">
                  33.3%
                </h2>
                <p className="!text-lg !font-semibold italic text-gray-700">
                  University of Louisville
                </p>
              </div>

              <div className="flex flex-col items-start justify-between bg-[#fff1e9] p-4 rounded-md">
                <img src="/uni.png" alt="Other" className="mb-2" />
                <h2 className="text-2xl !m-0 font-bold text-gray-800">28.7%</h2>
                <p className="!text-lg !m-0 !font-semibold text-gray-700">
                  Other
                </p>
              </div>

              <div className="flex flex-col items-start justify-between bg-[#f3ebfe] p-4 rounded-md">
                <img src="/uk.png" alt="Kentucky" className="mb-2" />
                <h3 className="text-2xl !m-0 font-bold text-gray-800">28.7%</h3>
                <p className="!text-sm !font-semibold italic text-gray-700">
                  University of Kentucky
                </p>
              </div>

              <div className="flex flex-col items-start justify-between bg-[#fff6cc] p-4 rounded-md">
                <img src="/v.png" alt="West Virginia" className="mb-2" />
                <h3 className="text-xl !m-0 font-bold text-gray-800">4.0%</h3>
                <p className="!text-lg !font-semibold italic text-gray-700">
                  West Virginia University
                </p>
              </div>

              <div className="flex flex-col items-start justify-between bg-[#fff6cc] p-4 rounded-md">
                <img src="./tm.png" alt="Florida State" className="mb-2" />
                <h3 className="text-xl !m-0 font-bold text-gray-800">4.0%</h3>
                <p className="!text-lg !font-semibold italic text-gray-700">
                  Florida State University
                </p>
              </div>

              <div className="flex flex-col items-start justify-between bg-[#e7f0f8] p-4 rounded-md">
                <img src="yt.png" alt="Virginia Tech" className="mb-2" />
                <h5 className="text-lg !m-0 font-bold text-gray-800">2.9%</h5>
                <p className="!text-lg !font-semibold italic text-gray-700">
                  Virginia Tech
                </p>
              </div>

              <div className="flex flex-col items-start justify-between bg-[#e7f0f8] p-4 rounded-md">
                <img
                  src="/red-wolf.png"
                  alt="Arkansas State"
                  className="mb-2"
                />
                <h5 className="text-lg !m-0 font-bold text-gray-800">2.0%</h5>
                <p className="!text-lg !font-semibold italic text-gray-700">
                  Arkansas State University
                </p>
              </div>

              <div className="flex flex-col items-start justify-between bg-[#e7f0f8] p-4 rounded-md">
                <img
                  src="/red-eagle.png"
                  alt="Boston College"
                  className="mb-2"
                />
                <h5 className="text-lg !m-0 font-bold text-gray-800">2.0%</h5>
                <p className="!text-lg !font-semibold italic text-gray-700">
                  Boston College
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
const RawMeasureables = () => (
  <div>
    <div className="mb-10">
      <h4>Raw Measureables</h4>
      <div className="mb-4 flex gap-2 justify-end">
        <Select
          defaultValue="Date Range"
          onChange={handleChange}
          options={[
            { value: "jack", label: "Jack" },
            { value: "lucy", label: "Lucy" },
          ]}
        />
        <Select
          defaultValue="Measure"
          onChange={handleChange}
          options={[
            { value: "jack", label: "Jack" },
            { value: "lucy", label: "Lucy" },
          ]}
        />
        <Select
          defaultValue="Source"
          onChange={handleChange}
          options={[
            { value: "jack", label: "Jack" },
            { value: "lucy", label: "Lucy" },
          ]}
        />
      </div>
      <Table
        dataSource={rawMeasureables}
        columns={rawMeasureablesColumns}
        pagination={false}
      />{" "}
    </div>
  </div>
);

const Survey = () => (
  <div>
    <div>
      <h4>Schools Athlete is Interested IN</h4>
      <div className="text-[#1C1D4D] text-sm">
        <div className="flex items-start space-x-4">
          <div className="card">
            <Image src="/bull-img.png" alt="abc" width={79} height={73} />
          </div>
          <div>
            <h5 className="mb-0 mt-1 !text-[22px] !font-[500]">
              Bulls College New York
            </h5>
            <p className="italic font-[500] mt-2 mb-2">Walk ON</p>
            <p className="m-0">Yes</p>
          </div>
        </div>

        <p className="mt-6 text-xs">Showing 1-1 of 1</p>
      </div>
    </div>
    <div>
      <h4>High School Coach Data</h4>

      <div className="mb-4">
        <p className=" mb-6">
          The data below has been provided by the high school coach and has not
          been confirmed by Verified Athletics
        </p>

        <div className="grid grid-cols-4  font-semibold italic">
          <div>Athletic Info</div>
          <div>Coach Weight</div>
          <div>Coach Height</div>
          <div>Coach GPA</div>
        </div>

        <div className="grid grid-cols-4  mt-1 font-normal not-italic">
          <div>some info</div>
          <div>140lbs</div>
          <div>6.1”</div>
          <div>4.3</div>
        </div>
      </div>
    </div>
    <div>
      <h4>Campus Information (Section F)</h4>
      <div className="flex items-center survey mb-5">
        <i className="icon-arrow-right text-2xl mr-2"></i>
        <div>
          <h6>
            Do you prefer your campus location to have all four seasons or be
            warm year round?
          </h6>
          <p className="m-0">No Preference</p>
        </div>
      </div>
      <div className="flex items-center survey mb-5">
        <i className="icon-arrow-right mr-2"></i>
        <div>
          <h6>
            What is the ideal location for you to go to school? (At least enter
            a state or enter None)
          </h6>
          <p className="m-0">New York, </p>
        </div>
      </div>
      <div className="flex items-center survey mb-5">
        <i className="icon-arrow-right mr-2"></i>
        <div>
          <h6>
            Within what distance do you want to be from your ideal location?
          </h6>
          <p className="m-0">California </p>
        </div>
      </div>
      <div className="flex items-center survey mb-5">
        <i className="icon-arrow-right mr-2"></i>
        <div>
          <h6>
            What is your ideal campus size (# indicates full-time undergrads)? 
          </h6>
          <p className="m-0">Yes full-time </p>
        </div>
      </div>
      <div className="flex items-center survey mb-5">
        <i className="icon-arrow-right mr-2"></i>
        <div>
          <h6>
            Do you want to include military schools? (Army, Navy, Air Force,
            Virginia Military Institute, Coast Guard Academy, Merchant Marine
            Academy)
          </h6>
          <p className="m-0">No</p>
        </div>
      </div>
      <div className="flex items-center survey mb-5">
        <i className="icon-arrow-right mr-2"></i>
        <div>
          <h6>
            Do you prefer to attend an HBCU (Historically Black College and
            University)?
          </h6>
          <p className="m-0">LA University </p>
        </div>
      </div>
    </div>
  </div>
);
const Notes = () => (
  <Flex vertical>
    <h4>Notes</h4>
    <CommentBox />
  </Flex>
);

const items: TabsProps["items"] = [
  {
    key: "1",
    label: "Activity",
    children: <Activity />,
  },
  {
    key: "2",
    label: "Videos",
    children: <Video />,
  },
  {
    key: "3",
    label: "Bio",
    children: <Bio />,
  },
  {
    key: "4",
    label: "Matrics",
    children: <Matrics />,
  },
  {
    key: "5",
    label: "Raw Measurables",
    children: <RawMeasureables />,
  },
  {
    key: "6",
    label: "Survey",
    children: <Survey />,
  },
  {
    key: "7",
    label: "Notes",
    children: <Notes />,
  },
];

export default function PlayerInformationOld() {
  return (
    <Tabs
      defaultActiveKey="1"
      items={items}
      onChange={onChange}
      className="player-information"
    />
  );
}
