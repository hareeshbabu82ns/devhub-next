"use client";

import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { useScraperContext } from "./scraper-context";

export interface JsonEditorProps {
  content: string;
  onChange: (value: string) => void;
  className?: string;
}

export const JsonEditor: React.FC<JsonEditorProps> = ({
  content,
  onChange,
  className = "",
}) => {
  return (
    <Textarea
      value={content}
      onChange={(e) => onChange(e.target.value)}
      className={`text-xs font-mono resize-none ${className}`}
      spellCheck={false}
    />
  );
};
