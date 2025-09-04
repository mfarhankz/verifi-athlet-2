"use client";

import { Button, Flex, Input, Layout, Select, Typography } from "antd";
import Image from "next/image";
import Link from "next/link";

export default function PlayerProfile() {
  const handleChange = (value: string) => {
    console.log(`selected ${value}`);
  };
  return (
    <Layout className="my-profile">
    <Typography.Title level={4}><i className="icon-user"></i> Profile Info</Typography.Title>
    <Flex vertical>
      <Flex className="items-center justify-between mb-5">
        <Flex className="items-center">
          <Image
            className="mr-2 border-img"
            src={"/user.svg"}
            alt={"Profile"}
            height={110}
            width={110}
          />
          <Flex className="flex-col items-start">
            <h6>Your Photo</h6>
            <Typography.Paragraph>
              Only jpg and png formats less than 2mb
            </Typography.Paragraph>

            <Button variant="link" color="danger" icon={<i className="icon-trash"></i>}>
              Remove
            </Button>
          </Flex>
        </Flex>
        <Flex>
          <Button size="large" icon={<i className="icon-camera"></i>}>
            Upload
          </Button>
        </Flex>
      </Flex>
      <Flex className="grid grid-cols-2 gap-5 mb-2">
        <Flex vertical>
          <Typography.Text>First Name</Typography.Text>
          <Input placeholder="Jimmy" />
        </Flex>
        <Flex vertical>
          <Typography.Text>Last Name</Typography.Text>
          <Input placeholder="Scape" />
        </Flex>
        <Flex vertical>
          <Typography.Text className="flex justify-between">
            Email Address
            <Link href="">+ Add Another</Link>
          </Typography.Text>
          <Input placeholder="Jimmy.scape@ixo.com" />
        </Flex>
        <Flex vertical>
          <Typography.Text className="flex justify-between">
            Phone No.
            <Link href="">+ Add Another</Link>
          </Typography.Text>
          <Input placeholder="(394) 928 2294" />
        </Flex>
        <Flex vertical className="col-span-2">
          <Typography.Text>Role</Typography.Text>

          <Select
            defaultValue="lucy"
            onChange={handleChange}
            style={{ width: "100%" }}
            options={[
              { value: "jack", label: "Senior Manager" },
              { value: "lucy", label: "Senior Team Manager" },
              { value: "Yiminghe", label: "Manager" },
            ]}
          />
        </Flex>
        <div className="col-span-2 mt-2">
          <Typography.Title level={4} className="mb-0"><i className="icon-lock-1"></i> Security</Typography.Title>
        </div>
        <div className="col-span-2">
          <Typography.Text>Current Password</Typography.Text>
          <Input type="password" placeholder="Password" />
        </div>
        <div>
          <Typography.Text>New Password</Typography.Text>
          <Input type="password" placeholder="Password" />
        </div>
        <div>
          <Typography.Text>Confirm New Password</Typography.Text>
          <Input type="password" placeholder="Password" />
        </div>
      </Flex>
      <Typography.Paragraph>
        Password must be 8-60 characters and include at least two of the
        following: uppercase, lowercase, number, or symbol.
      </Typography.Paragraph>

    </Flex>
  </Layout>
  );
}
