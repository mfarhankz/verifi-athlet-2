"use client";

import React, { useState } from "react";
import { Button, Select, Input } from "antd";
import {
  DeleteOutlined,
  PlusOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";

interface PipelineStep {
  id: string;
  name: string;
  role: string;
  isActive?: boolean;
}

interface Condition {
  id: string;
  ifValue: string;
  thenValue: string;
}

export default function NewPage3() {
  const router = useRouter();
  const [pipelineName, setPipelineName] = useState("Candidate shortlisting program");
  const [task, setTask] = useState("Film Evaluation");
  const [selectedPerson, setSelectedPerson] = useState("");
  const [conditions, setConditions] = useState<Condition[]>([
    { id: "1", ifValue: "", thenValue: "" },
  ]);

  const pipelineSteps: PipelineStep[] = [
    { id: "1", name: "Jason March", role: "Team Coach", isActive: true },
    { id: "2", name: "Alex Bizzard", role: "Assistant Coach" },
    { id: "3", name: "Hazzel Woods", role: "Assistant Coach" },
    { id: "4", name: "Mark Stone", role: "Chief Selector" },
  ];

  const addCondition = () => {
    const newCondition = {
      id: Date.now().toString(),
      ifValue: "",
      thenValue: "",
    };
    setConditions([...conditions, newCondition]);
  };

  const removeCondition = (id: string) => {
    setConditions(conditions.filter((c) => c.id !== id));
  };

  const updateCondition = (
    id: string,
    field: "ifValue" | "thenValue",
    value: string
  ) => {
    setConditions(
      conditions.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting pipeline...", {
      pipelineName,
      task,
      selectedPerson,
      conditions,
    });
  };

  const handleCancel = () => {
    router.back();
  };

  const handleRemove = () => {
    console.log("Removed");
  };

  return (
    <div className="min-h-screen bg-white p-8 text-left">
        <div className="mb-6 flex items-start gap-2">
          <button
            onClick={handleCancel}
            className="!border-none !bg-transparent !h-[20px] !min-h-[20px]"
          >
            <i className="icon-arrow-left-2 font-bold text-[20px] flex items-center"></i>
            
          </button>
          <div>
            <h4 className="!text-[22px] font-medium italic">Create Evaluation Pipeline</h4>
            <p className="text-gray-500 text-sm">
              Create a full pipeline to evaluate the players for their performance
            </p>
          </div>
        </div>

      <div className="max-w-[845px] mx-auto">
        {/* Header */}
        
        <form onSubmit={handleSubmit}>
          {/* Pipeline Name Input */}
          <div className="w-[400px] m-auto mb-12">
            <label className="block mb-1 text-sm font-medium italic">
              Enter Pipeline Name
            </label>
            <Input
              value={pipelineName}
              onChange={(e) => setPipelineName(e.target.value)}
              placeholder="Candidate shortlisting program"
            />
          </div>

          {/* Pipeline Steps */}
          <div className="flex items-center mb-6 overflow-hidden pb-4 relative custom-tabs">
            {pipelineSteps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className={`relative tab-item ${
                      step.isActive
                        ? "active-tab"
                        : ""
                    }`}>
                  <div className="flex items-start justify-between gap-2">
                      <div className="text-center">
                        <h6 className="mb-1">{step.name}</h6>
                        <p className="text-xs mb-0 font-light">{step.role}</p>
                      </div>
                      <EditOutlined className="text-gray-500 absolute right-1 top-1" />
                    </div>
                  {index < pipelineSteps.length - 1 && (
                  <i className="icon-svg-arrow-tab"></i>
                )}
                </div>
                
              </React.Fragment>
            ))}
          </div>

          {/* Task Section */}
          <div className="grid grid-cols-2 gap-12 mb-6">
            <div>
              <label className="block mb-2 text-gray-700 text-sm">Task</label>
              <Input
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="Film Evaluation"
              />
            </div>
            <div>
              <label className="block mb-2 text-gray-700 text-sm">
                Select Person
              </label>
              <Select
                value={selectedPerson || undefined}
                onChange={(value) => setSelectedPerson(value)}
                placeholder="Select"
                className="w-full"
              >
                <Select.Option value="jason">Jason March</Select.Option>
                <Select.Option value="alex">Alex Bizzard</Select.Option>
                <Select.Option value="hazzel">Hazzel Woods</Select.Option>
                <Select.Option value="mark">Mark Stone</Select.Option>
              </Select>
            </div>
          </div>

          {/* Choose Conditions */}
          <div className="mb-8">
            <h4 className="mb-4 !text-[22px] font-medium italic">Choose Conditions</h4>

            <div className="space-y-3">
              {conditions.map((condition) => (
                <div key={condition.id} className="flex items-start gap-3">
                  <div className="flex-1">
                    <label className="block mb-2 text-gray-700 text-sm">If</label>
                    <Select
                      value={condition.ifValue || undefined}
                      onChange={(value) =>
                        updateCondition(condition.id, "ifValue", value)
                      }
                      placeholder="Select"
                      className="w-full"
                    >
                      <Select.Option value="condition1">
                        Condition 1
                      </Select.Option>
                      <Select.Option value="condition2">
                        Condition 2
                      </Select.Option>
                      <Select.Option value="condition3">
                        Condition 3
                      </Select.Option>
                    </Select>
                  </div>

                  <div className="flex items-end pb-2.5">
                    <i className="icon-arrow-right-2 text-gray-400 text-[20px]"></i>
                  </div>

                  <div className="flex-1">
                    <label className="block mb-2 text-gray-700 text-sm">
                      Then
                    </label>
                    <Select
                      value={condition.thenValue || undefined}
                      onChange={(value) =>
                        updateCondition(condition.id, "thenValue", value)
                      }
                      placeholder="Select"
                      className="w-full"
                    >
                      <Select.Option value="action1">Action 1</Select.Option>
                      <Select.Option value="action2">Action 2</Select.Option>
                      <Select.Option value="action3">Action 3</Select.Option>
                    </Select>
                  </div>

                  {conditions.length > 1 && (
                    <div className="flex items-end pb-2.5">
                      <Button
                        type="text"
                        onClick={() => removeCondition(condition.id)}
                        className="min-w-[50px] !border-none"
                        style={{ backgroundColor: "rgba(28, 29, 77, 0.05)" }}
                        aria-label="Delete condition"
                      >
                        <i className="icon-svg-delete-black" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Button
              type="link"
              onClick={addCondition}
              className="mt-3 !text-[#126DB8] !text-sm !border-none"
              icon={<PlusOutlined />}
            >
              Another Condition
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4">
            <div className="flex gap-3">
              <Button type="text" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" className="!px-4 !italic">
                Submit
              </Button>
            </div>
           
            <Button
              type="link"
              onClick={handleRemove}
              className="!text-red-500 hover:!text-red-600 !text-base !border-none font-medium italic"
              icon={<PlusOutlined />}
            >
              Remove
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
