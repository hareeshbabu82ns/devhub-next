"use client";

import { useEffect, useState, useRef } from "react";
import OptimizedImage from "@/components/utils/optimized-image";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/utils/icons";
import { X, ChevronLeft, ChevronRight, MoveIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { DialogTitle } from "@radix-ui/react-dialog";

interface FullscreenImageViewerProps {
  imageUrl: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

export default function FullscreenImageViewer({
  imageUrl,
  alt,
  isOpen,
  onClose,
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false,
}: FullscreenImageViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  // Add animation frame ref for smoother dragging
  const animationRef = useRef<number | null>(null);
  const positionRef = useRef({ x: 0, y: 0 });

  // Reset scale and position when image changes
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    positionRef.current = { x: 0, y: 0 };
    setIsLoading(true);
  }, [imageUrl]);

  // Handle mouse/touch events for panning
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    // Only enable panning when zoomed in
    if (scale <= 1) return;

    setIsDragging(true);

    // Get current pointer position
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    setDragStart({
      x: clientX - positionRef.current.x,
      y: clientY - positionRef.current.y,
    });

    // Prevent default behaviors that might interfere with dragging
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;

    // Get current pointer position
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    // Calculate new position
    const newPosition = {
      x: clientX - dragStart.x,
      y: clientY - dragStart.y,
    };

    // Update position ref immediately for smooth tracking
    positionRef.current = newPosition;

    // Use requestAnimationFrame for smoother updates
    if (animationRef.current === null) {
      animationRef.current = requestAnimationFrame(() => {
        setPosition(newPosition);
        animationRef.current = null;
      });
    }

    // Prevent default behaviors
    e.preventDefault();
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  };

  // Add event listeners for drag operations
  useEffect(() => {
    const options = { passive: false }; // Improve touch performance

    window.addEventListener("mousemove", handleMouseMove, options);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleMouseMove, options);
    window.addEventListener("touchend", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleMouseMove);
      window.removeEventListener("touchend", handleMouseUp);

      // Clean up any pending animation frames
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isDragging, dragStart]);

  // Reset position when scale changes to 1 or below
  useEffect(() => {
    if (scale <= 1) {
      setPosition({ x: 0, y: 0 });
    }
  }, [scale]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "Escape": // Close fullscreen
          onClose();
          break;
        case "ArrowRight": // Next image
          if (onNext && hasNext) onNext();
          break;
        case "ArrowLeft": // Previous image
          if (onPrevious && hasPrevious) onPrevious();
          break;
        case "+": // Zoom in
          setScale((prev) => Math.min(prev + 0.25, 3));
          break;
        case "-": // Zoom out
          setScale((prev) => Math.max(prev - 0.25, 0.5));
          break;
        case "0": // Reset zoom
          setScale(1);
          setPosition({ x: 0, y: 0 });
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, onNext, onPrevious, hasNext, hasPrevious]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      modal={true}
    >
      <DialogContent
        className="grid w-full h-full max-w-none sm:max-w-none flex-col border-none bg-background/90 p-0 shadow-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-1/2 data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-1/2"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        <div className="flex flex-col items-center justify-center">
          {/* Close button */}
          <Button
            onClick={onClose}
            className="absolute right-4 top-4 z-20"
            size="icon"
            variant="secondary"
          >
            <X className="size-5" />
            <span className="sr-only">Close</span>
          </Button>

          {/* Navigation controls */}
          <div className="absolute top-1/2 left-0 right-0 flex justify-between px-6 transform -translate-y-1/2 z-10">
            {hasPrevious && (
              <Button
                onClick={onPrevious}
                size="icon"
                variant="outline"
                className="opacity-75 hover:opacity-100 size-12"
              >
                <ChevronLeft className="size-6" />
                <span className="sr-only">Previous image</span>
              </Button>
            )}
            {hasNext && (
              <Button
                onClick={onNext}
                size="icon"
                variant="outline"
                className="ml-auto opacity-75 hover:opacity-100 size-12"
              >
                <ChevronRight className="size-6" />
                <span className="sr-only">Next image</span>
              </Button>
            )}
          </div>

          {/* Zoom and pan controls */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10 flex items-center gap-4 bg-background/20 backdrop-blur-md p-3 rounded-full">
            <Button
              onClick={() => setScale((prev) => Math.max(prev - 0.25, 0.5))}
              size="icon"
              variant="outline"
              className="h-10 w-10"
            >
              <span className="text-xl font-bold">-</span>
              <span className="sr-only">Zoom out</span>
            </Button>
            <span className="text-base font-medium min-w-14 text-center text-white">
              {Math.round(scale * 100)}%
            </span>
            <Button
              onClick={() => setScale((prev) => Math.min(prev + 0.25, 3))}
              size="icon"
              variant="outline"
              className="h-10 w-10"
            >
              <span className="text-xl font-bold">+</span>
              <span className="sr-only">Zoom in</span>
            </Button>
            <Button
              onClick={() => {
                setScale(1);
                setPosition({ x: 0, y: 0 });
              }}
              size="icon"
              variant="outline"
              className="h-10 w-10 ml-2"
              title="Reset zoom and position"
            >
              <MoveIcon className="size-5" />
              <span className="sr-only">Reset view</span>
            </Button>
          </div>

          {/* Loading indicator */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Icons.loaderWheel className="size-16 animate-spin text-white" />
            </div>
          )}

          {/* Image with panning capability */}
          <div
            className="absolute inset-0 flex items-center justify-center overflow-hidden"
            ref={containerRef}
          >
            <div
              style={{
                transform: `scale(${scale}) translate3d(${position.x / scale}px, ${position.y / scale}px, 0)`,
                cursor:
                  scale > 1 ? (isDragging ? "grabbing" : "grab") : "default",
                willChange: isDragging ? "transform" : "auto",
                transition: isDragging ? "none" : "transform 200ms ease-out",
              }}
              className="origin-center"
              onMouseDown={handleMouseDown}
              onTouchStart={handleMouseDown}
            >
              <OptimizedImage
                src={imageUrl}
                alt={alt}
                width={1200}
                height={800}
                className={cn(
                  "max-h-[85vh] max-w-[85vw] object-contain transition-opacity duration-300 select-none",
                  isLoading ? "opacity-0" : "opacity-100",
                  "will-change-transform",
                )}
                onLoad={() => setIsLoading(false)}
                priority
                draggable={false}
              />
            </div>
          </div>

          {/* Pan instruction */}
          {scale > 1 && (
            <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-black/30 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm opacity-80 transition-opacity duration-300 hover:opacity-100">
              {isDragging ? "Moving image..." : "Drag to pan image"}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
