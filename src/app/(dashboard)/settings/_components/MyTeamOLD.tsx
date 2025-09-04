// "use client";

// import {
//   Button,
//   Flex,
//   Input,
//   Layout,
//   Radio,
//   Space,
//   Table,
//   Typography,
// } from "antd";
// import type {RadioChangeEvent, TableColumnsType, TableProps } from "antd";
// import TextArea from "antd/es/input/TextArea";
// import Image from "next/image";
// import Link from "next/link";
// import CoachInvite from "../../_components/CoachInvite";
// import { useState } from "react";
// // Team Alerts
// interface TeamAlert {
//   key: React.Key;
//   id: string;
//   coachFirstName: string;
//   coachLastName: string;
//   requestedDate: string;
//   rules: string;
//   recipient: string;
//   otherReceptions: string;
// }

// interface DataType {
//   key: React.Key;
//   id: string;
//   firstName: string;
//   lastName: string;
//   email: string;
//   img: string;
// }

// const rowSelection: TableProps<DataType>["rowSelection"] = {
//     onChange: (selectedRowKeys: React.Key[], selectedRows: DataType[]) => {
//       console.log(
//         `selectedRowKeys: ${selectedRowKeys}`,
//         "selectedRows: ",
//         selectedRows
//       );
//     },
//     // getCheckboxProps: (record: DataType) => ({
//     //   disabled: record.firstName === "Disabled User",
//     //   name: record.firstName,
//     // }),
//   };

// export default function MyTeam() {
//   const data: DataType[] = [
//     {
//       key: "1",
//       id: "1",
//       firstName: "John",
//       lastName: "Brown",
//       email: "michael.mitc@example.com",
//       img: "/c1.svg",
//     },
//     {
//       key: "2",
//       id: "2",
//       firstName: "Abigail",
//       lastName: "Wright",
//       email: "michelle.rivera@example.com",
//       img: "/c2.svg",
//     },
//     {
//       key: "3",
//       id: "3",
//       firstName: "Michael",
//       lastName: "Johnson",
//       email: "nathan.roberts@example.com",
//       img: "/c1.svg",
//     },
//     {
//       key: "4",
//       id: "4",
//       firstName: "David",
//       lastName: "Miller",
//       email: "georgia.young@example.com",
//       img: "/c3.svg",
//     },
//     {
//       key: "5",
//       id: "5",
//       firstName: "Ella",
//       lastName: "Green",
//       email: "tanya.hill@example.com",
//       img: "/c4.svg",
//     },
//     {
//       key: "6",
//       id: "6",
//       firstName: "Chloe",
//       lastName: "King",
//       email: "kenzi.lawson@example.com",
//       img: "/c5.svg",
//     },
//     {
//       key: "7",
//       id: "7",
//       firstName: "Matthew",
//       lastName: "Clark",
//       email: "deanna.curtis@example.com",
//       img: "/c6.svg",
//     },
//     {
//       key: "8",
//       id: "8",
//       firstName: "Martin",
//       lastName: "James",
//       email: "jackson.graham@example.com",
//       img: "/c2.svg",
//     },
//   ];
//   const columns: TableColumnsType<DataType> = [
//     {
//       title: "Player Name",
//       dataIndex: "name",
//       render: (_: unknown, record: DataType) => (
//         <div className="coaches flex items-center">
//           {record.firstName && (
//             <div className="flex justify-center items-center mr-3">
//               {/* <Checkbox onChange={onChange} /> */}
//               <Image
//                 src={record.img}
//                 alt={record.firstName}
//                 width={90}
//                 height={90}
//               />
//             </div>
//           )}
//           <Flex vertical>
//             <h4 className="custom-h3">
//               <span>{record.firstName}</span> {record.lastName}
//             </h4>
//             <a className="text-lg">{record.email}</a>
//           </Flex>
//         </div>
//       ),
//     },
//     {
//       title: "Resend Setup Email",
//       dataIndex: "resend",
//       render: (_: unknown, record: DataType) => (
//         <Link
//           className="flex justify-center underline text-lg"
//           href=""
//           id={record.firstName}
//         >
//           Send again
//         </Link>
//       ),
//     },
//     {
//       title: "Remove",
//       dataIndex: "remove",
//       render: (_: unknown, record: DataType) => (
//         <Link className="flex justify-center" href="" id={record.firstName}>
//           <i className="icon-profile-remove remove text-2xl"></i>
//         </Link>
//       ),
//     },
//   ];

