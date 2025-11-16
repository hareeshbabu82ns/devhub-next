/**
 * DictionarySkipLinks - Keyboard Navigation Skip Links (T164)
 * 
 * Purpose: Provide skip links for keyboard users to jump to main sections
 * WCAG 2.4.1: Bypass Blocks (Level A)
 * 
 * Features:
 * - Skip to main content
 * - Skip to filters
 * - Skip to search results
 * - Only visible when focused (keyboard navigation)
 */

"use client";

import { cn } from "@/lib/utils";

interface SkipLink {
  href: string;
  label: string;
}

const skipLinks: SkipLink[] = [
  { href: "#dictionary-main-content", label: "Skip to main content" },
  { href: "#dictionary-search", label: "Skip to search" },
  { href: "#dictionary-filters", label: "Skip to filters" },
  { href: "#dictionary-results", label: "Skip to results" },
];

/**
 * T164: Skip links for keyboard users
 * Allows bypassing repetitive navigation to reach main content quickly
 */
export function DictionarySkipLinks() {
  return (
    <div className="skip-links-container" role="navigation" aria-label="Skip links">
      {skipLinks.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className={cn(
            "skip-link",
            // Position off-screen by default
            "absolute -top-10 left-0 z-[9999]",
            // Style when visible
            "bg-primary text-primary-foreground",
            "px-4 py-2 rounded-br-md",
            "font-medium text-sm",
            "transition-all duration-200",
            // Show on focus
            "focus:top-0",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          )}
          onClick={(e) => {
            // Smooth scroll to target
            e.preventDefault();
            const target = document.querySelector(link.href);
            if (target) {
              target.scrollIntoView({ behavior: "smooth", block: "start" });
              // Focus the target element if it's focusable
              if (target instanceof HTMLElement) {
                target.focus();
              }
            }
          }}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}

/**
 * Utility component to mark sections with skip link targets
 * Usage: <SkipLinkTarget id="dictionary-main-content">
 */
interface SkipLinkTargetProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}

export function SkipLinkTarget({
  id,
  children,
  className,
  as: Component = "div",
}: SkipLinkTargetProps) {
  return (
    <Component
      id={id}
      className={cn(className)}
      tabIndex={-1} // Allow programmatic focus but not in tab order
      style={{ outline: "none" }} // Remove focus outline since this is just a target
    >
      {children}
    </Component>
  );
}
