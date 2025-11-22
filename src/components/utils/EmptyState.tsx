/**
 * EmptyState - Reusable empty state component
 *
 * Task: T006 [PH1]
 * Purpose: Contextual empty state with icon, title, description, and optional action
 *
 * Features:
 * - Icon with customizable size
 * - Title and description
 * - Optional context-specific message
 * - Optional call-to-action button
 */

import React from "react";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  context?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  context,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className,
      )}
    >
      {Icon && (
        <Icon
          className="h-12 w-12 mb-4 text-muted-foreground/40"
          aria-hidden="true"
        />
      )}
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-2 max-w-md">
          {description}
        </p>
      )}
      {context && (
        <p className="text-xs text-muted-foreground/70 mb-4 max-w-md italic">
          {context}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} variant="outline" className="mt-2">
          {action.label}
        </Button>
      )}
    </div>
  );
}
