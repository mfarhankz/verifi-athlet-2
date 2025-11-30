"use client";

import { useState } from "react";
import { Button, Select, Checkbox } from "antd";
import ImageWithAverage from "../../_components/ImageWithAverage";
import Image from "next/image";
import TextArea from "antd/es/input/TextArea";

interface CheckboxOption {
  value: number;
  label: string;
  color: string;
  key: string;
}

interface Category {
  title: string;
  key: string;
  options: CheckboxOption[];
}

const evaluationData: Category[] = [
  {
    title: "COMPETITION",
    key: "competition",
    options: [
      { value: 10, label: "Refuses to lose", color: "#2BB650", key: "refuses" },
      { value: 7, label: "Loves to compete", color: "#FFD000", key: "loves" },
      { value: 8, label: "Good competitor", color: "#FFD000", key: "good" },
      { value: 4, label: "Likes to win if convenient", color: "#FF7525", key: "convenient" },
      { value: 5, label: "Doesn't matter", color: "#FF7525", key: "matter" },
    ],
  },
  {
    title: "TALENT",
    key: "talent",
    options: [
      { value: 10, label: "All-state", color: "#2BB650", key: "all-state" },
      { value: 7, label: "All-league", color: "#FFD000", key: "all-league" },
      { value: 8, label: "Start on winner", color: "#FFD000", key: "start-winner" },
      { value: 4, label: "Can contribute", color: "#FF7525", key: "contribute" },
      { value: 5, label: "Little help", color: "#FF7525", key: "little-help" },
    ],
  },
  {
    title: "TOUGHNESS",
    key: "toughness",
    options: [
      { value: 10, label: "Real hitter", color: "#2BB650", key: "real-hitter" },
      { value: 7, label: "Good hitter", color: "#FFD000", key: "good-hitter" },
      { value: 8, label: "Average hitter", color: "#FFD000", key: "average-hitter" },
      { value: 4, label: "Poor hitter", color: "#FF7525", key: "poor-hitter" },
      { value: 5, label: "Won't hit", color: "#FF7525", key: "wont-hit" },
      { value: 5, label: "Hides", color: "#FF7525", key: "hides" },
    ],
  },
  {
    title: "AWARENESS & INTELLIGENCE",
    key: "awareness",
    options: [
      { value: 10, label: "Great instincts", color: "#2BB650", key: "great-instincts" },
      { value: 7, label: "Tell him once", color: "#FFD000", key: "tell-once" },
      { value: 8, label: "Learns quickly", color: "#FFD000", key: "learns-quickly" },
      { value: 4, label: "Learns w/ reps", color: "#FF7525", key: "learns-reps" },
      { value: 5, label: "Hard to teach", color: "#FF7525", key: "hard-teach" },
    ],
  },
  {
    title: "COMMITMENT & HARD WORK",
    key: "commitment",
    options: [
      { value: 10, label: "Whatever it takes", color: "#2BB650", key: "whatever-takes" },
      { value: 7, label: "Does the extra things", color: "#FFD000", key: "extra-things" },
      { value: 8, label: "What is required", color: "#FFD000", key: "required" },
      { value: 4, label: "Does the minimum", color: "#FF7525", key: "minimum" },
      { value: 5, label: "Must push", color: "#FF7525", key: "must-push" },
      { value: 5, label: "Does nothing", color: "#FF7525", key: "nothing" },
    ],
  },
  {
    title: "DURABILITY",
    key: "durability",
    options: [
      { value: 10, label: "Never gets hurt", color: "#2BB650", key: "never-hurt" },
      { value: 7, label: "Sometimes hurt", color: "#FFD000", key: "sometimes-hurt" },
      { value: 8, label: "Can't count on him", color: "#FFD000", key: "cant-count" },
      { value: 8, label: "Always hurt", color: "#FFD000", key: "always-hurt" },
    ],
  },
  {
    title: "SPEED",
    key: "speed",
    options: [
      { value: 10, label: "Outstanding", color: "#2BB650", key: "outstanding" },
      { value: 7, label: "Good", color: "#FFD000", key: "good" },
      { value: 8, label: "Average", color: "#FFD000", key: "average" },
      { value: 4, label: "Below", color: "#FF7525", key: "below" },
      { value: 5, label: "Poor", color: "#FF7525", key: "poor" },
    ],
  },
  {
    title: "COACHABILITY",
    key: "coachability",
    options: [
      { value: 10, label: "Takes coaching well", color: "#2BB650", key: "takes-coaching" },
      { value: 7, label: "Does it the easy way", color: "#FFD000", key: "easy-way" },
      { value: 8, label: "Does it his way", color: "#FFD000", key: "his-way" },
      { value: 4, label: "Doesn't do it at all", color: "#FF7525", key: "not-at-all" },
    ],
  },
  {
    title: "CHARACTER",
    key: "character",
    options: [
      { value: 10, label: "Fine person", color: "#2BB650", key: "fine-person" },
      { value: 7, label: "Some flaws", color: "#FFD000", key: "some-flaws" },
      { value: 8, label: "Questionable", color: "#FFD000", key: "questionable" },
      { value: 8, label: "Get rid of him", color: "#FFD000", key: "get-rid" },
    ],
  },
];



