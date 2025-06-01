import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface ShobhikaTextProps extends HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  className?: string;
  bold?: boolean;
}

/**
 * A component for rendering text in Shobhika font
 * Shobhika is a Unicode font that supports Sanskrit and Telugu scripts
 * It's specifically designed for Devanagari and other Indic scripts
 */
export function ShobhikaText({
  children,
  className,
  bold = false,
  ...props
}: ShobhikaTextProps) {
  return (
    <span
      className={cn("font-shobhika", { "font-bold": bold }, className)}
      {...props}
    >
      {children}
    </span>
  );
}
