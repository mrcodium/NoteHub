import { NodeViewWrapper } from "@tiptap/react";
import React, { useRef, useState } from "react";

export default function ResizableImage({ node, updateAttributes }) {
  const imgRef = useRef(null);
  const [aspectRatio, setAspectRatio] = useState(null);

  const startResize = (e, direction) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = imgRef.current.offsetWidth;

    const onMouseMove = (event) => {
      let deltaX = event.clientX - startX;
      if (direction === "left") deltaX = -deltaX; // invert for left handle

      let newWidth = startWidth + deltaX;
      if (newWidth < 120) newWidth = 120;

      // preserve ratio
      const newHeight = aspectRatio ? newWidth / aspectRatio : "auto";

      updateAttributes({
        width: newWidth + "px",
        height: newHeight + "px",
      });
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  return (
    <NodeViewWrapper
      className="node-image relative"
      data-align={node.attrs.align}
      contentEditable={false}
    >
      <img
        ref={imgRef}
        src={node.attrs.src}
        style={{
          width: node.attrs.width, // controlled by resize
          height: "auto", // always auto
          maxWidth: "100%", // responsive
          display: "block",
        }}
        draggable={false}
      />

      {/* Left handle */}
      <span
        onMouseDown={(e) => startResize(e, "left")}
        className="resize-handle left-2"
      />

      {/* Right handle */}
      <span
        onMouseDown={(e) => startResize(e, "right")}
        className="resize-handle right-2"
      />
    </NodeViewWrapper>
  );
}
