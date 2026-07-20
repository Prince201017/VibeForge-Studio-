/**
 * [ForgeOS UI] Image
 * Responsive image with native lazy loading, a skeleton placeholder
 * while loading, a fallback state on error, and optional aspect-ratio
 * locking to prevent layout shift.
 */
import React, { useState } from "react";
import { cn } from "../utils/classNames";
import { Skeleton } from "../display/Skeleton";

export interface ImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "onError"> {
  aspectRatio?: string; // e.g. "16/9", "1/1"
  fallback?: React.ReactNode;
  containerClassName?: string;
}

export const Image: React.FC<ImageProps> = ({ aspectRatio, fallback, className, containerClassName, alt, ...rest }) => {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

  return (
    <div
      style={aspectRatio ? { aspectRatio } : undefined}
      className={cn("relative overflow-hidden rounded-md bg-neutral-900", containerClassName)}
    >
      {status === "loading" && <Skeleton className="absolute inset-0 h-full w-full" />}
      {status === "error" ? (
        fallback ?? (
          <div className="absolute inset-0 flex items-center justify-center text-neutral-600">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 16l5-5 4 4 5-6 4 5M4 4h16v16H4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            </svg>
          </div>
        )
      ) : (
        <img
          {...rest}
          alt={alt}
          loading="lazy"
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
          className={cn("h-full w-full object-cover transition-opacity", status === "loaded" ? "opacity-100" : "opacity-0", className)}
        />
      )}
    </div>
  );
};

Image.displayName = "Image";
