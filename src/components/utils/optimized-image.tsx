"use client";

import Image, { ImageProps } from "next/image";

interface OptimizedImageProps extends Omit<ImageProps, "src"> {
  src: string;
}

/**
 * A wrapper around Next.js Image component that handles both regular images
 * and API-served images. For API routes (/api/assets/*), it removes the
 * download query parameter and uses unoptimized mode to avoid optimization errors.
 */
export default function OptimizedImage({ src, ...props }: OptimizedImageProps) {
  // Check if this is an API-served image
  const isApiImage = src.startsWith("/api/assets");

  // Remove download query parameter for display
  const cleanSrc = isApiImage ? src.replace(/\?download=true/g, "") : src;

  // Use unoptimized mode for API images to avoid Next.js optimization issues
  return <Image {...props} src={cleanSrc} unoptimized={isApiImage} />;
}
