"use client";

import { Button, Flex, Input, Layout, Space, Typography } from "antd";
import Image from "next/image";
import Link from "next/link";

export default function ReferralProgram() {

  return (
    <Layout className="referral-program">
    <Flex align="start" justify="space-between" className="bg-color">
      <Flex vertical align="start" justify="start" className="bg-img">
        <Typography.Title level={1} className="ref-h1">
          Invite Friends
        </Typography.Title>
        <Typography.Title level={2} className="ref-h2">
          <span>Get Rewards upto $500</span>
        </Typography.Title>

        <Typography.Text className="small">
          <Image
            className="mr-2 ml-2"
            src={"/dollar-circle.svg"}
            alt={"dollar"}
            height={20}
            width={20}
          />
          Typical referral pays $50
        </Typography.Text>
        <Typography.Text className="mediam">
          <Image
            className="mr-2 ml-1"
            src={"/dollar-circle.svg"}
            alt={"dollar"}
            height={30}
            width={30}
          />
          Larger deals earn $100
        </Typography.Text>
        <Typography.Text className="large">
          <Image
            className="mr-2"
            src={"/dollar-circle.svg"}
            alt={"dollar"}
            height={36}
            width={36}
          />
          Most AD deal pay $500
        </Typography.Text>

        <Flex vertical className="mt-5">
          <Space>
            <Input
              placeholder="Enter email address to invite"
              className="w-[345px] invite-input"
            />
            <Button color="default" variant="filled" className="invite-btn">
              Invite
            </Button>
          </Space>
          <Link href="">Copy Invitation Code</Link>
        </Flex>
      </Flex>
    </Flex>
    <Flex align="center" justify="space-between" vertical className="mt-7 text-box">
      <Typography.Title level={2}>How Referral System Works?</Typography.Title>
      <Flex className="mt-6 mb-5">
        <Flex vertical align="center">
          <Typography.Title level={2} style={{marginBottom:0}}>1</Typography.Title>
          <Typography.Title level={5}>Invite your friends</Typography.Title>
          <Typography.Text className="text-center">
            just invite your friends by sending them invite email or share your
            invitation code
          </Typography.Text>
        </Flex>
        <Flex vertical align="center">
          <Typography.Title level={2} style={{marginBottom:0}}>2</Typography.Title>
          <Typography.Title level={5}>Get initial $50 reward</Typography.Title>
          <Typography.Text className="text-center">
            Once they accept your invite you will get instant award of $50 in
            your account
          </Typography.Text>
        </Flex>
        <Flex vertical align="center">
          <Typography.Title level={2} style={{marginBottom:0}}>3</Typography.Title>
          <Typography.Title level={5}>Get AD deal $500</Typography.Title>
          <Typography.Text className="text-center">
            Secure bigger deals by getting AD deals and you will be awarded $500
          </Typography.Text>
        </Flex>
      </Flex>
      <Flex vertical align="center" className="mt-10">
        <Link href="">Do you want to know more?</Link>
        <Link href="">Contact us to know more about our referral program</Link>
      </Flex>
    </Flex>
  </Layout>
  );
}
