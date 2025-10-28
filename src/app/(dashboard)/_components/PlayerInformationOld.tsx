"use client";

import type { TabsProps } from "antd";
import { Flex, Table, Tabs, Select } from "antd";
import Image from "next/image";
import type { TableColumnsType } from "antd";
import CommentBox from "./CommentBox";

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

interface GameLog {
  key: string;
  date: string;
  res: string;
  cmp: number;
  att: number;
  cmp2: number;
  yds: number;
  avg: number;
  td: number;
  int: number;
  lng: number;
  sack: number;
}

const gameLog: GameLog[] = [
  {
    key: "1",
    date: "Sun 10/20",
    res: "28-20",
    cmp: 6065,
    att: 6690,
    cmp2: 5948,
    yds: 3536,
    avg: 8811,
    td: 1784,
    int: 9261,
    lng: 8829,
    sack: 6025,
  },
  {
    key: "2",
    date: "Mon 10/7",
    res: "11-29",
    cmp: 5560,
    att: 3933,
    cmp2: 1577,
    yds: 8861,
    avg: 5560,
    td: 8861,
    int: 8861,
    lng: 6025,
    sack: 5045,
  },
  {
    key: "3",
    date: "Sun 9/29",
    res: "29-30",
    cmp: 5560,
    att: 3933,
    cmp2: 1577,
    yds: 8861,
    avg: 5560,
    td: 8861,
    int: 8861,
    lng: 6025,
    sack: 5045,
  },
  {
    key: "4",
    date: "Sun 9/22",
    res: "22-20",
    cmp: 5560,
    att: 3933,
    cmp2: 1577,
    yds: 8861,
    avg: 5560,
    td: 8861,
    int: 8861,
    lng: 6025,
    sack: 5045,
  },
  {
    key: "5",
    date: "Thu 9/5",
    res: "28-30",
    cmp: 5560,
    att: 3933,
    cmp2: 1577,
    yds: 8861,
    avg: 5560,
    td: 8861,
    int: 8861,
    lng: 6025,
    sack: 5045,
  },
];

const gameLogColumns = [
  {
    title: "Date",
    dataIndex: "date",
    key: "date",
  },
  {
    title: "Result",
    dataIndex: "res",
    key: "res",
    render: (_: unknown, record: GameLog) => (
      <div className="flex items-center">
        {record.res && (
          <div className="flex justify-center items-center h-5 w-5 bg-[#2BB650] mr-2">
            <Image src="/w.svg" alt={record.res} width={16} height={13} />
          </div>
        )}
        {record.res}
      </div>
    ),
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
    title: "CMP2",
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
];

const Activity = () => (
  <div className="activity">
    <h4>Activity Information</h4>
  </div>
);

const Video = () => (
  <div className="video">
    <h4>Video Information</h4>
  </div>
);

const Bio = () => (
  <div className="bio">
    <h4>Contact Information</h4>
    <div className="grid grid-cols-2 p-5 gap-y-10">
      <div>
        <h6>Cell Phone</h6>
        <h5>(314) 412 2995</h5>
      </div>
      <div>
        <h6>OK to Connect</h6>
        <h5 className="flex">
          <Image
            className="mr-1"
            src={"/tick.svg"}
            alt={"Tick"}
            width={20}
            height={20}
          />
          Yes
        </h5>
      </div>
      <div>
        <h6>Email Address</h6>
        <h5>
          <a href="#">mrsh543@gmail.com</a>
        </h5>
      </div>
      <div>
        <h6>Birthday</h6>
        <h5>9/17/1995 (29)</h5>
      </div>
      <div className="col-span-2">
        <h6>Preferred Contact Way</h6>
        <h5>Text, Email</h5>
      </div>
      <div>
        <h6>Helping with Decesion</h6>
        <h5>Parent</h5>
      </div>
      <div>
        <h6>Contact Info</h6>
        <h5 className="flex items-center mb-3">
          <span className="ms">MS</span>Matt Sarish (314) 304 2234
        </h5>
        <h5 className="flex items-center">
          <span className="js">JS</span>Joellen Sarish (739) 392 2945
        </h5>
      </div>
    </div>
    <h4>Academy Details</h4>
    <div className="grid grid-cols-2 p-5 gap-y-8">
      <div>
        <h6>GPA</h6>
        <h5>3.20</h5>
      </div>
      <div>
        <h6>Major</h6>
        <h5>Sports Management</h5>
      </div>
      <div>
        <h6>Importance</h6>
        <h5>Sports Importance</h5>
      </div>
    </div>

    <h4>College Roster Bio</h4>
    <div className="px-3">
      <p className="my-3">
        Sed ut perspiciatis unde omnis iste natus error sit voluptatem
        accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab
        illo inventore veritatis et quasi architecto beatae vitae dicta sunt
        explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut
        odit aut fugit, sed quia consequuntur magni.
      </p>
      <a className="text-base font-semibold" href="#">
        Show more...
      </a>
    </div>
  </div>
);

const Stats = () => (
  <div>
    <div className="mb-10">
      <h4>
        Passing <span>89%</span>
      </h4>
      <Table
        dataSource={dataSource}
        columns={columns}
        pagination={false}
        className="with-footer"
      />
    </div>
    <div className="mb-10">
      <h4>
        Defense <span>49%</span>
      </h4>
      <Table
        dataSource={dataSource}
        columns={columns}
        pagination={false}
        className="with-footer"
      />
    </div>
    <div>
      <h4>
        Receiving <span>69%</span>
      </h4>
      <Table
        dataSource={dataSource}
        columns={columns}
        pagination={false}
        className="with-footer"
      />
    </div>
  </div>
);
const GameLog = () => (
  <div>
    <div className="mb-10">
      <h4>Raw Measureables</h4>
      <Select
        defaultValue="WR (0)"
        onChange={handleChange}
        options={[
          { value: "jack", label: "Jack" },
          { value: "lucy", label: "Lucy" },
        ]}
      />
      <Table dataSource={gameLog} columns={gameLogColumns} pagination={false} />{" "}
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
    children: <Stats />,
  },
  {
    key: "5",
    label: "Raw Measurables",
    children: <GameLog />,
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
