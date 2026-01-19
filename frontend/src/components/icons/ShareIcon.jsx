import React from "react";

const ShareIcon = ({ size = 24, color = "currentColor", ...props }) => {
  return (
    <svg
      width={size}
      height={size}
      version="1.1"
      viewBox="0 0 118 129"
      xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink"
      preserveAspectRatio="xMidYMid"
      fill={color}
      {...props}
    >
      <circle cx="96" cy="22" r="22" />
      <circle cx="22" cy="65" r="22" />
      <circle cx="96" cy="107" r="22" />
      <rect
        x="24.114"
        y="57.459"
        width="73"
        height="12"
        transform="rotate(-32 24.114 57.459)"
      />
      <rect
        x="31.3589"
        y="63"
        width="73"
        height="12"
        transform="rotate(32 31.3589 63)"
      />
    </svg>
  );
};

export default ShareIcon;
