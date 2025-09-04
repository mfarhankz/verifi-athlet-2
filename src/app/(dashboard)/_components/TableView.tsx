import React from "react";
import { Button, Dropdown, Flex, Input, Radio } from "antd";
import { Sortable } from "@/app/dndkit/presets/Sortable/Sortable";
import { columns } from "@/apis/data";

export default function TableView() {
  const dropdownContent = () => (
    <div className="table-view">
      <h5 className="mb-2">Table Column Options</h5>
      <p className="mb-3">
        Add or remove columns, To change the column order, drag and drop fields
      </p>
      <div className="input-field">
        <Input type="text" placeholder="Search Player..." />
        <i className="icon-search-normal-1 text-xl flex"></i>
      </div>

      <Sortable handle items={columns} />

      <Flex justify="center" className="mt-4 mx-auto mb-5">
        <div className="input-field flex flex-col">
        <p className="mb-2 text-[17px] ">
          Name this to save column settings (optional)
        </p>
        <Input className="w-full" type="text" />
        </div>
      </Flex>
      <Flex className="flex justify-center gap-2">
        <Button size="large">Cancel</Button>
        <Button type="primary" size="large">
        Save
        </Button>
      </Flex>
      <Flex>
            <Radio.Group
              name="radiogroup"
              defaultValue={1}
              className="survey-radio-group radio-group mt-4"
            >
              <Radio className="radio-item" value={1}>
               <Flex align="center" justify="space-between">
              <Flex vertical>
              <h6>Organic Data Table</h6>
              <p>Changes made just now</p>
              </Flex>
               <div className="gap-2 flex">
                <i className="icon-edit-2"></i>
                <i className="icon-close-circle"></i>
               </div>
               </Flex>
              </Radio>
              <Radio className="radio-item" value={2}>
              <Flex align="center" justify="space-between">
              <Flex vertical>
              <h6>Sport Info Data Table</h6>
              </Flex>
               <div className="gap-2 flex">
                <i className="icon-edit-2"></i>
                <i className="icon-close-circle"></i>
               </div>
               </Flex>
              </Radio>
              <Radio className="radio-item" value={3}>
              <Flex align="center" justify="space-between">
              <Flex vertical>
              <h6>Default Data Table</h6>
              </Flex>
               <div className="gap-2 flex">
                <i className="icon-edit-2"></i>
                <i className="icon-close-circle"></i>
               </div>
               </Flex>
              </Radio>
            </Radio.Group>
          </Flex>
    </div>
  );
  return (
    <Flex>
      <Dropdown dropdownRender={dropdownContent} trigger={["click"]}>
        <Button className="select-dropdown">
          <i className="icon-setting-4"></i> Table View{" "}
          <i className="icon-arrow-down-1"></i>
        </Button>
      </Dropdown>
    </Flex>
  );
}
