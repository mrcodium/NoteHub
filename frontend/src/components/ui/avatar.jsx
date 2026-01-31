import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";

const CLOUDINARY_REGEX = /\/image\/upload\//;

function optimizeCloudinaryUrl(src, size) {
  if (!src || !CLOUDINARY_REGEX.test(src)) return src;

  return src.replace(
    "/image/upload/",
    `/image/upload/f_auto,q_auto,dpr_auto,w_${size},h_${size},c_fill/`
  );
}

/* -------------------------------- Avatar Root -------------------------------- */
const Avatar = React.forwardRef(function Avatar({ className, ...props }, ref) {
  return (
    <AvatarPrimitive.Root
      ref={ref}
      className={cn("relative flex shrink-0 overflow-hidden rounded-full", className)}
      {...props}
    />
  );
});

/* ------------------------------- Avatar Image -------------------------------- */
const AvatarImage = React.forwardRef(function AvatarImage(
  { className, src, size = 150, unoptimized = false, ...props },
  ref
) {
  const optimizedSrc = React.useMemo(() => {
    if (unoptimized) return src;
    return optimizeCloudinaryUrl(src, size);
  }, [src, size, unoptimized]);

  const srcSet = !unoptimized
    ? `
      ${optimizeCloudinaryUrl(src, 50)} 50w,
      ${optimizeCloudinaryUrl(src, 150)} 150w,
      ${optimizeCloudinaryUrl(src, 300)} 300w
    `
    : undefined;

  return (
    <AvatarPrimitive.Image
      ref={ref}
      src={optimizedSrc}
      srcSet={srcSet}
      sizes="(max-width: 640px) 50px, (max-width: 1024px) 150px, 300px"
      className={cn("object-cover", className)}
      width={!unoptimized ? size : undefined}
      height={!unoptimized ? size : undefined}
      loading={props.loading || "lazy"}
      decoding="async"
      alt={props.alt || "Profile photo"}
      {...props}
    />
  );
});

/* ------------------------------ Avatar Fallback ------------------------------ */
const AvatarFallback = React.forwardRef(function AvatarFallback({ className, ...props }, ref) {
  return (
    <AvatarPrimitive.Fallback
      ref={ref}
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-muted",
        className
      )}
      {...props}
    />
  );
});

export { Avatar, AvatarImage, AvatarFallback };
