"use client";

import React, { useState } from "react";
import type { TableProps } from "antd";
import { Table, Select, Input, Drawer } from "antd";
import Image from "next/image";
import type { TableColumnsType } from "antd";
import Link from "next/link";
import ImageWithAverage from "../_components/ImageWithAverage";
import AthleteEvaluation from "./_components/AthleteEvaluation";

interface DataType {
  key: string;
  id: string;
  fname: string;
  lname: string;
  image: string;
  unread: number;
  school: string;
  schoolIcon: string;
  date: string;
  evaluation: string;
  direction: string;
  direction2: string;
}

export default function NewPage() {
  const handlePlyarProfile = (record: DataType) => {
    // TODO: Navigate to player profile
    console.log("Navigate to profile:", record);
  };

  const handleChat = (record: DataType) => {
    // TODO: Handle chat functionality
    console.log("Open chat for:", record);
  };

  const data: DataType[] = [
    {
      key: "table1-1",
      id: "AX30901",
      fname: "Martin",
      lname: "Jakson",
      image: "/player2.png",
      unread: 2,
      school: "Kansas City School (FLORIDA)",
      schoolIcon: "/b.svg",
      date: "Jason March",
      evaluation: "Level Pipeline",
      direction: "Jason March",
      direction2: "Position Info",
    },
    {
      key: "table1-2",
      id: "AX30901",
      fname: "Alex",
      lname: "Italia",
      image: "/pl15.png",
      unread: 2,
      school: "Kansas City School (FLORIDA)",
      schoolIcon: "/b.svg",
      date: "Jason March",
      evaluation: "Level Pipeline",
      direction: "Jason March",
      direction2: "Position Info",
    },
    {
      key: "table1-3",
      id: "AX30901",
      fname: "Daady",
      lname: "Rocky",
      image: "/player3.png",
      unread: 2,
      school: "Kansas City School (FLORIDA)",
      schoolIcon: "/b.svg",
      date: "Jason March",
      evaluation: "Level Pipeline",
      direction: "Jason March",
      direction2: "Position Info",
    },
  ];

  const data2: DataType[] = [
    {
      key: "table2-1",
      id: "AX30901",
      fname: "Martin",
      lname: "Jakson",
      image: "/player2.png",
      unread: 2,
      school: "Kansas City School (FLORIDA)",
      schoolIcon: "/b.svg",
      date: "Jason March",
      evaluation: "Level Pipeline",
      direction: "Jason March",
      direction2: "Position Info",
    },
    {
      key: "table2-2",
      id: "AX30901",
      fname: "Alex",
      lname: "Italia",
      image: "/pl15.png",
      unread: 2,
      school: "Kansas City School (FLORIDA)",
      schoolIcon: "/b.svg",
      date: "Jason March",
      evaluation: "Level Pipeline",
      direction: "Jason March",
      direction2: "Position Info",
    },
    {
      key: "table2-3",
      id: "AX30901",
      fname: "Daady",
      lname: "Rocky",
      image: "/player3.png",
      unread: 2,
      school: "Kansas City School (FLORIDA)",
      schoolIcon: "/b.svg",
      date: "Jason March",
      evaluation: "Level Pipeline",
      direction: "Jason March",
      direction2: "Position Info",
    },
    {
      key: "table2-4",
      id: "AX30901",
      fname: "Martin",
      lname: "Jakson",
      image: "/player2.png",
      unread: 2,
      school: "Kansas City School (FLORIDA)",
      schoolIcon: "/b.svg",
      date: "Jason March",
      evaluation: "Level Pipeline",
      direction: "Jason March",
      direction2: "Position Info",
    },
    {
      key: "table2-5",
      id: "AX30901",
      fname: "Alex",
      lname: "Italia",
      image: "/pl15.png",
      unread: 2,
      school: "Kansas City School (FLORIDA)",
      schoolIcon: "/b.svg",
      date: "Jason March",
      evaluation: "Level Pipeline",
      direction: "Jason March",
      direction2: "Position Info",
    },
    {
      key: "table2-6",
      id: "AX30901",
      fname: "Daady",
      lname: "Rocky",
      image: "/player3.png",
      unread: 2,
      school: "Kansas City School (FLORIDA)",
      schoolIcon: "/b.svg",
      date: "Jason March",
      evaluation: "Level Pipeline",
      direction: "Jason March",
      direction2: "Position Info",
    },
  ];
  const [selectionType] = useState<"checkbox" | "radio">("checkbox");
  const [directionFilter, setDirectionFilter] = useState<string | undefined>(
    undefined
  );
  const [direction2Filter, setDirection2Filter] = useState<string | undefined>(
    undefined
  );
  const [open, setOpen] = useState(false);

  const showDrawer = () => {
    setOpen(true);
  };

  const onClose = () => {
    setOpen(false);
  };

  const directionOptions = [
    { value: "Flat", label: "Flat" },
    { value: "Up", label: "Up" },
    { value: "Down", label: "Down" },
    { value: "Left", label: "Left" },
    { value: "Right", label: "Right" },
  ];

  const columns: TableColumnsType<DataType> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      fixed: "left",
      width: 500,
      onCell: (record) => ({
        onClick: () => handlePlyarProfile(record),
      }),
      render: (_, record) => (
        <div className="profile-list" onClick={(e) => {
          e.preventDefault();
          showDrawer();
        }}> 
          <ImageWithAverage
            src={record.image as string}
            alt={record.fname}
            size="small"
            height={60}
            width={60}
            // average={record.avg}
          />
          <div className="pro-detail">
            <h4 className="flex mb-1">{record.fname + " " + record.lname}</h4>
            <div className="flex items-center justify-start">
              <Image
                src={record.schoolIcon as string}
                alt={record.school}
                width={20}
                height={20}
              />
              <p className="leading-none mb-0 ml-1 text-[#126DB8] text-sm">
                {record.school}
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: (
        <Select
          placeholder="Current Stage"
          allowClear
          value={direction2Filter}
          // onChange={(value) => setDirection2Filter(value)}
          style={{ width: "100%", minWidth: 120 }}
          options={directionOptions}
        />
      ),
      dataIndex: "date",
      key: "date",
    },
    {
      title: (
        <Select
          placeholder="Pipe Line"
          allowClear
          value={direction2Filter}
          // onChange={(value) => setDirection2Filter(value)}
          style={{ width: "100%", minWidth: 120 }}
          options={directionOptions}
        />
      ),
      dataIndex: "evaluation",
      key: "evaluation",
    },

    {
      title: (
        <Select
          placeholder="Initiated By"
          allowClear
          value={directionFilter}
          //onChange={(value) => setDirectionFilter(value)}
          style={{ width: "100%", minWidth: 120 }}
          options={directionOptions}
        />
      ),
      dataIndex: "direction",
      key: "direction",
      filteredValue: directionFilter ? [directionFilter] : null,
      onFilter: (value, record) => {
        if (!directionFilter) return true;
        return record.direction === directionFilter;
      },
    },
    {
      title: (
        <Select
          placeholder="Position"
          allowClear
          value={direction2Filter}
          //onChange={(value) => setDirection2Filter(value)}
          style={{ width: "100%", minWidth: 120 }}
          options={directionOptions}
        />
      ),
      dataIndex: "direction2",
      key: "direction2",
      filteredValue: direction2Filter ? [direction2Filter] : null,
      onFilter: (value, record) => {
        if (!direction2Filter) return true;
        return record.direction2 === direction2Filter;
      },
    },
    {
      title: "Link",
      dataIndex: "high_school",
      align: "left",
      key: "high_school",
      width: 150,
      render: (record) => (
        <Link href="" className="underline">
          Video
        </Link>
      ),
    },
    {
      title: "",
      key: "operation",
      fixed: "right",
      width: 60,
      render: (record) => (
        <div className="flex flex-col items-center justify-center action-icons">
          <Link
            href=""
            className="icon-message"
            onClick={(e) => {
              e.preventDefault();
              handleChat(record);
            }}
          >
            {record.unread > 0 && <span>{record.unread}</span>}
          </Link>
                        </div>
      ),
    },
  ];

  const columns2: TableColumnsType<DataType> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      fixed: "left",
      width: 500,
      onCell: (record) => ({
        onClick: () => handlePlyarProfile(record),
      }),
      render: (_, record) => (
        <div className="profile-list" onClick={(e) => {
          e.preventDefault();
          showDrawer();
        }}>
          <ImageWithAverage
            src={record.image as string}
            alt={record.fname}
            size="small"
            height={60}
            width={60}
            // average={record.avg}
          />
          <div className="pro-detail">
            <h4 className="flex mb-1">{record.fname + " " + record.lname}</h4>
            <div className="flex items-center justify-start">
              <Image
                src={record.schoolIcon as string}
                alt={record.school}
                width={20}
                height={20}
              />
              <p className="leading-none mb-0 ml-1 text-[#126DB8] text-sm">
                {record.school}
              </p>
              </div>
          </div>
        </div>
      ),
    },
    {
      title: (
        <Select
          placeholder="Current Stage"
          allowClear
          value={direction2Filter}
          // onChange={(value) => setDirection2Filter(value)}
          style={{ width: "100%", minWidth: 120 }}
          options={directionOptions}
        />
      ),
      dataIndex: "date",
      align: "center",
      key: "date",
      width: 200,
      render: (_, record) => (
        <div className="inline my-auto font-[500] text-[16px] italic justify-start w-fit gd py-3 px-5">
          {record.date}
        </div>
      ),
    },
    {
      title: (
        <Select
          placeholder="Pipe Line"
          allowClear
          value={direction2Filter}
          // onChange={(value) => setDirection2Filter(value)}
          style={{ width: "100%", minWidth: 120 }}
          options={directionOptions}
        />
      ),
      dataIndex: "evaluation",
      key: "evaluation",
      
    },

    {
      title: (
        <Select
          placeholder="Initiated By"
          allowClear
          value={directionFilter}
          //onChange={(value) => setDirectionFilter(value)}
          style={{ width: "100%", minWidth: 120 }}
          options={directionOptions}
        />
      ),
      dataIndex: "direction",
      key: "direction",
      filteredValue: directionFilter ? [directionFilter] : null,
      onFilter: (value, record) => {
        if (!directionFilter) return true;
        return record.direction === directionFilter;
      },
    },
    {
      title: (
        <Select
          placeholder="Position"
          allowClear
          value={direction2Filter}
          //onChange={(value) => setDirection2Filter(value)}
          style={{ width: "100%", minWidth: 120 }}
          options={directionOptions}
        />
      ),
      dataIndex: "direction2",
      key: "direction2",
      filteredValue: direction2Filter ? [direction2Filter] : null,
      onFilter: (value, record) => {
        if (!direction2Filter) return true;
        return record.direction2 === direction2Filter;
      },
    },
    {
      title: "Link",
      dataIndex: "high_school",
      align: "left",
      key: "high_school",
      width: 150,
      render: () => (
        <Link 
          href="" 
          className="underline" 
          
        >
          Video
        </Link>
      ),
    },
    
  ];

  const rowSelection: TableProps<DataType>["rowSelection"] = {
    onChange: (selectedRowKeys: React.Key[], selectedRows: DataType[]) => {
      console.log(
        `selectedRowKeys: ${selectedRowKeys}`,
        "selectedRows: ",
        selectedRows
      );
    },
    getCheckboxProps: (record: DataType) => ({
      disabled: record.fname === "Disabled User",
      name: record.fname,
    }),
  };

  return (
    <div className="p-4 bg-white shadow-sm new-table">
      <div className="text-left">
            <h4 className="flex items-center"><i className="icon-arrow-left-2 font-bold mr-2 flex items-center"></i>Athletes for You to Evaluate</h4>
                    </div>
      <div className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <div>
          </div>
          <div className="flex items-center gap-2">
            
            <Input.Search
              style={{ width: 300 }}
              className="search-input"
              placeholder="Search..."
              allowClear
              value={""}
              onChange={(e) => ""}
              onSearch={() => ""}
            />
          </div>
        </div>
        <Table<DataType>
          columns={columns}
          dataSource={data}
          pagination={false}
          bordered
          style={{ width: "100%" }}
          scroll={{ x: "max-content", y: "calc(100vh - 180px)" }}
        />
      </div>
      <div>
        <div className="flex justify-between items-center mb-3">
          <div>
            <h4>Team Active Pipelines</h4>
            </div>
          <div className="flex items-center gap-2">
            <Select
              placeholder="View All"
              allowClear
              value={direction2Filter}
              // onChange={(value) => setDirection2Filter(value)}
              style={{ width: "120px" }}
              options={directionOptions}
            />
            <Input.Search
              style={{ width: 300 }}
              className="search-input"
              placeholder="Search..."
              allowClear
              value={""}
              onChange={(e) => ""}
              onSearch={() => ""}
            />
          </div>
        </div>
        <Table<DataType>
          columns={columns2}
          dataSource={data2}
          pagination={false}
          bordered
          style={{ width: "100%" }}
          scroll={{ x: "max-content", y: "calc(100vh - 180px)" }}
        />
      </div>
      <Drawer width={1300} onClose={onClose} open={open}>
        <AthleteEvaluation />
      </Drawer>
    </div>
  );
}
