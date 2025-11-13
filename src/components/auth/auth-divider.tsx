"use client";

import { LockKeyholeIcon } from "lucide-react";

interface AuthDividerProps {
  icon?: React.ReactNode;
  className?: string;
}

export function AuthDivider({ icon, className }: AuthDividerProps) {
  return (
    <div className={`flex w-full items-center py-4 ${className || ""}`}>
      <div className="bg-primary h-px flex-1" />
      <span className="text-primary px-2 text-sm">
        {icon || <LockKeyholeIcon className="size-4" />}
      </span>
      <div className="bg-primary h-px flex-1" />
    </div>
  );
}
