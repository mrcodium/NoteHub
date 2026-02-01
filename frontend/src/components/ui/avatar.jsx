import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";

const CLOUDINARY_REGEX = /\/image\/upload\//;
const GOOGLE_AVATAR_REGEX = /lh3\.googleusercontent\.com/;

function optimizeImageUrl(src, size) {
  if (!src) return src;

  // ✅ Cloudinary
  if (CLOUDINARY_REGEX.test(src)) {
    return src.replace(
      "/image/upload/",
      `/image/upload/f_auto,q_auto,dpr_auto,w_${size},h_${size},c_fill/`,
    );
  }

  // ✅ Google avatar
  if (GOOGLE_AVATAR_REGEX.test(src)) {
    return src.replace(/=s\d+(-c)?$/, "") + `=s${size}`;
  }

  return src;
}

/* -------------------------------- Avatar Root -------------------------------- */
const Avatar = React.forwardRef(function Avatar({ className, ...props }, ref) {
  return (
    <AvatarPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full",
        className,
      )}
      {...props}
    />
  );
});

/* ------------------------------- Avatar Image -------------------------------- */
const AvatarImage = React.forwardRef(function AvatarImage(
  { className, src, size = 150, unoptimized = false, ...props },
  ref,
) {
  const optimizedSrc = React.useMemo(() => {
    if (unoptimized) return src;
    return optimizeImageUrl(src, size);
  }, [src, size, unoptimized]);

  // Generate srcSet dynamically based on size
  const srcSet = !unoptimized
    ? [
        `${optimizeImageUrl(src, Math.round(size / 2))} ${Math.round(size / 2)}w`,
        `${optimizedSrc} ${size}w`,
        `${optimizeImageUrl(src, size * 2)} ${size * 2}w`,
      ].join(", ")
    : undefined;

  return (
    <AvatarPrimitive.Image
      ref={ref}
      src={optimizedSrc}
      srcSet={srcSet}
      sizes={`${size}px`}
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
const AvatarFallback = React.forwardRef(function AvatarFallback(
  { className, ...props },
  ref,
) {
  return (
    <AvatarPrimitive.Fallback
      ref={ref}
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-muted",
        className,
      )}
      {...props}
    />
  );
});

export { Avatar, AvatarImage, AvatarFallback };