//   const dataAlerts: TeamAlert[] = [
//     {
//       key: "1",
//       id: "1",
//       coachFirstName: "Christian",
//       coachLastName: "Marc",
//       requestedDate: "15/08/2017",
//       rules: "Any DL from D2 that’s is all conference",
//       recipient: "Just Me",
//       otherReceptions: "N/A",
//     },
//     {
//       key: "2",
//       id: "2",
//       coachFirstName: "Anna",
//       coachLastName: "Miller",
//       requestedDate: "15/08/2017",
//       rules: "Any player from FA group",
//       recipient: "Just Me",
//       otherReceptions: "N/A",
//     },
//     {
//       key: "3",
//       id: "3",
//       coachFirstName: "Marc",
//       coachLastName: "Coach",
//       requestedDate: "15/08/2017",
//       rules:
//         "Any player from FA group except players added to the system after 10/08/2023",
//       recipient: "Just Me",
//       otherReceptions: "N/A",
//     },
//   ];

//   const columnAlerts: TableColumnsType<TeamAlert> = [
//     {
//       dataIndex: "coach",
//       render: (_: unknown, record: TeamAlert) => (
//         <div className="flex items-center">
//           <Flex vertical>
//             <Typography.Paragraph>Coach</Typography.Paragraph>
//             <h4 className="mb-10">
//               <span>{record.coachFirstName}</span> {record.coachLastName}
//             </h4>

//             <Typography.Paragraph>Requested Date</Typography.Paragraph>
//             <Typography.Text>{record.requestedDate}</Typography.Text>
//           </Flex>
//         </div>
//       ),
//     },
//     {
//       dataIndex: "rule",
//       render: (_: unknown, record: TeamAlert) => (
//         <div className="flex items-center">
//           <Flex vertical>
//             <Typography.Paragraph>Rules</Typography.Paragraph>
//             <Typography.Text className="custom-h4 mb-10">
//               {record.rules}
//             </Typography.Text>

//             <Typography.Paragraph>Recipient</Typography.Paragraph>
//             <Typography.Text className="custom-h4">
//               {record.recipient}
//             </Typography.Text>
//           </Flex>
//         </div>
//       ),
//     },
//     {
//       dataIndex: "otherReceptions",
//       render: (_: unknown, record: TeamAlert) => (
//         <Flex vertical>
//           <Typography.Paragraph>Other Receptions </Typography.Paragraph>
//           <Typography.Text>{record.otherReceptions}</Typography.Text>
//         </Flex>
//       ),
//     },
//     {
//       dataIndex: "action",
//       render: (_: unknown, record: TeamAlert) => (
//         <Flex vertical>
//           <Typography.Paragraph>Actions</Typography.Paragraph>

//           <Space size={24}>
//             <Link className="flex items-center" href="" id={record.id}>
//               <i className="icon-edit-2 edit mr-1 text-xl flex"></i> Edit
//             </Link>
//             <Link
//               color="danger"
//               className="flex items-center remove"
//               href=""
//               id={record.id}
//             >
//               <i className="icon-trash mr-1 flex text-xl remove"></i> Remove
//             </Link>
//           </Space>
//         </Flex>
//       ),
//     },
//   ];

//   const onChange = (e: RadioChangeEvent) => {
//     console.log(`radio checked:${e.target.value}`);
//   };

  

//     const [selectionType] = useState<"checkbox" | "radio">("checkbox");
  

//   return (
//     <Layout>
//       <Flex className="grid grid-cols-2 gap-4">
//         <Flex vertical className="card right-100">
//           <Flex vertical>
//             <Typography.Title level={4}>
//               <i className="icon-user"></i>Team Information
//             </Typography.Title>
//             <Flex className="items-center justify-between mb-5">
//               <Flex className="items-center">
//                 <Image
//                   className="mr-2 border-img"
//                   src={"/team.svg"}
//                   alt={"Profile"}
//                   height={110}
//                   width={110}
//                 />
//                 <Flex className="flex-col items-start">
//                   <Typography.Title level={4}>Team Logo</Typography.Title>
//                   <Typography.Paragraph>
//                     Only jpg and png formats less than 2mb
//                   </Typography.Paragraph>

