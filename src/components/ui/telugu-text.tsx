import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface TeluguTextProps extends HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  className?: string;
}

/**
 * A component for rendering text in Telugu font
 * Uses the Mandali font configured in the app
 */
export function TeluguText({ children, className, ...props }: TeluguTextProps) {
  return (
    <span className={cn("font-telugu", className)} {...props}>
      {children}
    </span>
  );
}
