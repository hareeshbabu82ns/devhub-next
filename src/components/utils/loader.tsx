"use client";

import React from "react";
import { Icons } from "./icons";
import { cn } from "@/lib/utils";

interface CompProps {
  className?: string;
}

const Loader = ({ className }: CompProps) => {
  return (
    <div
      className={cn(
        "flex-1 flex size-full items-center justify-center",
        className,
      )}
    >
      <Icons.loaderWheel className="text-primary size-8 animate-spin" />
    </div>
  );
};

export default Loader;