//                   <Button
//                     variant="link"
//                     color="danger"
//                     icon={<i className="icon-trash"></i>}
//                   >
//                     Remove
//                   </Button>
//                 </Flex>
//               </Flex>
//               <Flex>
//                 <Button size="large" icon={<i className="icon-camera"></i>}>
//                   Upload
//                 </Button>
//               </Flex>
//             </Flex>
//             <Flex vertical className="mb-3">
//               <Typography.Text>Team Name</Typography.Text>
//               <Input placeholder="Arizona Cardinals" />
//             </Flex>
//             <Flex vertical className="mb-5">
//               <Typography.Text>Team Description</Typography.Text>
//               <TextArea rows={4} />
//             </Flex>
//           </Flex>
//           <Flex vertical>
//             <Flex className="items-center justify-between mb-5">
//               <Typography.Title level={4}>
//                 <i className="icon-star"></i>Player Rating Scale
//               </Typography.Title>
//               <Link className="underline text-lg" href="">
//                 New Rating
//               </Link>
//             </Flex>
//             <Flex vertical className="mb-4">
//               <Flex className="items-center justify-between">
//                 <Flex vertical>
//                   <Typography.Text>Too Good</Typography.Text>
//                   <h6 className="m-0 flex items-center">
//                     <Image
//                       className="mr-1"
//                       src={"/success-star.svg"}
//                       alt={"star"}
//                       height={18}
//                       width={18}
//                     />
//                     Talent Pool Rating
//                   </h6>
//                 </Flex>
//                 <Flex className="gap-5">
//                   <Link href="">
//                     <i className="icon-edit-2 edit text-xl"></i>
//                   </Link>
//                   <Link href="">
//                     <i className="icon-trash remove text-xl"></i>
//                   </Link>
//                 </Flex>
//               </Flex>
//             </Flex>
//             <Flex vertical className="mb-4">
//               <Flex className="items-center justify-between">
//                 <Flex vertical>
//                   <Typography.Text>Great Get</Typography.Text>
//                   <h6 className="m-0 flex items-center">
//                     <Image
//                       className="mr-1"
//                       src={"/alert-star.svg"}
//                       alt={"star"}
//                       height={18}
//                       width={18}
//                     />
//                     Talent Pool Rating
//                   </h6>
//                 </Flex>
//                 <Flex className="gap-5">
//                   <Link href="">
//                     <i className="icon-edit-2 edit text-xl"></i>
//                   </Link>
//                   <Link href="">
//                     <i className="icon-trash remove text-xl"></i>
//                   </Link>
//                 </Flex>
//               </Flex>
//             </Flex>
//             <Flex vertical className="mb-4">
//               <Flex className="items-center justify-between">
//                 <Flex vertical>
//                   <Typography.Text>Not Good Enough</Typography.Text>
//                   <h6 className="m-0 flex items-center">
//                     <Image
//                       className="mr-1"
//                       src={"/warning-star.svg"}
//                       alt={"star"}
//                       height={18}
//                       width={18}
//                     />
//                     Talent Pool Rating
//                   </h6>
//                 </Flex>
//                 <Flex className="gap-5">
//                   <Link href="">
//                     <i className="icon-edit-2 edit text-xl"></i>
//                   </Link>
//                   <Link href="">
//                     <i className="icon-trash remove text-xl"></i>
//                   </Link>
//                 </Flex>
//               </Flex>
//             </Flex>
//             <Flex vertical className="mb-4">
//               <Flex className="items-center justify-between">
//                 <Flex vertical>
//                   <Typography.Text>Good Get</Typography.Text>
//                   <h6 className="m-0 flex items-center">
//                     <Image
//                       className="mr-1"
//                       src={"/danger-star.svg"}
//                       alt={"star"}
//                       height={18}
//                       width={18}
//                     />
//                     Talent Pool Rating
//                   </h6>
//                 </Flex>
//                 <Flex className="gap-5">
//                   <Link href="">
//                     <i className="icon-edit-2 edit text-xl"></i>
//                   </Link>
//                   <Link href="">
//                     <i className="icon-trash remove text-xl"></i>
//                   </Link>
//                 </Flex>
//               </Flex>
//             </Flex>
//           </Flex>
//           <Flex vertical>
//             <Typography.Title level={4}>
//               <i className="icon-star"></i>Edit Player Rating Scale
//             </Typography.Title>
//             <Flex vertical>
//               <Flex vertical className="mb-3">
//                 <Typography.Text>Rating Name</Typography.Text>
//                 <Input placeholder="Talent Pool Rating" />
//               </Flex>
//               <Flex vertical className="mb-3">
//                 <Typography.Text>Choose Rating Type</Typography.Text>
//                 <Radio.Group onChange={onChange} defaultValue="a" className="rating-type">
//                   <Radio.Button value="a">Hangzhou</Radio.Button>
//                   <Radio.Button value="b">Shanghai</Radio.Button>
//                   <Radio.Button value="c">Beijing</Radio.Button>
//                   <Radio.Button value="d">Chengdu</Radio.Button>
//                 </Radio.Group>
//               </Flex>
//               <Flex vertical className="mb-3">
//                 <Typography.Text className="mb-2">Rating Name</Typography.Text>
//                 <Flex className="gap-2">
//                   <ul className="flex gap-1">
//                     <li className="p-1 border">
//                       <span className="w-8 h-8 block bg-[#FFD000]"></span>
//                     </li>
//                     <li className="p-1 border border-[#1C1D4D]">
//                       <span className="w-8 h-8 block bg-[#2BB650]"></span>
//                     </li>
//                     <li className="p-1 border">
//                       <span className="w-8 h-8 block bg-[#C00E1E]"></span>
//                     </li>
//                     <li className="p-1 border">
//                       <span className="w-8 h-8 block bg-[#FF5500]"></span>
//                     </li>
//                     <li className="p-1 border">
//                       <span className="w-8 h-8 block bg-[#36D8A8]"></span>
//                     </li>
//                     <li className="p-1 border">
//                       <span className="w-8 h-8 block bg-[#2DACDE]"></span>
//                     </li>
//                     <li className="p-1 border">
//                       <span className="w-8 h-8 block bg-[#3451CF]"></span>
//                     </li>
//                     <li className="p-1 border">
//                       <span className="w-8 h-8 block bg-[#CA46CD]"></span>
//                     </li>
//                     <li className="p-1 border">
//                       <span className="w-8 h-8 block bg-[#9A67DD]"></span>
//                     </li>
//                     <li className="p-1 border">
//                       <span className="w-8 h-8 block bg-[#39A6B0]"></span>
//                     </li>
//                     <li className="p-1 border">
//                       <span className="w-8 h-8 block bg-[#1C1D4D]"></span>
//                     </li>
//                   </ul>
//                 </Flex>
//               </Flex>
//               <Flex align="center" className="mb-3">
//                 <Typography.Paragraph className="w-[120px]">
//                   Custom Color
//                 </Typography.Paragraph>
//                 <Space>
//                   <Input placeholder="#" /> <Input className="w-[40px]" />
//                 </Space>
//               </Flex>
//             </Flex>
//           </Flex>
//         </Flex>
//         <Flex vertical className="card">
//           <Typography.Title level={4}>
//             <i className="icon-user"></i>Coaches
//           </Typography.Title>
//           <Flex justify="space-between">
//           <div className="mb-4">
//             <Input className="w-56" placeholder="Search..." />
//             <i className="icon-search-normal-1 relative right-[34px] top-[6px] text-2xl"></i>
//           </div>
//           <Flex>
//             <CoachInvite />
//           </Flex>
//           </Flex>
//           <div>
//             <Table<DataType>
//               rowSelection={{ type: selectionType, ...rowSelection }}
//               columns={columns}
//               dataSource={data}
//               pagination={false}
//             />
//           </div>
//         </Flex>
//         <Flex vertical className="card col-span-2">
//           <Flex>
//             <Typography.Title className="w-full" level={4}>
//               <i className="icon-user"></i>Coaches
//             </Typography.Title>
//             <Input className="w-80" placeholder="Search here..." />
//             <i className="icon-search-normal-1 relative right-[30px] top-[14px] text-xl"></i>
//             <Button className="linear-gradient border-0 mt-1">
//               Create Alert
//             </Button>
//           </Flex>
//           <Flex>
//             <Table<TeamAlert>
//               columns={columnAlerts}
//               dataSource={dataAlerts}
//               pagination={false}
//               showHeader={false}
//               className="team-table"
//             />
//           </Flex>
//         </Flex>
//       </Flex>
//     </Layout>
//   );
// }