import React from "react";
import { Button, Dropdown, Flex, Input } from "antd";

export default function CoachInvite() {
  const dropdownContent = () => (
    <Flex vertical className="invite-screen p-4">
      <Flex vertical >
        <h6 className="flex items-center mb-2">
          <i className="icon-profile-add text-2xl flex mr-1"></i>Invite coach to join the team
          </h6>
        <Input type="text" className="mb-3" placeholder="Enter email address to invite" />
        <Flex justify="center">
        <Button type="primary" >
        Invite
        </Button>
        </Flex>
      </Flex>
    </Flex>
  );
  return (
    <Flex gap={4} className="button-controls">
      <Button size="large" className="btn-remove">
        Remove Selected
      </Button>
      <Dropdown
        className="btn-invite"
        dropdownRender={dropdownContent}
        trigger={["click"]}
      >
        <Button className="linear-gradient border-0">+ Invite Coach</Button>
      </Dropdown>
    </Flex>
  );
}