export default function AthleteEvaluation() {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const directionOptions = [
    { value: "+A", label: "+A", color: "#2BB650" },
    { value: "A", label: "A", color: "#2BB650" },
    { value: "B", label: "B", color: "#FFD000" },
    { value: "C", label: "C", color: "#FF7525" },
  ];
  
  const [direction2Filter, setDirection2Filter] = useState<string | undefined>(
    directionOptions[0]?.value
  );

  const handleCheckboxChange = (categoryKey: string, optionKey: string, checked: boolean) => {
    // Find the category to get all its options
    const category = evaluationData.find((cat) => cat.key === categoryKey);
    if (!category) return;

    // Create a new state object
    const newCheckedItems = { ...checkedItems };

    if (checked) {
      // If checking: uncheck all other options in this category, then check the clicked one
      category.options.forEach((option) => {
        const optionKeyToCheck = `${categoryKey}-${option.key}`;
        newCheckedItems[optionKeyToCheck] = false;
      });
      // Now check the clicked option
      newCheckedItems[`${categoryKey}-${optionKey}`] = true;
    } else {
      // If unchecking: just uncheck this option
      newCheckedItems[`${categoryKey}-${optionKey}`] = false;
    }

    setCheckedItems(newCheckedItems);
  };

  const renderCheckbox = (category: Category, option: CheckboxOption) => {
    const checkboxKey = `${category.key}-${option.key}`;
    return (
      <Checkbox
        key={checkboxKey}
        checked={checkedItems[checkboxKey] || false}
        onChange={(e) => handleCheckboxChange(category.key, option.key, e.target.checked)}
        className="custom-checkbox"
      >
        <div className="flex items-center gap-2">
          <i className="w-[10px] h-[10px] flex" style={{ backgroundColor: option.color }}></i>
          <div className="flex items-center">
            {option.value} - <span>{option.label}</span>
          </div>
        </div>
      </Checkbox>
    );
  };

  const renderCategory = (category: Category) => {
    return (
      <div key={category.key}>
        <h4 className="mb-0 !text-[22px]">{category.title}</h4>
        <div className="flex flex-col gap-4 mt-4">
          {category.options.map((option) => renderCheckbox(category, option))}
        </div>
      </div>
    );
  };

  return (
    <div className="px-6 pb-6 pt-2">
      <div
        className="flex items-center justify-between p-4"
        style={{ backgroundColor: "rgba(28, 29, 77, 0.04)" }}
      >
        <div className="flex items-center gap-2">
          <ImageWithAverage
            src={"/player2.png"}
            alt={"Athlete Evaluation"}
            size="small"
            height={60}
            width={60}
          />
          <div className="pro-detail">
            <h4 className="flex mb-1">Daady Rocky</h4>
            <div className="flex items-center justify-start">
              <Image src={"/b.svg"} alt={"test"} width={20} height={20} />
              <p className="leading-none mb-0 ml-1 text-[#126DB8] text-sm">
                Kansas City School (FLORIDA)
              </p>
            </div>
          </div>
        </div>
        <div>
          <h6 className="mb-0">Current Stage</h6>
          <p className="mb-0">Jason March</p>
        </div>
        <div>
          <h6 className="mb-0">Current Stage</h6>
          <p className="mb-0">Jason March</p>
        </div>
        <div>
          <h6 className="mb-0">Current Stage</h6>
          <p className="mb-0">Jason March</p>
        </div>
        <div>
          <h6 className="mb-0">Current Stage</h6>
          <p className="mb-0">Jason March</p>
        </div>
        <div>
          <Button type="text" className=" bg-white">
            Athlete's full profile
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-x-12 gap-y-12 pt-8">
        {evaluationData.map((category) => renderCategory(category))}
      </div>

      <div className="flex flex-col justify-start items-start gap-2 pt-12">
        <h6 className="mb-0 !font-medium">Overall Grade</h6>
        <Select
          placeholder="Select Grade"
          allowClear
          value={direction2Filter}
          onChange={(value) => setDirection2Filter(value)}
          style={{ width: "300px", minWidth: 120 }}
        >
          {directionOptions.map((option) => (
            <Select.Option key={option.value} value={option.value}>
              <div className="flex items-center gap-2">
                <i 
                  className="w-[10px] h-[10px] flex" 
                  style={{ backgroundColor: option.color }}
                ></i>
                <span>{option.label}</span>
              </div>
            </Select.Option>
          ))}
        </Select>
     
      </div>

      <div 
        className="flex items-center justify-between gap-2 p-6 mt-8"
        style={{ backgroundColor: "rgba(43, 182, 80, 0.06)" }}
      >
        <h6 className="mb-0 !font-[600] text-[!22px] italic">Player score based on the above selection</h6>
        <h6 className="mb-0 !font-[600] text-[!22px] italic">TOTAL SCORE: 52</h6>
      </div>

      <div className="mt-8">
        <h6 className="mb-0 !font-medium">Enter your comments</h6>
        <TextArea placeholder="Write comments..." rows={4} className="mt-4" />
      </div>

      <div className="flex items-center justify-center gap-2 mt-4">
        <Button type="text" className="mt-4">Cancel</Button>
        <Button type="primary" className="mt-4">Save Feedback</Button>
      </div>
    </div>
  );
}
