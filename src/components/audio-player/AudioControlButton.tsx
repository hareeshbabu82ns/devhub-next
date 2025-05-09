import React, { forwardRef } from "react";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";

interface AudioControlButtonProps {
  /**
   * The icon to display in the button
   */
  icon: React.ReactNode;
  /**
   * The accessible label for the button
   */
  label: string;
  /**
   * Optional title attribute for tooltip
   */
  title?: string;
  /**
   * Whether the button is disabled
   */
  disabled?: boolean;
  /**
   * Button click handler
   */
  onClick: () => void;
  /**
   * Optional className for additional styling
   */
  className?: string;
  /**
   * Whether the button is in an active/pressed state
   */
  isActive?: boolean;
  /**
   * ARIA pressed state for toggle buttons
   */
  ariaPressed?: boolean;
}

/**
 * A standardized button component for audio player controls
 * with consistent styling and accessibility features
 */
const AudioControlButton = forwardRef<
  HTMLButtonElement,
  AudioControlButtonProps
>( ( { icon,
  label,
  title,
  disabled = false,
  onClick,
  className,
  isActive = false,
  ariaPressed, }, ref ) => {

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      aria-label={label}
      title={title}
      disabled={disabled}
      onClick={onClick}
      aria-pressed={ariaPressed}
      className={cn(
        "focus-visible:ring-2 focus-visible:ring-offset-2",
        isActive && "text-primary",
        className
      )}
    >
      {icon}
    </Button>
  );
} );

AudioControlButton.displayName = "AudioControlButton";

export default AudioControlButton;