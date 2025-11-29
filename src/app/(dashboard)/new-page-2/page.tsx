"use client";

import { useState } from "react";
import { Button, Select, Input } from "antd";
import {
  DeleteOutlined,
  PlusOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import ImageWithAverage from "../_components/ImageWithAverage";
import Image from "next/image";
import TextArea from "antd/es/input/TextArea";

interface CategoryEntry {
  id: string;
  rating: number | null;
  description: string;
}

interface Category {
  id: string;
  title: string;
  entries: CategoryEntry[];
}

const ratingOptions = [
  { value: 10, label: "10", color: "#2BB650" },
  { value: 9, label: "9", color: "#2BB650" },
  { value: 8, label: "8", color: "#2BB650" },
  { value: 7, label: "7", color: "#FFD000" },
  { value: 6, label: "6", color: "#FFD000" },
  { value: 5, label: "5", color: "#FF7525" },
  { value: 4, label: "4", color: "#FF7525" },
  { value: 3, label: "3", color: "#FF0000" },
  { value: 2, label: "2", color: "#FF0000" },
  { value: 1, label: "1", color: "#FF0000" },
];

export default function NewPage2() {
  const [categories, setCategories] = useState<Category[]>([
    {
      id: "competitions",
      title: "Competitions",
      entries: [
        { id: "1", rating: 10, description: "Refuses to lose at anything" },
        { id: "2", rating: 10, description: "Loves to compete" },
        { id: "3", rating: null, description: "Good competitor" },
        { id: "4", rating: null, description: "Likes to win if convenient" },
        { id: "5", rating: 5, description: "doesn't matter" },
      ],
    },
    {
      id: "talent",
      title: "Talent",
      entries: [
        { id: "1", rating: 10, description: "All-state" },
        { id: "2", rating: 2, description: "All-league" },
        { id: "3", rating: null, description: "Start on winner" },
        { id: "4", rating: null, description: "Can contribute" },
        { id: "5", rating: 5, description: "Little help" },
      ],
    },
    {
      id: "toughness",
      title: "Toughness",
      entries: [
        { id: "1", rating: 10, description: "Real hitter" },
        { id: "2", rating: 6, description: "Good hitter" },
        { id: "3", rating: null, description: "Average hitter" },
        { id: "4", rating: null, description: "Poor hitter" },
      ],
    },
    {
      id: "work-ethic",
      title: "Work Ethic & Intelligence",
      entries: [
        { id: "1", rating: 10, description: "Refuses to lose at anything" },
        { id: "2", rating: 10, description: "Loves to compete" },
        { id: "3", rating: 10, description: "Good competitor" },
        { id: "4", rating: null, description: "Likes to win if convenient" },
        { id: "5", rating: 5, description: "doesn't matter" },
      ],
    },
    {
      id: "commitment",
      title: "Commitment & Hardwork",
      entries: [
        { id: "1", rating: 10, description: "All-state" },
        { id: "2", rating: 10, description: "All-league" },
        { id: "3", rating: null, description: "Start on winner" },
        { id: "4", rating: null, description: "Can contribute" },
        { id: "5", rating: 5, description: "Little help" },
      ],
    },
    {
      id: "durability",
      title: "Durability",
      entries: [
        { id: "1", rating: 10, description: "Real hitter" },
        { id: "2", rating: 10, description: "Good hitter" },
        { id: "3", rating: null, description: "Average hitter" },
        { id: "4", rating: null, description: "Poor hitter" },
      ],
    },
  ]);

  const [customCategoryName, setCustomCategoryName] = useState("");
  const [customCategoryEntry, setCustomCategoryEntry] = useState({
    rating: null as number | null,
    description: "",
  });
  const [comments, setComments] = useState("");

  const addEntryToCategory = (categoryId: string) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId
          ? {
              ...cat,
              entries: [
                ...cat.entries,
                { id: Date.now().toString(), rating: null, description: "" },
              ],
            }
          : cat
      )
    );
  };

  const removeEntryFromCategory = (categoryId: string, entryId: string) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId
          ? { ...cat, entries: cat.entries.filter((e) => e.id !== entryId) }
          : cat
      )
    );
  };

  const updateEntry = (
    categoryId: string,
    entryId: string,
    field: "rating" | "description",
    value: number | null | string
  ) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId
          ? {
              ...cat,
              entries: cat.entries.map((e) =>
                e.id === entryId ? { ...e, [field]: value } : e
              ),
            }
          : cat
      )
    );
  };

  const addCustomCategory = () => {
    if (customCategoryName.trim()) {
      setCategories((prev) => [
        ...prev,
        {
          id: `custom-${Date.now()}`,
          title: customCategoryName,
          entries: customCategoryEntry.description
            ? [
                {
                  id: "1",
                  rating: customCategoryEntry.rating,
                  description: customCategoryEntry.description,
                },
              ]
            : [],
        },
      ]);
      setCustomCategoryName("");
      setCustomCategoryEntry({ rating: null, description: "" });
    }
  };

  const removeCategory = (categoryId: string) => {
    setCategories((prev) => prev.filter((cat) => cat.id !== categoryId));
  };

  const getRatingColor = (rating: number | null) => {
    if (!rating) return "#d1d5db";
    const option = ratingOptions.find((opt) => opt.value === rating);
    return option?.color || "#d1d5db";
  };

  return (
    <div className="p-4 bg-white shadow-sm new-table">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button className="w-10 h-10 !bg-[#fff] !border-none">
          <i className="icon-arrow-left-2 font-bold text-[20px] flex items-center"></i>
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-3 gap-x-12 gap-y-8">
        {categories.map((category) => (
          <div key={category.id} className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="mb-0 !text-[22px] font-bold italic">
                {category.title}
              </h4>
              {category.id.startsWith("custom-") && (
                
                <Button
                type="text"
                onClick={() => removeCategory(category.id)}
                className="min-w-[50px] !border-none"
                style={{ backgroundColor: "rgba(28, 29, 77, 0.05)" }}
              >
                <i className="icon-svg-delete-black" />
              </Button>
              )}
            </div>
            <div className="space-y-3">
              {category.entries.map((entry) => {
                const selectedOption = entry.rating
                  ? ratingOptions.find((opt) => opt.value === entry.rating)
                  : null;
                return (
                  <div key={entry.id} className="flex items-center gap-2">
                    <Select
                      value={entry.rating}
                      placeholder="--"
                      onChange={(value) =>
                        updateEntry(category.id, entry.id, "rating", value)
                      }
                      style={{ width: 80 }}
                    >
                      {ratingOptions.map((opt) => (
                        <Select.Option key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <i
                              className="w-[10px] h-[10px] flex"
                              style={{ backgroundColor: opt.color }}
                            ></i>
                            <span>{opt.label}</span>
                          </div>
                        </Select.Option>
                      ))}
                    </Select>
                    <Input
                      value={entry.description}
                      onChange={(e) =>
                        updateEntry(
                          category.id,
                          entry.id,
                          "description",
                          e.target.value
                        )
                      }
                      placeholder="Enter description..."
                      className="flex-1"
                    />
                    <Button
                      type="text"
                      onClick={() =>
                        removeEntryFromCategory(category.id, entry.id)
                      }
                      className="min-w-[50px] !border-none"
                      style={{ backgroundColor: "rgba(28, 29, 77, 0.05)" }}
                    >
                      <i className="icon-svg-delete-black" />
                    </Button>
                  </div>
                );
              })}
              <div className="flex items-center justify-start">
                <Button
                  type="link"
                  onClick={() => addEntryToCategory(category.id)}
                  className="!border-none !text-[#126DB8] !text-sm"
                >
                  <PlusOutlined /> Add more
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Custom Category Section */}
      <div className="mt-12 w-[400px] text-left">
        <h5 className="mb-4 font-semibold">Enter Category Name:</h5>
        <div className="flex items-center gap-2 mb-4">
          <Input
            value={customCategoryName}
            onChange={(e) => setCustomCategoryName(e.target.value)}
            placeholder="Enter category name..."
            className="flex-1"
          />
          <Button
            type="text"
            onClick={() => setCustomCategoryName("")}
            className="min-w-[50px] !border-none"
            style={{ backgroundColor: "rgba(28, 29, 77, 0.05)" }}
          >
            <i className="icon-svg-delete-black" />
          </Button>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <div className="relative" style={{ width: 80 }}>
            <Select
              value={customCategoryEntry.rating}
              placeholder="--"
              onChange={(value) =>
                setCustomCategoryEntry({
                  ...customCategoryEntry,
                  rating: value,
                })
              }
              style={{ width: 80 }}
              className={customCategoryEntry.rating ? "pl-4" : ""}
            >
              {ratingOptions.map((opt) => (
                <Select.Option key={opt.value} value={opt.value}>
                  <div className="flex items-center gap-2">
                    <i
                      className="w-[10px] h-[10px] flex"
                      style={{ backgroundColor: opt.color }}
                    ></i>
                    <span>{opt.label}</span>
                  </div>
                </Select.Option>
              ))}
            </Select>
          </div>
          <Input
            value={customCategoryEntry.description}
            onChange={(e) =>
              setCustomCategoryEntry({
                ...customCategoryEntry,
                description: e.target.value,
              })
            }
            placeholder="Enter list name..."
            className="flex-1"
          />
          <Button
            type="text"
            onClick={() =>
              setCustomCategoryEntry({ rating: null, description: "" })
            }
            className="min-w-[50px] !border-none"
            style={{ backgroundColor: "rgba(28, 29, 77, 0.05)" }}
          >
            <i className="icon-svg-delete-black" />
          </Button>
        </div>
        <Button
          type="text"
          icon={<PlusOutlined />}
          onClick={addCustomCategory}
          disabled={!customCategoryName.trim()}
        >
          Add Category
        </Button>
      </div>

      {/* Comments Section */}
      <div className="mt-8 text-left">
        <h4 className="!font-medium">Enter your comments:</h4>
        <TextArea
          placeholder="Write comments..."
          rows={4}
          value={comments}
          onChange={(e) => setComments(e.target.value)}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-4 mt-8 mb-8">
        <Button type="text" >
          Cancel
        </Button>
        <Button type="primary" className="!px-4 !italic">
          Save Feedback
        </Button>
      </div>
    </div>
  );
}
