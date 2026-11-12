"use client";

import Image, { ImageLoaderProps, ImageProps } from "next/image";
import { cleanAssetUrl, isAssetUrl } from "@/lib/assets/shared";

interface OptimizedImageProps extends Omit<ImageProps, "src"> {
  src: string;
}

/**
 * Asks the assets route for a copy no wider than the slot needs. (Next's own
 * optimizer cannot be used: it fetches without the session cookie.)
 */
const assetLoader = ({ src, width }: ImageLoaderProps) => `${src}?w=${width}`;

/**
 * next/image for both regular images and uploaded assets (/api/assets/*).
 * Assets are resized by the assets route itself, so grids of tiles download
 * thumbnails instead of full-size originals.
 */
export default function OptimizedImage({ src, ...props }: OptimizedImageProps) {
  if (isAssetUrl(src)) {
    // stored URLs may carry a legacy `?download=true`
    return <Image {...props} src={cleanAssetUrl(src)} loader={assetLoader} />;
  }
  return <Image {...props} src={src} />;
}
