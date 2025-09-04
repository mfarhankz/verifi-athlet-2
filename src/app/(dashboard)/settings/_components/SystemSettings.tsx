"use client";

import { Flex, Input, Layout, Radio, RadioChangeEvent, Space, Switch, Typography } from "antd";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function SystemSettings() {

    const [theme, setTheme] = useState("default");

  // Initialize theme from localStorage or default to "default"
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "default";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  const handleThemeChange = (e: RadioChangeEvent) => {
    const value = e.target.value; // `value` is already the correct type (number)
    const newTheme = value === 1 ? "default" : value === 2 ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const onChange = (checked: boolean) => {
    console.log(`switch to ${checked}`);
  };
  return (
    <Layout className="system-setting">
      <Typography.Title level={4}>
        <i className="icon-notification-bing"></i>Notification
      </Typography.Title>
      <Flex vertical>
        <Flex vertical>
          <Flex className="mb-5" align="center" justify="space-between">
            <h6 className="flex items-center">
              <i className="icon-sms flex text-xl mr-1"></i>
              Send me email notification when
            </h6>
            <Typography.Text>Jimmy.scape@ixo.com</Typography.Text>
          </Flex>
          <Flex
            align="center"
            justify="space-between"
            className="border-b py-2"
          >
            <Typography.Paragraph>
              New Players joins the invitation
            </Typography.Paragraph>
            <Switch defaultChecked onChange={onChange} />
          </Flex>
          <Flex
            align="center"
            justify="space-between"
            className="border-b py-2"
          >
            <Typography.Paragraph>
              Player leaves the platform
            </Typography.Paragraph>
            <Switch defaultChecked onChange={onChange} />
          </Flex>
          <Flex
            align="center"
            justify="space-between"
            className="border-b py-2"
          >
            <Typography.Paragraph>New team created</Typography.Paragraph>
            <Switch defaultChecked onChange={onChange} />
          </Flex>
          <Flex
            align="center"
            justify="space-between"
            className="border-b py-2"
          >
            <Typography.Paragraph>
              Player rating is improved
            </Typography.Paragraph>
            <Switch defaultChecked onChange={onChange} />
          </Flex>
          <Flex
            align="center"
            justify="space-between"
            className="border-b py-2"
          >
            <Typography.Paragraph>
              Player is de-activated in the system
            </Typography.Paragraph>
            <Switch defaultChecked onChange={onChange} />
          </Flex>
          <Flex className="mb-5 mt-5" align="center" justify="space-between">
            <h6 className="flex items-center">
              <i className="icon-keyboard-open flex mr-1"></i>
              Desktop push notification
            </h6>
          </Flex>
          <ul>
            <li className="flex items-center border-b py-2 justify-between">
              <Typography.Paragraph>
                New Players joins the invitation
              </Typography.Paragraph>

              <Switch defaultChecked onChange={onChange} />
            </li>
            <li className="flex items-center border-b py-2 justify-between">
              <Typography.Paragraph>
                Player leaves the platform
              </Typography.Paragraph>
              <Switch defaultChecked onChange={onChange} />
            </li>
            <li className="flex items-center mb-3 py-2 justify-between">
              <Typography.Paragraph>New team created</Typography.Paragraph>
              <Switch defaultChecked onChange={onChange} />
            </li>
          </ul>
        </Flex>

        <Typography.Title level={4}>
          <i className="icon-star"></i>Theme Settings
        </Typography.Title>

        <Flex>
          <Radio.Group
            name="theme"
            defaultValue={theme === "default" ? 1 : theme === "dark" ? 2 : 3}
            className="flex w-[100%] items-center justify-around my-5"
            onChange={handleThemeChange}
          >
            <Flex vertical align="center">
              <Image src={"/defualt.svg"} alt={""} height={126} width={157} />
              <Radio value={1}>Defualt</Radio>
            </Flex>
            <Flex vertical align="center">
              <Image src={"/dark.svg"} alt={""} height={126} width={157} />
              <Radio value={2}>Dark</Radio>
            </Flex>
            <Flex vertical align="center">
              <Image src={"/light.svg"} alt={""} height={126} width={157} />
              <Radio value={3}>Light</Radio>
            </Flex>
          </Radio.Group>
        </Flex>
        <Flex vertical className="mb-6 mt-2">
          <Radio>Custom Color</Radio>
          <Flex align="center" className="mb-2 mt-5">
            <Typography.Paragraph className="w-[120px]">
              Primary Color
            </Typography.Paragraph>
            <Space>
              <Input placeholder="#" /> <Input className="w-[40px]" />
            </Space>
          </Flex>
          <Flex align="center">
            <Typography.Paragraph className="w-[120px]">
              Secondary Color
            </Typography.Paragraph>
            <Space>
              <Input placeholder="#" /> <Input className="w-[40px]" />
            </Space>
          </Flex>
        </Flex>
      </Flex>
    </Layout>
  );
}
