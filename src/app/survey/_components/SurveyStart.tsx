"use client";

import { Flex, Typography } from "antd";
import Image from "next/image";

export default function SurveyStart() {
  return (
    <Flex
      vertical
      justify="center"
      align="center"
      className="py-4 px-5 mb-5 survey-banner"
    >
      <Image
        className="mr-7"
        src={"/paper.svg"}
        alt={""}
        height={52}
        width={52}
      />
      <Flex vertical justify="center" align="center" className="text-center">
        <Typography.Title level={4} className="italic margin-0">
          Start your survey
        </Typography.Title>
        <Typography.Text>
        Hundreds of colleges are using Verified Athletics to find transfers. 
        By filling out this short questionnaire and opting to share it with all schools you&apos;ll 
        increase your exposure to college coaches all over the country and make it easier for them to recruit you. 
        If you&apos;ve already committed to transfer to a school scroll to the bottom of the page and input your new school.
        </Typography.Text>
      </Flex>
    </Flex>
  );
}
