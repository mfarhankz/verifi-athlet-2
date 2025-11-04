"use client";

import React from "react";
import "./SuccessPopover.css";

interface SuccessPopoverProps {
  trigger: "top" | "bottom" | "left" | "right";
  children: React.ReactNode;
  content: string;
  visible: boolean;
  onClose?: () => void;
}

export default function SuccessPopover({
  trigger = "top",
  children,
  content,
  visible,
  onClose
}: SuccessPopoverProps) {
  React.useEffect(() => {
    if (visible && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, 2000); // Show for 2 seconds

      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  return (
    <div className="success-popover-wrapper">
      {children}
      {visible && (
        <div className={`success-popover success-popover-${trigger}`}>
          <div className="success-popover-content">
            {content}
          </div>
        </div>
      )}
    </div>
  );
}

